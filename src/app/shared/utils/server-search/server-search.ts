import { DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, Subject, catchError, debounceTime, finalize, map, switchMap } from 'rxjs';

/** Every searching picker pages the same way, as the product pickers in the sales and stock forms do. */
export const SEARCH_PAGE = 50;

/**
 * A form picker over a list that grows for years: the first page when it opens, a server search
 * 300ms after typing stops, the next page on scroll, and the chosen value kept named while the
 * person searches for something else. A failure is reported for a Try again in place.
 *
 * Created in a component's constructor, with the component's DestroyRef.
 */
export class ServerSearch<T extends { value: string }> {
    private readonly _held = signal<T | null>(null);
    private readonly _found = signal<readonly T[]>([]);
    /** While words are typed the held choice is left out, so "No match" can show. */
    private readonly _term = signal('');
    /** Loading runs from the keystroke until the new search answers, so an older answer landing meanwhile cannot end it. */
    private readonly _typing = signal(false);
    private readonly _asking = signal(false);
    private readonly _ask = new Subject<{ term: string; offset: number }>();
    private readonly _typed = new Subject<string>();
    private _page = { term: '', offset: 0, done: false };

    readonly choices = computed(() => {
        const held = this._held();
        const found = this._found();
        return held && !this._term() && !found.some((c) => c.value === held.value) ? [held, ...found] : found;
    });
    readonly loading = computed(() => this._typing() || this._asking());
    /** The words the shown choices answer, so an empty list can say "no match" rather than "none yet". */
    readonly term = this._term.asReadonly();
    readonly failed = signal(false);

    constructor(fetch: (term: string, offset: number) => Observable<T[]>, destroy: DestroyRef) {
        this._ask
            .pipe(
                switchMap((ask) => {
                    // Recorded when asked, not when answered, so Try again repeats the words that failed.
                    const before = this._page;
                    this._page = { ...ask, done: true };
                    this._term.set(ask.term);
                    this._typing.set(false);
                    this._asking.set(true);
                    this.failed.set(false);
                    return fetch(ask.term, ask.offset).pipe(
                        map((rows) => ({ ask, rows })),
                        catchError(() => {
                            // A failed next page leaves the list as it was, and scrolling again asks again.
                            if (ask.offset) this._page = { ...before, done: false };
                            else this.failed.set(true);
                            return EMPTY;
                        }),
                        finalize(() => this._asking.set(false))
                    );
                }),
                takeUntilDestroyed(destroy)
            )
            .subscribe(({ ask, rows }) => {
                this._page = { ...ask, done: rows.length < SEARCH_PAGE };
                this._found.update((found) => (ask.offset ? [...found, ...rows] : rows));
            });
        this._typed.pipe(debounceTime(300), takeUntilDestroyed(destroy)).subscribe((term) => this._ask.next({ term, offset: 0 }));
    }

    /** The first page, with nothing typed. */
    start(): void {
        this._ask.next({ term: '', offset: 0 });
    }

    search(term: string): void {
        this._typing.set(true);
        this._typed.next(term.trim());
    }

    /** The picker opens with an empty search box, so it shows the first page, not the last search. */
    opened(open: boolean): void {
        if (open && (this._page.term !== '' || this.failed())) this.start();
    }

    more(): void {
        if (this._page.done || this.loading()) return;
        this._ask.next({ term: this._page.term, offset: this._page.offset + SEARCH_PAGE });
    }

    retry(): void {
        this._ask.next({ term: this._page.term, offset: 0 });
    }

    /** Keeps a choice named whatever is searched: the saved one of a record, or the one just picked. */
    hold(choice: T | null): void {
        this._held.set(choice);
    }

    /** Holds the shown choice with this value, after the person picks it. */
    holdValue(value: string | null): void {
        const chosen = this.choices().find((c) => c.value === value);
        if (chosen) this._held.set(chosen);
    }
}

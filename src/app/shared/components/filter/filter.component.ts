import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, TemplateRef, computed, effect, inject, input, model, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideEraser, lucideListFilter, lucideRotateCcw, lucideSearch, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Text } from '@app/core/models/config.model';
import { Choice, FilterField, FilterConfig, FilterValues, RemoteChoices } from '@app/core/models/filter.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ChoicesService } from '@app/shared/services/choices/choices.service';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { resolveText } from '@app/shared/utils/resolve-text/resolve-text';
import { matches } from '@app/shared/utils/condition/condition';
import { isEmptyValue } from '@app/shared/utils/empty-value/empty-value';

const SEPARATOR = ',';

/** What this component draws today. Dates and ranges arrive with the first list that has one. */
const DRAWN: ReadonlySet<FilterField['type']> = new Set(['text', 'select', 'multi-select', 'segmented', 'toggle']);

const warned = new Set<string>();

/**
 * Remote choices this build can load: an endpoint and fixed params. Server search, paging, label
 * resolution and a param that follows another filter are not built yet, and a picker loading the
 * wrong list is worse than no picker.
 */
const drawsRemote = (source: RemoteChoices): boolean =>
    !source.search && !source.pageSize && !source.resolve && !source.group && !source.sub && Object.values(source.params ?? {}).every((param) => typeof param !== 'object');

/**
 * Search and the fields that narrow a list, with what is applied read back as chips.
 *
 * It holds no HTTP and no list state: it reports `search` and `values`, and whoever owns the store
 * decides what that means. The chips render from the applied values rather than from what was
 * typed, so a value that arrived from a stat card or a pasted link reads back the same way.
 *
 * `modal` is the default: one field per row with an explicit Apply, so a long field list is set in
 * one go rather than sending a request per field. `row` puts the fields inline after the search
 * box, and `bar` puts them in a popover that applies as they change. A phone never gets the inline
 * render, because four controls do not fit on one; it falls back to the modal, sized to the window.
 *
 *   <list-filter [config]="CATEGORY_LIST.filter" [(values)]="filters" [(search)]="search" />
 */
@Component({
    selector: 'list-filter',
    imports: [NgTemplateOutlet, FormsModule, NgIcon, NzButtonModule, NzInputModule, NzModalModule, NzPopoverModule, NzSegmentedModule, NzSelectModule, NzSwitchModule, NzTooltipModule, TranslatePipe, TextPipe],
    providers: [ChoicesService, provideIcons({ lucideCheck, lucideEraser, lucideListFilter, lucideRotateCcw, lucideSearch, lucideX })],
    templateUrl: './filter.component.html',
    styleUrl: './filter.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterComponent {
    private readonly _language = inject(LanguageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);
    private readonly _choices = inject(ChoicesService);
    private readonly _session = inject(SessionService);

    readonly config = input.required<FilterConfig>();
    /** Exactly what goes in the query string: strings or null, never objects. */
    readonly values = model<FilterValues>({});
    readonly search = model('');
    /** A load is in flight. The fields stay usable; nothing here waits on it. */
    readonly loading = input(false);
    /** Below the phone breakpoint the fields go behind the Filters button, whatever the config asks. */
    readonly narrow = input(false);

    private readonly _panel = viewChild.required<TemplateRef<{}>>('panel');
    private readonly _modalFooter = viewChild.required<TemplateRef<{}>>('modalFooter');

    /** What a modal holds before Apply. Null whenever nothing is pending. */
    private readonly _draft = signal<FilterValues | null>(null);

    /** The popover's own visibility, for the `bar` render and for every phone. */
    readonly popoverOpen = signal(false);

    /**
     * The fields this build can draw. One it cannot is left out with a single warning rather than
     * rendered as a dead control: a filter that looks applicable and does nothing is worse than one
     * that is absent.
     */
    readonly fields = computed(() =>
        this.config().fields.filter((field) => {
            // A remote field someone cannot load is absent, not an empty picker that answers 403.
            if (field.permission && !this._session.can(field.permission)) return false;
            const drawnChoices = !('choices' in field) || Array.isArray(field.choices) || ((field.type === 'select' || field.type === 'multi-select') && drawsRemote(field.choices as RemoteChoices));
            if (DRAWN.has(field.type) && drawnChoices) return true;
            const id = `${field.key}:${field.type}`;
            if (!warned.has(id)) {
                warned.add(id);
                console.warn(`[list-filter] "${field.key}" is a ${field.type} field this build cannot draw yet, so it is left out.`);
            }
            return false;
        })
    );

    /** Inline while there is room and the config asks for it; behind the button otherwise. */
    readonly inline = computed(() => this.config().render === 'row' && !this.narrow());

    /**
     * The modal is the default, and it is what a phone gets too: fields that no longer fit inline
     * belong in the panel with an explicit Apply, not in a popover hanging off the edge of a 390px
     * window. Only `bar` opts out, because applying live is the whole point of it.
     */
    readonly isModal = computed(() => !this.inline() && this.config().render !== 'bar');

    readonly showsChips = computed(() => this.config().chips !== false);
    readonly hasSearch = computed(() => !!this.config().search);

    /** Choices loaded from an endpoint, by field key. Absent until the field is first needed. */
    private readonly _remote = signal<Readonly<Record<string, readonly Choice[]>>>({});
    private readonly _remoteLoading = signal<ReadonlySet<string>>(new Set());

    choicesOf(field: FilterField): readonly Choice[] {
        if (!('choices' in field)) return [];
        return Array.isArray(field.choices) ? field.choices : (this._remote()[field.key] ?? []);
    }

    remoteLoading(field: FilterField): boolean {
        return this._remoteLoading().has(field.key);
    }

    isRemoteChoices(field: FilterField): boolean {
        return !!this.remoteOf(field);
    }

    private remoteOf(field: FilterField): RemoteChoices | null {
        return 'choices' in field && !Array.isArray(field.choices) ? (field.choices as RemoteChoices) : null;
    }

    /**
     * Loads a remote field's choices the first time they are needed: when the panel opens, or when
     * a value arrived from the URL and its chip needs a name. Nothing is asked when the page opens.
     */
    loadRemoteFor(field: FilterField): void {
        const source = this.remoteOf(field);
        if (!source || this._remote()[field.key] || this._remoteLoading().has(field.key)) return;

        this._remoteLoading.update((keys) => new Set(keys).add(field.key));
        const done = () =>
            this._remoteLoading.update((keys) => {
                const next = new Set(keys);
                next.delete(field.key);
                return next;
            });
        this._choices.load(source).subscribe({
            next: (choices) => {
                this._remote.update((all) => ({ ...all, [field.key]: choices }));
                done();
            },
            // The picker stays empty and says it found nothing; the list itself is unaffected, and
            // opening the panel again asks again.
            error: () => done(),
        });
    }

    private loadAllRemote(): void {
        for (const field of this.fields()) this.loadRemoteFor(field);
    }

    constructor() {
        effect(() => {
            const values = this.values();
            const pending = this.fields().filter((field) => this.remoteOf(field) && !isEmptyValue(values[field.key]));
            untracked(() => pending.forEach((field) => this.loadRemoteFor(field)));
        });
    }

    /** A field can be turned off by what another field holds: a sub-category under no category. */
    disabled(field: FilterField): boolean {
        return !!field.disabledWhen && matches(field.disabledWhen, this.values());
    }

    private source(draft?: boolean): FilterValues {
        return (draft ? this._draft() : null) ?? this.values();
    }

    valueOf(field: FilterField, draft?: boolean): string | null {
        return this.source(draft)[field.key] ?? null;
    }

    listOf(field: FilterField, draft?: boolean): string[] {
        const value = this.valueOf(field, draft);
        return value ? value.split(SEPARATOR).filter(Boolean) : [];
    }

    toggleOf(field: FilterField, draft?: boolean): boolean {
        return this.valueOf(field, draft) === 'true';
    }

    set(field: FilterField, value: string | null, draft?: boolean): void {
        this.write(field.key, isEmptyValue(value) ? null : String(value), draft);
    }

    setList(field: FilterField, values: readonly string[], draft?: boolean): void {
        this.write(field.key, values.length ? values.join(SEPARATOR) : null, draft);
    }

    setToggle(field: FilterField, on: boolean, draft?: boolean): void {
        this.write(field.key, on ? 'true' : null, draft);
    }

    /**
     * What is narrowing the list, in one place: one chip per field holding a value, reading back
     * the label its choices carry rather than the raw value that went into the query string.
     */
    readonly chips = computed(() => {
        const values = this.values();
        return this.fields()
            .filter((field) => !isEmptyValue(values[field.key]))
            .map((field) => ({ field, text: this.readBack(field, String(values[field.key])) }));
    });

    readonly appliedCount = computed(() => this.chips().length);

    /** Anything at all narrowing the list, the search box included, which is what Reset has to undo. */
    readonly anyApplied = computed(() => this.appliedCount() > 0 || this.search().trim() !== '');

    /** A required field has no chip to close: the list has nothing to show without it. */
    clear(field: FilterField): void {
        if (field.required) return;
        this.write(field.key, null);
    }

    /** Everything that narrowed the list, search included, which no chip stands for. */
    resetAll(): void {
        this.values.set(this.cleared(this.values()));
        this.search.set('');
    }

    clearSearch(): void {
        this.search.set('');
    }

    openPanel(): void {
        this.loadAllRemote();
        if (!this.isModal()) {
            this.popoverOpen.set(true);
            return;
        }

        // Nothing applies until Apply, so the modal edits a copy and the list behind it stays put.
        this._draft.set({ ...this.values() });
        this._modal.create({
            nzTitle: this._translate.instant('list.filters'),
            nzContent: this._panel(),
            nzFooter: this._modalFooter(),
            nzWidth: this.narrow() ? 'calc(100vw - 2rem)' : 560,
            nzOnCancel: () => this._draft.set(null),
        });
    }

    closePanel(): void {
        this._draft.set(null);
        this._modal.closeAll();
    }

    clearDraft(): void {
        this._draft.set(this.cleared(this._draft() ?? this.values()));
    }

    applyDraft(): void {
        const draft = this._draft();
        if (draft) this.values.set(draft);
        this.closePanel();
    }

    /** A required field keeps its value: the list has nothing to show without one. */
    private cleared(from: FilterValues): FilterValues {
        const next: Record<string, string | null> = { ...from };
        for (const field of this.fields()) if (!field.required) next[field.key] = null;
        return next;
    }

    private write(key: string, value: string | null, draft?: boolean): void {
        if (draft) {
            this._draft.set({ ...(this._draft() ?? this.values()), [key]: value });
            return;
        }
        this.values.set({ ...this.values(), [key]: value });
    }

    /**
     * A chip is built as a plain string, so its copy is resolved here rather than by the text pipe.
     * Reading the language makes the chips rebuild when someone switches, so a key translated a
     * moment ago does not stay in the language it was translated in.
     */
    private label(text: Text): string {
        return resolveText(text, this._language.current(), (key) => this._translate.instant(key));
    }

    private readBack(field: FilterField, raw: string): string {
        if (field.type === 'toggle') return this.label(field.label);
        const choices = this.choicesOf(field);
        const parts = raw.split(SEPARATOR);
        const named = parts.map((value) => {
            const choice = choices.find((c) => c.value === value);
            return choice ? this.label(choice.label) : value;
        });
        return `${this.label(field.label)}: ${named.join(', ')}`;
    }
}

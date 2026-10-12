import { TextFieldModule } from '@angular/cdk/text-field';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBell, lucideBoxes, lucideCheck, lucideCircleAlert, lucideCircleCheck, lucideFactory, lucideHeart, lucideLightbulb, lucideListTodo, lucidePhoneCall, lucidePlus, lucideRepeat, lucideRotateCw, lucideSearch, lucideShoppingCart, lucideTag, lucideTrash2, lucideTruck, lucideUndo2, lucideUser, lucideUsers, lucideWallet } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NOTE_TAGS, Note, NoteTag } from '@app/core/models/note.model';
import { NOTE_TAG_STYLE } from '@app/layout/constants/note-tags';
import { RequestFailure } from '@app/core/models/api.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { NotesService } from '@app/layout/services/notes/notes.service';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

/** The note being written: a new one has an oid already, so a repeated save finds the note it made. */
interface Draft {
    oid: string;
    isNew: boolean;
    title: string;
    text: string;
    tags: NoteTag[];
}

/**
 * The person's own notes, inside the header drawer: the list with a search, and one note open for
 * writing in its place. Saving does not ask first, unlike the business's records: a note is the
 * person's own and can be changed back the same way. Deleting asks, because it cannot.
 */
@Component({
    selector: 'notes-panel',
    imports: [FormsModule, TextFieldModule, NgIcon, NzButtonModule, NzInputModule, NzSkeletonModule, NzTagModule, TranslatePipe, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCheck, lucidePlus, lucideRotateCw, lucideSearch, lucideTrash2, lucideCircleAlert, lucideListTodo, lucideRepeat, lucidePhoneCall, lucideFactory, lucideUser, lucideShoppingCart, lucideBoxes, lucideWallet, lucideTruck, lucideUndo2, lucideTag, lucideLightbulb, lucideBell, lucideUsers, lucideHeart, lucideCircleCheck })],
    templateUrl: './notes-panel.component.html',
    styleUrl: './notes-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
    // The host draws no box of its own, so the panel fills the drawer and its buttons sit at the bottom.
    host: { class: 'contents' },
})
export class NotesPanelComponent {
    private readonly _notes = inject(NotesService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    readonly language = inject(LanguageService).current;

    readonly notes = signal<Note[] | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly query = signal('');
    /** The tag the list is narrowed to, or null for every note. */
    readonly tag = signal<NoteTag | null>(null);
    readonly allTags = NOTE_TAGS;
    readonly tagStyle = NOTE_TAG_STYLE;
    readonly draft = signal<Draft | null>(null);
    private readonly _original = signal<Draft | null>(null);
    readonly saving = this._notes.saving;

    readonly visible = computed(() => {
        const words = this.query().trim().toLowerCase();
        const tag = this.tag();
        return (this.notes() ?? []).filter((note) => (!tag || note.tags?.includes(tag)) && (!words || `${note.note_title ?? ''} ${note.note_text ?? ''}`.toLowerCase().includes(words)));
    });

    /** The tags the person's notes use, in the set's order: only those are offered as a filter. */
    readonly usedTags = computed(() => {
        const used = new Set((this.notes() ?? []).flatMap((note) => note.tags ?? []));
        return NOTE_TAGS.filter((tag) => used.has(tag));
    });

    readonly changed = computed(() => {
        const draft = this.draft();
        const original = this._original();
        return !!draft && (draft.title.trim() !== original?.title.trim() || draft.text.trim() !== original?.text.trim() || [...draft.tags].sort().join() !== [...(original?.tags ?? [])].sort().join());
    });
    readonly empty = computed(() => !this.draft()?.title.trim() && !this.draft()?.text.trim());

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._notes.list().subscribe({
            next: (notes) => this.notes.set(notes),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    /** The title, or the first line of the text when there is no title. */
    heading(note: Note): string {
        return note.note_title || (note.note_text ?? '').split('\n')[0];
    }

    /** What is under the heading: the text, without the line already used as the heading. */
    preview(note: Note): string {
        const text = note.note_text ?? '';
        return note.note_title ? text : text.split('\n').slice(1).join(' ');
    }

    startNew(): void {
        this.edit({ oid: crypto.randomUUID(), isNew: true, title: '', text: '', tags: [] });
    }

    open(note: Note): void {
        this.edit({ oid: note.oid, isNew: false, title: note.note_title ?? '', text: note.note_text ?? '', tags: [...(note.tags ?? [])] });
    }

    setTitle(title: string): void {
        this.draft.update((draft) => (draft ? { ...draft, title } : draft));
    }

    setText(text: string): void {
        this.draft.update((draft) => (draft ? { ...draft, text } : draft));
    }

    toggleTag(tag: NoteTag): void {
        this.draft.update((draft) => (draft ? { ...draft, tags: draft.tags.includes(tag) ? draft.tags.filter((each) => each !== tag) : [...draft.tags, tag] } : draft));
    }

    /** Tapping the tag already chosen shows every note again. */
    filterBy(tag: NoteTag | null): void {
        this.tag.set(this.tag() === tag ? null : tag);
    }

    /** Back to the list, asking first when something written would be lost. */
    back(): void {
        if (!this.changed() || this.empty()) return this.close();
        confirmAction(this._modal, {
            title: this._translate.instant('shell.notes.discardTitle'),
            body: this._translate.instant('shell.notes.discardBody'),
            ok: this._translate.instant('shell.notes.discard'),
            cancel: this._translate.instant('shell.notes.keepWriting'),
            danger: true,
        }).subscribe((leave) => leave && this.close());
    }

    save(): void {
        const draft = this.draft();
        if (!draft || this.empty() || this.saving()) return;
        const title = draft.title.trim() || null;
        const text = draft.text.trim() || null;
        // Tags are optional: none goes as null, in the set's order.
        const tags = draft.tags.length ? NOTE_TAGS.filter((tag) => draft.tags.includes(tag)) : null;
        (draft.isNew ? this._notes.create(draft.oid, title, text, tags) : this._notes.update(draft.oid, title, text, tags)).subscribe({
            next: () => {
                this._message.success(this._translate.instant('shell.notes.saved'));
                this.close();
                this.load();
            },
            error: (error: unknown) => this._message.error(this._translate.instant(failureKey(error, 'shell.notes.saveFailed'))),
        });
    }

    remove(): void {
        const draft = this.draft();
        if (!draft || draft.isNew) return;
        confirmAction(this._modal, {
            title: this._translate.instant('shell.notes.deleteTitle'),
            body: this._translate.instant('shell.notes.deleteBody'),
            ok: this._translate.instant('shell.notes.delete'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._notes.remove(draft.oid).subscribe({
                next: () => {
                    this._message.success(this._translate.instant('shell.notes.deleted'));
                    this.close();
                    this.load();
                },
                error: (error: unknown) => this._message.error(this._translate.instant(failureKey(error, 'shell.notes.deleteFailed'))),
            });
        });
    }

    private edit(draft: Draft): void {
        this.draft.set(draft);
        this._original.set(draft);
    }

    private close(): void {
        this.draft.set(null);
        this._original.set(null);
    }
}

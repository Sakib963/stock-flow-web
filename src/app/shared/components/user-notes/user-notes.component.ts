import { CommonModule, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
  ChangeDetectionStrategy
} from '@angular/core';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NoteService, Note } from '@app/core/services/note.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ConfirmationModalComponent } from '../confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'user-notes',
  imports: [
    CommonModule,
    FormsModule,
    NgZorroCustomModule,
    AngularSvgIconModule,
    DatePipe,
  ],
  templateUrl: './user-notes.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './user-notes.component.scss',
})
export class UserNotesComponent implements OnInit {
  private breakpointObserver = inject(BreakpointObserver);
  noteService = inject(NoteService);
  private readonly _notification = inject(NzNotificationService);
  private readonly _modal = inject(NzModalService);
  private readonly _destroyRef = inject(DestroyRef);

  // Input/Output for drawer control
  isOpen = input<boolean>(false);
  onClose = output<void>();

  isMobile = signal(false);

  // Note management states
  noteTitle = signal('');
  noteContent = signal('');
  isEditMode = signal(false);
  selectedNoteOid = signal<string | null>(null);
  isSubmitting = signal(false);
  showNoteForm = signal(false);

  ngOnInit(): void {
    this.breakpointObserver
      .observe([Breakpoints.Handset])
      .subscribe((result) => {
        this.isMobile.set(result.matches);
      });
  }

  drawerPlacement = computed(() => (this.isMobile() ? 'bottom' : 'right'));
  drawerWidth = computed(() => (this.isMobile() ? undefined : 400));
  drawerHeight = computed(() => (this.isMobile() ? '80vh' : undefined));
  noteCount = computed(() => this.noteService.notes().length);

  // Close drawer
  closeDrawer(): void {
    this.resetNoteForm();
    this.onClose.emit();
  }

  // Reset note form
  resetNoteForm(): void {
    this.noteTitle.set('');
    this.noteContent.set('');
    this.isEditMode.set(false);
    this.selectedNoteOid.set(null);
    this.showNoteForm.set(false);
  }

  // Show new note form
  showNewNoteForm(): void {
    this.resetNoteForm();
    this.showNoteForm.set(true);
  }

  // View/Edit note
  viewNote(note: Note): void {
    this.noteTitle.set(note.title);
    this.noteContent.set(note.content);
    this.isEditMode.set(true);
    this.selectedNoteOid.set(note.oid);
    this.showNoteForm.set(true);
  }

  // Cancel edit
  cancelEdit(): void {
    this.resetNoteForm();
  }

  // Save note (create or update)
  saveNote(): void {
    const title = this.noteTitle();
    const content = this.noteContent();

    if (!title.trim()) {
      this._notification.warning('Warning', 'Please enter a title');
      return;
    }

    this.isSubmitting.set(true);
    const noteData = { title, content };

    if (this.isEditMode() && this.selectedNoteOid()) {
      // Update existing note
      this.noteService
        .updateNote({ oid: this.selectedNoteOid()!, ...noteData })
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            if (response.body?.code === 200) {
              this.resetNoteForm();
              this.noteService.loadNotes();
            }
          },
          error: () => {
            this.isSubmitting.set(false);
            this._notification.error('Error', 'Failed to update note');
          },
        });
    } else {
      // Create new note
      this.noteService
        .createNote(noteData)
        .pipe(takeUntilDestroyed(this._destroyRef))
        .subscribe({
          next: (response) => {
            this.isSubmitting.set(false);
            if (response.body?.code === 200) {
              this.resetNoteForm();
              this.noteService.loadNotes();
            }
          },
          error: () => {
            this.isSubmitting.set(false);
            this._notification.error('Error', 'Failed to create note');
          },
        });
    }
  }

  // Delete note with confirmation
  deleteNote(noteOid: string, event: Event): void {
    event.stopPropagation();
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message:
          'Are you sure you want to delete this note? This action cannot be undone.',
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => {
        this.noteService
          .deleteNote(noteOid)
          .pipe(takeUntilDestroyed(this._destroyRef))
          .subscribe({
            next: (response) => {
              if (response.body?.code === 200) {
                this.noteService.loadNotes();
                if (this.selectedNoteOid() === noteOid) {
                  this.resetNoteForm();
                }
              }
            },
            error: () => {
              this._notification.error('Error', 'Failed to delete note');
            },
          });
      },
    });
  }
}

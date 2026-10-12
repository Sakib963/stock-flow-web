import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCamera, lucideCheck, lucideRefreshCw, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Profile } from '@app/core/models/profile.model';
import { SessionService } from '@app/core/services/session/session.service';
import { ProfileService } from '@app/layout/services/profile/profile.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;
const MOBILE = /^\+?[0-9][0-9 -]{5,19}$/;

/**
 * The person's own name, mobile, designation and photo. Email and role are shown but not editable:
 * they are what the person signs in with and may do, which only an admin changes. Saving does not ask
 * first: these are the person's own details, changed back the same way.
 */
@Component({
    selector: 'profile-dialog',
    imports: [ReactiveFormsModule, NgIcon, NzAvatarModule, NzButtonModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, NzUploadModule, TranslatePipe, DigitsPipe],
    providers: [provideIcons({ lucideCamera, lucideCheck, lucideRefreshCw, lucideTrash2, lucideX })],
    templateUrl: './profile-dialog.component.html',
    styleUrl: './profile-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDialogComponent {
    private readonly _profiles = inject(ProfileService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    readonly session = inject(SessionService);

    readonly close = output<void>();
    readonly accept = ACCEPT;

    readonly profile = signal<Profile | null>(null);
    readonly failed = signal(false);
    readonly photo = signal<string | null>(null);
    /** Null while idle, the percentage sent while a photo uploads. */
    readonly uploading = signal<number | null>(null);
    readonly photoError = signal<string | null>(null);
    readonly saving = this._profiles.saving;

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(128)]],
        mobile_number: ['', [Validators.required, Validators.pattern(MOBILE)]],
        designation: ['', [Validators.maxLength(128)]],
    });

    private _upload?: Subscription;

    constructor() {
        inject(DestroyRef).onDestroy(() => this._upload?.unsubscribe());
        this.load();
    }

    load(): void {
        this.failed.set(false);
        this._profiles.profile().subscribe({
            next: (profile) => {
                this.profile.set(profile);
                this.photo.set(profile.photo);
                this.form.setValue({ name: profile.name ?? '', mobile_number: profile.mobile_number ?? '', designation: profile.designation ?? '' });
            },
            error: () => this.failed.set(true),
        });
    }

    /** nz-upload asks before it uploads; answering false keeps the upload ours, so it is signed and its progress is real. */
    readonly pick = (file: NzUploadFile): boolean => {
        const picked = file as unknown as File;
        this.photoError.set(null);
        if (!ACCEPT.split(',').includes(picked.type)) {
            this.photoError.set('shell.profile.photoWrongType');
            return false;
        }
        if (picked.size > MAX_BYTES) {
            this.photoError.set('shell.profile.photoTooLarge');
            return false;
        }
        this._upload?.unsubscribe();
        this.uploading.set(0);
        this._upload = this._profiles.uploadPhoto(picked).subscribe({
            next: (event) => {
                if (event.state === 'uploading') return this.uploading.set(event.progress);
                this.uploading.set(null);
                this.photo.set(event.url);
            },
            error: (error: unknown) => {
                this.uploading.set(null);
                this.photoError.set(error instanceof HttpErrorResponse && error.status === 503 ? 'shell.profile.photoNotSetUp' : `shell.profile.photoFailed.${failureOf(error)}`);
            },
        });
        return false;
    };

    removePhoto(): void {
        this._upload?.unsubscribe();
        this.uploading.set(null);
        this.photoError.set(null);
        this.photo.set(null);
    }

    save(): void {
        if (this.form.invalid) return revealErrors(this.form);
        if (this.uploading() !== null || this.saving()) return;
        const { name, mobile_number, designation } = this.form.getRawValue();
        this._profiles.save({ name: name.trim(), mobile_number: mobile_number.trim(), designation: designation.trim() || null, photo: this.photo() }).subscribe({
            next: (saved) => {
                this.session.updateUser({ name: saved.name, mobile_number: saved.mobile_number, designation: saved.designation, photo: saved.photo });
                this._message.success(this._translate.instant('shell.profile.saved'));
                this.close.emit();
            },
            error: (error: unknown) => this._message.error(this._translate.instant(failureKey(error, 'shell.profile.saveFailed'))),
        });
    }
}

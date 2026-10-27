import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImagePlus, lucideRotateCw, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { BusinessSettings } from '@app/core/models/business-settings.model';
import { PageBack } from '@app/core/models/page-header.model';
import { RequestFailure } from '@app/core/models/api.model';
import { SessionService } from '@app/core/services/session/session.service';
import { SETTINGS_PAGES } from '@app/modules/settings/constants/settings-routes';
import { BusinessSettingsService } from '@app/modules/settings/services/business-settings.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Editing the business details every receipt, invoice, label and the tracking page carry. Saving
 * reaches every open tab: the server bumps the config version and each tab reloads on its next request.
 */
@Component({
    selector: 'business-settings-edit',
    imports: [ReactiveFormsModule, NgIcon, NzButtonModule, NzFormModule, NzInputModule, NzSkeletonModule, NzUploadModule, TranslatePipe, DigitsPipe, FormPageComponent, PageHeaderComponent],
    providers: [provideIcons({ lucideImagePlus, lucideRotateCw, lucideTrash2 })],
    templateUrl: './business-settings-edit.component.html',
    styleUrl: './business-settings-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSettingsEditComponent {
    private readonly _settings = inject(BusinessSettingsService);
    private readonly _session = inject(SessionService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _router = inject(Router);

    readonly back: PageBack = { route: SETTINGS_PAGES.view, label: 'settings.business.backToSettings' };
    readonly accept = ACCEPT;
    readonly formId = 'business-settings-form';

    readonly loaded = signal<BusinessSettings | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly logo = signal<string | null>(null);
    /** Null while idle, the percentage sent while a logo uploads. */
    readonly uploading = signal<number | null>(null);
    readonly logoError = signal<string | null>(null);
    readonly saving = this._settings.saving;

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(128)]],
        phone_primary: ['', [Validators.maxLength(32)]],
        phone_secondary: ['', [Validators.maxLength(32)]],
        address: ['', [Validators.maxLength(500)]],
        website: ['', [Validators.maxLength(255)]],
        facebook_url: ['', [Validators.maxLength(255)]],
        instagram_url: ['', [Validators.maxLength(255)]],
    });

    private _upload?: Subscription;

    constructor() {
        inject(DestroyRef).onDestroy(() => this._upload?.unsubscribe());
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._settings.settings().subscribe({
            next: (settings) => {
                this.loaded.set(settings);
                this.logo.set(settings.logo_url);
                this.form.setValue({
                    name: settings.name ?? '',
                    phone_primary: settings.phone_primary ?? '',
                    phone_secondary: settings.phone_secondary ?? '',
                    address: settings.address ?? '',
                    website: settings.website ?? '',
                    facebook_url: settings.facebook_url ?? '',
                    instagram_url: settings.instagram_url ?? '',
                });
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    /** nz-upload asks before it uploads; answering false keeps the upload ours, so it is signed and its progress is real. */
    readonly pick = (file: NzUploadFile): boolean => {
        const picked = file as unknown as File;
        this.logoError.set(null);
        if (!ACCEPT.split(',').includes(picked.type)) {
            this.logoError.set('settings.business.logoWrongType');
            return false;
        }
        if (picked.size > MAX_BYTES) {
            this.logoError.set('settings.business.logoTooLarge');
            return false;
        }
        this._upload?.unsubscribe();
        this.uploading.set(0);
        this._upload = this._settings.uploadLogo(picked).subscribe({
            next: (event) => {
                if (event.state === 'uploading') return this.uploading.set(event.progress);
                this.uploading.set(null);
                this.logo.set(event.url);
                this.form.markAsDirty();
            },
            error: (error: unknown) => {
                this.uploading.set(null);
                this.logoError.set(error instanceof HttpErrorResponse && error.status === 503 ? 'settings.business.logoNotSetUp' : `settings.business.logoFailed.${failureOf(error)}`);
            },
        });
        return false;
    };

    removeLogo(): void {
        this._upload?.unsubscribe();
        this.uploading.set(null);
        this.logoError.set(null);
        this.logo.set(null);
        this.form.markAsDirty();
    }

    /** What every printed page carries changes for everyone, so it asks first. */
    save(): void {
        if (this.form.invalid) return revealErrors(this.form);
        if (this.uploading() !== null || this.saving()) return;
        if (!this.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        confirmAction(this._modal, {
            title: this._translate.instant('settings.business.confirmTitle'),
            body: this._translate.instant('settings.business.confirmBody'),
            ok: this._translate.instant('settings.business.save'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => confirmed && this.send());
    }

    cancel(): void {
        void this._router.navigateByUrl(SETTINGS_PAGES.view);
    }

    private send(): void {
        const value = this.form.getRawValue();
        const text = (field: string) => field.trim() || null;
        this._settings
            .save({
                name: value.name.trim(),
                logo_url: this.logo(),
                address: text(value.address),
                phone_primary: text(value.phone_primary),
                phone_secondary: text(value.phone_secondary),
                website: text(value.website),
                facebook_url: text(value.facebook_url),
                instagram_url: text(value.instagram_url),
            }, this.loaded()?.version ?? '')
            .subscribe({
                next: () => {
                    this.form.markAsPristine();
                    this._message.success(this._translate.instant('settings.business.saved'));
                    // This tab shows the new name at once; every other tab follows on its next request.
                    const owner = this._session.loadedFor();
                    if (owner) void this._session.load(owner).catch(() => undefined);
                    void this._router.navigateByUrl(SETTINGS_PAGES.view);
                },
                error: (error: unknown) => {
                    const key = error instanceof HttpErrorResponse && error.status === 400 ? 'settings.business.invalid' : failureKey(error, 'settings.business.saveFailed');
                    this._message.error(this._translate.instant(key));
                },
            });
    }
}

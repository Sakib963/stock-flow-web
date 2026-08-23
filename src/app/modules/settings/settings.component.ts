import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { FileService } from '@app/core/services/file.service';
import { SettingsService } from '@app/core/services/settings.service';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { DEFAULT_TRACKER_TEMPLATE, TRACKER_TEMPLATES } from '@app/core/constants/tracker-templates';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

// Settings: the shop's editable business profile + delivery defaults. Saving pushes
// the new values to the DB and refreshes the app-wide SettingsService (which the 3
// order prints and delivery defaults read from). Tabs: Company Info, Branding,
// Tracking Page (which of the tracker's designs the public page uses) and Delivery.
@Component({
    selector: 'settings',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent implements OnInit {
    form!: FormGroup;
    loading = false;
    saving = false;
    uploadingLogo = false;
    uploadingInvoiceLogo = false;
    trackerTemplates = TRACKER_TEMPLATES;

    constructor(
        private _fb: FormBuilder,
        private _http: HttpService,
        private _fileService: FileService,
        private _settings: SettingsService,
        private _notify: NzNotificationService,
        private _modal: NzModalService,
        private _destroyRef: DestroyRef
    ) {}

    ngOnInit(): void {
        this.form = this.createForm();
        this.load();
    }

    createForm(): FormGroup {
        return this._fb.group({
            // Company Info
            name: [null, [Validators.required]],
            legal_name: [null],
            logo_url: [null],
            address: [null],
            phone_primary: [null],
            phone_secondary: [null],
            email: [null],
            website: [null],
            bin: [null],
            tin: [null],
            trade_license: [null],
            bank_details: [null],
            bkash_number: [null],
            nagad_number: [null],
            facebook_url: [null],
            instagram_url: [null],
            invoice_footer: [null],
            invoice_logo_url: [null],
            tracker_template: [DEFAULT_TRACKER_TEMPLATE],
            // Delivery Details
            default_delivery_charge: [0, [Validators.min(0)]],
            order_system: ['both', [Validators.required]],
        });
    }

    load(): void {
        this.loading = true;
        this._http
            .get(APIEndpoint.GET_SETTINGS)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.loading = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.data) this.patch(res.body.data);
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
    }

    private patch(d: any): void {
        this.form.patchValue({
            name: d.name,
            legal_name: d.legal_name,
            logo_url: d.logo_url,
            address: d.address,
            phone_primary: d.phone_primary,
            phone_secondary: d.phone_secondary,
            email: d.email,
            website: d.website,
            bin: d.bin,
            tin: d.tin,
            trade_license: d.trade_license,
            bank_details: d.bank_details,
            bkash_number: d.bkash_number,
            nagad_number: d.nagad_number,
            facebook_url: d.facebook_url,
            instagram_url: d.instagram_url,
            invoice_footer: d.invoice_footer,
            invoice_logo_url: d.invoice_logo_url,
            tracker_template: d.tracker_template || DEFAULT_TRACKER_TEMPLATE,
            default_delivery_charge: Number(d.default_delivery_charge ?? 0),
            order_system: d.order_system || 'both',
        });
    }

    onLogoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            this._notify.error('Error', 'File size exceeds 500 KB. Please upload a smaller logo.');
            return;
        }
        this.uploadingLogo = true;
        this._fileService.uploadImage(file).subscribe({
            next: (res: any) => {
                this.uploadingLogo = false;
                if (res?.secure_url) this.form.get('logo_url')?.setValue(res.secure_url);
                else this._notify.error('Error', 'Failed to upload logo');
            },
            error: () => {
                this.uploadingLogo = false;
                this._notify.error('Error', 'Failed to upload logo');
            },
        });
        input.value = '';
    }

    removeLogo(): void {
        this.form.get('logo_url')?.setValue(null);
    }

    onInvoiceLogoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            this._notify.error('Error', 'File size exceeds 500 KB. Please upload a smaller image.');
            return;
        }
        this.uploadingInvoiceLogo = true;
        this._fileService.uploadImage(file).subscribe({
            next: (res: any) => {
                this.uploadingInvoiceLogo = false;
                if (res?.secure_url) this.form.get('invoice_logo_url')?.setValue(res.secure_url);
                else this._notify.error('Error', 'Failed to upload image');
            },
            error: () => {
                this.uploadingInvoiceLogo = false;
                this._notify.error('Error', 'Failed to upload image');
            },
        });
        input.value = '';
    }

    removeInvoiceLogo(): void {
        this.form.get('invoice_logo_url')?.setValue(null);
    }

    // Tracking page design. Only the key is stored; the tracker owns the actual design.
    isTemplate(key: string): boolean {
        return (this.form.get('tracker_template')?.value || DEFAULT_TRACKER_TEMPLATE) === key;
    }

    selectTemplate(key: string): void {
        this.form.get('tracker_template')?.setValue(key);
    }

    // Confirm before saving (settings apply across the app and the order prints).
    promptSave(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            this._notify.error('Error', 'Business name is required.');
            return;
        }
        this._modal.create({
            nzContent: ConfirmationModalComponent,
            nzData: { message: 'Save these settings? They apply across the app and on order prints.' },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.save(),
        });
    }

    save(): void {
        this.saving = true;
        this._http
            .post(APIEndpoint.UPDATE_SETTINGS, this.form.getRawValue())
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => (this.saving = false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notify.success('Saved', 'Settings updated');
                        this._settings.refresh(res.body.data);
                    } else {
                        this._notify.error('Error!', res.body?.message);
                    }
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
    }
}

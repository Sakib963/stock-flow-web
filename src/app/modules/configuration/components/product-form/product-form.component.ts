import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { HttpService } from '@app/core/services/http.service';
import { FileService } from '@app/core/services/file.service';
import { ImagePreviewService } from '@app/core/services/image-preview.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { finalize } from 'rxjs';
import { DropdownList } from '@app/core/interfaces/dropdown';

@Component({
    selector: 'product-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
    templateUrl: './product-form.component.html',
    styleUrl: './product-form.component.scss',
})
export class ProductFormComponent implements OnInit {
    product = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _httpService = inject(HttpService);
    private readonly _fileService = inject(FileService);
    private readonly _imagePreviewService = inject(ImagePreviewService);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _destroyRef = inject(DestroyRef);

    subCategoryList: DropdownList = [];
    brandList: any[] = [];
    productNatureList: any[] = DROPDOWN_OPTIONS.PRODUCT_NATURE;
    unitTypeList: any[] = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;

    loadingStates = signal({
        subCategory: false,
        brand: false,
    });
    imgLoading = false;

    mode = computed(() => {
        return this.product() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this product?' : 'Are you sure you want to create this product?';
    });

    form = this._formBuilder.nonNullable.group({
        oid: [null],
        name: ['', [Validators.required]],
        sku: [''],
        sub_category_oid: ['', [Validators.required]],
        brand_oid: [''],
        unit_type: [''],
        product_nature: ['', [Validators.required]],
        restock_threshold: [0, [Validators.required, Validators.min(0)]],
        description: [''],
        photo: [''],
        status: ['Active', [Validators.required]],
    });

    ngOnInit(): void {
        this.loadBrandList();

        this.loadSubCategoryList();
        
        const product = this.product();
        if (product) {
            this._patchForm(product);
        }
    }

    private _patchForm(product: any): void {
        if (!product) return;

        this.form.patchValue(product);
    }

    loadSubCategoryList(): void {
        this.loadingStates.update((state) => ({ ...state, subCategory: true }));
        this._httpService
            .get(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.loadingStates.update((state) => ({ ...state, subCategory: false })))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        // Ensure groupLabel exists for ng-zorro grouping (handles both grouplabel and groupLabel from API)
                        this.subCategoryList = (res.body?.data || []).map((item: any) => ({
                            ...item,
                            groupLabel: item.groupLabel || item.grouplabel
                        }));
                    }
                },
                error: (err: any) => {
                    console.log(err);
                },
            });
    }

    loadBrandList(): void {
        this.loadingStates.update((state) => ({ ...state, brand: true }));
        this._httpService
            .get(APIEndpoint.GET_BRAND_LIST_FOR_DROPDOWN)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.loadingStates.update((state) => ({ ...state, brand: false })))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.brandList = res.body?.data || [];
                    }
                },
                error: (err: any) => {
                    console.log(err);
                },
            });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        const formValue = this.form.getRawValue();
        this.showConfirmationModal(formValue);
    }

    showConfirmationModal(payload: any): void {
        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: {
                message: this.confirmationMessage(),
            },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () => this.handleForm(payload),
        });
    }

    handleForm(payload: any): void {
        const mode = this.mode();
        if (mode === 'create') {
            this.actions.emit({ action: 'save', data: payload });
        } else {
            this.actions.emit({ action: 'update', data: payload });
        }
    }

    resetForm(): void {
        this.form.reset({
            oid: null,
            name: '',
            sku: '',
            sub_category_oid: '',
            brand_oid: '',
            unit_type: '',
            product_nature: '',
            restock_threshold: 0,
            description: '',
            photo: '',
            status: 'Active',
        });
        this.subCategoryList = [];
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        if (!control) return false;

        return control.hasValidator(Validators.required);
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (input.files && input.files[0]) {
            const file = input.files[0];
            const maxSizeInBytes = 500 * 1024; // 500 KB
            if (file.size > maxSizeInBytes) {
                this._notificationService.error('Error', 'File size exceeds 500 KB. Please upload a smaller file.');
                return;
            }

            this.imgLoading = true;
            this._fileService.uploadImage(file).subscribe({
                next: (res: any) => {
                    const imageUrl = res.secure_url;
                    this.form.controls['photo'].setValue(imageUrl);
                    this.imgLoading = false;
                },
                error: (err: any) => {
                    this._notificationService.error('Error', 'Failed to upload image');
                    console.error('Image upload error:', err);
                    this.imgLoading = false;
                },
            });
        }
    }

    removePhoto(): void {
        this.form.controls['photo'].setValue('');
    }

    previewPhoto(imageUrl: string): void {
        if (imageUrl) {
            this._imagePreviewService.previewImage(imageUrl, 'Product Photo Preview');
        }
    }
}

import { CommonModule, Location } from '@angular/common';
import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { DropdownList } from '@app/core/interfaces/dropdown';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

@Component({
    selector: 'sub-category-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
    templateUrl: './sub-category-form.component.html',
    styleUrl: './sub-category-form.component.scss',
})
export class SubCategoryFormComponent {
    category = input<any>(undefined);
    readonly actions = output<FormActions>();
    buttonLoading = input(false);

    categoryList: DropdownList = [];
    listLoading = signal(false);

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _httpService = inject(HttpService);
    private readonly _location = inject(Location);

    mode = computed(() => {
        return this.category() ? 'edit' : 'create';
    });

    confirmationMessage = computed(() => {
        return this.mode() === 'edit' ? 'Are you sure you want to update this sub-category?' : 'Are you sure you want to create this sub-category?';
    });

    form = this._formBuilder.nonNullable.group({
        oid: [null],
        category_oid: ['', [Validators.required]],
        name: ['', [Validators.required]],
        category_code: ['', [Validators.required]],
        description: [''],
        status: ['Active', [Validators.required]],
    });

    ngOnInit(): void {
        const category = this.category();
        if (category) {
            this._patchForm(category);
        }
        this.loadCategoryList();
    }

    private _patchForm(category: any): void {
        if (!category) return;

        this.form.patchValue(category);
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
        this.form.reset();
    }

    navigateBack(): void {
        this._location.back();
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        if (!control) return false;

        return control.hasValidator(Validators.required);
    }

    loadCategoryList(): any {
      this.listLoading.set(true);
        this._httpService
            .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => this.listLoading.set(false))
            )
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) {
                        this.categoryList = [];
                        if (res.body?.data?.length) {
                            this.categoryList = res.body.data;
                        } else {
                            this.categoryList = [];
                        }
                    }
                },
                error: (err: any) => {
                    console.log(err);
                },
            });
    }
}

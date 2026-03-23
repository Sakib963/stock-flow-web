import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { FormActions } from '@app/core/interfaces/form-action';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'app-order-verification-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule, PrimaryButton, SecondaryButton],
    templateUrl: './order-verification-form.component.html',
    styleUrl: './order-verification-form.component.scss',
})
export class OrderVerificationFormComponent implements OnInit {
    purchaseDetails = input<any>(undefined);
    buttonLoading = input(false);
    readonly actions = output<FormActions>();

    private readonly _formBuilder = inject(FormBuilder);
    private readonly _modalService = inject(NzModalService);
    private readonly _destroyRef = inject(DestroyRef);

    form = this._formBuilder.nonNullable.group({
        oid: ['', [Validators.required]],
        products: this._formBuilder.array([]),
    });

    INTENDED_USE_OPTIONS = DROPDOWN_OPTIONS.INTENDED_USE_OPTIONS;

    ngOnInit(): void {
        const purchaseDetails = this.purchaseDetails();
        if (purchaseDetails) {
            this._patchForm(purchaseDetails);
        }
    }

    private _createProductGroup(product: any): FormGroup {
        const group = this._formBuilder.group({
            oid: [product.oid],
            product_oid: [product.product_oid],
            verified_quantity: [product.quantity, [Validators.required, Validators.min(0)]],
            verified_unit_price: [product.unit_price, [Validators.required, Validators.min(0)]],
            intended_use: [product.intended_use || null, [Validators.required]],
            selling_price: [product.selling_price || null],
            maximum_discount: [product.maximum_discount || null],
        });

        this._updateForSaleValidators(group, group.get('intended_use')?.value, false);

        group
            .get('intended_use')
            ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe((intendedUse) => {
                this._updateForSaleValidators(group, intendedUse, true);
            });

        return group;
    }

    private _patchForm(purchaseDetails: any): void {
        if (!purchaseDetails) return;

        this.form.patchValue({ oid: purchaseDetails.oid });
        this.products.clear();

        (purchaseDetails.products || []).forEach((product: any) => {
            this.products.push(this._createProductGroup(product));
        });
    }

    private _updateForSaleValidators(group: FormGroup, intendedUse: string, emitEvent: boolean): void {
        const sellingPriceCtrl = group.get('selling_price');
        const discountCtrl = group.get('maximum_discount');

        if (intendedUse === 'for_sale') {
            sellingPriceCtrl?.setValidators([Validators.required, Validators.min(0)]);
            discountCtrl?.setValidators([Validators.required, Validators.min(0), Validators.max(100), Validators.pattern(/^(\d{1,2}(\.\d+)?|100(\.0+)?)$/)]);
        } else {
            sellingPriceCtrl?.clearValidators();
            sellingPriceCtrl?.setValue(null, { emitEvent: false });
            discountCtrl?.clearValidators();
            discountCtrl?.setValue(null, { emitEvent: false });
        }

        sellingPriceCtrl?.updateValueAndValidity({ emitEvent });
        discountCtrl?.updateValueAndValidity({ emitEvent });
    }

    get products(): FormArray {
        return this.form.get('products') as FormArray;
    }

    get productsFormGroups(): FormGroup[] {
        return this.products.controls as FormGroup[];
    }

    onSubmit(): void {
        if (this.form.valid) {
            this._modalService.create({
                nzContent: ConfirmationModalComponent,
                nzData: { message: 'Do you want to verify this purchase order?' },
                nzFooter: null,
                nzClosable: false,
                nzOnOk: () => this.actions.emit({ action: 'save', data: this.form.getRawValue() }),
            });
        } else {
            markFormGroupTouched(this.form);
        }
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }
}

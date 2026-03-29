import { Component, DestroyRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { HttpService } from '@app/core/services/http.service';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { checkRequiredValidator, markFormGroupTouched } from '@app/core/constants/helper';

export interface ModalData {
    formData: any;
    batch_code: string;
    cost_price: string;
}

@Component({
    selector: 'app-update-pricing-modal',
    imports: [CommonModule, ReactiveFormsModule, NgZorroCustomModule, PrimaryButton, SecondaryButton],
    templateUrl: './update-pricing-modal.component.html',
    styleUrls: ['./update-pricing-modal.component.scss'],
})
export class UpdatePricingModalComponent {
    form!: FormGroup;
    loading: boolean = false;

    constructor(
        @Inject(NZ_MODAL_DATA) public modalData: ModalData,
        private _modalRef: NzModalRef,
        private _fb: FormBuilder,
        private _modal: NzModalService,
        private _httpService: HttpService,
        private _destroyRef: DestroyRef
    ) {}

    ngOnInit(): void {
        this.form = this.createForm();

        if (this.modalData) {
            this.form.patchValue(this.modalData.formData);
        } else {
            this.closeModal();
        }
    }

    createForm(): FormGroup {
        return this._fb.group({
            oid: [null],
            selling_price: [null, [Validators.required, Validators.min(0)]],
            maximum_discount: [null, [Validators.required, Validators.min(0)]],
            ad_run_cost: [null, [Validators.min(0)]],
            packaging_cost: [null, [Validators.min(0)]],
            gift_cost: [null, [Validators.min(0)]],
            content_creation_cost: [null, [Validators.min(0)]],
            influencer_cost: [null, [Validators.min(0)]],
            cost_remarks: [null, [Validators.maxLength(500)]],
        });
    }

    handleForm(): void {
        if (this.form.valid) {
            if (this.hasNegativeUnitProfit()) {
                this._modal.confirm({
                    nzTitle: 'Negative Unit Profit Detected',
                    nzContent: 'Current inputs indicate negative unit profit. Do you still want to continue with this pricing update?',
                    nzOkText: 'Continue',
                    nzCancelText: 'Review Values',
                    nzOnOk: () => this._modalRef.destroy(this.form.value),
                });
                return;
            }

            this._modalRef.destroy(this.form.value);
        } else {
            markFormGroupTouched(this.form);
        }
    }

    closeModal(): void {
        this._modalRef.destroy();
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    getPerUnitPriceText(): string {
        const costPrice = this.modalData?.cost_price;
        const batchCode = this.modalData?.batch_code;

        if (costPrice && batchCode) {
            return `Per unit cost for batch <strong>${batchCode}</strong> is <strong>${costPrice} BDT</strong>.`;
        } else {
            return 'Cost information for this batch is currently unavailable.';
        }
    }

    getMaximumDiscountText(): string {
        const sellingPrice = this.form.get('selling_price')?.value;
        const maxDiscount = this.form.get('maximum_discount')?.value;

        if (sellingPrice && maxDiscount) {
            const discountedPrice = sellingPrice - maxDiscount;
            return `Maximum discount: ${maxDiscount} ৳ – Price after discount: ${discountedPrice} ৳`;
        }

        return 'Enter Selling Price and Maximum Discount to see the calculated price.';
    }

    getTooltipText(field: string): string {
        const tooltipMap: Record<string, string> = {
            selling_price: 'Required. Selling price used for revenue and profit calculations.',
            maximum_discount: 'Required in BDT. This caps discount at sale time.',
            ad_run_cost: 'Optional per-unit ad spend allocation.',
            packaging_cost: 'Optional per-unit packaging cost.',
            gift_cost: 'Optional per-unit gift or promo item cost.',
            content_creation_cost: 'Optional per-unit content production allocation.',
            influencer_cost: 'Optional per-unit influencer marketing allocation.',
            cost_remarks: 'Optional notes for budget intent, decisions, or campaign context.',
        };

        return tooltipMap[field] || '';
    }

    getTotalExtraCostPerUnit(): number {
        const adRunCost = Number(this.form.get('ad_run_cost')?.value || 0);
        const packagingCost = Number(this.form.get('packaging_cost')?.value || 0);
        const giftCost = Number(this.form.get('gift_cost')?.value || 0);
        const contentCreationCost = Number(this.form.get('content_creation_cost')?.value || 0);
        const influencerCost = Number(this.form.get('influencer_cost')?.value || 0);

        return adRunCost + packagingCost + giftCost + contentCreationCost + influencerCost;
    }

    getUnitProfit(): number {
        const sellingPrice = Number(this.form.get('selling_price')?.value || 0);
        const costPrice = Number(this.modalData?.cost_price || 0);
        return sellingPrice - costPrice - this.getTotalExtraCostPerUnit();
    }

    hasNegativeUnitProfit(): boolean {
        return this.getUnitProfit() < 0;
    }

    getUnitProfitHintText(): string {
        const unitProfit = this.getUnitProfit();
        const extraCost = this.getTotalExtraCostPerUnit();
        return `Unit Profit = Selling Price - Purchase Cost - Extra Costs = ${unitProfit} BDT (extra costs: ${extraCost} BDT)`;
    }
}

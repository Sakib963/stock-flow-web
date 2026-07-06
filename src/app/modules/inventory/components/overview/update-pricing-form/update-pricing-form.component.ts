import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NZ_DRAWER_DATA, NzDrawerRef } from 'ng-zorro-antd/drawer';
import { NzModalService } from 'ng-zorro-antd/modal';
import { checkRequiredValidator, markFormGroupTouched } from '@app/core/constants/helper';

export interface UpdatePricingDrawerData {
    formData: {
        oid: string;
        selling_price: number | null;
        maximum_discount: number | null;
        ad_run_cost: number | null;
        packaging_cost: number | null;
        gift_cost: number | null;
        content_creation_cost: number | null;
        influencer_cost: number | null;
        cost_remarks: string | null;
    };
    cost_price: number;
    batch_code: string;
}

@Component({
    selector: 'inventory-update-pricing-form',
    imports: [CommonModule, ReactiveFormsModule, NgZorroCustomModule],
    templateUrl: './update-pricing-form.component.html',
    styleUrl: './update-pricing-form.component.scss',
})
export class UpdatePricingFormComponent implements OnInit {
    form!: FormGroup;

    constructor(
        @Inject(NZ_DRAWER_DATA) public drawerData: UpdatePricingDrawerData,
        private _drawerRef: NzDrawerRef,
        private _fb: FormBuilder,
        private _modal: NzModalService
    ) {}

    ngOnInit(): void {
        this.form = this._fb.group({
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

        if (this.drawerData?.formData) {
            this.form.patchValue(this.drawerData.formData);
        } else {
            this.closeDrawer();
        }
    }

    handleSubmit(): void {
        if (this.form.invalid) {
            markFormGroupTouched(this.form);
            return;
        }

        if (this.hasNegativeUnitProfit()) {
            this._modal.confirm({
                nzTitle: 'Negative Unit Profit Detected',
                nzContent: 'Current inputs indicate a negative unit profit. Do you still want to continue?',
                nzOkText: 'Continue',
                nzCancelText: 'Review Values',
                nzOnOk: () => this._drawerRef.close(this.form.value),
            });
            return;
        }

        this._drawerRef.close(this.form.value);
    }

    closeDrawer(): void {
        this._drawerRef.close();
    }

    hasRequiredValidator(controlName: string): boolean {
        const control = this.form.get(controlName);
        return control ? checkRequiredValidator(control) : false;
    }

    getPerUnitPriceText(): string {
        const { cost_price, batch_code } = this.drawerData;
        if (cost_price && batch_code) {
            return `Per unit cost for batch <strong>${batch_code}</strong> is <strong>${cost_price} BDT</strong>.`;
        }
        return 'Cost information for this batch is currently unavailable.';
    }

    getMaximumDiscountText(): string {
        const sellingPrice = Number(this.form.get('selling_price')?.value || 0);
        const maxDiscount = Number(this.form.get('maximum_discount')?.value || 0);
        if (sellingPrice && maxDiscount) {
            return `Maximum discount: ${maxDiscount} ৳. Price after max discount: ${sellingPrice - maxDiscount} ৳`;
        }
        return 'Enter Selling Price and Maximum Discount to see the calculated price.';
    }

    getTotalExtraCostPerUnit(): number {
        return (
            Number(this.form.get('ad_run_cost')?.value || 0) +
            Number(this.form.get('packaging_cost')?.value || 0) +
            Number(this.form.get('gift_cost')?.value || 0) +
            Number(this.form.get('content_creation_cost')?.value || 0) +
            Number(this.form.get('influencer_cost')?.value || 0)
        );
    }

    getUnitProfit(): number {
        const sellingPrice = Number(this.form.get('selling_price')?.value || 0);
        return sellingPrice - Number(this.drawerData?.cost_price || 0) - this.getTotalExtraCostPerUnit();
    }

    hasNegativeUnitProfit(): boolean {
        return this.getUnitProfit() < 0;
    }

    getUnitProfitHintText(): string {
        const unitProfit = this.getUnitProfit();
        const extraCost = this.getTotalExtraCostPerUnit();
        return `Unit Profit = Selling Price - Purchase Cost - Extra Costs = ${unitProfit} BDT (extra costs: ${extraCost} BDT)`;
    }

    getTooltipText(field: string): string {
        const tooltips: Record<string, string> = {
            selling_price: 'Required. Selling price used for revenue and profit calculations.',
            maximum_discount: 'Required in BDT. This caps discount at sale time.',
            ad_run_cost: 'Optional per-unit ad spend allocation.',
            packaging_cost: 'Optional per-unit packaging cost.',
            gift_cost: 'Optional per-unit gift or promo item cost.',
            content_creation_cost: 'Optional per-unit content production allocation.',
            influencer_cost: 'Optional per-unit influencer marketing allocation.',
            cost_remarks: 'Optional notes for budget intent or campaign context.',
        };
        return tooltips[field] || '';
    }
}

import { Component, DestroyRef, inject, input, OnInit, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { checkRequiredValidator, markFormGroupTouched } from '@app/core/constants/helper';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { FormActions } from '@app/core/interfaces/form-action';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
    selector: 'app-order-verification-form',
    imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
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
    private readonly _notificationService = inject(NzNotificationService);

    form = this._formBuilder.nonNullable.group({
        oid: ['', [Validators.required]],
        products: this._formBuilder.array([]),
    });

    INTENDED_USE_OPTIONS = DROPDOWN_OPTIONS.INTENDED_USE_OPTIONS;

    activeProductIndex: number | null = null;
    private _draftVerifiedProductKeys = new Set<string>();
    private readonly _verificationDraftStoragePrefix = 'purchase-verification-draft';

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
            ad_run_cost: [product.ad_run_cost || null, [Validators.min(0)]],
            packaging_cost: [product.packaging_cost || null, [Validators.min(0)]],
            gift_cost: [product.gift_cost || null, [Validators.min(0)]],
            content_creation_cost: [product.content_creation_cost || null, [Validators.min(0)]],
            influencer_cost: [product.influencer_cost || null, [Validators.min(0)]],
            cost_remarks: [product.cost_remarks || null, [Validators.maxLength(500)]],
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
        this._draftVerifiedProductKeys.clear();

        (purchaseDetails.products || []).forEach((product: any) => {
            this.products.push(this._createProductGroup(product));
        });

        this._restoreDraftState();
    }

    private _getDraftStorageKey(): string | null {
        const purchaseOid = this.form.get('oid')?.value || this.purchaseDetails()?.oid;
        if (!purchaseOid) {
            return null;
        }
        return `${this._verificationDraftStoragePrefix}::${purchaseOid}`;
    }

    private _persistDraftState(): void {
        if (typeof window === 'undefined') {
            return;
        }

        const storageKey = this._getDraftStorageKey();
        if (!storageKey) {
            return;
        }

        const snapshot = {
            products: this.productsFormGroups.map((group, index) => ({
                key: this.getProductKey(group, index),
                value: group.getRawValue(),
            })),
            verifiedKeys: Array.from(this._draftVerifiedProductKeys),
            savedOn: Date.now(),
        };

        window.localStorage.setItem(storageKey, JSON.stringify(snapshot));
    }

    private _restoreDraftState(): void {
        if (typeof window === 'undefined') {
            return;
        }

        const storageKey = this._getDraftStorageKey();
        if (!storageKey) {
            return;
        }

        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
            return;
        }

        try {
            const snapshot = JSON.parse(raw);
            const draftRows = Array.isArray(snapshot?.products) ? snapshot.products : [];
            const draftByKey = new Map<string, any>();

            draftRows.forEach((row: any) => {
                if (row?.key) {
                    draftByKey.set(row.key, row.value || {});
                }
            });

            this.productsFormGroups.forEach((group, index) => {
                const key = this.getProductKey(group, index);
                const rowValue = draftByKey.get(key);
                if (rowValue) {
                    group.patchValue(rowValue);
                }
            });

            const currentKeys = new Set(this.productsFormGroups.map((group, index) => this.getProductKey(group, index)));
            const verifiedKeys = Array.isArray(snapshot?.verifiedKeys) ? snapshot.verifiedKeys : [];
            this._draftVerifiedProductKeys = new Set(verifiedKeys.filter((key: string) => currentKeys.has(key)));
        } catch {
            window.localStorage.removeItem(storageKey);
            this._draftVerifiedProductKeys.clear();
        }
    }

    private _updateForSaleValidators(group: FormGroup, intendedUse: string, emitEvent: boolean): void {
        const sellingPriceCtrl = group.get('selling_price');
        const discountCtrl = group.get('maximum_discount');
        const adRunCostCtrl = group.get('ad_run_cost');
        const packagingCostCtrl = group.get('packaging_cost');
        const giftCostCtrl = group.get('gift_cost');
        const contentCreationCostCtrl = group.get('content_creation_cost');
        const influencerCostCtrl = group.get('influencer_cost');
        const costRemarksCtrl = group.get('cost_remarks');

        if (intendedUse === 'for_sale') {
            sellingPriceCtrl?.setValidators([Validators.required, Validators.min(0)]);
            discountCtrl?.setValidators([Validators.required, Validators.min(0)]);
            adRunCostCtrl?.setValidators([Validators.min(0)]);
            packagingCostCtrl?.setValidators([Validators.min(0)]);
            giftCostCtrl?.setValidators([Validators.min(0)]);
            contentCreationCostCtrl?.setValidators([Validators.min(0)]);
            influencerCostCtrl?.setValidators([Validators.min(0)]);
        } else {
            sellingPriceCtrl?.clearValidators();
            sellingPriceCtrl?.setValue(null, { emitEvent: false });
            discountCtrl?.clearValidators();
            discountCtrl?.setValue(null, { emitEvent: false });
            adRunCostCtrl?.clearValidators();
            adRunCostCtrl?.setValue(null, { emitEvent: false });
            packagingCostCtrl?.clearValidators();
            packagingCostCtrl?.setValue(null, { emitEvent: false });
            giftCostCtrl?.clearValidators();
            giftCostCtrl?.setValue(null, { emitEvent: false });
            contentCreationCostCtrl?.clearValidators();
            contentCreationCostCtrl?.setValue(null, { emitEvent: false });
            influencerCostCtrl?.clearValidators();
            influencerCostCtrl?.setValue(null, { emitEvent: false });
            costRemarksCtrl?.setValue(null, { emitEvent: false });
        }

        sellingPriceCtrl?.updateValueAndValidity({ emitEvent });
        discountCtrl?.updateValueAndValidity({ emitEvent });
        adRunCostCtrl?.updateValueAndValidity({ emitEvent });
        packagingCostCtrl?.updateValueAndValidity({ emitEvent });
        giftCostCtrl?.updateValueAndValidity({ emitEvent });
        contentCreationCostCtrl?.updateValueAndValidity({ emitEvent });
        influencerCostCtrl?.updateValueAndValidity({ emitEvent });
        costRemarksCtrl?.updateValueAndValidity({ emitEvent });
    }

    getTotalExtraCostPerUnit(group: FormGroup): number {
        const adRunCost = Number(group.get('ad_run_cost')?.value || 0);
        const packagingCost = Number(group.get('packaging_cost')?.value || 0);
        const giftCost = Number(group.get('gift_cost')?.value || 0);
        const contentCreationCost = Number(group.get('content_creation_cost')?.value || 0);
        const influencerCost = Number(group.get('influencer_cost')?.value || 0);

        return adRunCost + packagingCost + giftCost + contentCreationCost + influencerCost;
    }

    getUnitProfit(group: FormGroup): number {
        if (group.get('intended_use')?.value !== 'for_sale') {
            return 0;
        }

        const sellingPrice = Number(group.get('selling_price')?.value || 0);
        const verifiedUnitPrice = Number(group.get('verified_unit_price')?.value || 0);
        return sellingPrice - verifiedUnitPrice - this.getTotalExtraCostPerUnit(group);
    }

    get products(): FormArray {
        return this.form.get('products') as FormArray;
    }

    get productsFormGroups(): FormGroup[] {
        return this.products.controls as FormGroup[];
    }

    get activeProductGroup(): FormGroup | null {
        if (this.activeProductIndex === null) {
            return null;
        }
        return this.products.at(this.activeProductIndex) as FormGroup;
    }

    get activeProductName(): string {
        if (this.activeProductIndex === null) {
            return '';
        }
        return this.purchaseDetails()?.products?.[this.activeProductIndex]?.product_name || `Product #${this.activeProductIndex + 1}`;
    }

    openVerification(index: number): void {
        this.activeProductIndex = index;
    }

    closeVerificationPanel(): void {
        this.activeProductIndex = null;
    }

    saveProductVerification(): void {
        if (this.activeProductIndex === null) {
            return;
        }

        const group = this.activeProductGroup;
        if (!group) {
            return;
        }

        if (group.invalid) {
            markFormGroupTouched(group);
            this._notificationService.warning('Verification', 'Please complete required fields before marking this item as verified.');
            return;
        }

        this._draftVerifiedProductKeys.add(this.getProductKey(group, this.activeProductIndex));
        this._persistDraftState();
        // No database save happens here - this is local draft state only
        // Notification removed to avoid misconception that data was saved to database
        this.closeVerificationPanel();
    }

    getVerificationProgress(): { completed: number; total: number } {
        return {
            completed: this._draftVerifiedProductKeys.size,
            total: this.productsFormGroups.length,
        };
    }

    isDraftVerified(index: number): boolean {
        const group = this.products.at(index) as FormGroup;
        return this._draftVerifiedProductKeys.has(this.getProductKey(group, index));
    }

    private getProductKey(group: FormGroup, index: number): string {
        const purchaseOid = this.form.get('oid')?.value || this.purchaseDetails()?.oid || 'unknown_purchase';
        const detailsOid = group.get('oid')?.value || 'no_details_oid';
        const productOid = group.get('product_oid')?.value || 'no_product_oid';
        return `${purchaseOid}::${detailsOid}::${productOid}::${index}`;
    }

    onSubmit(): void {
        if (!this.form.valid) {
            markFormGroupTouched(this.form);
            return;
        }

        if (this._draftVerifiedProductKeys.size < this.productsFormGroups.length) {
            const progress = this.getVerificationProgress();
            this._notificationService.warning('Verification Incomplete', `Please verify all items before submitting. Current progress: ${progress.completed} of ${progress.total} items marked as verified.`);
            return;
        }

        this._modalService.create({
            nzContent: ConfirmationModalComponent,
            nzData: {
                message: 'This will verify the entire purchase order and create inventory entries. Do you want to proceed?',
            },
            nzFooter: null,
            nzClosable: false,
            nzOnOk: () =>
                this.actions.emit({
                    action: 'save',
                    data: {
                        ...this.form.getRawValue(),
                        draftStorageKey: this._getDraftStorageKey(),
                    },
                }),
        });
    }

    clearDraftState(): void {
        this._modalService.confirm({
            nzTitle: 'Clear Verification Draft',
            nzContent: 'This will remove all locally saved verification inputs for this purchase order and reset the form to current loaded values. Continue?',
            nzOkText: 'Clear Draft',
            nzCancelText: 'Keep Draft',
            nzOnOk: () => {
                const storageKey = this._getDraftStorageKey();
                if (storageKey && typeof window !== 'undefined') {
                    window.localStorage.removeItem(storageKey);
                }

                this._draftVerifiedProductKeys.clear();
                this.activeProductIndex = null;

                const purchaseDetails = this.purchaseDetails();
                if (purchaseDetails) {
                    this._patchForm(purchaseDetails);
                }

                this._notificationService.success('Verification Draft', 'Local draft has been cleared.');
            },
        });
    }

    onCancel(): void {
        this.actions.emit({ action: 'cancel' });
    }

    hasRequiredValidator(control: any): boolean {
        return !!control && checkRequiredValidator(control);
    }
}

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { DangerButton } from '@app/shared/components/buttons/danger-button/danger-button.component';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';

@Component({
  selector: 'view-invoice',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NgZorroCustomModule,
    SecondaryButton,
    DangerButton,
    ReactiveFormsModule,
    PrimaryButton,
  ],
  templateUrl: './view-invoice.component.html',
  styleUrls: ['./view-invoice.component.scss'],
})
export class ViewInvoiceComponent implements OnInit {
  @Input() invoiceDetails: any;
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  isDisplayReturnForm: boolean = false;
  form!: FormGroup;
  soldProducts: any[] = [];
  selectedProductIds: Set<number> = new Set();

  returnReasons: any[] = [];

  constructor(private _fb: FormBuilder, private _modal: NzModalService) {}

  ngOnInit(): void {
    this.soldProducts = this.invoiceDetails.products || [];
  }

  goBack() {
    this.actionEmitter.emit({ action: 'back' });
  }

  getPaymentMethod(paymentMethod: string): string {
    switch (paymentMethod) {
      case 'cash':
        return 'sales.quick_sale.payment_info.payment_method.options.cash';
      case 'bank_transfer':
        return 'sales.quick_sale.payment_info.payment_method.options.bkash';
      default:
        return '-';
    }
  }

  getPaymentStatus(paymentStatus: string): string {
    switch (paymentStatus) {
      case 'unpaid':
        return 'sales.quick_sale.payment_info.payment_status.options.unpaid';
      case 'partially_paid':
        return 'sales.quick_sale.payment_info.payment_status.options.partially_paid';
      case 'paid':
        return 'sales.quick_sale.payment_info.payment_status.options.paid';
      default:
        return '-';
    }
  }

  displayReturnForm(): void {
    this.returnReasons = DROPDOWN_OPTIONS.PRODUCT_RETURN_REASONS;
    this.isDisplayReturnForm = true;
    this.form = this.createReturnForm();
    this.addProductRow();
  }

  hideReturnForm(): void {
    this.isDisplayReturnForm = false;
    this.form.reset();
    this.selectedProductIds.clear();
  }

  createReturnForm(): FormGroup {
    return this._fb.group({
      invoice_oid: [this.invoiceDetails.oid, Validators.required],
      invoice_no: [this.invoiceDetails.invoice_no, Validators.required],
      return_reason: [null],
      refund_amount: [null, [Validators.required, Validators.min(0)]],
      products: this._fb.array([]),
    });
  }

  get products(): FormArray {
    return this.form.get('products') as FormArray;
  }

  addProductRow(): void {
    const item = this._fb.group({
      product_oid: [null, Validators.required],
      inventory_oid: [null, Validators.required],
      return_quantity: [1, [Validators.required, Validators.min(1)]],
    });

    item.get('inventory_oid')!.valueChanges.subscribe((id: any) => {
      if (id) {
        this.selectedProductIds.add(id);
        const product = this.soldProducts.find((p) => p.inventory_oid === id);
        if (product) {
          item.patchValue({
            product_oid: product.product_oid,
          });
        }
      }
    });

    this.products.push(item);
  }

  removeProduct(index: number): void {
    const productId = this.products.at(index).value.inventory_oid;
    this.selectedProductIds.delete(productId);
    this.products.removeAt(index);
  }

  getAvailableProducts(): any[] {
    return this.soldProducts.filter(
      (p) => !this.selectedProductIds.has(p.inventory_oid)
    );
  }

  getMaxReturnQuantity(product: any): number {
    return (
      this.soldProducts.find((p) => p.inventory_oid === product.inventory_oid)
        ?.quantity || 0
    );
  }

  submitReturnForm(): void {
    if (this.form.valid) {
      this.displayConfirmationModal(this.form.value);
    } else {
      markFormGroupTouched(this.form);
    }
  }

  displayConfirmationModal(payload: any): void {
    let message = 'Do you want to submit this product return?';
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => {
        this.isDisplayReturnForm = false;
        this.actionEmitter.emit({ action: 'return', value: payload });
      },
    });
  }
}

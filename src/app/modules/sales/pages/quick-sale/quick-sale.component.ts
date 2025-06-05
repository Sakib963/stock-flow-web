import { Component, DestroyRef, Input, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { SelectProductComponent } from '../../components/select-product/select-product.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ActivatedRoute, Router } from '@angular/router';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { PrintService } from '@app/core/services/print.service';

@Component({
  selector: 'app-quick-sale',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    FormsModule,
    NzAutocompleteModule,
    ReactiveFormsModule,
    LoaderComponent,
    SelectProductComponent,
    TranslateModule,
  ],
  templateUrl: './quick-sale.component.html',
  styleUrls: ['./quick-sale.component.scss'],
})
export class QuickSaleComponent implements OnInit {
  @Input() invoiceId: string | null = null;
  form!: FormGroup;
  productList: any = [];
  selectedProducts: any[] = [];

  loading: boolean = false;
  isFilter: boolean = false;

  editingProduct: any = null;
  selectedProductIndex: number | null = null;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService,
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute,
    private _printService: PrintService
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();

    if (this.invoiceId) {
      this.loadInvoiceDetails();
    } else {
      this.loadInvoiceNumber();
    }

    // Conditional validator for payment_reference
    this.form.get('payment_method')?.valueChanges.subscribe((method) => {
      const refCtrl = this.form.get('payment_reference');
      if (method === 'bkash') {
        refCtrl?.setValidators([Validators.required]);
      } else {
        refCtrl?.clearValidators();
        refCtrl?.setValue(null);
      }
      refCtrl?.updateValueAndValidity();
    });
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      invoice_no: [null, [Validators.required]],
      customer_name: [null],
      customer_phone: [null],
      customer_address: [null],
      customer_email: [null],
      payment_method: ['cash', Validators.required],
      payment_reference: [null],
      payment_status: ['paid', Validators.required],
      notes: [null],
      status: ['Draft'],
      total_amount: [0, [Validators.required, Validators.min(0)]],
      products: this._fb.array([]),
    });
  }

  createProductGroup(product: any = null): FormGroup {
    return this._fb.group({
      inventory_oid: [product?.inventory_oid ?? null, Validators.required],
      product_name: [product?.product_name ?? null, Validators.required],
      product_oid: [product?.product_oid ?? null, Validators.required],
      quantity_available: [product?.quantity_available ?? null],
      quantity: [
        product?.quantity ?? 1,
        [Validators.required, Validators.min(1)],
      ],
      unit_price: [
        product?.unit_price ?? null,
        [Validators.required, Validators.min(0)],
      ],
      discount: [product?.discount ?? 0],
      total: [product?.total ?? 0, Validators.required],
    });
  }

  get products(): FormArray {
    return this.form.get('products') as FormArray;
  }

  get productRows(): any[] {
    return this.products.value;
  }

  addProduct(): void {
    this.products.push(this.createProductGroup());
  }

  removeProduct(index: number): void {
    this.products.removeAt(index);
  }

  generateInvoice(payload: any): void {
    // Call api CONFIRM_SALES_INVOICE
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CONFIRM_SALES_INVOICE, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this._notificationService.success(
              'Success',
              'Invoice generated successfully'
            );
            this._printService.printReceipt(payload).then(() => {
              if (this.invoiceId) {
                this.resetToPlainQuickSaleRoute();
              }
              this.resetForm();
            });
          } else {
            this._notificationService.error('Error', res.message);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  confirmSalesInvoice(): void {
    // get form raw value and set status to 'Purchased' and call displayConfirmationModal func,
    if (this.form.valid) {
      this.form.patchValue({ status: 'Purchased' });

      if (this.form.valid || this.products.length === 0) {
        const invoiceData = this.form.getRawValue();
        this.displayConfirmationModal(invoiceData, 'confirm');
      } else {
        this._notificationService.error(
          'Error',
          'Cannot confirm invoice due to invalid data'
        );
      }
    } else {
      markFormGroupTouched(this.form);
      this._notificationService.error(
        'Error',
        'Please fill all required fields before confirming the invoice.'
      );
    }
  }

  handleProductSelect(event: { action: string; value: any }): void {
    const { action, value } = event;

    switch (action) {
      case 'add':
        this.addProductToInvoice(value);
        break;

      case 'update':
        this.updateProductInInvoice(value);
        break;

      default:
        console.warn(`Unhandled action: ${action}`);
    }
  }

  addProductToInvoice(product: any): void {
    const exists = this.products.controls.some(
      (ctrl) => ctrl.get('inventory_oid')?.value === product.inventory_oid
    );
    if (!exists) {
      this.products.push(this.createProductGroup(product));
      this.updateTotalAmount();
    } else {
      this._notificationService.warning(
        'Product already exists',
        'This product is already added to the invoice.'
      );
    }
  }

  updateTotalAmount(): void {
    const total = this.products.controls.reduce((sum, productGroup) => {
      const itemTotal = Number(productGroup.get('total')?.value) || 0;
      return sum + itemTotal;
    }, 0);

    this.form.get('total_amount')?.setValue(total);
  }

  removeProductFromInvoice(index: any): void {
    if (index !== -1) {
      this.products.removeAt(index);
      this.updateTotalAmount();
    }
  }

  updateProductInInvoice(updatedProduct: any): void {
    const index = this.products.controls.findIndex(
      (item) =>
        item.get('inventory_oid')?.value === updatedProduct.inventory_oid
    );

    if (index !== -1) {
      const item = this.products.at(index);

      item.patchValue({
        quantity: updatedProduct.quantity,
        unit_price: updatedProduct.unit_price,
        discount: updatedProduct.discount,
        total: updatedProduct.total,
        quantity_available: updatedProduct.quantity_available,
        inventory_oid: updatedProduct.inventory_oid,
      });

      this.updateTotalAmount();
      this.selectedProductIndex = null; // Reset selected product index
      this.editingProduct = null; // Reset editing state
    } else {
      this.addProductToInvoice(updatedProduct);
      console.warn(
        `Product with OID ${updatedProduct.inventory_oid} not found for update.`
      );
    }
  }

  editProduct(index: number): void {
    const product = this.products.at(index).value;
    this.selectedProductIndex = index;
    this.editingProduct = product;
  }

  resetForm(): void {
    this.form.reset({
      oid: null,
      invoice_no: null,
      customer_name: null,
      customer_phone: null,
      customer_address: null,
      customer_email: null,
      payment_method: 'cash',
      payment_reference: null,
      payment_status: 'paid',
      notes: null,
      status: 'Draft',
      total_amount: 0,
      products: [],
    });
    this.products.clear();
    this.loadInvoiceNumber();
    this.updateTotalAmount();
  }

  saveAsDraft(): void {
    if (this.form) {
      this.form.patchValue({ status: 'Draft' });

      if (this.form.valid || this.products.length === 0) {
        const draftData = this.form.getRawValue();
        this.displayConfirmationModal(draftData, 'draft');
      } else {
        this._notificationService.error(
          'Error',
          'Cannot save draft due to invalid data'
        );
      }
    }
  }

  loadInvoiceNumber(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_INVOICE_NUMBER_FOR_SALE)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            if (res.body?.data && res.body?.data.invoice_no) {
              this.form.get('invoice_no')?.setValue(res.body.data.invoice_no);
            } else {
              this._notificationService.error(
                'Error',
                'Invoice number not found in response'
              );
            }
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  loadInvoiceDetails(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_INVOICE_DETAILS, { oid: this.invoiceId })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.patchInvoiceForm(res.body.data);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
          this.resetToPlainQuickSaleRoute();
        },
      });
  }

  patchInvoiceForm(data: any): void {
    this.form.patchValue({
      oid: data.oid,
      invoice_no: data.invoice_no,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      customer_email: data.customer_email,
      payment_method: data.payment_method,
      payment_reference: data.payment_reference,
      payment_status: data.payment_status,
      notes: data.notes,
      status: data.status,
      total_amount: data.total_amount,
    });
    // clear existing products
    this.products.clear();
    // add products to the form
    data.products.forEach((product: any) => {
      this.products.push(this.createProductGroup(product));
    });
    // update total amount
    this.updateTotalAmount();
  }

  resetToPlainQuickSaleRoute(): void {
    this._router.navigate(['../quick-sale'], {
      relativeTo: this._activatedRoute.parent,
      replaceUrl: true,
    });
  }

  saveInvoiceInDraft(payload: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.SAVE_INVOICE_IN_DRAFT, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            if (this.invoiceId) {
              this.resetToPlainQuickSaleRoute();
            } else {
              this.resetForm();
              this.products.clear();
              this.loadInvoiceNumber();
              this.updateTotalAmount();
              this._notificationService.success(
                'Success',
                'Invoice saved successfully'
              );
            }
          } else {
            this._notificationService.error('Error', res.message);
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  displayConfirmationModal(payload: any, type: string): void {
    let message;
    if (type === 'draft') {
      message = 'Do you want to save this invoice as a draft?';
    } else {
      message = 'Do you want to generate this invoice?';
    }
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () =>
        type === 'draft'
          ? this.saveInvoiceInDraft(payload)
          : this.generateInvoice(payload),
    });
  }
}

import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

@Component({
  selector: 'product-dispose-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './product-dispose-form.component.html',
  styleUrls: ['./product-dispose-form.component.scss'],
})
export class ProductDisposeFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  productList: any[] = [];
  disposeReasons: any[] = DROPDOWN_OPTIONS.DISPOSAL_REASONS;
  selectedProduct: any = null;

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
    this.loadProductList();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }
    this.form
      .get('product_oid')
      ?.valueChanges.pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((productOid: any) => {
        this.selectedProduct = this.productList.find(
          (item) => item.product_oid === productOid
        );
        console.log('Selected Product:', this.selectedProduct);
        if (this.selectedProduct) {
          this.form.patchValue({
            available_quantity: this.selectedProduct.quantity_available,
            inventory_oid: this.selectedProduct.inventory_oid,
          });
        }
      });
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      product_oid: [null, [Validators.required]],
      inventory_oid: [null, [Validators.required]],
      available_quantity: [{ value: 0, disabled: true }],
      dispose_quantity: [null, [Validators.required, Validators.min(1)]],
      reason: [null, [Validators.required]],
      notes: [null],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create this product disposal?';
    if (this.formData) {
      message = 'Are you sure you want to save this product disposal?';
    }
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () =>
        this.actionEmitter.emit({ action: 'submit', value: this.form.value }),
    });
  }

  handleForm(): void {
    if (this.form.valid) {
      this.handleConfirm();
    } else {
      markFormGroupTouched(this.form);
    }
  }

  goBack(): void {
    this.actionEmitter.emit({ action: 'back', value: this.form.value });
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  loadProductList(): void {
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_LIST_FOR_DISPOSE_DROPDOWN)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          this.productList = res?.body?.data;
          console.log('Product List:', this.productList);
        },
        error: (err: any) => {
          console.error(err);
        },
      });
  }
}

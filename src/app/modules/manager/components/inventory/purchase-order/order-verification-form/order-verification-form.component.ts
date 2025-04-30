import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';

@Component({
  selector: 'app-order-verification-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './order-verification-form.component.html',
  styleUrls: ['./order-verification-form.component.scss'],
})
export class OrderVerificationFormComponent implements OnInit {
  @Input() purchaseDetails: any;
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  form!: FormGroup;

  INTENDED_USE_OPTIONS = DROPDOWN_OPTIONS.INTENDED_USE_OPTIONS;

  constructor(private _fb: FormBuilder, private _modal: NzModalService) {}

  ngOnInit(): void {
    this.form = this._fb.group({
      oid: [this.purchaseDetails.oid, Validators.required],
      products: this._fb.array(
        this.purchaseDetails.products.map((product: any) => {
          const group = this._fb.group({
            oid: [product.oid],
            product_oid: [product.product_oid],
            verified_quantity: [
              product.quantity,
              [Validators.required, Validators.min(0)],
            ],
            verified_unit_price: [
              product.unit_price,
              [Validators.required, Validators.min(0)],
            ],
            intended_use: [null, Validators.required],
            selling_price: [null], // Conditional
            maximum_discount: [null], // Conditional
          });

          const intendedUseCtrl = group.get('intended_use');
          const sellingPriceCtrl = group.get('selling_price');
          const discountCtrl = group.get('maximum_discount');

          // Apply conditional validators when intended_use changes
          intendedUseCtrl?.valueChanges.subscribe((val) => {
            if (val === 'for_sale') {
              sellingPriceCtrl?.setValidators([
                Validators.required,
                Validators.min(0),
              ]);
              discountCtrl?.setValidators([
                Validators.required,
                Validators.min(0),
                Validators.max(100),
                Validators.pattern(/^(\d{1,2}(\.\d+)?|100(\.0+)?)$/),
              ]);
            } else {
              sellingPriceCtrl?.clearValidators();
              sellingPriceCtrl?.setValue(null);
              sellingPriceCtrl?.markAsTouched();
              discountCtrl?.clearValidators();
              discountCtrl?.setValue(null);
              discountCtrl?.markAsTouched();
            }

            sellingPriceCtrl?.updateValueAndValidity();
            discountCtrl?.updateValueAndValidity();
          });

          return group;
        })
      ),
    });
  }

  get products(): FormArray {
    return this.form.get('products') as FormArray;
  }

  get productsFormGroups(): FormGroup[] {
    return this.products.controls as FormGroup[];
  }

  handleForm(): void {
    if (this.form.valid) {
      this.handleConfirm();
    } else {
      markFormGroupTouched(this.form);
    }
  }

  handleConfirm(): void {
    let message = 'Do you want to verify this purchase?';
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

  goBack(): any {
    this.actionEmitter.emit({ action: 'cancel', value: null });
  }
}

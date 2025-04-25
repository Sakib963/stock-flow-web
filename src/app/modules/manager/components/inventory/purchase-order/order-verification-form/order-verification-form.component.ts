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

  constructor(private _fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this._fb.group({
      oid: [this.purchaseDetails.oid, Validators.required],
      products: this._fb.array(
        this.purchaseDetails.products.map((product: any) =>
          this._fb.group({
            oid: [product.oid],
            verified_quantity: [
              product.quantity,
              [Validators.required, Validators.min(0)],
            ],
            verified_unit_price: [
              product.unit_price,
              [Validators.required, Validators.min(0)],
            ],
          })
        )
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
    console.log(this.form.value);
  }

  goBack(): any {
    this.actionEmitter.emit({ action: 'cancel', value: null });
  }
}

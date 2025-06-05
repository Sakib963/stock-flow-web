import { Component, DestroyRef, Inject } from '@angular/core';
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
import { HttpService } from '@app/core/services/http.service';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import {
  checkRequiredValidator,
  markFormGroupTouched,
} from '@app/core/constants/helper';

export interface ModalData {
  formData: any;
  batch_code: string;
  cost_price: string;
}

@Component({
  selector: 'app-update-pricing-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgZorroCustomModule,
    PrimaryButton,
    SecondaryButton,
  ],
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
      selling_price: [null, [Validators.required]],
      maximum_discount: [null, [Validators.required]],
    });
  }

  handleForm(): void {
    if (this.form.valid) {
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
}

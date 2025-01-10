import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { markFormGroupTouched, checkRequiredValidator } from '@app/core/constants/helper';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';

@Component({
  selector: 'app-supplier-dealer-form',
  standalone: true,
  imports: [CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton],
  templateUrl: './supplier-dealer-form.component.html',
  styleUrls: ['./supplier-dealer-form.component.scss']
})
export class SupplierDealerFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  source_types: any[] = [];

  constructor(private _fb: FormBuilder, private _modal: NzModalService) {}

  ngOnInit(): void {
    this.form = this.createForm();

    this.source_types = DROPDOWN_OPTIONS.SOURCE_TYPES;

    if (this.formData) {
      this.form.patchValue(this.formData);
    }
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      name: [null, [Validators.required]],
      source_type: [null, [Validators.required]],
      contact_person: [null],
      phone_number: [null, [Validators.required]],
      email: [null, [Validators.required]],
      address: [null],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create an suppler/dealer?';
    if (this.formData) {
      message = 'Do you want to update this suppler/dealer?';
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
}

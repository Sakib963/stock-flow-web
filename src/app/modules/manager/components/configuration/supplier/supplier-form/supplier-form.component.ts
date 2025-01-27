import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
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
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-supplier-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './supplier-form.component.html',
  styleUrls: ['./supplier-form.component.scss'],
})
export class SupplierFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  source_types: any[] = [];

  constructor(private _fb: FormBuilder, private _modal: NzModalService) {}

  ngOnInit(): void {
    this.form = this.createForm();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      name: [null, [Validators.required]],
      contact_person: [null],
      phone_number: [null, [Validators.required]],
      email: [null, [Validators.required]],
      address: [null],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create a supplier?';
    if (this.formData) {
      message = 'Are you sure you want to save these updates?';
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

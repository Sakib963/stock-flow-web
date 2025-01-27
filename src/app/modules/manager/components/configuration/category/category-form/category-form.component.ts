import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';

@Component({
  selector: 'app-category-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './category-form.component.html',
  styleUrls: ['./category-form.component.scss'],
})
export class CategoryFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

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
      description: [null],
      category_code: [null, [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create a category?';
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

import { Component, EventEmitter, OnInit, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Validators,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { markFormGroupTouched } from '@app/core/constants/helper';

@Component({
    selector: 'password-change-form',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgZorroCustomModule,
        PrimaryButton,
        SecondaryButton,
    ],
    templateUrl: './password-change-form.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./password-change-form.component.scss']
})
export class PasswordChangeFormComponent implements OnInit {
  @Output() actionEmitter = new EventEmitter<any>();
  form!: FormGroup;

  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        current_password: [null, Validators.required],
        new_password: [
          null,
          [
            Validators.required,
            Validators.minLength(8),
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/
            ),
          ],
        ],
        confirm_password: [null, Validators.required],
      },
      { validators: this.passwordMatchValidator }
    );
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('new_password')!.value ===
      form.get('confirm_password')!.value
      ? null
      : { mismatch: true };
  }

  onSubmit() {
    if (this.form.valid) {
      this.actionEmitter.emit({ action: 'submit', value: this.form.value });
    } else {
      markFormGroupTouched(this.form);
    }
  }

  goBack() {
    this.actionEmitter.emit({ action: 'cancel' });
  }

  get newPasswordControl() {
    return this.form.get('new_password')!;
  }

  get confirmPasswordControl() {
    return this.form.get('confirm_password')!;
  }

  togglePassword(field: string) {
    if (field === 'current') {
      this.showCurrentPassword = !this.showCurrentPassword;
    } else if (field === 'new') {
      this.showNewPassword = !this.showNewPassword;
    } else if (field === 'confirm') {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }
}

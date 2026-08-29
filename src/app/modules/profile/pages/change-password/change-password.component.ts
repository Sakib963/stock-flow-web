import { Component, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OtpVerificationComponent } from '../../components/otp-verification/otp-verification.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PasswordChangeFormComponent } from '../../components/password-change-form/password-change-form.component';
import { HttpService } from '@app/core/services/http.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { AuthService } from '@app/modules/auth/services/auth.service';

@Component({
  selector: 'change-password',
  imports: [
    CommonModule,
    FormsModule,
    OtpVerificationComponent,
    NgZorroCustomModule,
    PasswordChangeFormComponent,
    LoaderComponent,
  ],
  templateUrl: './change-password.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./change-password.component.scss'],
})
export class ChangePasswordComponent {
  showOtp: boolean = false;
  currentStep: number = 0;
  loading: boolean = false;
  updatedPassword: string | null = null;

  otpOid: string | null = null;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _modal: NzModalService,
    private _authService: AuthService
  ) {}

  handleOtpVerified(event: any): void {
    if (event.action === 'otp_verified') {
      this.currentStep = 2;
    } else if (event.action === 'try_again') {
      this.currentStep = 0;
    }
  }

  handlePasswordSubmit(event: any): void {
    let message = 'Do you want to change your password?';
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => this.submitConfirmPassword(event.value),
    });
  }

  submitConfirmPassword(payload: any): void {
    this.loading = true;
    this._httpService
      .post(APIEndpoint.CHANGE_PASSWORD, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success('Success!', res?.body?.message);
          this.otpOid = res.body?.data?.otp_oid;
          this.updatedPassword = payload.new_password;
          this.currentStep = 1;
        },
        error: (err: any) => {
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  logout(): void {
    this._authService.logout();
  }
}

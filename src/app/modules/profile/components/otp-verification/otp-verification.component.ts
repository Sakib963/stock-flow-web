import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';

@Component({
  selector: 'otp-verification',
  imports: [CommonModule, FormsModule, NgZorroCustomModule, SpinnerComponent],
  templateUrl: './otp-verification.component.html',
  styleUrls: ['./otp-verification.component.scss'],
})
export class OtpVerificationComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() otpOid: string | null = null;
  @Input() newPassword: string | null = null;
  otp: string = '';
  countdown: number = 120; // 120 seconds
  totalTime: number = 120; // Keep total time for progress bar
  isOtpExpired = false;
  isOtpError = false;
  loading = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService
  ) {}

  ngOnInit() {
    if (this.otpOid && this.newPassword) {
      this.startCountdown();
    } else {
      // Handle case where otpOid is not available
      console.error('OTP OID is not available');
      this.isOtpError = true;
    }
  }

  startCountdown() {
    const interval = setInterval(() => {
      if (this.countdown > 0) {
        this.countdown--;
      } else {
        clearInterval(interval);
        this.isOtpExpired = true;
      }
    }, 1000);
  }

  submitOtp() {
    if (this.isOtpExpired) return;
    if (!this.otp) return;
    if (this.otp.length !== 6) return;
    this.loading = true;
    const payload = {
      otp: this.otp,
      otp_oid: this.otpOid,
      new_password: this.newPassword,
    };
    this._httpService
      .post(APIEndpoint.VERIFY_OTP_FOR_PASSWORD_CHANGE, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success('Success!', res?.body?.message);
          this.actionEmitter.emit({ action: 'otp_verified', value: true });
        },
        error: (err: any) => {
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  tryAgain(): void {
          this.actionEmitter.emit({ action: 'try_again', value: true });
  }

  formatProgress = (percent: number): string => {
    return `${Math.round(percent)}% Remaining`;
  };
}

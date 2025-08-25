import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SpinnerComponent } from '@app/shared/components/spinner/spinner.component';

@Component({
    selector: 'otp-verification',
    imports: [CommonModule, FormsModule, NgZorroCustomModule, SpinnerComponent],
    templateUrl: './otp-verification.component.html',
    styleUrls: ['./otp-verification.component.scss']
})
export class OtpVerificationComponent implements OnInit {
  @Output() actionEmitter = new EventEmitter<void>();
  @Input() otpOid: string | null = null;
  otp: string = '';
  countdown: number = 120; // 120 seconds
  totalTime: number = 120; // Keep total time for progress bar
  isOtpExpired = false;
  isOtpError = false;
  loading = false;

  ngOnInit() {
    if (this.otpOid) {
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
    this.loading = true;
    // Call your OTP verification API
  }

  tryAgain(): void {
    console.log('try again');
  }

  formatProgress = (percent: number): string => {
    return `${Math.round(percent)}% Remaining`;
  };
}

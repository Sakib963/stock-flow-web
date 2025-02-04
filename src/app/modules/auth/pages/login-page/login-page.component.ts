import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ROLES } from '@app/core/constants/constants';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { HttpService } from '@app/core/services/http.service';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    AngularSvgIconModule,
    RouterLink,
  ],
  templateUrl: './login-page.component.html',
  styleUrls: ['./login-page.component.scss'],
})
export class LoginPageComponent implements OnInit {
  form!: FormGroup;
  submitted = false;
  passwordTextType!: boolean;
  queryParamValue: any;

  constructor(
    private _fb: FormBuilder,
    private _activatedRoute: ActivatedRoute,
    private _destroyRef: DestroyRef,
    private _httpService: HttpService,
    public authService: AuthService,
    private _router: Router,
    private _notificationService: NzNotificationService
  ) {
    this._activatedRoute.queryParams
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((params) => {
        this.queryParamValue = params['origUrl'];
      });
  }

  ngOnInit(): void {
    this.form = this.createForm();
  }

  createForm(): FormGroup {
    return this._fb.group({
      email: [null, [Validators.required]],
      password: ['asdfgh', [Validators.required]],
    });
  }

  get f(): any {
    return this.form.controls;
  }

  togglePasswordTextType(): void {
    this.passwordTextType = !this.passwordTextType;
  }

  handleForm(): any {
    this.submitted = true;

    if (this.form.valid) {
      this.authService.loading.set(true);
      this.authService
        .login(this.form.getRawValue())
        .pipe(
          takeUntilDestroyed(this._destroyRef),
          finalize(() => this.authService.loading.set(false))
        )
        .subscribe({
          next: (res: any) => {
            if (res.code === 200) {
              this.authService._userInfo.set({
                role: res.data.role,
                name: res.data.name,
                email: res.data.email,
                photo: res.data.photo,
                mobile_number: res.data.mobile_number,
                designation: res.data.designation,
              });
              if (res.data.role === ROLES.ADMIN) {
                this._router.navigate(['/admin/dashboard']);
                console.log(this.authService.currentUserRole);
              } else if (res.data.role === ROLES.MANAGER) {
                this._router.navigate(['/manager/dashboard']);
                console.log(this.authService.currentUserRole);
              } else if (res.data.role === ROLES.GUEST) {
                this.authService.setGuestUser(true);
                this._router.navigate(['/manager/dashboard']);
              }
            }
          },
          error: (e) => {
            console.log(e);

            if (e.status == 404) {
              this._notificationService.error('Error!', e?.message);
            }
          },
          complete: () => {
            this.authService._userInfo.set({
              role: '',
              name: '',
              email: '',
              photo: '',
              mobile_number: '',
              designation: '',
            });
          },
        });
    } else {
      markFormGroupTouched(this.form);
    }
  }
}

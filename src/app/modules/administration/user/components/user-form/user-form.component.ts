import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCamera, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideLock, lucideRotateCw, lucideShieldAlert, lucideTrash2, lucideX } from '@ng-icons/lucide';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, Subscription, filter, map, startWith, take } from 'rxjs';
import { AssignableRole, User, UserField, UserPayload } from '@app/core/models/user.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { UserService } from '@app/modules/administration/user/services/user.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { passwordRules } from '@app/shared/utils/password-rules/password-rules';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';
import { uniqueValue } from '@app/shared/utils/unique-value/unique-value';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;
const PHONE = /^\+?[0-9][0-9 -]{5,19}$/;
const PASSWORD = (control: { value: string }) => (passwordRules(control.value ?? '').every((rule) => rule.met) ? null : { rule: true });

/**
 * The user form, rendered by both the create page and the edit page. It owns the fields and what
 * makes them valid; the page decides when to save.
 */
@Component({
    selector: 'user-form',
    imports: [ReactiveFormsModule, NgIcon, NzAvatarModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, NzTooltipModule, NzUploadModule, TranslatePipe, DigitsPipe, StatusTagComponent],
    providers: [provideIcons({ lucideCamera, lucideCircle, lucideCircleCheck, lucideCircleX, lucideEye, lucideEyeOff, lucideLock, lucideRotateCw, lucideShieldAlert, lucideTrash2, lucideX })],
    templateUrl: './user-form.component.html',
    styleUrl: './user-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormComponent {
    private readonly _builder = inject(FormBuilder).nonNullable;
    private readonly _users = inject(UserService);

    readonly language = inject(LanguageService).current;
    readonly formId = 'user-form';
    readonly accept = ACCEPT;

    /** The person being edited. Absent on create, which is the only time a password is typed. */
    readonly editing = input<User | null>(null);
    readonly submitted = output<void>();

    readonly isNew = computed(() => !this.editing());
    /** Why the role cannot change here, or null: nobody changes their own, and the last owner stays one. */
    readonly roleLocked = computed(() => (this.editing()?.self ? 'administration.user.roleLockedSelf' : this.editing()?.last_owner ? 'administration.user.roleLockedOwner' : null));

    readonly form = this._builder.group({
        name: ['', [Validators.required, Validators.maxLength(128)]],
        email: ['', [Validators.required, Validators.email, Validators.maxLength(256)], [uniqueValue((value) => this._users.isAvailable('email', value, this.editing()?.oid))]],
        mobile_number: ['', [Validators.required, Validators.pattern(PHONE)], [uniqueValue((value) => this._users.isAvailable('mobile_number', value, this.editing()?.oid), { isOwn: (value) => value === this.editing()?.mobile_number })]],
        designation: ['', [Validators.maxLength(256)]],
        role_oid: ['', [Validators.required]],
        password: ['', [Validators.required, PASSWORD]],
    });

    readonly roles = signal<AssignableRole[]>([]);
    readonly rolesLoading = signal(true);
    readonly rolesFailed = signal(false);

    readonly photo = signal<string | null>(null);
    /** Null while idle, the percentage sent while a photo uploads. */
    readonly uploading = signal<number | null>(null);
    readonly photoError = signal<string | null>(null);
    readonly passwordVisible = signal(false);
    private _upload?: Subscription;

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly rules = computed(() => passwordRules(this._value().password ?? ''));
    readonly pickedRole = computed(() => this.roles().find((role) => role.oid === this._value().role_oid) ?? null);

    /** What Save is still waiting for, counted for the action bar. */
    readonly remaining = computed(() => {
        const value = this._value();
        const required = [value.name, value.mobile_number, value.role_oid, ...(this.isNew() ? [value.email, value.password] : [])];
        return required.filter((field) => !field?.toString().trim()).length;
    });

    constructor() {
        inject(DestroyRef).onDestroy(() => this._upload?.unsubscribe());
        this.loadRoles();

        effect(() => {
            const user = this.editing();
            if (!user) return;
            this.form.controls.email.disable();
            this.form.controls.password.disable();
            if (this.roleLocked()) this.form.controls.role_oid.disable();
            this.form.patchValue({ name: user.name, email: user.email, mobile_number: user.mobile_number ?? '', designation: user.designation ?? '', role_oid: user.role_oid ?? '' });
            this.photo.set(user.photo);
            this.form.markAsPristine();
        });
    }

    loadRoles(): void {
        this.rolesLoading.set(true);
        this.rolesFailed.set(false);
        this._users.assignableRoles().subscribe({
            next: (roles) => {
                this.roles.set(roles);
                this.rolesLoading.set(false);
            },
            error: () => {
                this.rolesLoading.set(false);
                this.rolesFailed.set(true);
            },
        });
    }

    /** The person's current role stays pickable even when it is not one the editor could give, so the form shows it. */
    readonly roleChoices = computed(() => {
        const user = this.editing();
        const roles = this.roles();
        if (!user?.role_oid || roles.some((role) => role.oid === user.role_oid)) return roles;
        return [{ oid: user.role_oid, name: user.role_name ?? '', description: null, holders: 0, sensitive: [] }, ...roles];
    });

    sensitiveLabel(role: AssignableRole): string {
        return [...new Set(role.sensitive.map((action) => (this.language() === 'bn' ? action.label_bn || action.label : action.label)))].join(', ');
    }

    /** nz-upload asks before it uploads; answering false keeps the upload ours, so it is signed and its progress is real. */
    readonly pick = (file: NzUploadFile): boolean => {
        const picked = file as unknown as File;
        this.photoError.set(null);
        if (!ACCEPT.split(',').includes(picked.type)) {
            this.photoError.set('administration.user.photoWrongType');
            return false;
        }
        if (picked.size > MAX_BYTES) {
            this.photoError.set('administration.user.photoTooLarge');
            return false;
        }
        this._upload?.unsubscribe();
        this.uploading.set(0);
        this._upload = this._users.uploadPhoto(picked).subscribe({
            next: (event) => {
                if (event.state === 'uploading') return this.uploading.set(event.progress);
                this.uploading.set(null);
                this.photo.set(event.url);
                this.form.markAsDirty();
            },
            error: (error: unknown) => {
                this.uploading.set(null);
                this.photoError.set(error instanceof HttpErrorResponse && error.status === 503 ? 'administration.user.photoNotSetUp' : `administration.user.photoFailed.${failureOf(error)}`);
            },
        });
        return false;
    };

    removePhoto(): void {
        this._upload?.unsubscribe();
        this.uploading.set(null);
        this.photoError.set(null);
        this.photo.set(null);
        this.form.markAsDirty();
    }

    togglePassword(): void {
        this.passwordVisible.update((visible) => !visible);
    }

    payload(): UserPayload {
        const raw = this.form.getRawValue();
        const user = this.editing();
        const common = { name: raw.name.trim(), mobile_number: raw.mobile_number.trim(), designation: raw.designation.trim() || null, photo: this.photo(), role_oid: raw.role_oid };
        return user ? { ...common, oid: user.oid, version: user.version } : { ...common, email: raw.email.trim().toLowerCase(), password: raw.password };
    }

    /** Waits for the email and phone checks in flight, then answers whether the form may be sent. */
    ready(): Observable<boolean> {
        revealErrors(this.form);
        return this.form.statusChanges.pipe(
            startWith(this.form.status),
            filter((status) => status !== 'PENDING'),
            take(1),
            map((status) => status === 'VALID')
        );
    }

    /** Marks the field the server refused, in the person's own language. */
    reject(field: UserField): void {
        const control = this.form.controls[field];
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    invalid(field: keyof typeof this.form.controls): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}

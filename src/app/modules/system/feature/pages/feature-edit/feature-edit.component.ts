import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { HasUnsavedChanges } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { RequestFailure } from '@app/core/models/api.model';
import { Feature, FeaturePayload } from '@app/core/models/feature.model';
import { PageBack } from '@app/core/models/page-header.model';
import { FEATURE_ROUTES } from '@app/modules/system/feature/constants/feature-routes';
import { FeatureService } from '@app/modules/system/feature/services/feature.service';
import { FormPageComponent } from '@app/shared/components/form-page/form-page.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/** What a module or feature is called and how it is found, in both languages. Only one page edits it, so the form lives here. */
@Component({
    selector: 'feature-edit',
    imports: [ReactiveFormsModule, NzButtonModule, NzFormModule, NzInputModule, NzSelectModule, NzSkeletonModule, NzSwitchModule, TranslatePipe, DigitsPipe, PageHeaderComponent, FormPageComponent],
    templateUrl: './feature-edit.component.html',
    styleUrl: './feature-edit.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureEditComponent implements HasUnsavedChanges {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _features = inject(FeatureService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    private readonly _oid = this._route.snapshot.paramMap.get('oid') ?? '';

    readonly formId = 'feature-form';
    readonly back: PageBack = { route: FEATURE_ROUTES.list };
    readonly feature = signal<Feature | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._features.saving;

    readonly form = inject(FormBuilder).nonNullable.group({
        label: ['', [Validators.required, Validators.maxLength(128)]],
        label_bn: ['', [Validators.required, Validators.maxLength(128)]],
        description_en: ['', [Validators.maxLength(512)]],
        description_bn: ['', [Validators.maxLength(512)]],
        tags: [[] as string[]],
        is_new: [false],
    });

    private readonly _value = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
    readonly remaining = computed(() => [this._value().label?.trim(), this._value().label_bn?.trim()].filter((field) => !field).length);

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._features.details(this._oid).subscribe({
            next: ({ details }) => {
                this.feature.set(details);
                this.form.setValue({ label: details.label, label_bn: details.label_bn ?? '', description_en: details.description_en ?? '', description_bn: details.description_bn ?? '', tags: [...(details.tags ?? [])], is_new: details.is_new });
                this.form.markAsPristine();
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    hasUnsavedChanges(): boolean {
        return this.form.dirty;
    }

    invalid(field: keyof typeof this.form.controls): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }

    save(): void {
        if (this.saving()) return;
        if (!this.form.dirty) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        revealErrors(this.form);
        if (this.form.invalid) {
            this._message.error(this._translate.instant('form.fixErrors'));
            return;
        }
        const raw = this.form.getRawValue();
        const payload: FeaturePayload = {
            oid: this._oid,
            label: raw.label.trim(),
            label_bn: raw.label_bn.trim(),
            description_en: raw.description_en.trim() || null,
            description_bn: raw.description_bn.trim() || null,
            tags: [...new Set(raw.tags.map((tag) => tag.trim()).filter(Boolean))],
            is_new: raw.is_new,
        };
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        confirmAction(this._modal, { title: t('system.feature.confirmEdit.title'), body: t('system.feature.confirmEdit.body', { name: payload.label }), ok: t('form.saveChanges'), cancel: t('form.confirm.cancel') }).subscribe((confirmed) => {
            if (!confirmed) return;
            this._features.update(payload).subscribe({
                next: (changed) => {
                    this.form.markAsPristine();
                    this._message[changed ? 'success' : 'info'](t(changed ? 'system.feature.updated' : 'form.nothingChanged'));
                    void this._router.navigateByUrl(FEATURE_ROUTES.detail(this._oid));
                },
                error: (error: unknown) => this._message.error(t(failureKey(error, 'form.saveFailed'))),
            });
        });
    }

    cancel(): void {
        void this._router.navigateByUrl(FEATURE_ROUTES.detail(this._oid));
    }

    backToList(): void {
        void this._router.navigateByUrl(FEATURE_ROUTES.list);
    }
}

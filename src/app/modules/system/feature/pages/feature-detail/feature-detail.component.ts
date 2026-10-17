import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideBan, lucideCheck, lucideEyeOff, lucideHistory, lucideInfo, lucideKeyRound, lucideListTree, lucidePencil, lucidePower, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { Feature, FeatureDetails, FeatureState } from '@app/core/models/feature.model';
import { PageBack } from '@app/core/models/page-header.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { FEATURE_KIND, FEATURE_STATE } from '@app/modules/system/feature/config/feature-list.config';
import { FEATURE_ROUTES } from '@app/modules/system/feature/constants/feature-routes';
import { FeatureService } from '@app/modules/system/feature/services/feature.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { revealErrors } from '@app/shared/utils/reveal-errors/reveal-errors';

/** One module or feature, read only, with turning it on, disabling it with a reason, or hiding it. */
@Component({
    selector: 'feature-detail',
    imports: [ReactiveFormsModule, RouterLink, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzModalModule, NzSkeletonModule, TranslatePipe, PageHeaderComponent, StatusTagComponent, ActionFooterComponent, RecordTimelineComponent, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideBan, lucideCheck, lucideEyeOff, lucideHistory, lucideInfo, lucideKeyRound, lucideListTree, lucidePencil, lucidePower, lucideRotateCw })],
    templateUrl: './feature-detail.component.html',
    styleUrl: './feature-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _features = inject(FeatureService);
    private readonly _session = inject(SessionService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: FEATURE_ROUTES.list };
    readonly record = signal<FeatureDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._features.saving;
    readonly disabling = signal(false);

    readonly feature = computed<Partial<Feature> | null>(() => this.record()?.details ?? this._seed);
    readonly canEdit = computed(() => this._session.can('system.feature.edit'));
    readonly stateTone = computed(() => (this.feature()?.state ? FEATURE_STATE[this.feature()!.state!] : null));
    readonly kindTone = computed(() => (this.feature()?.kind ? FEATURE_KIND[this.feature()!.kind!] : null));
    readonly states = FEATURE_STATE;
    readonly detailRoute = FEATURE_ROUTES.detail;
    /** Its module turns it off as well, whatever its own state says. */
    readonly offThroughModule = computed(() => {
        const f = this.record()?.details;
        return !!f && f.own_state === 'On' && f.state !== 'On';
    });

    readonly reasonForm = inject(FormBuilder).nonNullable.group({
        reason_en: ['', [Validators.required, Validators.maxLength(256)]],
        reason_bn: ['', [Validators.required, Validators.maxLength(256)]],
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._features.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
    }

    label(entry: { label?: string; label_bn?: string } | null | undefined): string {
        return (this.language() === 'bn' ? entry?.label_bn : entry?.label) || entry?.label || '';
    }

    turnOn(): void {
        this.ask('On', 'lucidePower');
    }

    hide(): void {
        this.ask('Hidden', 'lucideEyeOff');
    }

    openDisable(): void {
        const f = this.record()?.details;
        this.reasonForm.reset({ reason_en: f?.disabled_message_en ?? '', reason_bn: f?.disabled_message_bn ?? '' });
        this.disabling.set(true);
    }

    confirmDisable(): void {
        if (this.saving()) return;
        if (this.reasonForm.invalid) {
            revealErrors(this.reasonForm);
            return;
        }
        const { reason_en, reason_bn } = this.reasonForm.getRawValue();
        this.send('Disabled', { reason_en: reason_en.trim(), reason_bn: reason_bn.trim() });
    }

    private ask(state: FeatureState, icon: string): void {
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        const name = this.label(this.feature());
        confirmAction(this._modal, { title: t(`system.feature.switch.${state}.title`, { name }), body: t(`system.feature.switch.${state}.body`), ok: t(`system.feature.switch.${state}.button`), cancel: t('form.confirm.cancel'), danger: state === 'Hidden', icon }).subscribe((confirmed) => {
            if (confirmed) this.send(state, {});
        });
    }

    private send(state: FeatureState, reasons: { reason_en?: string; reason_bn?: string }): void {
        this._features.switch({ oid: this.oid, state, ...reasons }).subscribe({
            next: (changed) => {
                this.disabling.set(false);
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? `system.feature.switch.${state}.done` : 'form.nothingChanged'));
                this.load();
            },
            error: (error: unknown) => this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed'))),
        });
    }

    edit(): void {
        void this._router.navigateByUrl(FEATURE_ROUTES.edit(this.oid));
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(FEATURE_ROUTES.list);
    }

    /** Only a row for this very feature counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Feature> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Feature> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}

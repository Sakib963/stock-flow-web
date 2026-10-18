import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideHistory, lucideInfo, lucideKeyRound, lucidePencil, lucidePower, lucideRotateCw, lucideTrash2, lucideUsers } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { GrantTree, Role, RoleDetails } from '@app/core/models/role.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { ROLE_STATUS } from '@app/modules/administration/role/config/role-list.config';
import { ROLE_ROUTES } from '@app/modules/administration/role/constants/role-routes';
import { RoleService } from '@app/modules/administration/role/services/role.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { GrantTreeComponent } from '@app/shared/components/grant-tree/grant-tree.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';

@Component({
    selector: 'role-detail',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, TranslatePipe, DigitsPipe, RecordDatePipe, PageHeaderComponent, StatusTagComponent, GrantTreeComponent, RecordTimelineComponent, ActionFooterComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideHistory, lucideInfo, lucideKeyRound, lucidePencil, lucidePower, lucideRotateCw, lucideTrash2, lucideUsers })],
    templateUrl: './role-detail.component.html',
    styleUrl: './role-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _roles = inject(RoleService);
    private readonly _session = inject(SessionService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: ROLE_ROUTES.list };
    readonly record = signal<RoleDetails | null>(null);
    readonly tree = signal<GrantTree | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly pending = signal<'status' | 'delete' | null>(null);

    readonly role = computed<Partial<Role & { holders: number; actions: number }> | null>(() => this.record()?.details ?? this._seed);
    readonly statusTone = computed(() => (this.role()?.status ? ROLE_STATUS[this.role()?.status ?? ''] : null));
    readonly editable = computed(() => this.record()?.details.editable ?? false);
    readonly canEdit = computed(() => this._session.can('administration.role.edit') && this.editable());
    readonly canDelete = computed(() => this._session.can('administration.role.delete') && this.editable());
    readonly holdsIt = computed(() => !!this.record()?.holders.some((h) => h.email === this._session.user()?.email));
    readonly ticked = computed(() => {
        const codes = new Set(this.record()?.codes ?? []);
        return (action: { code: string }) => codes.has(action.code);
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._roles.details(this.oid).subscribe({
            next: (details) => {
                this.record.set(details);
                this.loading.set(false);
            },
            error: (error: unknown) => {
                this.loading.set(false);
                this.failed.set(failureOf(error));
            },
        });
        this._roles.tree().subscribe({ next: (tree) => this.tree.set(tree), error: () => this.tree.set({ features: [], actions: [] }) });
    }

    toggleStatus(): void {
        const loaded = this.record();
        if (!loaded || this.pending()) return;
        const next = loaded.details.status === 'Active' ? 'Inactive' : 'Active';
        const t = (key: string, params?: object) => localDigits(this._translate.instant(key, params), this.language());
        const copy = `administration.role.switch.${next}`;
        confirmAction(this._modal, {
            title: t(`${copy}.title`, { name: loaded.details.name }),
            body: t(`${copy}.body`, { count: loaded.holders.length }),
            ok: t(`${copy}.button`),
            cancel: t('form.confirm.cancel'),
            danger: next === 'Inactive',
            icon: 'lucidePower',
            run: () => this.send('status', () => this._roles.switchStatus(this.oid, next), `${copy}.done`),
        }).subscribe();
    }

    remove(): void {
        const loaded = this.record();
        if (!loaded || this.pending() || loaded.holders.length) return;
        confirmAction(this._modal, {
            title: this._translate.instant('administration.role.delete.title', { name: loaded.details.name }),
            body: this._translate.instant('administration.role.delete.body'),
            ok: this._translate.instant('administration.role.delete.button'),
            cancel: this._translate.instant('form.confirm.cancel'),
            danger: true,
            icon: 'lucideTrash2',
            run: () => this.send('delete', () => this._roles.delete(this.oid), 'administration.role.delete.done', true),
        }).subscribe();
    }

    private send(kind: 'status' | 'delete', request: () => ReturnType<RoleService['delete']>, done: string, leave = false): Promise<boolean> {
        this.pending.set(kind);
        return new Promise((resolve) =>
            request().subscribe({
                next: () => {
                    this.pending.set(null);
                    this._message.success(this._translate.instant(done));
                    if (leave) void this._router.navigateByUrl(ROLE_ROUTES.list);
                    else this.load();
                    resolve(true);
                },
                error: (error: unknown) => {
                    this.pending.set(null);
                    this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                    resolve(false);
                },
            })
        );
    }

    edit(): void {
        void this._router.navigateByUrl(ROLE_ROUTES.edit(this.oid));
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(ROLE_ROUTES.list);
    }

    /** Only a row for this very role counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<Role & { holders: number; actions: number }> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<Role> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}

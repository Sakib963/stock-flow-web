import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideHistory, lucideInfo, lucideKeyRound, lucideLaptop, lucideLogOut, lucidePencil, lucidePower, lucideRotateCw, lucideTrash2, lucideZap } from '@ng-icons/lucide';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { PageBack } from '@app/core/models/page-header.model';
import { User, UserDetails, UserSession } from '@app/core/models/user.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { USER_STATUS } from '@app/modules/administration/user/config/user-list.config';
import { USER_ROUTES } from '@app/modules/administration/user/constants/user-routes';
import { UserService } from '@app/modules/administration/user/services/user.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { GrantTreeComponent } from '@app/shared/components/grant-tree/grant-tree.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordTimelineComponent } from '@app/shared/components/record-timeline/record-timeline.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

type Pending = 'status' | 'sign-out' | 'delete';

@Component({
    selector: 'user-detail',
    imports: [NgIcon, NzAvatarModule, NzButtonModule, NzCardModule, NzSkeletonModule, TranslatePipe, RecordDatePipe, PageHeaderComponent, StatusTagComponent, GrantTreeComponent, RecordTimelineComponent, ActionFooterComponent],
    providers: [provideIcons({ lucideArrowLeft, lucideHistory, lucideInfo, lucideKeyRound, lucideLaptop, lucideLogOut, lucidePencil, lucidePower, lucideRotateCw, lucideTrash2, lucideZap })],
    templateUrl: './user-detail.component.html',
    styleUrl: './user-detail.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailComponent {
    private readonly _route = inject(ActivatedRoute);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _users = inject(UserService);
    private readonly _session = inject(SessionService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly language = inject(LanguageService).current;
    readonly oid = this._route.snapshot.paramMap.get('oid') ?? '';
    private readonly _seed = this.seedFromList();

    readonly back: PageBack = { route: USER_ROUTES.list };
    readonly record = signal<UserDetails | null>(null);
    readonly loading = signal(true);
    readonly failed = signal<RequestFailure | null>(null);
    readonly pending = signal<Pending | null>(null);
    readonly fillBody = { display: 'flex', flexDirection: 'column', flex: '1', minHeight: '0' };

    readonly user = computed<Partial<User> | null>(() => this.record()?.details ?? this._seed);
    readonly statusTone = computed(() => USER_STATUS[this.user()?.status ?? ''] ?? null);
    readonly deleted = computed(() => this.record()?.details.status === 'Deleted');
    /** The caller may change this person at all: their role is within the caller's own access and they are not deleted. */
    readonly changeable = computed(() => !!this.record()?.details.within_reach && !this.deleted());
    readonly canEdit = computed(() => this._session.can('administration.user.edit') && this.changeable());
    readonly canDelete = computed(() => this._session.can('administration.user.delete') && this.changeable());

    /** Why a quick action cannot run, or null when it can. */
    readonly offReason = computed(() => {
        const d = this.record()?.details;
        if (!d || d.status !== 'Active') return null;
        return d.self ? 'administration.user.reason.self' : d.last_owner ? 'administration.user.reason.lastOwner' : null;
    });
    readonly signOutReason = computed(() => {
        const loaded = this.record();
        if (!loaded) return null;
        return loaded.details.self ? 'administration.user.reason.signOutSelf' : !loaded.sessions.length ? 'administration.user.reason.noSessions' : null;
    });
    readonly deleteReason = computed(() => {
        const d = this.record()?.details;
        if (!d) return null;
        return d.self ? 'administration.user.reason.self' : d.last_owner ? 'administration.user.reason.lastOwner' : null;
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(null);
        this._users.details(this.oid).subscribe({
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

    toggleStatus(): void {
        const d = this.record()?.details;
        if (!d || this.pending()) return;
        const next = d.status === 'Active' ? 'Inactive' : 'Active';
        const copy = `administration.user.switch.${next}`;
        this.ask(copy, { name: d.name }, next === 'Inactive', 'lucidePower', () => this.send('status', this._users.switchStatus(this.oid, next), `${copy}.done`));
    }

    signOutEverywhere(): void {
        const loaded = this.record();
        if (!loaded || this.pending()) return;
        this.ask('administration.user.signOut', { name: loaded.details.name, count: loaded.sessions.length }, true, 'lucideLogOut', () => this.send('sign-out', this._users.signOutEverywhere(this.oid), 'administration.user.signOut.done'));
    }

    remove(): void {
        const d = this.record()?.details;
        if (!d || this.pending()) return;
        this.ask('administration.user.delete', { name: d.name }, true, 'lucideTrash2', () => this.send('delete', this._users.delete(this.oid), 'administration.user.delete.done'));
    }

    private ask(copy: string, params: object, danger: boolean, icon: string, run: () => Promise<boolean>): void {
        const t = (key: string) => localDigits(this._translate.instant(key, params), this.language());
        confirmAction(this._modal, { title: t(`${copy}.title`), body: t(`${copy}.body`), ok: t(`${copy}.button`), cancel: t('form.confirm.cancel'), danger, icon, run }).subscribe();
    }

    private send(kind: Pending, request: Observable<unknown>, done: string): Promise<boolean> {
        this.pending.set(kind);
        return new Promise((resolve) =>
            request.subscribe({
                next: () => {
                    this.pending.set(null);
                    this._message.success(this._translate.instant(done));
                    this.load();
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

    /** Named as the profile's own device list names it: "Chrome on Windows". */
    deviceLabel({ device }: UserSession): string {
        if (device.browser && device.os) return this._translate.instant('shell.sessions.browserOn', { browser: device.browser, os: device.os });
        const name = device.browser ?? device.os;
        return name ? this._translate.instant('shell.sessions.deviceNamed', { name }) : this._translate.instant('shell.sessions.unknownDevice');
    }

    edit(): void {
        void this._router.navigateByUrl(USER_ROUTES.edit(this.oid));
    }

    goBack(): void {
        this._location.back();
    }

    backToList(): void {
        void this._router.navigateByUrl(USER_ROUTES.list);
    }

    /** Only a row for this very person counts: navigation state survives a reload and a Back. */
    private seedFromList(): Partial<User> | null {
        const row = this._router.currentNavigation()?.extras.state?.['row'] as Partial<User> | undefined;
        return row?.oid === this.oid ? row : null;
    }
}

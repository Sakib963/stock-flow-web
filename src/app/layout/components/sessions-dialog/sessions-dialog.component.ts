import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMonitor, lucideSmartphone, lucideTablet } from '@ng-icons/lucide';
import { ActiveSession } from '@app/core/models/auth.model';
import { AuthService } from '@app/core/services/auth/auth.service';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';

const ICONS: Record<ActiveSession['device']['type'], string> = { desktop: 'lucideMonitor', phone: 'lucideSmartphone', tablet: 'lucideTablet' };

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31536000],
    ['month', 2592000],
    ['week', 604800],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
];

/** "5 minutes ago", or "৫ মিনিট আগে": the browser already knows both languages. */
const relativeTime = (iso: string, locale: string): string => {
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const unit = RELATIVE_UNITS.find(([, size]) => Math.abs(seconds) >= size);
    return unit ? format.format(Math.round(seconds / unit[1]), unit[0]) : format.format(0, 'minute');
};

const labelOf = ({ device }: ActiveSession): { key: string; params: Record<string, string> } => {
    if (device.browser && device.os) return { key: 'shell.sessions.browserOn', params: { browser: device.browser, os: device.os } };
    const name = device.browser ?? device.os;
    return name ? { key: 'shell.sessions.deviceNamed', params: { name } } : { key: 'shell.sessions.unknownDevice', params: {} };
};

/**
 * Every device signed in to this account, opened from the account menu.
 *
 * Sign out everywhere is only half a feature if nobody can see what "everywhere" is. This is where
 * a person finds a device they do not recognise and ends it, on its own or together with every
 * other one, without being thrown off the device they are holding.
 *
 * The dialog is `nz-modal`, the confirmations are `nz-popconfirm` and the modal service, and only
 * the rows are ours.
 */
@Component({
    selector: 'sessions-dialog',
    imports: [TranslatePipe, NzButtonModule, NzModalModule, NzPopconfirmModule, NzSkeletonModule, NzTagModule, NgIcon],
    providers: [provideIcons({ lucideMonitor, lucideSmartphone, lucideTablet })],
    templateUrl: './sessions-dialog.component.html',
    styleUrl: './sessions-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsDialogComponent {
    private readonly _auth = inject(AuthService);
    private readonly _session = inject(SessionService);
    private readonly _language = inject(LanguageService);
    private readonly _translate = inject(TranslateService);
    private readonly _message = inject(NzMessageService);
    private readonly _modal = inject(NzModalService);
    private readonly _destroyRef = inject(DestroyRef);

    readonly close = output<void>();

    readonly loading = signal(true);
    readonly failed = signal(false);
    /** The session being signed out, or `others` while every other device is. One action at a time. */
    readonly busy = signal<string | null>(null);

    private readonly _sessions = signal<ActiveSession[]>([]);
    readonly hasOthers = computed(() => this._sessions().some((session) => !session.current));

    readonly rows = computed(() => {
        const locale = this._language.current() === 'bn' ? 'bn-BD' : 'en-GB';
        const day = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' });
        return this._sessions().map((session) => ({
            ...session,
            icon: ICONS[session.device.type],
            label: labelOf(session),
            signedIn: day.format(new Date(session.signed_in_on)),
            lastActive: relativeTime(session.last_used_on, locale),
        }));
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this.failed.set(false);
        this._auth
            .listSessions()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (sessions) => {
                    this._sessions.set(sessions);
                    this.loading.set(false);
                },
                error: () => {
                    this.failed.set(true);
                    this.loading.set(false);
                },
            });
    }

    signOutDevice(session: ActiveSession): void {
        const { key, params } = labelOf(session);
        const remove = () => this._sessions.update((sessions) => sessions.filter((s) => s.id !== session.id));

        this.busy.set(session.id);
        this._auth
            .signOutSession(session.id)
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: () => {
                    remove();
                    this._message.success(this._translate.instant('shell.sessions.signedOut', { device: this._translate.instant(key, params) }));
                    this.busy.set(null);
                },
                error: (error: HttpErrorResponse) => {
                    // Already signed out somewhere else is what the person wanted anyway.
                    if (error.status === 404) remove();
                    else this._message.error(this._translate.instant('shell.sessions.actionFailed'), { nzDuration: 6000 });
                    this.busy.set(null);
                },
            });
    }

    signOutOthers(): void {
        this.busy.set('others');
        this._auth
            .signOutOtherDevices()
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: () => {
                    this._sessions.update((sessions) => sessions.filter((s) => s.current));
                    this._message.success(this._translate.instant('shell.sessions.signedOutOthers'));
                    this.busy.set(null);
                },
                error: () => {
                    this._message.error(this._translate.instant('shell.sessions.actionFailed'), { nzDuration: 6000 });
                    this.busy.set(null);
                },
            });
    }

    confirmSignOutEverywhere(): void {
        this._modal.confirm({
            nzTitle: this._translate.instant('shell.signOutEverywhereTitle'),
            nzContent: this._translate.instant('shell.signOutEverywhereBody'),
            nzOkText: this._translate.instant('shell.signOutEverywhereConfirm'),
            nzOkDanger: true,
            nzCancelText: this._translate.instant('shell.cancel'),
            nzOnOk: () => this.signOutEverywhere(),
        });
    }

    private async signOutEverywhere(): Promise<void> {
        // Closed first: signing out everywhere leaves the shell, and an output cannot emit once
        // the navigation has destroyed this component.
        this.close.emit();
        try {
            await this._auth.signOutEverywhere();
            this._session.clear();
        } catch {
            this._message.error(this._translate.instant('shell.signOutEverywhereFailed'), { nzDuration: 6000 });
        }
    }
}

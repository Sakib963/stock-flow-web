import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideEllipsis } from '@ng-icons/lucide';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map } from 'rxjs';
import { ActionEvent, Text } from '@app/core/models/config.model';
import { Crumb, PageAction, PageBack, PageHeaderConfig } from '@app/core/models/page-header.model';
import { SessionService } from '@app/core/services/session/session.service';
import { LIST_ICONS, isListIcon } from '@app/shared/constants/list-icons';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';
import { fillRoute } from '@app/shared/utils/fill-route/fill-route';
import { findMenuPath } from '@app/shared/utils/menu-path/menu-path';

const VISIBLE_ACTIONS = 2;
const HOME: Crumb = { label: 'shell.home', route: '/app/dashboard' };

/**
 * The top of every page: where you are, what this screen is, and the one or two things you most
 * likely came to do. It owns the white band; the page below sits on grey.
 *
 * The title, lead and breadcrumb default to the menu, which already holds both languages and the
 * path, so no page keeps its own breadcrumb list in step with the menu. Actions come from the config
 * and are absent without their permission. Actions it cannot run itself are reported through
 * (action); a custom one can still be projected.
 *
 *   <page-header [config]="ORDER_LIST.header" [count]="total()" (action)="onAction($event)" />
 *   <page-header [title]="'dashboard.title' | translate" [lead]="greeting()" />
 */
@Component({
    selector: 'page-header',
    imports: [RouterLink, NgIcon, NzBreadCrumbModule, NzButtonModule, NzDropdownModule, NzMenuModule, NzTooltipModule, TranslatePipe, TextPipe, MoneyPipe],
    providers: [provideIcons({ ...LIST_ICONS, lucideArrowLeft, lucideEllipsis })],
    templateUrl: './page-header.component.html',
    styleUrl: './page-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);
    private readonly _session = inject(SessionService);

    readonly config = input<PageHeaderConfig | null>(null);
    /** Overrides the config and the menu. */
    readonly title = input<Text | null>(null);
    readonly lead = input<Text | null>(null);
    readonly back = input<PageBack | null>(null);
    /** The list total, shown when the config asks for a count. Null while it is not known. */
    readonly count = input<number | null>(null);
    /** A request for the count is in flight. Tells an unknown count apart from a failed one. */
    readonly countPending = input(false);

    readonly action = output<ActionEvent>();

    private readonly _url = toSignal(
        this._router.events.pipe(
            filter((e): e is NavigationEnd => e instanceof NavigationEnd),
            map((e) => e.urlAfterRedirects)
        ),
        { initialValue: this._router.url }
    );

    private readonly _menuPath = computed(() => findMenuPath(this._session.menu(), this._url()));

    readonly heading = computed<Text>(() => this.title() ?? this.config()?.title ?? this._menuPath().at(-1)?.label ?? '');

    readonly leadText = computed<Text | null>(() => {
        const own = this.lead() ?? this.config()?.lead;
        if (own) return own;
        const description = this._menuPath().at(-1)?.description;
        return description?.en ? { en: description.en, bn: description.bn ?? description.en } : null;
    });

    private readonly _wantsCount = computed(() => !!this.config()?.count);

    readonly showCount = computed(() => this._wantsCount() && this.count() !== null);

    /**
     * A count that has not arrived holds its place instead of appearing from nowhere and shoving the
     * title's neighbours sideways. It is a placeholder only while a request is running: a count the
     * page failed to load would otherwise pulse for ever, promising a number that is not coming.
     */
    readonly showCountPlaceholder = computed(() => this._wantsCount() && this.count() === null && this.countPending());

    /** A known count with a newer one in flight, so the number on screen is about to change. */
    readonly countStale = computed(() => this.showCount() && this.countPending());

    readonly crumbs = computed<readonly Crumb[]>(() => {
        const setting = this.config()?.breadcrumb ?? 'menu';
        if (setting === false) return [];
        if (setting !== 'menu') return setting;

        const path = this._menuPath();
        if (!path.length) return [];
        const trail = path.map((item) => ({ label: item.label, route: item.route ?? undefined }));
        // A Home link someone cannot follow would be a crumb that does nothing when clicked.
        return this._session.can('dashboard.overview.view') ? [HOME, ...trail] : trail;
    });

    readonly backTarget = computed(() => this.back() ?? this.config()?.back ?? null);

    private readonly _actions = computed(() => (this.config()?.actions ?? []).filter((a) => this._session.can(a.permission)));

    /** The primary last, so it sits at the right edge where the eye ends. */
    readonly visibleActions = computed(() => {
        const shown = this._actions().slice(0, VISIBLE_ACTIONS);
        return [...shown.filter((a) => !a.primary), ...shown.filter((a) => a.primary)];
    });

    readonly overflowActions = computed(() => this._actions().slice(VISIBLE_ACTIONS));

    iconOf(action: PageAction): string | null {
        return isListIcon(action.icon) ? action.icon : null;
    }

    goBack(): void {
        const back = this.backTarget();
        if (back === 'history') this._location.back();
        else if (back) void this._router.navigateByUrl(back.route);
    }

    run(action: PageAction): void {
        if (action.run.kind === 'navigate') {
            const route = fillRoute(action.run.route);
            if (route) void this._router.navigateByUrl(route);
            return;
        }
        this.action.emit({ action, rows: [] });
    }
}

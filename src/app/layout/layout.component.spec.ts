import { TestBed } from '@angular/core/testing';
import { NzMessageService } from 'ng-zorro-antd/message';
import { Router, provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { MenuItem, SessionPayload } from '@app/core/models/session.model';
import { NotificationService } from '@app/core/services/notification.service';
import { SessionService } from '@app/core/services/session.service';
import { LanguageService } from '@app/core/services/language.service';
import { ShellNavService } from '@app/layout/services/shell-nav.service';
import { ShellSearchService } from '@app/layout/services/shell-search.service';
import { ShellStateService } from '@app/layout/services/shell-state.service';
import { LayoutComponent } from './layout.component';

/**
 * The shell, against the acceptance checklist in Design/design_handoff_shell §9.
 *
 * The menu is a fixture rather than the real one: these assertions are about how the rail behaves
 * given a shape of menu, and pinning them to the seeded catalogue would break them every time a
 * feature is added.
 */

const leaf = (id: string, route: string | null, over: Partial<MenuItem> = {}): MenuItem => ({
    id,
    label: { en: id, bn: id },
    description: { en: null, bn: null },
    tags: [],
    icon: null,
    order: 0,
    route,
    permission: null,
    isDisabled: false,
    disabledMessage: { en: null, bn: null },
    isNew: false,
    children: [],
    ...over,
});

const menu: MenuItem[] = [
    leaf('dashboard', '/app/dashboard', { label: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' }, tags: ['overview'] }),
    leaf('activity', '/app/activity', { label: { en: 'Activity log', bn: 'কার্যক্রম' }, isDisabled: true, disabledMessage: { en: 'Recording already, the page is next.', bn: 'রেকর্ড হচ্ছে, পেজটি পরের ধাপে।' } }),
    leaf('sales', null, {
        label: { en: 'Sales', bn: 'বিক্রি' },
        children: [leaf('sales-pos', '/app/sales/pos', { label: { en: 'Counter sale', bn: 'কাউন্টার বিক্রি' }, tags: ['pos', 'counter', 'sell', 'order'] }), leaf('sales-online', '/app/sales/online', { label: { en: 'Online order', bn: 'অনলাইন অর্ডার' }, tags: ['online', 'delivery', 'order'] }), leaf('sales-returns', '/app/sales/returns', { label: { en: 'Returns', bn: 'ফেরত' }, tags: ['return', 'refund'] })],
    }),
    leaf('inventory', null, {
        label: { en: 'Inventory', bn: 'স্টক' },
        children: [leaf('products', '/app/inventory/products', { label: { en: 'Products', bn: 'পণ্য' }, tags: ['product', 'sku', 'stock', 'sell'] })],
    }),
];

const item = (id: string): MenuItem => menu.find((i) => i.id === id)!;

const payload: SessionPayload = {
    version: 'v1',
    user: { name: 'Samiha Rahman', email: 'samiha@shop.com', mobile_number: null, photo: null, designation: 'Owner', role: 'Admin' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'both' },
    permissions: [],
    menu,
    counters: { notifications: 0 },
};

describe('LayoutComponent', () => {
    beforeEach(async () => {
        localStorage.clear();
        await TestBed.configureTestingModule({
            imports: [LayoutComponent],
            providers: [
                provideRouter([
                    { path: 'app/dashboard', children: [] },
                    { path: 'app/activity', children: [] },
                    { path: 'app/sales/pos', children: [] },
                    { path: 'app/sales/online', children: [] },
                    { path: 'app/sales/returns', children: [] },
                    { path: 'app/inventory/products', children: [] },
                ]),
                provideHttpClient(),
                provideHttpClientTesting(),
                provideNzI18n(en_US),
                provideTranslateService({ fallbackLang: 'en' }),
            ],
        }).compileComponents();

        const session = TestBed.inject(SessionService);
        const load = session.load('session-a');
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO))
            .flush({ code: 200, data: payload });
        await load;
    });

    afterEach(() => localStorage.clear());

    async function render(url = '/app/dashboard') {
        const fixture = TestBed.createComponent(LayoutComponent);
        await fixture.whenStable();
        // After creation, so the first completed navigation is the one the shell was mounted for.
        await TestBed.inject(Router).navigateByUrl(url);
        fixture.detectChanges();
        await fixture.whenStable();
        return {
            fixture,
            el: fixture.nativeElement as HTMLElement,
            cmp: fixture.componentInstance,
            // The shell's state lives in services now, so the acceptance checks read it there
            // rather than off the frame component. Injected after the component is created: both
            // are root-provided and read `matchMedia` and `localStorage` when first constructed,
            // so pulling them earlier would build them before a test had stubbed either.
            state: TestBed.inject(ShellStateService),
            nav: TestBed.inject(ShellNavService),
            search: TestBed.inject(ShellSearchService),
            notifications: TestBed.inject(NotificationService),
            language: TestBed.inject(LanguageService),
        };
    }

    const rows = (el: HTMLElement, selector: string) => Array.from(el.querySelectorAll<HTMLElement>(selector));

    /**
     * Runs a block at phone width.
     *
     * jsdom answers every media query with matches:false, so the query the shell asks has to be
     * stubbed before the component reads it. Restored in a finally, since a leaked stub would
     * put every test after this one on a phone.
     */
    async function atPhoneWidth<T>(fn: () => Promise<T>): Promise<T> {
        const original = window.matchMedia;
        window.matchMedia = ((q: string) => ({ matches: q.includes('767'), media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
        try {
            return await fn();
        } finally {
            window.matchMedia = original;
        }
    }

    /** The phone overlays render into the CDK container at body level, not inside the fixture. */
    const overlay = (selector: string) => document.querySelector<HTMLElement>(selector);

    it('keeps the business name binding in the restyled brand row', async () => {
        const { el } = await render();
        expect(el.querySelector('[data-shell=business]')?.textContent?.trim()).toBe('Samiha Style Studio');
    });

    it('paints the full-column wash and nothing behind the logo', async () => {
        const { el } = await render();
        expect(el.querySelector('[data-shell=sider-art] svg')?.getAttribute('preserveAspectRatio')).toBe('none');
        expect(el.querySelector('[data-shell=brand] svg')).toBeNull();
    });

    it('opens the group holding a deep-linked route, without a click', async () => {
        const { nav } = await render('/app/sales/online');
        expect(nav.openGroup()).toBe('sales');
    });

    it('treats a child route as its page, so a detail screen keeps the rail where it was', async () => {
        const { nav } = await render('/app/inventory/products');
        expect(nav.activeGroup()).toBe('inventory');
    });

    it('opens one group at a time: opening a second closes the first', async () => {
        const { nav } = await render();
        nav.toggleGroup('sales');
        expect(nav.isOpen('sales')).toBe(true);

        nav.toggleGroup('inventory');
        expect(nav.isOpen('inventory')).toBe(true);
        expect(nav.isOpen('sales')).toBe(false);
    });

    it('closes a group when its own row is clicked again', async () => {
        const { nav } = await render();
        nav.toggleGroup('sales');
        nav.toggleGroup('sales');
        expect(nav.openGroup()).toBeNull();
    });

    it('keeps pointing at the group holding the active leaf, open or shut', async () => {
        const { fixture, el, state, nav } = await render('/app/sales/pos');

        // Deep-linked, so it arrives open with the active child marked inside it.
        expect(el.querySelector('.shell__nav-list > .has-active.is-open')).toBeTruthy();
        expect(el.querySelector('.shell__nav--child.is-active')?.textContent?.trim()).toContain('Counter sale');

        nav.toggleGroup('sales');
        fixture.detectChanges();
        // Shut, and only one group is flagged: the stylesheet draws the soft hint on this state.
        expect(rows(el, '.shell__nav-list > .has-active').length).toBe(1);
        expect(el.querySelector('.shell__nav-list > .has-active.is-open')).toBeNull();
    });

    it('renders children whether the group is open or shut, and keeps shut ones out of the tab order', async () => {
        const { fixture, el, nav } = await render();
        // Present even while shut: the open and close states are a transition, and an element that
        // is not in the DOM cannot animate.
        expect(rows(el, '.shell__nav--child').length).toBe(4);
        expect(rows(el, '.shell__nav--child').every((a) => a.getAttribute('tabindex') === '-1')).toBe(true);

        nav.toggleGroup('sales');
        fixture.detectChanges();
        const open = el.querySelector('.shell__children.is-open');
        expect(open).toBeTruthy();
        expect(rows(open as HTMLElement, '.shell__nav--child').every((a) => a.getAttribute('tabindex') === null)).toBe(true);
    });

    it('groups matches by the section they live under, and omits sections that match nothing', async () => {
        const { search } = await render();
        // Counter sale and Products both carry the tag; nothing under Sales matches on label.
        search.onSearch('sell');

        const groups = search.groups();
        expect(groups.map((g) => g.id)).toEqual(['sales', 'inventory']);
        expect(groups.map((g) => g.rows.map((r) => r.item.id))).toEqual([['sales-pos'], ['products']]);
    });

    it('counts the matches in each section', async () => {
        const { search } = await render();
        search.onSearch('order');
        expect(search.groups().map((g) => [g.id, g.count])).toEqual([['sales', 2]]);
    });

    it('numbers rows across groups so the arrow keys walk the panel in painted order', async () => {
        const { search } = await render();
        search.onSearch('sell');
        expect(search.groups().flatMap((g) => g.rows.map((r) => r.index))).toEqual([0, 1]);
    });

    it('reports no match rather than showing empty groups', async () => {
        const { search } = await render();
        search.onSearch('zzzz');
        expect(search.noMatch()).toBe(true);
        expect(search.groups()).toEqual([]);
    });

    it('matches a Bengali synonym, so both languages reach the same page', async () => {
        const { search } = await render();
        search.onSearch('কাউন্টার');
        expect(search.rows().map((i) => i.id)).toEqual(['sales-pos']);
    });

    it('shows where the person has been once the field is emptied again', async () => {
        const { search } = await render('/app/sales/pos');
        search.onSearch('');
        const recent = search.groups();
        expect(recent.length).toBe(1);
        expect(recent[0].labelKey).toBe('shell.recent');
        expect(recent[0].rows.map((r) => r.item.id)).toEqual(['sales-pos']);
    });

    it('opens the group a search result lands in, so the rail shows where you went', async () => {
        const { nav, search } = await render();
        search.onSearch('online');
        search.go(search.rows()[0]);
        expect(nav.openGroup()).toBe('sales');
        expect(search.term()).toBe('');
    });

    it('never opens two header panels at once', async () => {
        const { state, search } = await render();
        state.openSearchPanel();
        expect(state.openPanel()).toBe('search');

        state.togglePanel('account');
        expect(state.openPanel()).toBe('account');
    });

    it('puts the menu in a drawer on a phone, with its own brand row and way out', async () => {
        await atPhoneWidth(async () => {
            const { fixture, el, state } = await render();
            // The rail is not docked into the shell at this width, so it is not in the frame.
            expect(el.querySelector('.shell__body .shell__sider')).toBeNull();

            state.toggleMobile();
            fixture.detectChanges();
            await fixture.whenStable();

            const head = overlay('[data-shell=drawer-head]');
            expect(head).toBeTruthy();
            expect(head?.querySelector('[data-shell=drawer-head] span')?.textContent?.trim()).toBe('Samiha Style Studio');
            expect(head?.querySelector('button')).toBeTruthy();
        });
    });

    it('keeps the rail docked in the frame on a wide window', async () => {
        const { el } = await render();
        // Anchored on the component element rather than a styling class. The classes are Tailwind
        // utilities now, so a class name here would assert how the rail looks in order to find out
        // where it is, and would break on any restyle that changed nothing structural.
        expect(el.querySelector('main')?.previousElementSibling?.tagName.toLowerCase()).toBe('sider');
        expect(el.querySelector('sider')).toBeTruthy();
    });

    it('opens search as a sheet on a phone, in a container that is not the desktop dropdown', async () => {
        await atPhoneWidth(async () => {
            const { fixture, el, search } = await render();
            // The field is not in the bar at this width, so the bar carries the way in instead.
            expect(el.querySelector('header button[aria-label="shell.searchPlaceholder"]')).toBeTruthy();
            expect(el.querySelector('[data-shell=search]')).toBeNull();

            search.requestFocus();
            fixture.detectChanges();
            await fixture.whenStable();

            expect(overlay('.sf-sheet')).toBeTruthy();
            // The bug this replaced: the sheet reused .shell__panel and inherited a 340px
            // min-width meant for a desktop popover, so every row came out wider than the screen.
            expect(overlay('.sf-sheet')?.classList.contains('shell__panel')).toBe(false);
            expect(overlay('[data-shell=search-panel]')).toBeNull();
        });
    });

    // These two were one test until the shell's width moved into a root-provided service. It
    // reads `matchMedia` once when it is first constructed and follows the change event after
    // that, which is right for an app where the shell outlives every page, but it means a second
    // `render()` in the same test does not re-read the width: the service is already built. So the
    // phone half gets its own test, where the stub is in place before anything constructs it.
    // The shell's utilities are split between a static `class` and a `[class]` binding that picks
    // the tone. That only works because Angular merges the two rather than letting the binding
    // replace the attribute, and every converted template in the shell now leans on it, so it is
    // asserted once here rather than assumed everywhere.
    it('merges the static utility classes with the bound ones', async () => {
        const { el } = await render();
        const badge = el.querySelector('badge span')!;
        expect(badge.classList.contains('uppercase')).toBe(true); // static
        expect(badge.classList.contains('text-n-500')).toBe(true); // bound
    });

    it('renders exactly one search field on a wide window', async () => {
        const { el } = await render();
        // Two would mean the focus call could reach a hidden copy instead of the live one, which
        // is why the wide-window block is not rendered at all on a phone rather than hidden.
        expect(el.querySelectorAll('input[role="combobox"]').length).toBe(1);
    });

    it('keeps the search field out of the frame on a phone, and puts it in the sheet', async () => {
        await atPhoneWidth(async () => {
            const phone = await render();
            expect(phone.el.querySelectorAll('input[role="combobox"]').length).toBe(0);

            phone.search.requestFocus();
            phone.fixture.detectChanges();
            await phone.fixture.whenStable();
            expect(overlay('.sf-sheet input[role="combobox"]')).toBeTruthy();
        });
    });
    it('leaves the stored desktop collapse alone on a phone, and still opens groups', async () => {
        await atPhoneWidth(async () => {
            localStorage.setItem('sf_sider_collapsed', 'true');
            const { fixture, el, state, nav } = await render();

            // The preference is untouched, it just does not apply where there is no rail.
            expect(state.collapsed()).toBe(true);
            expect(state.railCollapsed()).toBe(false);
            expect(el.querySelector('.shell.is-collapsed')).toBeNull();

            state.toggleMobile();
            nav.toggleGroup('sales');
            fixture.detectChanges();
            await fixture.whenStable();
            // The bug: the group row opened while its children stayed shut, because the shut
            // condition read the stored preference rather than the width being used.
            expect(overlay('.shell__children.is-open')).toBeTruthy();
        });
    });
    it('never leaves the drawer open behind a panel, or a panel behind the drawer', async () => {
        const { state, notifications } = await render();

        // The drawer covers the whole screen on a phone, header included. Anything left open
        // behind it is stacked underneath with no way to reach it, which is what used to happen.
        state.toggleMobile();
        expect(state.mobileOpen()).toBe(true);

        state.togglePanel('notifications');
        expect(state.mobileOpen()).toBe(false);
        expect(state.openPanel()).toBe('notifications');

        state.toggleMobile();
        expect(state.openPanel()).toBeNull();
        expect(state.mobileOpen()).toBe(true);
    });

    it('closes the drawer when search opens, however search was reached', async () => {
        const { state, search } = await render();

        state.toggleMobile();
        search.requestFocus();
        expect(state.mobileOpen()).toBe(false);
        expect(state.openPanel()).toBe('search');

        state.toggleMobile();
        state.openSearchPanel();
        expect(state.mobileOpen()).toBe(false);
    });

    it('closes the open panel on Escape and clears the search term', async () => {
        const { cmp, state, search } = await render();
        search.onSearch('sales');
        cmp.onGlobalKey(new KeyboardEvent('keydown', { key: 'Escape' }));
        expect(state.openPanel()).toBeNull();
        expect(search.term()).toBe('');
    });

    it('ignores Enter once the panel is shut, so a stale cursor cannot navigate', async () => {
        const { cmp, search } = await render();
        search.onSearch('online');
        cmp.closePanel();

        const before = TestBed.inject(Router).url;
        search.onSearchKey(new KeyboardEvent('keydown', { key: 'Enter' }));
        expect(TestBed.inject(Router).url).toBe(before);
    });

    it('focuses the field on the platform accelerator, from anywhere in the app', async () => {
        const { fixture, el, cmp, state, search } = await render();
        cmp.onGlobalKey(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
        fixture.detectChanges();
        expect(state.openPanel()).toBe('search');

        // Focus is a tick behind the signal on purpose: on a phone the field is inside the block
        // the open state promotes into a modal, so it is not focusable until that has rendered.
        await new Promise((resolve) => setTimeout(resolve));
        expect(el.querySelector('[data-shell=search] input')).toBe(document.activeElement);
    });

    it('collapses and expands the rail on the accelerator, and remembers it per machine', async () => {
        const { cmp, state } = await render();
        cmp.onGlobalKey(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true }));
        expect(state.collapsed()).toBe(true);
        expect(localStorage.getItem('sf_sider_collapsed')).toBe('true');
    });

    it('opens the shortcuts list on a bare question mark, but not while someone is typing one', async () => {
        const { el, cmp, state } = await render();

        const field = el.querySelector('[data-shell=search] input') as HTMLInputElement;
        field.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true }));
        expect(state.shortcutsOpen()).toBe(false);

        cmp.onGlobalKey(new KeyboardEvent('keydown', { key: '?' }));
        expect(state.shortcutsOpen()).toBe(true);
    });

    it('still narrows the rail on a wide window with the same preference stored', async () => {
        localStorage.setItem('sf_sider_collapsed', 'true');
        const { el, state } = await render();
        expect(state.railCollapsed()).toBe(true);
        // The rail width is a custom property bound on the frame, so this is what "collapsed"
        // actually renders as. The header and the sider both measure from it.
        expect(el.querySelector<HTMLElement>(':scope > div')?.style.getPropertyValue('--sider')).toBe('64px');
        // The rail drops its labels when it narrows, which is what a 64px column means. Asserted
        // on the rendered result rather than a class, because the collapse is bound per element now.
        expect(el.querySelector('.shell__nav-list > a span')).toBeNull();
    });
    it('names the row in the tooltip once the rail is collapsed, and not before', async () => {
        const { fixture, state, nav } = await render();
        const dashboard = item('dashboard');

        // Expanded: the label is already on screen, so the tooltip carries the description.
        // This fixture has none, which is exactly the case that used to show no tooltip at all.
        expect(nav.rowTitle(dashboard)).toBe('');

        state.toggleCollapsed();
        expect(nav.rowTitle(dashboard)).toBe('Dashboard');
    });

    it('answers a tap on a disabled feature with the reason, in the current language', async () => {
        const { nav, language } = await render();
        const message = TestBed.inject(NzMessageService);
        const shown: string[] = [];
        vi.spyOn(message, 'info').mockImplementation(((content: string) => {
            shown.push(content);
            return {} as never;
        }) as never);

        const disabled = item('activity');
        nav.explainDisabled(disabled, new MouseEvent('click'));
        expect(shown).toEqual(['Recording already, the page is next.']);

        language.use('bn');
        nav.explainDisabled(disabled, new MouseEvent('click'));
        expect(shown[1]).toBe('রেকর্ড হচ্ছে, পেজটি পরের ধাপে।');
    });

    it('falls back to shell copy when the server sends no reason', async () => {
        const { nav } = await render();
        const message = TestBed.inject(NzMessageService);
        const shown: string[] = [];
        vi.spyOn(message, 'info').mockImplementation(((content: string) => {
            shown.push(content);
            return {} as never;
        }) as never);

        nav.explainDisabled(leaf('mystery', null, { isDisabled: true }), new MouseEvent('click'));
        expect(shown[0]).toBe('shell.soonReason');
    });

    it('shows the unread dot only while something is unread, and clears it on mark all read', async () => {
        const { fixture, el, notifications } = await render();
        expect(el.querySelector('[data-shell=bell-dot]')).toBeTruthy();

        notifications.markAllRead();
        fixture.detectChanges();
        expect(notifications.unread()).toBe(0);
        expect(el.querySelector('[data-shell=bell-dot]')).toBeNull();
    });

    it('marks one alert read by opening it', async () => {
        const { notifications } = await render();
        const before = notifications.unread();
        const unread = notifications.items().find((n) => !n.readAt)!;

        notifications.markRead(unread.id);
        expect(notifications.unread()).toBe(before - 1);
    });
});

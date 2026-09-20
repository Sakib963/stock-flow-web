import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ActionEvent } from '@app/core/models/config.model';
import { PageHeaderConfig } from '@app/core/models/page-header.model';
import { MenuItem, SessionPayload } from '@app/core/models/session.model';
import { SessionService } from '@app/core/services/session/session.service';
import { PageHeaderComponent } from './page-header.component';

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
    leaf('dashboard', '/app/dashboard'),
    leaf('configuration', null, {
        label: { en: 'Configuration', bn: 'কনফিগারেশন' },
        children: [leaf('categories', '/app/configuration/categories', { label: { en: 'Categories', bn: 'ক্যাটাগরি' }, description: { en: 'Create the product groups, like Saree or Cosmetics, that every product is filed under.', bn: 'পণ্যের ক্যাটাগরি তৈরি করুন, যেমন শাড়ি বা কসমেটিকস, প্রতিটি পণ্য যার নিচে থাকে।' } })],
    }),
];

const HEADER: PageHeaderConfig = {
    count: true,
    actions: [
        { key: 'export', label: 'Export', icon: 'lucideDownload', permission: 'configuration.category.export', run: { kind: 'download', endpoint: APIEndpoint.GET_CATEGORY_LIST, format: 'xlsx' } },
        { key: 'new', label: 'New category', icon: 'lucidePlus', primary: true, permission: 'configuration.category.create', run: { kind: 'navigate', route: '/app/configuration/categories/new' } },
        { key: 'print', label: 'Print', icon: 'lucidePrinter', permission: 'configuration.category.view', run: { kind: 'emit' } },
    ],
};

describe('PageHeaderComponent', () => {
    async function render(permissions: string[], inputs: Record<string, unknown> = { config: HEADER, count: 12 }) {
        await TestBed.configureTestingModule({
            imports: [PageHeaderComponent],
            providers: [provideRouter([{ path: 'app/configuration/categories', children: [] }, { path: 'app/configuration/categories/new', children: [] }, { path: 'app/dashboard', children: [] }]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();

        const payload: SessionPayload = { version: 'v1', user: { name: 'Samiha', email: 's@x.com', mobile_number: null, photo: null, designation: null, role: 'Owner' }, business: { name: null, logoUrl: null, orderSystem: 'both' }, permissions, menu, counters: { notifications: 0 } };
        const load = TestBed.inject(SessionService).load('session-a');
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO))
            .flush({ code: 200, data: payload });
        await load;
        await TestBed.inject(Router).navigateByUrl('/app/configuration/categories');

        const fixture = TestBed.createComponent(PageHeaderComponent);
        for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
        fixture.detectChanges();
        await fixture.whenStable();
        return { fixture, el: fixture.nativeElement as HTMLElement };
    }

    const actionKeys = (el: HTMLElement) => Array.from(el.querySelectorAll('button[data-action]')).map((b) => b.getAttribute('data-action'));

    it('takes its title, lead and breadcrumb from the menu, so no page keeps its own copy', async () => {
        const { el } = await render([]);

        expect(el.querySelector('h1')?.textContent?.trim()).toBe('Categories');
        expect(el.querySelector('[data-page-header="lead"]')?.textContent?.trim()).toBe('Create the product groups, like Saree or Cosmetics, that every product is filed under.');
        const crumbs = el.querySelector('[data-page-header="breadcrumb"]')?.textContent ?? '';
        expect(crumbs).toContain('Configuration');
        expect(crumbs).toContain('Categories');
    });

    it('leaves Home out of the breadcrumb for someone who cannot open the dashboard', async () => {
        const without = await render([]);
        expect(without.el.querySelector('[data-page-header="breadcrumb"]')?.textContent).not.toContain('shell.home');

        TestBed.resetTestingModule();
        const withDashboard = await render(['dashboard.overview.view']);
        expect(withDashboard.el.querySelector('[data-page-header="breadcrumb"]')?.textContent).toContain('shell.home');
    });

    it('leaves out an action the person lacks, instead of greying it', async () => {
        const { el } = await render(['configuration.category.create']);

        expect(actionKeys(el)).toEqual(['new']);
    });

    it('shows at most two actions and puts the primary one last', async () => {
        const { el } = await render(['configuration.category.create', 'configuration.category.export', 'configuration.category.view']);

        expect(actionKeys(el)).toEqual(['export', 'new']);
        expect(el.querySelector('button[data-action="new"]')?.classList).toContain('ant-btn-primary');
        expect(el.querySelector('[aria-label="list.moreActions"]')).not.toBeNull();
    });

    it('shows the record count beside the title only once it is known', async () => {
        const known = await render([], { config: HEADER, count: 1250 });
        expect(known.el.querySelector('[data-page-header="count"]')?.textContent?.trim()).toBe('1,250');

        TestBed.resetTestingModule();
        const unknown = await render([], { config: HEADER, count: null });
        expect(unknown.el.querySelector('[data-page-header="count"]')).toBeNull();
    });

    it('holds the count place with a placeholder while the list is loading', async () => {
        const { el } = await render([], { config: HEADER, count: null, countPending: true });

        expect(el.querySelector('[data-page-header="count"]')).toBeNull();
        expect(el.querySelector('[data-page-header="count-placeholder"]')).not.toBeNull();
    });

    it('leaves the count out entirely when nothing is loading, so a failed load does not pulse for ever', async () => {
        const { el } = await render([], { config: HEADER, count: null, countPending: false });

        expect(el.querySelector('[data-page-header="count"]')).toBeNull();
        expect(el.querySelector('[data-page-header="count-placeholder"]')).toBeNull();
    });

    it('dims the count it already has while a newer one is on the way, instead of swapping it for a placeholder', async () => {
        const { el } = await render([], { config: HEADER, count: 1250, countPending: true });

        const count = el.querySelector('[data-page-header="count"]');
        expect(count?.textContent?.trim()).toBe('1,250');
        expect(count?.classList).toContain('opacity-55');
        expect(el.querySelector('[data-page-header="count-placeholder"]')).toBeNull();
    });

    it('opens a navigate action itself and hands any other kind to the page', async () => {
        const { fixture, el } = await render(['configuration.category.create', 'configuration.category.export']);
        const emitted: ActionEvent[] = [];
        fixture.componentInstance.action.subscribe((event) => emitted.push(event));

        (el.querySelector('button[data-action="new"]') as HTMLButtonElement).click();
        await fixture.whenStable();
        expect(TestBed.inject(Router).url).toBe('/app/configuration/categories/new');

        (el.querySelector('button[data-action="export"]') as HTMLButtonElement).click();
        expect(emitted.map((e) => e.action.key)).toEqual(['export']);
    });

    it('still works as a plain title and lead for a page with no config', async () => {
        const { el } = await render([], { title: 'Dashboard', lead: 'Good morning' });

        expect(el.querySelector('h1')?.textContent?.trim()).toBe('Dashboard');
        expect(el.querySelector('[data-page-header="lead"]')?.textContent?.trim()).toBe('Good morning');
    });
});

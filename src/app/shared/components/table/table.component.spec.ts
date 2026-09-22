import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { LayoutContext } from '@app/core/models/renderer.model';
import { SessionPayload } from '@app/core/models/session.model';
import { TableConfig } from '@app/core/models/table.model';
import { SessionService } from '@app/core/services/session/session.service';
import { provideRenderers } from '@app/shared/services/renderer-registry/renderer-registry.service';
import { TableComponent } from './table.component';

@Component({ selector: 'test-board', template: '<p data-board>{{ context().rows().length }} on the board</p>' })
class BoardLayoutComponent {
    readonly context = input.required<LayoutContext>();
}

const CATEGORIES: TableConfig = {
    key: 'configuration.category',
    rowKey: 'oid',
    source: { endpoint: APIEndpoint.GET_CATEGORY_LIST },
    open: { route: '/app/configuration/categories/:oid' },
    columns: [
        { key: 'category_code', label: 'Code', type: 'identifier', width: 110 },
        { key: 'name', label: 'Name', type: 'name', sub: 'description' },
        { key: 'margin', label: 'Margin', type: 'percent', width: 90, permission: 'configuration.category.margin' },
        { key: 'status', label: 'Status', type: 'status', width: 110, tones: { Active: { label: 'Active', tone: 'success' }, Inactive: { label: 'Inactive', tone: 'neutral' } } },
    ],
    layouts: [{ type: 'table' }],
    rowActions: [
        { key: 'view', label: 'View', icon: 'lucideEye', permission: 'configuration.category.view', stateful: false, run: { kind: 'navigate', route: '/app/configuration/categories/:oid' } },
        { key: 'deactivate', label: 'Deactivate', icon: 'lucideBan', permission: 'configuration.category.edit', run: { kind: 'emit' } },
    ],
    empty: { icon: 'lucideFolderTree', title: 'No categories yet', body: 'Categories group the products you sell.' },
};

/** The same list with the host owning the rows, for what is drawn rather than what is fetched. */
const PASSED: TableConfig = { ...CATEGORIES, source: undefined };

const ROWS = [
    { oid: 'c-1', category_code: 'SAR', name: 'Saree', description: 'Silk and cotton', status: 'Active', allowed_actions: ['deactivate'] },
    { oid: 'c-2', category_code: 'KUR', name: 'Kurti', description: null, status: 'Inactive' },
];

describe('TableComponent', () => {
    let http: HttpTestingController;

    async function setup(permissions: string[], providers: unknown[] = []) {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        await TestBed.configureTestingModule({
            imports: [TableComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...(providers as never[])],
        }).compileComponents();
        http = TestBed.inject(HttpTestingController);

        const payload: SessionPayload = { version: 'v1', user: { name: 'Samiha', email: 's@x.com', mobile_number: null, photo: null, designation: null, role: 'Owner' }, business: { name: null, logoUrl: null, orderSystem: 'both' }, permissions, menu: [], counters: { notifications: 0 } };
        const load = TestBed.inject(SessionService).load('session-a');
        http.expectOne((r) => r.url.includes(APIEndpoint.GET_USER_INFO)).flush({ code: 200, data: payload });
        await load;
    }

    afterEach(() => vi.useRealTimers());

    async function render(config: TableConfig = CATEGORIES, inputs: Record<string, unknown> = {}) {
        const fixture = TestBed.createComponent(TableComponent);
        fixture.componentRef.setInput('config', config);
        for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);
        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    }

    async function respond(fixture: { detectChanges(): void }, body: object) {
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST)).flush(body);
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();
    }

    it('loads by itself from its source, showing skeleton rows until the rows land', async () => {
        await setup([]);
        const { fixture, el } = await render();

        expect(el.querySelector('section')?.getAttribute('data-state')).toBe('loading');
        expect(el.querySelectorAll('[data-table="skeleton-row"]').length).toBe(20);

        await respond(fixture, { code: 200, message: 'ok', data: { rows: ROWS }, total: 2 });

        expect(el.querySelectorAll('[data-table="row"]').length).toBe(2);
        expect(el.textContent).toContain('Saree');
        expect(el.querySelector('[data-table="range"]')?.textContent).toContain('list.range');
    });

it('numbers every row from the page offset, so row one of page three is not called one', async () => {
        await setup([]);
        const { fixture, el, cmp } = await render();
        await respond(fixture, { code: 200, message: 'ok', data: { rows: ROWS }, total: 44 });

        const serialOf = () => [...el.querySelectorAll('[data-table="row"]')].map((row) => row.querySelector('td')?.textContent?.trim());
        expect(serialOf()).toEqual(['1', '2']);

        cmp.onPage(3);
        await vi.advanceTimersByTimeAsync(150);
        await respond(fixture, { code: 200, message: 'ok', data: { rows: ROWS }, total: 44 });

        expect(serialOf()).toEqual(['41', '42']);
    });

    it('draws no actions column at all for someone with none of its actions', async () => {
        await setup([]);
        const { el, cmp } = await render(PASSED, { rows: ROWS });

        expect(cmp.hasActions()).toBe(false);
        expect(el.querySelector('[data-row="actions"]')).toBeNull();
    });

    it('gives a row its menu where the person holds an action and the row allows it', async () => {
        await setup(['configuration.category.view', 'configuration.category.edit']);
        const { el, cmp } = await render(PASSED, { rows: ROWS });

        expect(cmp.hasActions()).toBe(true);
        expect(el.querySelectorAll('[data-row="actions"]').length).toBe(2);
    });

    it('leaves out a column the person may not see, such as a margin', async () => {
        await setup([]);
        const { fixture, el, cmp } = await render();
        await respond(fixture, { code: 200, message: 'ok', data: { rows: ROWS }, total: 2 });

        expect(cmp.columns().map((c) => c.key)).toEqual(['category_code', 'name', 'status']);
        expect(el.querySelector('thead')?.textContent).not.toContain('Margin');
    });

    it('offers a stateful action only where the server says the row allows it', async () => {
        await setup(['configuration.category.view', 'configuration.category.edit']);
        const { cmp } = await render(CATEGORIES, { rows: ROWS });

        expect(cmp.actionsFor(ROWS[0]).map((a) => a.key)).toEqual(['view', 'deactivate']);
        expect(cmp.actionsFor(ROWS[1]).map((a) => a.key)).toEqual(['view']);
    });

    it('offers no action at all without its permission, whatever the row allows', async () => {
        await setup([]);
        const { cmp } = await render(CATEGORIES, { rows: ROWS });

        expect(cmp.actionsFor(ROWS[0])).toEqual([]);
    });

    it('says "no categories yet" with nothing to show, and names what would be here', async () => {
        await setup([]);
        const { fixture, el } = await render();
        await respond(fixture, { code: 200, message: 'ok', data: { rows: [] }, total: 0 });

        expect(el.querySelector('[data-table="empty"]')?.textContent).toContain('No categories yet');
        expect(el.querySelector('[data-table="footer"]')).toBeNull();
    });

    it('keeps a failed load inside the card with a retry that asks again', async () => {
        await setup([]);
        const { fixture, el } = await render();
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST)).flush({}, { status: 500, statusText: 'Server Error' });
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();

        expect(el.querySelector('[data-table="error"]')?.textContent).toContain('list.serverBody');
        (el.querySelector('[data-table="retry"]') as HTMLButtonElement).click();
        await vi.advanceTimersByTimeAsync(0);
        await respond(fixture, { code: 200, message: 'ok', data: { rows: ROWS }, total: 2 });

        expect(el.querySelectorAll('[data-table="row"]').length).toBe(2);
    });

    it('offers no retry when the person is refused the list, because asking again will not help', async () => {
        await setup([]);
        const { fixture, el } = await render();
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST)).flush({}, { status: 403, statusText: 'Forbidden' });
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();

        expect(el.querySelector('[data-table="error"]')?.textContent).toContain('list.forbiddenTitle');
        expect(el.querySelector('[data-table="retry"]')).toBeNull();
    });

    it('draws rows its host passes when it has no source, without a request', async () => {
        await setup([]);
        const { el } = await render({ ...CATEGORIES, source: undefined }, { rows: ROWS, total: 2 });

        http.expectNone((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        expect(el.querySelectorAll('[data-table="row"]').length).toBe(2);
    });

    it('draws a registered layout with the same rows the table would show', async () => {
        await setup([], [provideRenderers('layout', { 'test.board': () => Promise.resolve(BoardLayoutComponent) })]);
        const board: TableConfig = { ...CATEGORIES, source: undefined, layouts: [{ type: 'component', key: 'board', label: 'Board', icon: 'lucideInbox', renderer: 'test.board', skeleton: 'cards' }] };
        const { fixture, el } = await render(board, { rows: ROWS });
        await vi.advanceTimersByTimeAsync(0);
        fixture.detectChanges();

        expect(el.querySelector('[data-board]')?.textContent).toBe('2 on the board');
    });
});

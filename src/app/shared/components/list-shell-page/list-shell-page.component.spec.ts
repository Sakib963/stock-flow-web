import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { ListShellPageConfig } from '@app/core/models/list-shell-page.model';
import { ListShellPageComponent } from './list-shell-page.component';

const CONFIG: ListShellPageConfig = {
    permission: 'configuration.category.view',
    header: { count: true },
    filter: {
        render: 'row',
        search: { placeholder: { en: 'Search', bn: 'খুঁজুন' } },
        fields: [
            { key: 'status', label: { en: 'Status', bn: 'অবস্থা' }, type: 'select', choices: [{ value: 'Active', label: { en: 'Active', bn: 'চালু' } }] },
            { key: 'shape', label: { en: 'Shape', bn: 'ধরন' }, type: 'select', default: 'all', choices: [{ value: 'all', label: { en: 'All', bn: 'সব' } }] },
        ],
    },
    table: {
        key: 'test.list',
        rowKey: 'oid',
        source: { endpoint: APIEndpoint.GET_CATEGORY_LIST },
        columns: [{ key: 'name', label: { en: 'Name', bn: 'নাম' }, type: 'name' }],
        layouts: [{ type: 'table' }],
        empty: { icon: 'lucideFolderTree', title: { en: 'Nothing yet', bn: 'কিছু নেই' }, body: { en: 'Add one', bn: 'একটি যোগ করুন' } },
    },
};

const PAGE = { code: 200, message: 'ok', data: { rows: [{ oid: 'c-1', name: 'Saree' }] }, total: 31 };

const WITH_STATS: ListShellPageConfig = {
    ...CONFIG,
    stats: [
        { key: 'active', label: { en: 'Active', bn: 'চালু' }, icon: 'lucideCheck', tone: 'success', filter: { status: 'Active' } },
        { key: 'inactive', label: { en: 'Inactive', bn: 'বন্ধ' }, icon: 'lucideCircleDashed' },
    ],
};

const STATS_PAGE = { ...PAGE, data: { ...PAGE.data, stats: { active: 7, inactive: 2 } } };

describe('ListShellPageComponent', () => {
    // The store remembers a list per tab, and every config here shares one key.
    beforeEach(() => sessionStorage.clear());
    afterEach(() => vi.useRealTimers());

    async function open(config: ListShellPageConfig = CONFIG, body: object = PAGE) {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
        await TestBed.configureTestingModule({
            imports: [ListShellPageComponent],
            providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();

        const fixture = TestBed.createComponent(ListShellPageComponent);
        fixture.componentRef.setInput('config', config);
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(0);

        const http = TestBed.inject(HttpTestingController);
        const first = http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        first.flush(body);
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();

        return { fixture, http, cmp: fixture.componentInstance, el: fixture.nativeElement as HTMLElement, first };
    }

    it('opens the list with each field at its configured default, in the very first request', async () => {
        const { first } = await open();

        expect(first.request.params.get('shape')).toBe('all');
        expect(first.request.params.has('status')).toBe(false);
    });

    it('feeds the header count from the same request that filled the rows', async () => {
        const { el } = await open();

        expect(el.querySelector('[data-page-header="count"]')?.textContent?.trim()).toBe('31');
        expect(el.querySelectorAll('[data-table="row"]').length).toBe(1);
    });

    it('carries what was typed into one request, after the typing has stopped', async () => {
        const { fixture, http, el } = await open();

        const box = el.querySelector('[data-filter="search"] input') as HTMLInputElement;
        box.value = 'sar';
        box.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        // Nothing goes out while someone is still typing.
        http.expectNone((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        await vi.advanceTimersByTimeAsync(300);

        const sent = http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        expect(sent.request.params.get('search')).toBe('sar');
        expect(sent.request.params.get('offset')).toBe('0');
        sent.flush(PAGE);
    });

    it('sends a chosen filter as its own parameter, and reads it back as a chip', async () => {
        const { fixture, http, cmp, el } = await open();

        cmp.onFilters({ status: 'Active' });
        await vi.advanceTimersByTimeAsync(150);

        const sent = http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        expect(sent.request.params.get('status')).toBe('Active');
        sent.flush(PAGE);
        await vi.advanceTimersByTimeAsync(400);
        fixture.detectChanges();

        expect(el.querySelector('[data-filter="chip"]')?.textContent).toContain('Active');
    });

    it('asks for stats only when a config shows them, and draws a placeholder until they land', async () => {
        const plain = await open();
        expect(plain.first.request.params.has('include')).toBe(false);
        expect(plain.el.querySelector('[data-page=stats]')).toBeNull();

        TestBed.resetTestingModule();
        const { first, el } = await open(WITH_STATS, PAGE);

        expect(first.request.params.get('include')).toBe('stats');
        // The response carried no stats, so neither card invents a zero.
        expect(el.querySelectorAll('[data-stat] .tabular-nums').length).toBe(0);
    });

    it('shows each stat card and narrows the list to the one that was clicked', async () => {
        const { fixture, http, el } = await open(WITH_STATS, STATS_PAGE);

        const cards = [...el.querySelectorAll('[data-stat]')];
        expect(cards.map((c) => c.querySelector('.tabular-nums')?.textContent?.trim())).toEqual(['7', '2']);

        // Only the card with a filter is a button; the other reports and does nothing.
        expect(cards.map((c) => c.tagName)).toEqual(['BUTTON', 'DIV']);

        (cards[0] as HTMLButtonElement).click();
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(150);

        const sent = http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        expect(sent.request.params.get('status')).toBe('Active');
        sent.flush(STATS_PAGE);
    });

    it('does not undo the filters someone set when the record above it changes', async () => {
        const { fixture, http, cmp } = await open();

        cmp.onFilters({ status: 'Active', shape: null });
        await vi.advanceTimersByTimeAsync(150);
        http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST)).flush(PAGE);
        await vi.advanceTimersByTimeAsync(400);

        fixture.componentRef.setInput('context', { oid: 'other' });
        fixture.detectChanges();
        await vi.advanceTimersByTimeAsync(150);

        const sent = http.expectOne((r) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST));
        expect(sent.request.params.get('status')).toBe('Active');
        expect(sent.request.params.has('shape')).toBe(false);
        sent.flush(PAGE);
    });
});

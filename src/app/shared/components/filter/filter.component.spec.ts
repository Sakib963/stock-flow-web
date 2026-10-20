import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzDateFnsAdapter } from 'ng-zorro-antd/core/time';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { TranslateService, provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FilterConfig, FilterField, RemoteChoices } from '@app/core/models/filter.model';
import { SessionService } from '@app/core/services/session/session.service';
import { FilterComponent } from './filter.component';

const STATUS = {
    key: 'status',
    label: { en: 'Status', bn: 'অবস্থা' },
    type: 'select' as const,
    choices: [
        { value: 'Active', label: { en: 'Active', bn: 'চালু' } },
        { value: 'Inactive', label: { en: 'Inactive', bn: 'বন্ধ' } },
    ],
};

const CONFIG: FilterConfig = {
    render: 'row',
    search: { placeholder: { en: 'Search', bn: 'খুঁজুন' } },
    fields: [STATUS],
};

describe('FilterComponent', () => {
    async function render(config: FilterConfig = CONFIG, values: Record<string, string | null> = {}) {
        await TestBed.configureTestingModule({
            imports: [FilterComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideNzDateFnsAdapter(), provideTranslateService({ fallbackLang: 'en' }), { provide: SessionService, useValue: { can: (code: string) => code !== 'configuration.brands.view' } }],
        }).compileComponents();

        const fixture = TestBed.createComponent(FilterComponent);
        TestBed.inject(TranslateService).setTranslation('en', { list: { dateSpan: '{{from}} to {{to}}', dateFrom: 'from {{from}}', dateTo: 'until {{to}}' } });
        TestBed.inject(TranslateService).use('en');
        fixture.componentRef.setInput('config', config);
        fixture.componentRef.setInput('values', values);
        fixture.detectChanges();
        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    }

    it('reads an applied filter back as a chip carrying the label, not the value in the query string', async () => {
        const { cmp } = await render(CONFIG, { status: 'Active' });

        expect(cmp.chips().map((c) => c.text)).toEqual(['Status: Active']);
    });

    it('names every value of a multi-select in one chip, and sends them as one parameter', async () => {
        const many: FilterConfig = { ...CONFIG, fields: [{ ...STATUS, type: 'multi-select' }] };
        const { cmp } = await render(many, { status: 'Active,Inactive' });

        expect(cmp.chips()[0].text).toBe('Status: Active, Inactive');

        cmp.setList(cmp.fields()[0], ['Inactive']);
        expect(cmp.values()['status']).toBe('Inactive');
    });

    it('empties a filter when its chip is closed, and leaves the search alone', async () => {
        const { cmp } = await render(CONFIG, { status: 'Active' });
        cmp.search.set('saree');

        cmp.clear(cmp.fields()[0]);

        expect(cmp.values()['status']).toBeNull();
        expect(cmp.search()).toBe('saree');
        expect(cmp.chips()).toEqual([]);
    });

    it('offers a reset whenever anything narrows the list, search included, and undoes all of it', async () => {
        const { cmp } = await render(CONFIG);
        expect(cmp.anyApplied()).toBe(false);

        cmp.search.set('saree');
        expect(cmp.anyApplied()).toBe(true);

        cmp.set(cmp.fields()[0], 'Active');
        cmp.resetAll();

        expect(cmp.values()['status']).toBeNull();
        expect(cmp.search()).toBe('');
        expect(cmp.anyApplied()).toBe(false);
    });

    it('refuses to close a required filter, because the list has nothing to show without it', async () => {
        const required: FilterConfig = { ...CONFIG, fields: [{ ...STATUS, required: true }] };
        const { cmp } = await render(required, { status: 'Active' });

        cmp.clear(cmp.fields()[0]);
        cmp.resetAll();

        expect(cmp.values()['status']).toBe('Active');
    });

    it('leaves out a field it cannot draw yet rather than showing a control that does nothing', async () => {
        const remote: FilterConfig = {
            ...CONFIG,
            fields: [STATUS, { key: 'total', label: { en: 'Total', bn: 'মোট' }, type: 'number-range', fromKey: 'min', toKey: 'max', format: 'money' }, { key: 'supplier', label: { en: 'Supplier', bn: 'সরবরাহকারী' }, type: 'select', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST, search: { key: 'search' } } }],
        };
        const { cmp } = await render(remote);

        expect(cmp.fields().map((f) => f.key)).toEqual(['status']);
    });

    describe('choices loaded from an endpoint', () => {
        const SOURCE: RemoteChoices = { endpoint: APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN };
        const CATEGORY = { key: 'category_oid', label: { en: 'Category', bn: 'ক্যাটাগরি' }, type: 'select' as const, choices: SOURCE };
        const MODAL: FilterConfig = { render: 'modal', fields: [STATUS, CATEGORY] };
        const ROWS = { code: 200, message: 'ok', data: [{ value: 'c1', label: 'Clothing' }] };
        const isDropdown = (r: { url: string }) => r.url.endsWith(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN);

        afterEach(() => TestBed.inject(HttpTestingController).verify());

        it('asks for nothing until the filter is opened, then loads with the picker showing it is busy', async () => {
            const { cmp } = await render(MODAL);
            const http = TestBed.inject(HttpTestingController);
            http.expectNone(isDropdown);

            cmp.openPanel();
            const field = cmp.fields()[1];
            expect(cmp.remoteLoading(field)).toBe(true);

            http.expectOne(isDropdown).flush(ROWS);
            expect(cmp.remoteLoading(field)).toBe(false);
            expect(cmp.choicesOf(field)).toEqual([{ value: 'c1', label: 'Clothing' }]);
            cmp.closePanel();
        });

        it('names a category that arrived in the URL, which is the one reason to load before the filter opens', async () => {
            const { cmp } = await render(MODAL, { category_oid: 'c1' });
            TestBed.inject(HttpTestingController).expectOne(isDropdown).flush(ROWS);

            expect(cmp.chips().map((c) => c.text)).toEqual(['Category: Clothing']);
        });

        it('reopening the filter reuses the categories rather than asking again', async () => {
            const { cmp } = await render(MODAL);
            const http = TestBed.inject(HttpTestingController);
            cmp.openPanel();
            http.expectOne(isDropdown).flush(ROWS);
            cmp.closePanel();

            cmp.openPanel();
            http.expectNone(isDropdown);
            expect(cmp.choicesOf(cmp.fields()[1])).toEqual([{ value: 'c1', label: 'Clothing' }]);
            cmp.closePanel();
        });

        it('leaves out a remote field whose endpoint the person may not call', async () => {
            const { cmp } = await render({ render: 'modal', fields: [STATUS, { ...CATEGORY, permission: 'configuration.brands.view' }] });
            expect(cmp.fields().map((f) => f.key)).toEqual(['status']);
        });
    });

    describe('a date range', () => {
        const PLACED: FilterConfig = { render: 'modal', fields: [{ key: 'placed', label: { en: 'Placed', bn: 'সময়' }, type: 'date-range', fromKey: 'date_from', toKey: 'date_to', presets: ['today', 'last-7-days'], max: 'today' }] };
        const range = (cmp: FilterComponent) => cmp.fields()[0] as Extract<FilterField, { type: 'date-range' }>;

        it('writes both ends at once as calendar days, and reads them back as one chip', async () => {
            const { cmp } = await render(PLACED);
            cmp.setRange(range(cmp), [new Date(2026, 9, 1, 23, 30), new Date(2026, 9, 12)]);
            expect(cmp.values()).toEqual({ date_from: '2026-10-01', date_to: '2026-10-12' });
            expect(cmp.chips().map((c) => c.text)).toEqual(['Placed: 1 Oct 2026 to 12 Oct 2026']);
        });

        it('reads one day as one date, and a link holding only a start as from', async () => {
            const { cmp } = await render(PLACED, { date_from: '2026-10-05', date_to: '2026-10-05' });
            expect(cmp.chips()[0].text).toBe('Placed: 5 Oct 2026');
            TestBed.resetTestingModule();
            const open = await render(PLACED, { date_from: '2026-10-05' });
            expect(open.cmp.chips()[0].text).toBe('Placed: from 5 Oct 2026');
        });

        it('empties both ends when its chip is closed or the filters are cleared', async () => {
            const { cmp } = await render(PLACED, { date_from: '2026-10-01', date_to: '2026-10-12' });
            cmp.clear(range(cmp));
            expect(cmp.values()).toEqual({ date_from: null, date_to: null });
            expect(cmp.chips()).toEqual([]);
        });

        it('offers its presets on the business calendar, and no day after its max', async () => {
            const { cmp } = await render(PLACED);
            const setup = cmp.rangeSetup()['placed'];
            const [from, to] = setup.presets['list.datePresets.last-7-days'];
            expect(Math.round((to.getTime() - from.getTime()) / 86_400_000)).toBe(6);
            const tomorrow = new Date(to);
            tomorrow.setDate(tomorrow.getDate() + 1);
            expect(setup.disabled(to)).toBe(false);
            expect(setup.disabled(tomorrow)).toBe(true);
        });

        it('is drawn as a range picker in the panel', async () => {
            const { cmp, el } = await render({ ...PLACED, render: 'row' });
            expect(cmp.fields().length).toBe(1);
            expect(el.querySelector('nz-range-picker')).not.toBeNull();
        });
    });
});

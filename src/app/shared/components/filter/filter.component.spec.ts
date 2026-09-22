import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { FilterConfig } from '@app/core/models/filter.model';
import { FilterComponent } from './filter.component';

const STATUS = { key: 'status', label: { en: 'Status', bn: 'অবস্থা' }, type: 'select' as const, choices: [{ value: 'Active', label: { en: 'Active', bn: 'চালু' } }, { value: 'Inactive', label: { en: 'Inactive', bn: 'বন্ধ' } }] };

const CONFIG: FilterConfig = {
    render: 'row',
    search: { placeholder: { en: 'Search', bn: 'খুঁজুন' } },
    fields: [STATUS],
};

describe('FilterComponent', () => {
    async function render(config: FilterConfig = CONFIG, values: Record<string, string | null> = {}) {
        await TestBed.configureTestingModule({
            imports: [FilterComponent],
            providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();

        const fixture = TestBed.createComponent(FilterComponent);
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
            fields: [STATUS, { key: 'placed', label: { en: 'Placed', bn: 'দেওয়া' }, type: 'date-range', fromKey: 'from', toKey: 'to' }, { key: 'supplier', label: { en: 'Supplier', bn: 'সরবরাহকারী' }, type: 'select', choices: { endpoint: APIEndpoint.GET_CATEGORY_LIST } }],
        };
        const { cmp } = await render(remote);

        expect(cmp.fields().map((f) => f.key)).toEqual(['status']);
    });
});

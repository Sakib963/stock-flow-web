import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { Column, TablePreferences } from '@app/core/models/table.model';
import { ColumnPickerComponent } from '@app/shared/components/table/components/column-picker/column-picker.component';

const column = (key: string, extra: Partial<Column> = {}): Column => ({ key, label: key, type: 'text', ...extra }) as Column;

const COLUMNS: Column[] = [column('code', { pin: 'start', locked: true }), column('name', { locked: true }), column('supplier'), column('stock'), column('status')];

describe('ColumnPickerComponent', () => {
    let fixture: ComponentFixture<ColumnPickerComponent>;
    let picker: ColumnPickerComponent;

    const prefs = (over: Partial<TablePreferences> = {}): TablePreferences => ({ layout: 'table', density: 'compact', order: ['code', 'name', 'supplier', 'stock', 'status'], hidden: [], ...over });

    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ColumnPickerComponent], providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();

        fixture = TestBed.createComponent(ColumnPickerComponent);
        picker = fixture.componentInstance;
        fixture.componentRef.setInput('columns', COLUMNS);
        fixture.componentRef.setInput('preferences', prefs());
        fixture.detectChanges();
    });

    it('offers the movable columns and lists the pinned ones apart', () => {
        expect(picker.rows().map((c) => c.key)).toEqual(['name', 'supplier', 'stock', 'status']);
        expect(picker.pinned().map((c) => c.key)).toEqual(['code']);
    });

    it('hides a column and shows it again', () => {
        picker.toggle(COLUMNS[2]);
        expect(picker.preferences().hidden).toEqual(['supplier']);

        picker.toggle(COLUMNS[2]);
        expect(picker.preferences().hidden).toEqual([]);
    });

    it('refuses to hide a locked column, however it is asked', () => {
        picker.toggle(COLUMNS[1]);

        expect(picker.preferences().hidden).toEqual([]);
        expect(picker.canToggle(COLUMNS[1])).toBe(false);
    });

    it('refuses to hide the last column standing, so the table is never blank', () => {
        fixture.componentRef.setInput('preferences', prefs({ hidden: ['supplier', 'stock'] }));
        fixture.detectChanges();

        // 'code' and 'name' are locked, so they are still shown: 'status' is not the last one.
        expect(picker.canToggle(COLUMNS[4])).toBe(true);

        const only = [column('name'), column('status')];
        fixture.componentRef.setInput('columns', only);
        fixture.componentRef.setInput('preferences', prefs({ order: ['name', 'status'], hidden: ['status'] }));
        fixture.detectChanges();

        expect(picker.canToggle(only[0])).toBe(false);
    });

    it('moves a row down with Alt and the down arrow', () => {
        picker.onKeydown(0, new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));

        expect(picker.preferences().order.filter((k) => k !== 'code')).toEqual(['supplier', 'name', 'stock', 'status']);
    });

    it('moves a row up with Alt and the up arrow', () => {
        picker.onKeydown(2, new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));

        expect(picker.preferences().order.filter((k) => k !== 'code')).toEqual(['name', 'stock', 'supplier', 'status']);
    });

    it('leaves the order alone at either end of the list', () => {
        picker.onKeydown(0, new KeyboardEvent('keydown', { key: 'ArrowUp', altKey: true }));
        picker.onKeydown(3, new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));

        expect(picker.rows().map((c) => c.key)).toEqual(['name', 'supplier', 'stock', 'status']);
    });

    it('ignores a bare arrow, so the arrows still move focus through the list', () => {
        picker.onKeydown(0, new KeyboardEvent('keydown', { key: 'ArrowDown' }));

        expect(picker.rows().map((c) => c.key)).toEqual(['name', 'supplier', 'stock', 'status']);
    });

    it('does not reorder when the table turned reorder off', () => {
        fixture.componentRef.setInput('canReorder', false);
        fixture.detectChanges();

        picker.onKeydown(0, new KeyboardEvent('keydown', { key: 'ArrowDown', altKey: true }));

        expect(picker.rows().map((c) => c.key)).toEqual(['name', 'supplier', 'stock', 'status']);
    });

    it('does not hide when the table turned hiding off', () => {
        fixture.componentRef.setInput('canHide', false);
        fixture.detectChanges();

        picker.toggle(COLUMNS[2]);

        expect(picker.preferences().hidden).toEqual([]);
    });

    it('puts the config back, order and hidden together', () => {
        fixture.componentRef.setInput('preferences', prefs({ order: ['status', 'stock', 'supplier', 'name', 'code'], hidden: ['supplier'] }));
        fixture.detectChanges();

        picker.reset();

        expect(picker.preferences().order).toEqual(['code', 'name', 'supplier', 'stock', 'status']);
        expect(picker.preferences().hidden).toEqual([]);
    });

    it('resets back to the columns the config hides, not to all of them showing', () => {
        const columns = [...COLUMNS, column('cost', { hidden: true })];
        fixture.componentRef.setInput('columns', columns);
        fixture.componentRef.setInput('preferences', prefs({ order: ['code', 'name', 'supplier', 'stock', 'status', 'cost'], hidden: [] }));
        fixture.detectChanges();

        picker.reset();

        expect(picker.preferences().hidden).toEqual(['cost']);
    });
});

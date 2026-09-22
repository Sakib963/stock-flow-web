import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { Row } from '@app/core/models/config.model';
import { Column } from '@app/core/models/table.model';
import { TableCellComponent } from './table-cell.component';

const PERSON: Column = { key: 'actor', label: 'Last updated by', type: 'user', name: 'actor_name' };

describe('TableCellComponent', () => {
    // Reset first: a cell is cheap to draw, so some of these compare two rows in one test, and a
    // second configure on a live TestBed is an error rather than a second component.
    async function render(column: Column, row: Row) {
        TestBed.resetTestingModule();
        await TestBed.configureTestingModule({
            imports: [TableCellComponent],
            providers: [provideRouter([]), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
        }).compileComponents();

        const fixture = TestBed.createComponent(TableCellComponent);
        fixture.componentRef.setInput('column', column);
        fixture.componentRef.setInput('row', row);
        fixture.detectChanges();
        return { fixture, el: fixture.nativeElement as HTMLElement, cmp: fixture.componentInstance };
    }

    it('shows the name the row carries, and keeps the account it belongs to for the card', async () => {
        const { cmp, el } = await render(PERSON, { actor: 'n@x.test', actor_name: 'Nazmus Sakib' });

        expect(cmp.person()?.label).toBe('Nazmus Sakib');
        expect(cmp.person()?.account).toBe('n@x.test');
        expect(el.textContent).toContain('Nazmus Sakib');
    });

    it('names the account when the person who did it no longer has one, rather than going blank', async () => {
        const { cmp, el } = await render(PERSON, { actor: 'left@x.test', actor_name: null });

        expect(cmp.person()?.named).toBe(false);
        expect(cmp.person()?.label).toBe('left@x.test');
        expect(el.textContent).toContain('left@x.test');
    });

    it('opens a card from the name whenever the row names an account', async () => {
        const { el } = await render(PERSON, { actor: 'a@x.test', actor_name: 'Samiha Rahman' });

        expect(el.querySelector('button')).not.toBeNull();
    });

    it('writes a date in the format its column asked for', async () => {
        const slashed: Column = { key: 'created_on', label: 'Added', type: 'date', format: 'slashed' };
        const { el } = await render(slashed, { created_on: new Date(2026, 0, 7, 10, 0).toISOString() });

        expect(el.textContent?.trim()).toBe('07/01/2026');
    });
});

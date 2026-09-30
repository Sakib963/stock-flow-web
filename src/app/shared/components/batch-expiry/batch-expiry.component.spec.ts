import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { toDay } from '@app/shared/utils/calendar-day/calendar-day';
import { BatchExpiryComponent } from './batch-expiry.component';

const inDays = (days: number): string => {
    const today = new Date();
    return toDay(new Date(today.getFullYear(), today.getMonth(), today.getDate() + days))!;
};

const open = async (day: string | null, canEdit = false): Promise<ComponentFixture<BatchExpiryComponent>> => {
    await TestBed.configureTestingModule({
        imports: [BatchExpiryComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(BatchExpiryComponent);
    fixture.componentRef.setInput('batchOid', 'i-1');
    fixture.componentRef.setInput('batchCode', 'B-7KQ4-M2XH');
    fixture.componentRef.setInput('day', day);
    fixture.componentRef.setInput('canEdit', canEdit);
    fixture.detectChanges();
    return fixture;
};

const text = (fixture: ComponentFixture<BatchExpiryComponent>) => (fixture.nativeElement as HTMLElement).textContent ?? '';

describe('BatchExpiryComponent', () => {
    it('says a batch has no expiry date, and offers no edit without the permission', async () => {
        const fixture = await open(null);
        expect(text(fixture)).toContain('inventory.expiry.none');
        expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    });

    it('offers no edit for a date not yet on a batch, as on a line still being verified', async () => {
        const fixture = await open('2027-03-31', true);
        fixture.componentRef.setInput('batchOid', null);
        fixture.detectChanges();
        expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();
    });

    it('marks a batch past its date as expired', async () => {
        expect(text(await open(inDays(-1)))).toContain('inventory.expiry.expired');
    });

    it('marks a batch within 30 days as expiring soon', async () => {
        expect(text(await open(inDays(10)))).toContain('inventory.expiry.soon');
    });

    it('shows a batch further off with its date and no tag', async () => {
        const later = text(await open(inDays(90)));
        expect(later).toContain('inventory.expiry.expires');
        expect(later).not.toContain('inventory.expiry.soon');
        expect(later).not.toContain('inventory.expiry.expired');
    });

    it('saves the picked day as a plain date and tells the page', async () => {
        const fixture = await open(null, true);
        const component = fixture.componentInstance;
        const changed: (string | null)[] = [];
        component.changed.subscribe((day) => changed.push(day));

        component.edit();
        component.picked.set(new Date(2027, 2, 31));
        component.save();

        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_EXPIRY));
        expect(request.request.body).toEqual({ inventory_oid: 'i-1', expiry_date: '2027-03-31' });
        request.flush({ code: 200, data: { changed: true } });

        expect(changed).toEqual(['2027-03-31']);
        expect(component.open()).toBe(false);
    });

    it('asks in the same dialog before saving, and sends nothing until confirmed', async () => {
        const fixture = await open('2026-10-20', true);
        const component = fixture.componentInstance;
        component.edit();
        component.picked.set(new Date(2027, 2, 31));
        component.review();

        expect(component.confirming()).toBe(true);
        expect(component.open()).toBe(true);
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_EXPIRY));
    });

    it('closes without asking or saving when the date is unchanged', async () => {
        const fixture = await open('2027-03-31', true);
        const component = fixture.componentInstance;
        component.edit();
        component.review();

        expect(component.confirming()).toBe(false);
        expect(component.open()).toBe(false);
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_EXPIRY));
    });

    it('clears the date when nothing is picked', async () => {
        const fixture = await open('2027-03-31', true);
        fixture.componentInstance.edit();
        fixture.componentInstance.picked.set(null);
        fixture.componentInstance.save();

        const request = TestBed.inject(HttpTestingController).expectOne((r) => r.url.includes(APIEndpoint.UPDATE_BATCH_EXPIRY));
        expect(request.request.body.expiry_date).toBeNull();
    });
});

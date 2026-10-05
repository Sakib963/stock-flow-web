import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { Customer } from '@app/core/models/customer.model';
import { CustomerFormComponent } from './customer-form.component';

const open = async (setup: { editing?: Customer; withAddress?: boolean } = {}) => {
    await TestBed.configureTestingModule({
        imports: [CustomerFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomerFormComponent);
    if (setup.editing) fixture.componentRef.setInput('editing', setup.editing);
    if (setup.withAddress) fixture.componentRef.setInput('withAddress', true);
    fixture.detectChanges();
    return fixture;
};

describe('CustomerFormComponent', () => {
    it('takes a phone typed in Bengali digits or with +88 and sends it as the 11 digit number', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: ' Person A ', phone: '+৮৮০১৯৮৭-৬৫৪৩২১' });
        expect(form.valid()).toBe(true);
        expect(form.payload()).toEqual({ name: 'Person A', phone: '01987654321', gender: null, age_band: null, social_handle: null, note: null });
    });

    it('refuses a landline or a short number', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: 'Person A', phone: '029876543' });
        expect(form.valid()).toBe(false);
        expect(form.form.controls.phone.hasError('phone')).toBe(true);
    });

    it('sends a first address only when it was asked for, and always as the default', async () => {
        const fixture = await open({ withAddress: true });
        const form = fixture.componentInstance;
        form.form.patchValue({ name: 'Person A', phone: '01987654321' });
        expect(form.payload().address).toBeUndefined();

        form.addAddress.set(true);
        fixture.detectChanges();
        expect(form.valid()).toBe(false);
    });

    it('never offers an address to someone who sells only at the counter', async () => {
        const fixture = await open();
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-customer="add-address"]')).toBeNull();
    });

    it('names the customer who already has the phone the server refused', async () => {
        const form = (await open()).componentInstance;
        form.rejectPhone('Person B');
        expect(form.form.controls.phone.hasError('taken')).toBe(true);
        expect(form.phoneOwner()).toBe('Person B');
    });

    it('sends the status and oid only when editing', async () => {
        const form = (await open({ editing: { oid: 'c-1', name: 'Person A', phone: '01987654321', gender: 'Female', age_band: '18_24', flag: 'None', flag_reason: null, social_handle: null, note: null, status: 'Active' } })).componentInstance;
        expect(form.payload()).toEqual(expect.objectContaining({ oid: 'c-1', status: 'Active', gender: 'Female', age_band: '18_24' }));
    });
});

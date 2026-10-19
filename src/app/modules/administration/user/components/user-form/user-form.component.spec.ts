import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { User } from '@app/core/models/user.model';
import { UserFormComponent } from './user-form.component';

const ROLES = [
    { oid: 'r-1', name: 'Counter', description: null, holders: 2, sensitive: [] },
    { oid: 'r-2', name: 'Manager', description: null, holders: 1, sensitive: [{ code: 'sales.order.refund', action: 'refund', label: 'Orders', label_bn: 'অর্ডার' }] },
];

const open = async (editing: Partial<User> | null = null) => {
    await TestBed.configureTestingModule({
        imports: [UserFormComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })],
    }).compileComponents();
    const fixture = TestBed.createComponent(UserFormComponent);
    if (editing) fixture.componentRef.setInput('editing', editing);
    fixture.detectChanges();
    const roles = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith('/get-assignable-roles'));
    expect(fixture.componentInstance.rolesLoading()).toBe(true);
    roles.flush({ data: ROLES });
    fixture.detectChanges();
    return fixture;
};

describe('UserFormComponent', () => {
    it('asks for a temporary password on create, ticking the rules off as it is typed', async () => {
        const fixture = await open();
        const form = fixture.componentInstance;
        form.form.controls.password.setValue('Welcome2026');
        expect(form.rules().map((r) => r.met)).toEqual([true, true, true, false]);
        expect(form.form.controls.password.valid).toBe(false);
        form.form.controls.password.setValue('Welcome-2026');
        expect(form.form.controls.password.valid).toBe(true);
        expect(fixture.nativeElement.querySelector('#user-password')).not.toBeNull();
    });

    it('sends the email lowercased and the password on create', async () => {
        const form = (await open()).componentInstance;
        form.form.patchValue({ name: ' Rahim ', email: 'Rahim@Example.com', mobile_number: '01712345678', role_oid: 'r-1', password: 'Welcome-2026' });
        expect(form.payload()).toEqual({ name: 'Rahim', email: 'rahim@example.com', mobile_number: '01712345678', designation: null, photo: null, role_oid: 'r-1', password: 'Welcome-2026' });
    });

    it('locks the email and leaves out the password on edit, sending the version', async () => {
        const fixture = await open({ oid: 'u-1', name: 'Rahim', email: 'rahim@example.com', mobile_number: '01712345678', role_oid: 'r-1', role_name: 'Counter', version: 'v1', photo: null, designation: null });
        const form = fixture.componentInstance;
        expect(form.form.controls.email.disabled).toBe(true);
        expect(fixture.nativeElement.querySelector('#user-password')).toBeNull();
        expect(form.payload()).toEqual({ oid: 'u-1', version: 'v1', name: 'Rahim', mobile_number: '01712345678', designation: null, photo: null, role_oid: 'r-1' });
        expect(form.form.dirty).toBe(false);
    });

    it('locks the role on your own account and says why', async () => {
        const fixture = await open({ oid: 'u-1', name: 'Rahim', email: 'rahim@example.com', mobile_number: '01712345678', role_oid: 'r-1', self: true, version: 'v1' });
        expect(fixture.componentInstance.form.controls.role_oid.disabled).toBe(true);
        expect(fixture.nativeElement.querySelector('[data-user="role-locked"]')).not.toBeNull();
    });

    it('notes a sensitive role as soon as it is picked', async () => {
        const fixture = await open();
        fixture.componentInstance.form.controls.role_oid.setValue('r-2');
        fixture.detectChanges();
        expect(fixture.nativeElement.querySelector('[data-user="sensitive-note"]')).not.toBeNull();
        expect(fixture.componentInstance.sensitiveLabel(fixture.componentInstance.pickedRole()!)).toBe('Orders');
    });
});

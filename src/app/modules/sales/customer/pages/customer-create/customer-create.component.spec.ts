import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { of } from 'rxjs';
import { provideTranslateService } from '@ngx-translate/core';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { SessionService } from '@app/core/services/session/session.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CustomerCreateComponent } from './customer-create.component';

const open = async () => {
    await TestBed.configureTestingModule({
        imports: [CustomerCreateComponent],
        providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { can: () => true, menu: () => [] } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CustomerCreateComponent);
    fixture.detectChanges();
    vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
    return { fixture, page: fixture.componentInstance, http: TestBed.inject(HttpTestingController) };
};

describe('CustomerCreateComponent', () => {
    it('marks the phone with the name of the customer who already has it, and keeps what was typed', async () => {
        const { page, http } = await open();
        const editor = page.editor()!;
        editor.form.patchValue({ name: 'Person A', phone: '01987654321' });
        page.save();

        http.expectOne((r) => r.url.includes(APIEndpoint.CREATE_CUSTOMER)).flush({ code: 409, message: 'taken', data: { field: 'phone', customer: { oid: 'c-2', name: 'Person B' } } }, { status: 409, statusText: 'Conflict' });

        expect(editor.form.controls.phone.hasError('taken')).toBe(true);
        expect(editor.phoneOwner()).toBe('Person B');
        expect(editor.form.controls.name.value).toBe('Person A');
    });

    it('sends nothing while a field is wrong', async () => {
        const { page, http } = await open();
        page.editor()!.form.patchValue({ name: 'Person A', phone: '0198' });
        page.save();
        http.expectNone((r) => r.url.includes(APIEndpoint.CREATE_CUSTOMER));
    });
});

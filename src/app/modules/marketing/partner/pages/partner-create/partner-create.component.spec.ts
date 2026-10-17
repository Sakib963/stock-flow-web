import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { PartnerCreateComponent } from './partner-create.component';

const ROUTES = [{ path: 'app/marketing/partners', children: [{ path: '**', children: [] }] }];

const open = async (): Promise<ComponentFixture<PartnerCreateComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [PartnerCreateComponent],
        providers: [provideRouter(ROUTES), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();
    const fixture = TestBed.createComponent(PartnerCreateComponent);
    fixture.detectChanges();
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
    return fixture;
};

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fills the form and answers the name check it sets off, so it settles out of PENDING. */
const fill = async (fixture: ComponentFixture<PartnerCreateComponent>) => {
    fixture.componentInstance.editor()!.form.patchValue({ name: '  Style Diaries ', partner_type: 'Page', platforms: ['Instagram'], handle: '@stylediaries', note: ' ' });
    await settle(450);
    TestBed.inject(HttpTestingController)
        .match((r) => r.url.endsWith(APIEndpoint.CHECK_PARTNER_AVAILABILITY))
        .forEach((request) => request.flush({ code: 200, message: 'ok', data: { available: true } }));
    fixture.detectChanges();
};

describe('PartnerCreateComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('counts the name and type as still to fill in until they are chosen', async () => {
        const fixture = await open();
        expect(fixture.componentInstance.editor()!.remaining()).toBe(2);
    });

    it('sends the partner trimmed, with an empty note as nothing', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        const sent = TestBed.inject(HttpTestingController).expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_PARTNER));
        expect(sent.request.body).toEqual(expect.objectContaining({ name: 'Style Diaries', partner_type: 'Page', platforms: ['Instagram'], handle: '@stylediaries', note: null, payment_method: null, status: 'Active' }));
        sent.flush({ code: 200, message: 'ok', data: { oid: 'new-1' } });
    });

    it('marks the name when the database says another partner already has it', async () => {
        const fixture = await open();
        await fill(fixture);
        fixture.componentInstance.save();
        await fixture.whenStable();

        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_PARTNER))
            .flush({ code: 409, message: 'taken', data: { field: 'name' } }, { status: 409, statusText: 'Conflict' });
        expect(fixture.componentInstance.editor()!.form.controls.name.hasError('taken')).toBe(true);
    });
});

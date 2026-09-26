import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { CategoryQuickAddComponent } from './category-quick-add.component';

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const open = async (name: string | null): Promise<ComponentFixture<CategoryQuickAddComponent>> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
        imports: [CategoryQuickAddComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
    }).compileComponents();

    const fixture = TestBed.createComponent(CategoryQuickAddComponent);
    fixture.componentRef.setInput('startingName', name);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
};

const answerConfirm = (yes: boolean) =>
    vi.spyOn(TestBed.inject(NzModalService), 'confirm').mockImplementation(() => {
        return { afterClose: of(yes) } as unknown as NzModalRef;
    });

/** Fills the rest of the category form and answers its availability checks. */
const complete = async (fixture: ComponentFixture<CategoryQuickAddComponent>) => {
    const form = fixture.componentInstance.editor()!.form;
    form.controls.category_code.setValue('JEWE');
    await settle(450);
    TestBed.inject(HttpTestingController)
        .match((r) => r.url.endsWith(APIEndpoint.CHECK_CATEGORY_AVAILABILITY))
        .forEach((r) => r.flush({ code: 200, message: 'ok', data: { available: true } }));
};

describe('CategoryQuickAddComponent', () => {
    afterEach(() => TestBed.inject(HttpTestingController).verify({ ignoreCancelled: true }));

    it('holds no form while closed', async () => {
        const fixture = await open(null);
        expect(fixture.componentInstance.editor()).toBeUndefined();
    });

    it('starts from the name that was being searched for', async () => {
        const fixture = await open('Jewellery');
        expect(fixture.componentInstance.editor()!.form.controls.name.value).toBe('Jewellery');
        await complete(fixture);
    });

    it('asks before adding, and adds nothing when the answer is no', async () => {
        const fixture = await open('Jewellery');
        await complete(fixture);
        const asked = answerConfirm(false);

        fixture.componentInstance.save();
        await settle(0);

        expect(asked).toHaveBeenCalledTimes(1);
        TestBed.inject(HttpTestingController).expectNone((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY));
    });

    it('adds the category once confirmed and hands its oid and name back to the sub-category form', async () => {
        const fixture = await open('Jewellery');
        await complete(fixture);
        answerConfirm(true);
        const created = vi.fn();
        fixture.componentInstance.created.subscribe(created);

        fixture.componentInstance.save();
        await settle(0);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY))
            .flush({ code: 200, message: 'ok', data: { oid: 'c3' } });

        expect(created).toHaveBeenCalledWith({ oid: 'c3', name: 'Jewellery' });
    });

    it('marks the name taken and stays open when the database refuses it', async () => {
        const fixture = await open('Jewellery');
        await complete(fixture);
        answerConfirm(true);
        const created = vi.fn();
        fixture.componentInstance.created.subscribe(created);

        fixture.componentInstance.save();
        await settle(0);
        TestBed.inject(HttpTestingController)
            .expectOne((r) => r.url.endsWith(APIEndpoint.CREATE_CATEGORY))
            .flush({ code: 409, message: 'taken', data: { field: 'name' } }, { status: 409, statusText: 'Conflict' });

        expect(created).not.toHaveBeenCalled();
        expect(fixture.componentInstance.editor()!.form.controls.name.hasError('taken')).toBe(true);
    });
});

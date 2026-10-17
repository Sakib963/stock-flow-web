import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { provideTranslateService } from '@ngx-translate/core';
import { of, Subject } from 'rxjs';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PhotoUpload } from '@app/core/models/photo-upload.model';
import { Profile } from '@app/core/models/profile.model';
import { SessionService } from '@app/core/services/session/session.service';
import { ProfileService } from '@app/layout/services/profile/profile.service';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { ProfileDialogComponent } from './profile-dialog.component';

const PROFILE: Profile = { email: 'nusrat@shop.test', name: 'Nusrat Jahan', mobile_number: '01711000111', designation: null, photo: null };

const open = async () => {
    const updateUser = vi.fn();
    await TestBed.configureTestingModule({
        imports: [ProfileDialogComponent],
        providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS, { provide: SessionService, useValue: { initials: () => 'NJ', user: () => ({ role: 'Staff' }), updateUser } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(ProfileDialogComponent);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne((r) => r.url.includes(APIEndpoint.GET_PROFILE_INFO)).flush({ code: 200, data: PROFILE });
    fixture.detectChanges();
    const confirm = vi.spyOn(fixture.debugElement.injector.get(NzModalService), 'confirm').mockImplementation(() => ({ afterClose: of(true) }) as unknown as NzModalRef);
    return { fixture, page: fixture.componentInstance, http, updateUser, confirm };
};

describe('ProfileDialogComponent', () => {
    it('opens to read, with no field to type in until Edit is pressed', async () => {
        const { page, fixture } = await open();
        const text = (document.querySelector('.ant-modal') as HTMLElement).textContent ?? '';
        expect(text).toContain('Nusrat Jahan');
        expect(text).toContain('01711000111');
        expect(document.querySelector('[data-profile="name"]')).toBeNull();
        (document.querySelector('[data-profile="edit"]') as HTMLButtonElement).click();
        fixture.detectChanges();
        expect(document.querySelector('[data-profile="name"]')).toBeTruthy();
        fixture.destroy();
    });

    it('calls nothing when Save is pressed with nothing changed', async () => {
        const { page, http, confirm } = await open();
        const info = vi.spyOn(TestBed.inject(NzMessageService), 'info');
        page.edit();
        page.save();
        expect(info).toHaveBeenCalledWith('form.nothingChanged');
        expect(confirm).not.toHaveBeenCalled();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
    });

    it('asks before saving, and saves nothing when the answer is no', async () => {
        const { page, http, confirm } = await open();
        confirm.mockImplementation(() => ({ afterClose: of(false) }) as unknown as NzModalRef);
        page.edit();
        page.form.patchValue({ designation: 'Store manager' });
        page.form.markAsDirty();
        page.save();
        expect(confirm).toHaveBeenCalled();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        expect(page.editing()).toBe(true);
    });

    it('fills the form from the account, and shows email and role without letting them change', async () => {
        const { page, fixture } = await open();
        page.edit();
        fixture.detectChanges();
        expect(page.form.getRawValue()).toEqual({ name: 'Nusrat Jahan', mobile_number: '01711000111', designation: '' });
        const text = (document.querySelector('.ant-modal') as HTMLElement).textContent ?? '';
        expect(text).toContain('nusrat@shop.test');
        expect(text).toContain('Staff');
        expect(document.querySelector('input[type="email"], #profile-email')).toBeNull();
        fixture.destroy();
    });

    it('saves after the confirmation, then shows the new details to read and the header the new name', async () => {
        const { page, http, updateUser } = await open();
        page.edit();
        page.form.patchValue({ name: '  Nusrat J.  ', designation: 'Store manager' });
        page.form.markAsDirty();
        page.save();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        expect(sent.request.body).toEqual({ name: 'Nusrat J.', mobile_number: '01711000111', designation: 'Store manager', photo: null });
        sent.flush({ code: 200, data: { ...PROFILE, name: 'Nusrat J.', designation: 'Store manager' } });
        expect(updateUser).toHaveBeenCalledWith({ name: 'Nusrat J.', mobile_number: '01711000111', designation: 'Store manager', photo: null });
        expect(page.editing()).toBe(false);
        expect(page.profile()?.name).toBe('Nusrat J.');
    });

    it('sends nothing while a field is wrong', async () => {
        const { page, http } = await open();
        page.edit();
        page.form.patchValue({ mobile_number: 'call me' });
        page.save();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        expect(page.form.controls.mobile_number.touched).toBe(true);
    });

    it('holds Save while a photo uploads, then saves the uploaded photo', async () => {
        const { page, http } = await open();
        page.edit();
        const upload = new Subject<PhotoUpload>();
        vi.spyOn(TestBed.inject(ProfileService), 'uploadPhoto').mockReturnValue(upload);
        page.pick(new File(['x'], 'me.jpg', { type: 'image/jpeg' }) as unknown as NzUploadFile);
        upload.next({ state: 'uploading', progress: 40 });
        expect(page.uploading()).toBe(40);
        page.save();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        upload.next({ state: 'done', url: 'https://res.cloudinary.com/x/image/upload/v1/stockflow/people/me.jpg' });
        expect(page.photo()).toContain('stockflow/people/me.jpg');
        page.save();
        expect(http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO)).request.body.photo).toContain('stockflow/people/me.jpg');
    });

    it('refuses a file that is not a photo before sending anything', async () => {
        const { page } = await open();
        const upload = vi.spyOn(TestBed.inject(ProfileService), 'uploadPhoto').mockReturnValue(of());
        page.pick(new File(['x'], 'notes.pdf', { type: 'application/pdf' }) as unknown as NzUploadFile);
        expect(page.photoError()).toBe('shell.profile.photoWrongType');
        expect(upload).not.toHaveBeenCalled();
    });
});

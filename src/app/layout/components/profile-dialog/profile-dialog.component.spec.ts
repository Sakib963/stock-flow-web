import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
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
    return { fixture, page: fixture.componentInstance, http, updateUser };
};

describe('ProfileDialogComponent', () => {
    it('fills the form from the account, and shows email and role without letting them change', async () => {
        const { page, fixture } = await open();
        expect(page.form.getRawValue()).toEqual({ name: 'Nusrat Jahan', mobile_number: '01711000111', designation: '' });
        const text = (document.querySelector('.ant-modal') as HTMLElement).textContent ?? '';
        expect(text).toContain('nusrat@shop.test');
        expect(text).toContain('Staff');
        expect(document.querySelector('input[type="email"], #profile-email')).toBeNull();
        fixture.destroy();
    });

    it('saves, then the header shows the new name at once', async () => {
        const { page, http, updateUser } = await open();
        page.form.patchValue({ name: '  Nusrat J.  ', designation: 'Store manager' });
        page.save();
        const sent = http.expectOne((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        expect(sent.request.body).toEqual({ name: 'Nusrat J.', mobile_number: '01711000111', designation: 'Store manager', photo: null });
        sent.flush({ code: 200, data: { ...PROFILE, name: 'Nusrat J.', designation: 'Store manager' } });
        expect(updateUser).toHaveBeenCalledWith({ name: 'Nusrat J.', mobile_number: '01711000111', designation: 'Store manager', photo: null });
    });

    it('sends nothing while a field is wrong', async () => {
        const { page, http } = await open();
        page.form.patchValue({ mobile_number: 'call me' });
        page.save();
        http.expectNone((r) => r.url.includes(APIEndpoint.UPDATE_PROFILE_INFO));
        expect(page.form.controls.mobile_number.touched).toBe(true);
    });

    it('holds Save while a photo uploads, then saves the uploaded photo', async () => {
        const { page, http } = await open();
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

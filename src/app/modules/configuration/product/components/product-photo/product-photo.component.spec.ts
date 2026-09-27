import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NzUploadFile } from 'ng-zorro-antd/upload';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { PhotoUpload } from '@app/core/models/product.model';
import { ProductService } from '@app/modules/configuration/product/services/product.service';
import { ProductPhotoComponent } from './product-photo.component';

const photo = (type = 'image/jpeg') => new File(['x'], 'kurti.jpg', { type }) as unknown as NzUploadFile;

describe('ProductPhotoComponent', () => {
    let upload: Subject<PhotoUpload>;
    let fixture: ComponentFixture<ProductPhotoComponent>;
    let changed: (string | null)[];
    let busy: boolean[];

    beforeEach(async () => {
        upload = new Subject();
        URL.createObjectURL = vi.fn(() => 'blob:preview');
        URL.revokeObjectURL = vi.fn();
        await TestBed.configureTestingModule({
            imports: [ProductPhotoComponent],
            providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: ProductService, useValue: { uploadPhoto: () => upload } }],
        }).compileComponents();
        fixture = TestBed.createComponent(ProductPhotoComponent);
        changed = [];
        busy = [];
        fixture.componentInstance.changed.subscribe((url) => changed.push(url));
        fixture.componentInstance.busy.subscribe((value) => busy.push(value));
        fixture.detectChanges();
    });

    it('offers a drop zone while there is no photo', () => {
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-photo="empty"]')).toBeTruthy();
    });

    it('shows the picked photo at once, the progress over it, and hands back the address when it is saved', () => {
        const component = fixture.componentInstance;
        vi.useFakeTimers();
        expect(component.pick(photo())).toBe(false);
        expect(component.uploadLabel()).toBe('configuration.product.photo.preparing');

        upload.next({ state: 'uploading', progress: 42 });
        vi.advanceTimersByTime(40);
        // Counting up to what was really sent, not jumping to it.
        expect(component.progress()).toBeGreaterThan(0);
        expect(component.progress()).toBeLessThan(42);
        vi.advanceTimersByTime(2000);
        vi.useRealTimers();
        fixture.detectChanges();

        const element = fixture.nativeElement as HTMLElement;
        expect(element.querySelector('[data-photo="filled"] img')?.getAttribute('src')).toBe('blob:preview');
        expect(element.querySelector('[data-photo="filled"] img')?.getAttribute('style')).toContain('opacity: 0.536');
        expect(component.progress()).toBe(42);

        upload.next({ state: 'done', url: 'https://res.cloudinary.com/stockflow/image/upload/v1/kurti.jpg' });
        expect(changed).toEqual(['https://res.cloudinary.com/stockflow/image/upload/v1/kurti.jpg']);
        expect(busy).toEqual([true, false]);
    });

    it('keeps a closed file picker from reaching the form page, whose Cancel leaves the form', () => {
        const host = fixture.nativeElement as HTMLElement;
        const leave = vi.fn();
        host.addEventListener('cancel', leave);

        host.querySelector('input[type="file"]')!.dispatchEvent(new Event('cancel', { bubbles: true }));

        expect(leave).not.toHaveBeenCalled();
    });

    it('refuses a file that is not a photo, before anything is sent', () => {
        fixture.componentInstance.pick(photo('application/pdf'));
        expect(fixture.componentInstance.failed()).toBe('configuration.product.photo.wrongType');
        expect(busy).toEqual([]);
    });

    it('stops holding the form when an upload fails, and says why', () => {
        fixture.componentInstance.pick(photo());
        upload.error(new Error('offline'));

        expect(busy).toEqual([true, false]);
        expect(fixture.componentInstance.failed()).toBe('configuration.product.photo.failed.server');
        expect(changed).toEqual([]);
    });
});

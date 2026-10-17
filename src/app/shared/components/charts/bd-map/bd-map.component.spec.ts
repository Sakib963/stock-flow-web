import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { BdMapComponent } from './bd-map.component';

const FILE = {
    width: 100,
    height: 100,
    credit: 'geoBoundaries, CC BY 4.0',
    districts: [
        { oid: 'BD-Dhaka', d: 'M0 0L10 0L10 10Z', x: 5, y: 5 },
        { oid: 'BD-Gazipur', d: 'M20 0L30 0L30 10Z', x: 25, y: 5 },
        { oid: 'BD-Sylhet', d: 'M40 0L50 0L50 10Z', x: 45, y: 5 },
    ],
};

describe('BdMapComponent', () => {
    it('shades each district against the largest, leaves one with no figure plain, and names the largest', async () => {
        await TestBed.configureTestingModule({ imports: [BdMapComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
        const fixture = TestBed.createComponent(BdMapComponent);
        fixture.componentRef.setInput('values', [
            { oid: 'BD-Dhaka', name: 'Dhaka', value: 40, tip: 'Dhaka: 40' },
            { oid: 'BD-Gazipur', name: 'Gazipur', value: 10, tip: 'Gazipur: 10' },
        ]);
        fixture.componentRef.setInput('label', 'map');
        fixture.detectChanges();
        TestBed.inject(HttpTestingController).expectOne('assets/maps/bd-districts.json').flush(FILE);
        fixture.detectChanges();
        const shapes = Object.fromEntries(fixture.componentInstance.shapes().map((s) => [s.oid, s]));
        expect(shapes['BD-Dhaka'].shade).toBe('fill-primary');
        expect(shapes['BD-Gazipur'].shade).toBe('fill-primary/20');
        expect(shapes['BD-Sylhet'].shade).toBe('fill-line-soft');
        expect([shapes['BD-Dhaka'].labelled, shapes['BD-Sylhet'].labelled]).toEqual([true, false]);
    });

});

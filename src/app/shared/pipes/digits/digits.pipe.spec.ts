import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { DigitsPipe } from './digits.pipe';

describe('DigitsPipe', () => {
    let pipe: DigitsPipe;

    beforeEach(() => {
        TestBed.configureTestingModule({ providers: [provideTranslateService({ fallbackLang: 'en' })] });
        TestBed.inject(LanguageService).use('en');
        pipe = TestBed.runInInjectionContext(() => new DigitsPipe());
    });

    it('follows the language on screen, with no language handed to it', () => {
        expect(pipe.transform(12)).toBe('12');

        TestBed.inject(LanguageService).use('bn');
        expect(pipe.transform(12)).toBe('১২');
    });

    it('leaves nothing blank rather than printing "null"', () => {
        expect(pipe.transform(null)).toBe('');
    });
});

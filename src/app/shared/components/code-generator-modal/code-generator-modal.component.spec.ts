import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { Observable, of, throwError } from 'rxjs';
import { CodeRequest } from '@app/core/models/code-generator.model';
import { CodeGeneratorModalComponent } from './code-generator-modal.component';

const open = async (request: Partial<CodeRequest>) => {
    TestBed.resetTestingModule();
    const closed: (string | undefined)[] = [];
    await TestBed.configureTestingModule({
        imports: [CodeGeneratorModalComponent],
        providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), { provide: NZ_MODAL_DATA, useValue: { name: 'Traditional Clothing', generate: () => of('TRADCLO'), ...request } }, { provide: NzModalRef, useValue: { close: (value: string | undefined) => closed.push(value) } }],
    }).compileComponents();

    const fixture = TestBed.createComponent(CodeGeneratorModalComponent);
    fixture.detectChanges();
    return { fixture, closed };
};

describe('CodeGeneratorModalComponent', () => {
    it('asks for a code as soon as it opens, with no second button to press', async () => {
        const { fixture } = await open({});
        expect(fixture.componentInstance.code()).toBe('TRADCLO');
        expect((fixture.nativeElement as HTMLElement).querySelector('[data-generator="code"]')?.textContent?.trim()).toBe('TRADCLO');
    });

    it('closes with the code only once it is applied', async () => {
        const { fixture, closed } = await open({});
        expect(closed).toEqual([]);

        fixture.componentInstance.accept();
        expect(closed).toEqual(['TRADCLO']);
    });

    it('closes with nothing when it is dismissed', async () => {
        const { fixture, closed } = await open({});
        fixture.componentInstance.dismiss();
        expect(closed).toEqual([undefined]);
    });

    it('says to type a name first rather than asking for a code for nothing', async () => {
        let asked = 0;
        const { fixture } = await open({
            name: '   ',
            generate: () => {
                asked += 1;
                return of('X');
            },
        });

        expect(asked).toBe(0);
        expect(fixture.componentInstance.error()).toBe('codeGenerator.needsName');
    });

    it('offers another go when the request failed, and applies nothing meanwhile', async () => {
        let attempt = 0;
        const generate = (): Observable<string> => {
            attempt += 1;
            return attempt === 1 ? throwError(() => new Error('offline')) : of('TRADCLO');
        };
        const { fixture, closed } = await open({ generate });

        expect(fixture.componentInstance.error()).toBe('codeGenerator.failed');
        fixture.componentInstance.accept();
        expect(closed).toEqual([]);

        fixture.componentInstance.generate();
        expect(fixture.componentInstance.code()).toBe('TRADCLO');
        expect(fixture.componentInstance.error()).toBe(null);
    });
});

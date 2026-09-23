import { importProvidersFrom } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { provideTranslateService } from '@ngx-translate/core';
import { of } from 'rxjs';
import { CodeGeneratorService } from './code-generator.service';

describe('CodeGeneratorService', () => {
    beforeEach(() => {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), importProvidersFrom(NzModalModule), CodeGeneratorService] });
    });

    // The feature passes its own call, so the modal never knows what it is generating a code for.
    it("opens a centred modal carrying the caller's own request", () => {
        let created: { nzData: unknown; nzCentered?: boolean } | null = null;
        TestBed.overrideProvider(NzModalService, { useValue: { create: (options: never) => ((created = options), { afterClose: of(undefined) }) } });

        const request = { name: 'Traditional Clothing', generate: () => of('TRADCLO') };
        TestBed.inject(CodeGeneratorService).ask(request).subscribe();

        expect(created!.nzData).toBe(request);
        expect(created!.nzCentered).toBe(true);
    });

    it('resolves to the code that was applied', async () => {
        TestBed.overrideProvider(NzModalService, { useValue: { create: () => ({ afterClose: of('TRADCLO') }) } });

        const code = await new Promise((resolve) =>
            TestBed.inject(CodeGeneratorService)
                .ask({ name: 'x', generate: () => of('TRADCLO') })
                .subscribe(resolve)
        );
        expect(code).toBe('TRADCLO');
    });

    it('resolves to nothing when the person did not take it', async () => {
        TestBed.overrideProvider(NzModalService, { useValue: { create: () => ({ afterClose: of(undefined) }) } });

        const code = await new Promise((resolve) =>
            TestBed.inject(CodeGeneratorService)
                .ask({ name: 'x', generate: () => of('X') })
                .subscribe(resolve)
        );
        expect(code).toBe(undefined);
    });
});

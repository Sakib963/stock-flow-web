import { Injectable, inject } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { CodeRequest } from '@app/core/models/code-generator.model';
import { CodeGeneratorModalComponent } from '@app/shared/components/code-generator-modal/code-generator-modal.component';

/**
 * Opens the code generator and resolves to the code the person applied, or undefined if they did
 * not take it. One call, so a feature needs no open flag, no modal in its template and no state of
 * its own.
 *
 * Provided by the signed-in shell rather than the root, because it needs NzModalService, which the
 * root injector does not have. A root service cannot reach a route's providers.
 */
@Injectable()
export class CodeGeneratorService {
    private readonly _modal = inject(NzModalService);
    private readonly _translate = inject(TranslateService);

    ask(request: CodeRequest): Observable<string | undefined> {
        return this._modal.create<CodeGeneratorModalComponent, CodeRequest, string | undefined>({
            nzTitle: this._translate.instant('codeGenerator.title'),
            nzContent: CodeGeneratorModalComponent,
            nzData: request,
            nzCentered: true,
            nzWidth: 440,
            // The component draws its own actions, because what they do depends on what came back.
            nzFooter: null,
        }).afterClose;
    }
}

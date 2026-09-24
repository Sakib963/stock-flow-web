import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCircleAlert, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { TranslatePipe } from '@ngx-translate/core';
import { CodeRequest } from '@app/core/models/code-generator.model';

/**
 * Suggests a code for a name, and hands it back only when the person accepts it.
 *
 * Opened through `CodeGeneratorService`, never placed in a page template: a modal that lives in
 * the markup is a modal every page has to carry an open flag for. It closes with the code, or with
 * nothing, and the caller decides what to do with that.
 *
 * It knows no feature. The `generate` call arrives with the request, so sub-category, brand,
 * warehouse and aisle reuse this unchanged.
 */
@Component({
    selector: 'code-generator-modal',
    imports: [NgIcon, NzButtonModule, NzSpinModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideCircleAlert, lucideRotateCw, lucideX })],
    templateUrl: './code-generator-modal.component.html',
    styleUrl: './code-generator-modal.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CodeGeneratorModalComponent {
    private readonly _modal = inject(NzModalRef<CodeGeneratorModalComponent, string | undefined>);
    private readonly _request = inject<CodeRequest>(NZ_MODAL_DATA);

    readonly loading = signal(false);
    readonly code = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    /**
     * There is no name to build a code from, so trying again would ask the same unanswerable
     * question. The name is on the page behind this modal and cannot be typed while it is open, so
     * the only way forward is to close it.
     */
    readonly needsName = signal(false);

    constructor() {
        this.generate();
    }

    generate(): void {
        const name = this._request.name.trim();
        this.code.set(null);
        this.error.set(null);
        this.needsName.set(false);

        if (!name) {
            this.needsName.set(true);
            this.error.set('codeGenerator.needsName');
            return;
        }

        this.loading.set(true);
        this._request.generate(name).subscribe({
            next: (code) => {
                this.code.set(code);
                this.loading.set(false);
            },
            error: () => {
                this.error.set('codeGenerator.failed');
                this.loading.set(false);
            },
        });
    }

    accept(): void {
        const code = this.code();
        if (code) this._modal.close(code);
    }

    dismiss(): void {
        this._modal.close(undefined);
    }
}

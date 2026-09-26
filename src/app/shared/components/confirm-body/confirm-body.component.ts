import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { ConfirmCopy } from '@app/core/models/form.model';

/**
 * The body and buttons of a confirmation opened by `confirmAction`. The confirm dialog's own buttons
 * take text only, and every other action button carries an icon; it closes with true on the
 * confirming button.
 */
@Component({
    selector: 'confirm-body',
    imports: [NgIcon, NzButtonModule],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './confirm-body.component.html',
    styleUrl: './confirm-body.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmBodyComponent {
    private readonly _modal = inject(NzModalRef<ConfirmBodyComponent, boolean>);
    readonly copy = inject<ConfirmCopy>(NZ_MODAL_DATA);

    close(confirmed: boolean): void {
        this._modal.close(confirmed);
    }
}

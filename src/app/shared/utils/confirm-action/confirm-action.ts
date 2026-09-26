import { NzModalService } from 'ng-zorro-antd/modal';
import { Observable, map } from 'rxjs';
import { ConfirmCopy } from '@app/core/models/form.model';
import { ConfirmBodyComponent } from '@app/shared/components/confirm-body/confirm-body.component';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** ng-zorro renders a string title as HTML, and the copy carries what someone typed. */
const asText = (value: string): string => value.replace(/[&<>"']/g, (character) => ESCAPES[character]);

/**
 * Asks before a mutating action, and answers true only when the person pressed the confirming button.
 *
 * Answered from `afterClose` rather than a button callback, so closing the dialog with Escape, the
 * close button or the mask is a "no" as well, and the page never waits on a question nobody will answer.
 */
export const confirmAction = (modal: NzModalService, copy: ConfirmCopy): Observable<boolean> =>
    modal
        .confirm<ConfirmBodyComponent>({
            nzTitle: asText(copy.title),
            nzContent: ConfirmBodyComponent,
            nzData: copy,
            // The body draws the buttons, so they can carry icons like every other action button.
            nzOkText: null,
            nzCancelText: null,
            nzCentered: true,
        })
        .afterClose.pipe(map((confirmed) => confirmed === true));

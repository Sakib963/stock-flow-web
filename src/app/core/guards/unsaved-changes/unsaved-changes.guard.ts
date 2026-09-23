import { inject } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { CanDeactivateFn } from '@angular/router';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslateService } from '@ngx-translate/core';

/**
 * A page that knows for itself whether it holds unsaved work.
 *
 * Only needed when the page is not a reactive form, or when dirty means something more than the
 * form being touched. A page with a `form` needs none of this: the guard reads its dirty state.
 */
export interface HasUnsavedChanges {
    hasUnsavedChanges(): boolean;
}

interface MaybeForm {
    form?: unknown;
    hasUnsavedChanges?: () => boolean;
}

const holdsUnsavedWork = (component: MaybeForm): boolean => {
    if (typeof component?.hasUnsavedChanges === 'function') return component.hasUnsavedChanges();
    return component?.form instanceof AbstractControl && component.form.dirty;
};

/**
 * Stops someone leaving a form with work in it by accident.
 *
 * Put it on the route: `canDeactivate: [unsavedChangesGuard]`. A page whose form is a reactive
 * `form` property is covered with no code of its own, which is the point. A page that is not a
 * reactive form implements `HasUnsavedChanges` instead.
 *
 * The route tree must also carry `OVERLAY_PROVIDERS`, because this opens a modal and
 * `NzModalService` is never in the root injector. Without them the guard throws at navigation
 * time, with nothing at build time to warn you.
 *
 * Two choices only, discard or keep editing, because that is the whole decision. A page that has
 * just saved calls `markAsPristine()` before it navigates, so a successful save never asks.
 */
export const unsavedChangesGuard: CanDeactivateFn<MaybeForm> = (component) => {
    if (!holdsUnsavedWork(component)) return true;

    const translate = inject(TranslateService);
    const modal = inject(NzModalService);

    // Resolved by whichever button is pressed. Closing it any other way keeps the person on the
    // page, which is the safe answer: nothing typed is lost by staying.
    return new Promise<boolean>((resolve) => {
        modal.confirm({
            nzTitle: translate.instant('form.leave.title'),
            nzContent: translate.instant('form.leave.body'),
            nzOkText: translate.instant('form.leave.discard'),
            nzOkDanger: true,
            nzCancelText: translate.instant('form.leave.stay'),
            nzCentered: true,
            nzOnOk: () => resolve(true),
            nzOnCancel: () => resolve(false),
        });
    });
};

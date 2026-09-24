import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The bar under a page's content, holding what you do when you have finished reading or filling it.
 *
 * Every create, edit and record page ends in one, so the buttons are always in the same place. It
 * owns the strip and nothing else: what goes in it is projected, because a form ends in Save and a
 * record page ends in Back and its reports.
 */
@Component({
    selector: 'action-footer',
    templateUrl: './action-footer.component.html',
    styleUrl: './action-footer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionFooterComponent {}

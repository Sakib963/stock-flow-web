import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEllipsis } from '@ng-icons/lucide';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { TranslatePipe } from '@ngx-translate/core';
import { RowAction } from '@app/core/models/table.model';
import { LIST_ICONS, isListIcon } from '@app/shared/constants/list-icons';
import { TextPipe } from '@app/shared/pipes/text/text.pipe';

/**
 * What can be done to one row, behind one button.
 *
 * The old app put an eye and a pencil in every row, so a hundred-row list carried two hundred
 * targets and no room for a third verb. One overflow menu holds every verb a row has, named in
 * words, and the destructive one is last behind a divider (REQ-26).
 *
 * The menu is an nz-dropdown, so the CDK renders it above the table rather than inside the
 * horizontal scroller, where it would be clipped, and flips it near the foot of the window.
 */
@Component({
    selector: 'row-actions',
    imports: [NgIcon, NzDropdownModule, TranslatePipe, TextPipe],
    providers: [provideIcons({ ...LIST_ICONS, lucideEllipsis })],
    templateUrl: './row-actions.component.html',
    styleUrl: './row-actions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RowActionsComponent {
    /** Already filtered: permitted, and allowed by the row's own state. */
    readonly actions = input.required<readonly RowAction[]>();
    /** The record's identifier, repeated in the menu head so a menu over a long table is unambiguous. */
    readonly label = input('');

    readonly run = output<string>();

    readonly open = signal(false);

    readonly ordinary = computed(() => this.actions().filter((a) => !a.danger));
    readonly dangerous = computed(() => this.actions().filter((a) => !!a.danger));

    iconOf(action: RowAction): string | null {
        return isListIcon(action.icon) ? action.icon : null;
    }

    /** The row click opens the record, so a click on the trigger or an item must not reach it. */
    stopRow(event: Event): void {
        event.stopPropagation();
    }

    pick(action: RowAction, event: Event): void {
        event.stopPropagation();
        this.open.set(false);
        this.run.emit(action.key);
    }
}

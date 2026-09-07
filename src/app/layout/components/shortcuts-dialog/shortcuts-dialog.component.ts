import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft } from '@ng-icons/lucide';

/**
 * The keyboard shortcuts reference, opened from the account menu or by pressing `?`.
 *
 * It lists only what the shell actually binds. A reference that promises a key which does nothing
 * is worse than no reference, because the person stops trusting the rest of the list, so this grows
 * as bindings are added rather than being written ahead of them.
 *
 * The dialog itself is `nz-modal`, which brings the backdrop, the focus trap, the scroll lock and
 * Escape. Only the list inside it is ours.
 */
@Component({
    selector: 'shortcuts-dialog',
    imports: [TranslatePipe, NzModalModule, NgIcon],
    providers: [provideIcons({ lucideArrowDown, lucideArrowUp, lucideCommand, lucideCornerDownLeft })],
    templateUrl: './shortcuts-dialog.component.html',
    styleUrl: './shortcuts-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShortcutsDialogComponent {
    /** Rendered as the modifier key cap, so a Mac reads the glyph its keyboard actually has. */
    readonly modifier = input.required<string>();
    readonly close = output<void>();
}

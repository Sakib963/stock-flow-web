import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TranslatePipe } from '@ngx-translate/core';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

/**
 * The body of a create or edit screen: one capped content column and the action bar under it.
 *
 * Every create and every edit is its own page, whatever its size, so this is the only form surface
 * there is. The page above it renders its own <page-header>; this owns what sits below.
 *
 * There is no Reset button here and there never will be: it destroys work with no undo.
 */
@Component({
    selector: 'form-page',
    imports: [DigitsPipe, NgIcon, NzButtonModule, TranslatePipe, ActionFooterComponent],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './form-page.component.html',
    styleUrl: './form-page.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormPageComponent {
    readonly formId = input.required<string>();
    readonly saveLabel = input<string>('form.save');
    readonly saving = input(false);
    /** How many required fields are still not filled. Zero hides the note. */
    readonly remaining = input(0);

    readonly cancel = output<void>();
}

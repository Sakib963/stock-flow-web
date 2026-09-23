import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { TranslatePipe } from '@ngx-translate/core';

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
    imports: [NzButtonModule, TranslatePipe],
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

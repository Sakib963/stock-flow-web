import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The top of every feature page: what this screen is, and the one thing you most likely came to do.
 *
 * It is a component rather than a pattern each page repeats, because the alternative is twenty
 * pages that are almost the same. Actions are projected so a page decides its own buttons without
 * this component knowing anything about them.
 *
 *   <page-header title="Orders" subtitle="Counter and online">
 *     <button nz-button nzType="primary">New order</button>
 *   </page-header>
 */
@Component({
    selector: 'page-header',
    templateUrl: './page-header.component.html',
    styleUrl: './page-header.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    readonly title = input.required<string>();
    readonly subtitle = input<string>('');
}

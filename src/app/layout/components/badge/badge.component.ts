import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The small caps marker beside a menu row or a search result: "soon" for a page that is present
 * but not ported yet, "new" for one that just arrived.
 *
 * A component rather than a shared class because it is painted by four separate shell components,
 * and a class in any one of their stylesheets would stop at that component's boundary.
 */
@Component({
    selector: 'badge',
    // The parent flex row sees the host, not the span, so the flex behaviour sits here.
    host: { class: 'inline-flex flex-none' },
    templateUrl: './badge.component.html',
    styleUrl: './badge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeComponent {
    readonly variant = input<'soon' | 'new'>('soon');
}

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
    template: `
        <header class="page-header">
            <div class="page-header__text">
                <h1 class="page-header__title">{{ title() }}</h1>
                @if (subtitle()) {
                    <p class="page-header__subtitle">{{ subtitle() }}</p>
                }
            </div>
            <div class="page-header__actions">
                <ng-content />
            </div>
        </header>
    `,
    styles: [
        `
            .page-header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                background: #fff;
                border: 1px solid #dfe3e9;
                border-radius: 8px;
                padding: 18px 22px;
                margin-bottom: 16px;
            }
            .page-header__title {
                margin: 0;
                font-size: 18px;
                font-weight: 700;
                letter-spacing: -0.015em;
                color: #1c2028;
            }
            .page-header__subtitle {
                margin: 4px 0 0;
                font-size: 13px;
                line-height: 1.5;
                color: #6b7480;
            }
            .page-header__actions {
                display: flex;
                align-items: center;
                gap: 8px;
                flex: none;
            }
            @media (max-width: 767px) {
                .page-header {
                    flex-direction: column;
                    align-items: stretch;
                    padding: 16px;
                }
            }
        `,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeaderComponent {
    readonly title = input.required<string>();
    readonly subtitle = input<string>('');
}

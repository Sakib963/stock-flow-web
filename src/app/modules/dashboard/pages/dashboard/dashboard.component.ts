import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { SessionService } from '@app/core/services/session.service';

/**
 * The landing screen.
 *
 * Deliberately empty of numbers: there is no dashboard endpoint yet, and inventing figures on the
 * one screen an owner reads first would be worse than admitting there is nothing to show. A brand
 * new client deployment genuinely has no orders and no history, so this empty state is the first
 * thing every client sees rather than an edge case.
 */
@Component({
    selector: 'dashboard',
    imports: [TranslatePipe, PageHeaderComponent],
    template: `
        <page-header [title]="'dashboard.title' | translate" [subtitle]="greeting()" />

        <section class="grid gap-4 md:grid-cols-3">
            @for (tile of tiles(); track tile.key) {
                <article class="rounded-[8px] border border-n-200 bg-white p-5">
                    <h2 class="text-n-500 text-xs font-semibold uppercase tracking-wide">{{ tile.key | translate }}</h2>
                    <p class="text-n-400 mt-3 text-2xl font-bold">&mdash;</p>
                    <p class="text-n-500 mt-1 text-xs">{{ 'dashboard.noData' | translate }}</p>
                </article>
            }
        </section>

        <section class="mt-4 rounded-[8px] border border-n-200 bg-white p-5">
            <h2 class="text-n-900 text-sm font-bold">{{ 'dashboard.accessTitle' | translate }}</h2>
            <p class="text-n-500 mt-1 text-xs">{{ 'dashboard.accessBody' | translate }}</p>
            <ul class="mt-3 flex flex-wrap gap-2">
                @for (section of sections(); track section) {
                    <li class="rounded-[6px] border border-n-200 bg-n-75 px-2.5 py-1 text-xs font-semibold text-n-600">{{ section }}</li>
                }
            </ul>
        </section>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent {
    readonly session = inject(SessionService);

    readonly greeting = computed(() => {
        const name = this.session.user()?.name ?? '';
        const business = this.session.business()?.name ?? '';
        return business ? `${name} at ${business}` : name;
    });

    readonly sections = computed(() => this.session.menu().map((m) => this.session.label(m)));

    readonly tiles = computed(() => [{ key: 'dashboard.takings' }, { key: 'dashboard.needsAttention' }, { key: 'dashboard.runningLow' }]);
}

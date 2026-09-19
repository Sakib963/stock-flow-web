import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { SessionService } from '@app/core/services/session/session.service';

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
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.scss',
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

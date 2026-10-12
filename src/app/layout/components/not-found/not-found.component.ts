import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzResultModule } from 'ng-zorro-antd/result';
import { TranslatePipe } from '@ngx-translate/core';
import { firstOpenRoute } from '@app/core/guards/first-child/first-child.guard';
import { SessionService } from '@app/core/services/session/session.service';

/** What an address that is no page shows, inside the shell so the menu is still there to pick from. */
@Component({
    selector: 'not-found',
    imports: [RouterLink, NgIcon, NzButtonModule, NzResultModule, TranslatePipe],
    providers: [provideIcons({ lucideHouse })],
    templateUrl: './not-found.component.html',
    styleUrl: './not-found.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
    private readonly _session = inject(SessionService);
    /** The first page this person may open, so the way out is never a closed door. */
    readonly home = computed(() => firstOpenRoute(this._session.menu()));
}

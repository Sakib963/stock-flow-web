import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideClock, lucideRefreshCw } from '@ng-icons/lucide';
import { AppUpdateService } from '@app/core/services/app-update/app-update.service';

@Component({
    selector: 'update-dialog',
    imports: [NzModalModule, NzButtonModule, TranslatePipe, NgIcon],
    providers: [provideIcons({ lucideClock, lucideRefreshCw })],
    templateUrl: './update-dialog.component.html',
    styleUrl: './update-dialog.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateDialogComponent {
    readonly update = inject(AppUpdateService);
}

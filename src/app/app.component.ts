import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppUpdateService } from '@app/core/services/app-update/app-update.service';
import { UpdateDialogComponent } from '@app/shared/components/update-dialog/update-dialog.component';

@Component({
    selector: 'root',
    imports: [RouterOutlet, UpdateDialogComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
    readonly update = inject(AppUpdateService);
}

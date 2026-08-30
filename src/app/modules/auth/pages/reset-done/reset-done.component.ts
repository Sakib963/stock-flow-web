import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCircleCheck } from '@ng-icons/lucide';
import { AuthShellComponent } from '@app/modules/auth/components/auth-shell/auth-shell.component';
import { RecoveryService } from '@app/modules/auth/services/recovery.service';

@Component({
    selector: 'reset-done',
    imports: [RouterLink, TranslatePipe, NzButtonModule, NgIcon, AuthShellComponent],
    providers: [provideIcons({ lucideArrowRight, lucideCircleCheck })],
    templateUrl: './reset-done.component.html',
    styleUrl: './reset-done.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResetDoneComponent implements OnInit {
    private readonly _router = inject(Router);
    private readonly _recovery = inject(RecoveryService);

    readonly email = signal((this._router.getCurrentNavigation()?.extras?.state ?? history.state)?.['email'] ?? '');

    ngOnInit(): void {
        // Nothing may be left to resubmit by navigating back: the reset is spent.
        this._recovery.clear();
    }
}

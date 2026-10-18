import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCheck, lucideEyeOff, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { FeatureTree } from '@app/core/models/feature.model';
import { FeatureService } from '@app/modules/administration/feature/services/feature.service';
import { GrantTreeComponent } from '@app/shared/components/grant-tree/grant-tree.component';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/**
 * The whole product as a tree: each module, its features, and each feature's actions, the permissions
 * a role is granted. Read only, and read fresh each time it opens.
 */
@Component({
    selector: 'feature-tree',
    imports: [NgIcon, NzButtonModule, NzDrawerModule, NzSkeletonModule, TranslatePipe, GrantTreeComponent],
    providers: [provideIcons({ lucideBan, lucideCheck, lucideEyeOff, lucideRotateCw, lucideX })],
    templateUrl: './feature-tree.component.html',
    styleUrl: './feature-tree.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureTreeComponent {
    private readonly _features = inject(FeatureService);

    readonly open = input(false);
    readonly closed = output<void>();

    readonly data = signal<FeatureTree | null>(null);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        effect(() => {
            if (this.open()) untracked(() => this.load());
        });
    }

    load(): void {
        this.failed.set(null);
        this.data.set(null);
        this._features.tree().subscribe({ next: (tree) => this.data.set(tree), error: (error: unknown) => this.failed.set(failureOf(error)) });
    }
}

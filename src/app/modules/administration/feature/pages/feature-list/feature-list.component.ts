import { ChangeDetectionStrategy, Component, signal, viewChild } from '@angular/core';
import { ActionEvent } from '@app/core/models/config.model';
import { FeatureReorderComponent } from '@app/modules/administration/feature/components/feature-reorder/feature-reorder.component';
import { FeatureTreeComponent } from '@app/modules/administration/feature/components/feature-tree/feature-tree.component';
import { FEATURE_LIST } from '@app/modules/administration/feature/config/feature-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'feature-list',
    imports: [ListShellPageComponent, FeatureTreeComponent, FeatureReorderComponent],
    templateUrl: './feature-list.component.html',
    styleUrl: './feature-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureListComponent {
    readonly config = FEATURE_LIST;
    readonly treeOpen = signal(false);
    readonly reorderOpen = signal(false);
    readonly list = viewChild(ListShellPageComponent);

    onAction(event: ActionEvent): void {
        if (event.action.key === 'tree') this.treeOpen.set(true);
        if (event.action.key === 'reorder') this.reorderOpen.set(true);
    }
}

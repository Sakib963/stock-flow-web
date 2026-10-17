import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FEATURE_LIST } from '@app/modules/system/feature/config/feature-list.config';
import { ListShellPageComponent } from '@app/shared/components/list-shell-page/list-shell-page.component';

@Component({
    selector: 'feature-list',
    imports: [ListShellPageComponent],
    templateUrl: './feature-list.component.html',
    styleUrl: './feature-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureListComponent {
    readonly config = FEATURE_LIST;
}

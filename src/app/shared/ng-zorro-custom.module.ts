import { NgModule } from '@angular/core';
import { TextFieldModule } from '@angular/cdk/text-field';

import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzBreadCrumbModule } from 'ng-zorro-antd/breadcrumb';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzDropdownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPageHeaderModule } from 'ng-zorro-antd/page-header';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopoverModule } from 'ng-zorro-antd/popover';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSegmentedModule } from 'ng-zorro-antd/segmented';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTimePickerModule } from 'ng-zorro-antd/time-picker';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTreeViewModule } from 'ng-zorro-antd/tree-view';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';
import { NzStepsModule } from 'ng-zorro-antd/steps';
import { NzProgressModule } from 'ng-zorro-antd/progress';
import { NzListModule } from 'ng-zorro-antd/list';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';

// NzMessageModule and NzNotificationModule were removed in ng-zorro v20. Both are now
// service-only (NzMessageService / NzNotificationService are providedIn: 'root'),
// so there is no module left to import.
const NG_ZORRO_MODULES = [
  NzGridModule,
  NzBreadCrumbModule,
  NzButtonModule,
  NzTabsModule,
  NzCardModule,
  NzDividerModule,
  NzFormModule,
  NzInputModule,
  NzImageModule,
  NzDropdownModule,
  NzSelectModule,
  NzDatePickerModule,
  NzSkeletonModule,
  NzPageHeaderModule,
  NzTableModule,
  NzModalModule,
  NzPaginationModule,
  NzCheckboxModule,
  NzRadioModule,
  NzSwitchModule,
  NzIconModule,
  NzTooltipModule,
  NzTimelineModule,
  NzBadgeModule,
  NzDescriptionsModule,
  NzUploadModule,
  NzCollapseModule,
  NzTreeModule,
  NzTreeSelectModule,
  NzInputNumberModule,
  NzTimePickerModule,
  NzTagModule,
  NzSegmentedModule,
  NzAvatarModule,
  NzEmptyModule,
  NzAlertModule,
  NzResultModule,
  NzPopoverModule,
  NzLayoutModule,
  NzDrawerModule,
  NzTreeViewModule,
  NzAutocompleteModule,
  NzStepsModule,
  NzProgressModule,
  NzInputModule,
  NzListModule,
  NzSpinModule,
  NzSpaceModule,
  NzPopconfirmModule,
  NzStatisticModule,
  TextFieldModule
];

@NgModule({
  imports: [...NG_ZORRO_MODULES],
  exports: [...NG_ZORRO_MODULES],
})
export class NgZorroCustomModule {}

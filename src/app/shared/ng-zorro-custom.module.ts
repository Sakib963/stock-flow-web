import { NgModule } from '@angular/core';

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
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzImageModule } from 'ng-zorro-antd/image';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageModule } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzNotificationModule } from 'ng-zorro-antd/notification';
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
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { NzTreeModule } from 'ng-zorro-antd/tree';
import { NzTreeSelectModule } from 'ng-zorro-antd/tree-select';
import { NzUploadModule } from 'ng-zorro-antd/upload';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzTreeViewModule } from 'ng-zorro-antd/tree-view';
import { NzAutocompleteModule } from 'ng-zorro-antd/auto-complete';

const NG_ZORRO_MODULES = [
  NzGridModule,
  NzBreadCrumbModule,
  NzButtonModule,
  NzMessageModule,
  NzTabsModule,
  NzCardModule,
  NzDividerModule,
  NzFormModule,
  NzInputModule,
  NzImageModule,
  NzDropDownModule,
  NzNotificationModule,
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
  NzToolTipModule,
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
  NzAutocompleteModule
];

@NgModule({
  imports: [...NG_ZORRO_MODULES],
  exports: [...NG_ZORRO_MODULES],
})
export class NgZorroCustomModule {}

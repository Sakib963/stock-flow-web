import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Constants } from '@app/core/constants/constants';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { AuthService } from '@app/modules/auth/services/auth.service';

@Component({
  selector: 'app-view-purchase-order-list',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, LoaderComponent],
  templateUrl: './view-purchase-order-list.component.html',
  styleUrls: ['./view-purchase-order-list.component.scss'],
})
export class ViewPurchaseOrderListComponent {
  @Input() data: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Output() paginationEvent: EventEmitter<object> = new EventEmitter();
  @Input() loading: boolean = false;
  @Input() totalCount: number = 0;
  purchaseTypes = DROPDOWN_OPTIONS.PURCHASE_TYPES;

  currentIndex: number = 1;
  offset: number = 0;
  pageSize: number = Constants.PAGE_SIZE;

  user_id: any;
  constructor(private _authService: AuthService) {
    this.user_id = this._authService._userInfo()?.email;
  }

  onPageIndexChange(pageIndex: number): void {
    this.currentIndex = pageIndex;
    this.offset = (pageIndex - 1) * this.pageSize;
    this.paginationEvent.emit({ offset: this.offset, limit: this.pageSize });
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize = pageSize;
    this.currentIndex = 1;
    this.offset = 0;
    this.paginationEvent.emit({ offset: this.offset, limit: this.pageSize });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }

  getPurchaseType(value: any): any {
    return this.purchaseTypes.find((item: any) => item.value === value)?.label;
  }

  getRibbonColor(item: any): any {
    if (item.status === 'Submitted') {
      return 'purple';
    } else if (item.status === 'Verified') {
      return 'green';
    } else if (item.status === 'Cancelled') {
      return 'pink';
    } else if (item.status === 'Rejected') {
      return 'red';
    }
  }

  getEditButtonStatus(item: any): boolean {
    if (item.status === 'Submitted' && this.user_id === item.created_by) {
      return true;
    }
    return false;
  }
}

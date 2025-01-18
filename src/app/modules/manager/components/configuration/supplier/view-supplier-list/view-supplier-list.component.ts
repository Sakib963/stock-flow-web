import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { Constants } from '@app/core/constants/constants';

@Component({
  selector: 'app-view-supplier-list',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, LoaderComponent],
  templateUrl: './view-supplier-list.component.html',
  styleUrls: ['./view-supplier-list.component.scss']
})
export class ViewSupplierListComponent {
  @Input() data: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Output() paginationEvent: EventEmitter<object> = new EventEmitter();
  @Input() loading: boolean = false;
  @Input() totalCount: number = 0;

  currentIndex: number = 1;
  offset: number = 0;
  pageSize: number = Constants.PAGE_SIZE;

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

  handleAddCategory(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }
}
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { LoaderComponent } from '../loader/loader.component';
import { Constants } from '@app/core/constants/constants';
import { ListModel } from '@app/core/models/list.model';

@Component({
  selector: 'list',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, LoaderComponent],
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss'],
})
export class ListComponent {
  @Input() data: any[] = [];
  @Input() listConfig!: ListModel;
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Output() paginationEvent: EventEmitter<object> = new EventEmitter();
  @Input() loading: boolean = false;
  @Input() totalCount: number = 0;
  @Input() isListView: boolean = true;

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

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }

  getListParentClass(): string {
    const columnLength = this.listConfig?.columns.length;
    const actionLength = this.listConfig?.actions.length ? 1 : 0;
    if (this.isListView) {
      return `grid md:grid-cols-${columnLength + actionLength} gap-x-6 py-5`;
    } else {
      return `grid gap-1 p-5 border rounded-md`;
    }
  }

  getULClass(): string {
    if (this.isListView) {
      return 'divide-y divide-gray-100';
    } else {
      return 'space-y-4 md:space-y-0 md:grid md:grid-cols-3 md:gap-6';
    }
  }
}

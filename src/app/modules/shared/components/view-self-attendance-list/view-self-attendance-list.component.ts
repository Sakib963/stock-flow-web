import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Constants } from '@app/core/constants/constants';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
  selector: 'app-view-self-attendance-list',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, LoaderComponent],
  templateUrl: './view-self-attendance-list.component.html',
  styleUrls: ['./view-self-attendance-list.component.scss'],
})
export class ViewSelfAttendanceListComponent {
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

  convertToBangladeshTime(dateString: string): string | null {
    if (dateString) {
      const utcDate = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
        timeZone: 'Asia/Dhaka',
      };

      return new Intl.DateTimeFormat('en-US', options).format(utcDate);
    }
    return null;
  }

  getTotalTime(item: any): string | null {
    if (!item?.sign_in_time_bd) {
      return 'Not signed in yet.';
    }

    const signIn = new Date(item.sign_in_time_bd);
    const signOut = item?.sign_out_time_bd
      ? new Date(item.sign_out_time_bd)
      : null;
    const today = new Date();
    const isToday =
      signIn.getFullYear() === today.getFullYear() &&
      signIn.getMonth() === today.getMonth() &&
      signIn.getDate() === today.getDate();

    if (signIn && !signOut) {
      return isToday ? 'Currently signed in.' : 'Missed signing out.';
    }

    if (signIn && signOut) {
      const diffMs = signOut.getTime() - signIn.getTime();
      if (diffMs <= 0) {
        return 'Invalid time range.';
      }

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return `Total Time: ${hours}h ${minutes}m`;
    }

    return 'Invalid data.';
  }
}

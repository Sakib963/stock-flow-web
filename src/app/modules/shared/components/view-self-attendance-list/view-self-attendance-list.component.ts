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

  getTotalTime(item: any): string {
    if (!item?.attendance_date) {
      return 'Invalid data.';
    }

    const today = new Date();
    const attendanceDate = new Date(item.attendance_date);
    const isToday =
      attendanceDate.getFullYear() === today.getFullYear() &&
      attendanceDate.getMonth() === today.getMonth() &&
      attendanceDate.getDate() === today.getDate();

    const signIn = item?.sign_in_time_bd
      ? new Date(item.sign_in_time_bd)
      : null;
    const signOut = item?.sign_out_time_bd
      ? new Date(item.sign_out_time_bd)
      : null;

    // Case 1: No sign-in time for today (Absent)
    if (!signIn) {
      return isToday ? 'Not signed in yet.' : 'Absent';
    }

    // Case 2: Signed in but no sign-out
    if (signIn && !signOut) {
      return isToday ? 'Currently signed in.' : 'Missed signing out.';
    }

    // Case 3: Both sign-in and sign-out available
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

  getTotalTimeClass(item: any): string {
    const statusText = this.getTotalTime(item);

    switch (statusText) {
      case 'Absent':
      case 'Missed signing out.':
        return 'text-red-500';
      case 'Not signed in yet.':
        return 'text-yellow-500';
      case 'Currently signed in.':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  }
}

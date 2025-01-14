import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-warehouse-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-warehouse-list.component.html',
  styleUrls: ['./view-warehouse-list.component.scss'],
})
export class ViewWarehouseListComponent {
  @Input() data: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  handleAdd(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }
}

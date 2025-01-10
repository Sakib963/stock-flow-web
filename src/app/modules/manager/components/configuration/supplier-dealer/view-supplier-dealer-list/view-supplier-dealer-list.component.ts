import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-supplier-dealer-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-supplier-dealer-list.component.html',
  styleUrls: ['./view-supplier-dealer-list.component.scss']
})
export class ViewSupplierDealerListComponent {
  @Input() data: any[] = [];
  @Input() sourceTypes: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();


  handleAddCategory(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }

  getSourceType(source_type: any): any {
    const item = this.sourceTypes.find((item) => item.value === source_type);

    if (item) {
      return item?.label
    } else {
      return ''
    }
  }

}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-product-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-product-list.component.html',
  styleUrls: ['./view-product-list.component.scss']
})
export class ViewProductListComponent {
  @Input() data: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  handleAddCategory(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }

  getFirstLetter(name: any): any {
    return name[0];
  }

}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-view-user-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './view-user-list.component.html',
  styleUrls: ['./view-user-list.component.scss'],
})
export class ViewUserListComponent {
  @Input() data: any[] = [];
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  handleAddUser(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }

  handleAction(action: any, value: any): any {
    this.actionEmitter.emit({ action, value });
  }

  getFirstLetter(name: any): any {
    return name[0];
  }
}

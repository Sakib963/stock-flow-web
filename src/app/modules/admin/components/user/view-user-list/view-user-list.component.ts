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

  ngOnInit() {
    console.log('Data passed:', this.data);
  }

  handleAddUser(): any {
    this.actionEmitter.emit({ action: 'create', value: null });
  }
}

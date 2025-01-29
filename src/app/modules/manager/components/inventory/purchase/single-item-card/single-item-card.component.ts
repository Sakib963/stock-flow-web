import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';

@Component({
  selector: 'app-single-item-card',
  standalone: true,
  imports: [CommonModule, AngularSvgIconModule],
  templateUrl: './single-item-card.component.html',
  styleUrls: ['./single-item-card.component.scss']
})
export class SingleItemCardComponent {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() itemDetails: any;
  @Input() isEdit: boolean = false;
  @Input() isDisplay: boolean = false;

  handleEdit(): void {
    this.actionEmitter.emit({ action: 'edit' });
  }

  handleDelete(): void {
    this.actionEmitter.emit({ action: 'delete' });
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-single-item-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './single-item-card.component.html',
  styleUrls: ['./single-item-card.component.scss']
})
export class SingleItemCardComponent {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() itemDetails: any;

}

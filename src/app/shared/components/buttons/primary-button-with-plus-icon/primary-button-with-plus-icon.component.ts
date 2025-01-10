import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'primary-button-with-plus-icon',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './primary-button-with-plus-icon.component.html',
  styleUrls: ['./primary-button-with-plus-icon.component.scss']
})
export class PrimaryButtonWithPlusIcon {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
}

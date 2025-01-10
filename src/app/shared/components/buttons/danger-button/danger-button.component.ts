import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'danger-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './danger-button.component.html',
  styleUrls: ['./danger-button.component.scss']
})
export class DangerButton {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
}

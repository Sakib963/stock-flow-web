import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DisableForGuestDirective } from '@app/shared/directives/guest-user.directive';

@Component({
  selector: 'danger-button',
  standalone: true,
  imports: [CommonModule, DisableForGuestDirective],
  templateUrl: './danger-button.component.html',
  styleUrls: ['./danger-button.component.scss']
})
export class DangerButton {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
}

import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'secondary-button',
    imports: [CommonModule],
    templateUrl: './secondary-button.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./secondary-button.component.scss']
})
export class SecondaryButton {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
}

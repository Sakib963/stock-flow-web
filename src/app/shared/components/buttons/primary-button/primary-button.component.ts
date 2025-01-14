import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../spinner/spinner.component';

@Component({
  selector: 'primary-button',
  standalone: true,
  imports: [CommonModule, SpinnerComponent],
  templateUrl: './primary-button.component.html',
  styleUrls: ['./primary-button.component.scss']
})
export class PrimaryButton {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
  @Input() loading: boolean = false;
}
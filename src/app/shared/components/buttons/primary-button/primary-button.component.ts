import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from '../../spinner/spinner.component';
import { DisableForGuestDirective } from '@app/shared/directives/guest-user.directive';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
    selector: 'primary-button',
    imports: [CommonModule, SpinnerComponent, DisableForGuestDirective, NgZorroCustomModule],
    templateUrl: './primary-button.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./primary-button.component.scss']
})
export class PrimaryButton {
  @Input({required: true}) label: any;
  @Input() type: any = 'button';
  @Input() loading: boolean = false;
  @Input() prefixIcon?: string; // Icon to show before the label
  @Input() suffixIcon?: string; // Icon to show after the label
  @Input() iconOnly: boolean = false; // Show only icon without label
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';

@Component({
  selector: 'view-invoice',
  standalone: true,
  imports: [CommonModule, TranslateModule, NgZorroCustomModule, SecondaryButton],
  templateUrl: './view-invoice.component.html',
  styleUrls: ['./view-invoice.component.scss'],
})
export class ViewInvoiceComponent {
  @Input() invoiceDetails: any;
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();

  constructor() {}

  goBack() {
    this.actionEmitter.emit({ action: 'back' });
    // Implement your logic to go back
  }
}

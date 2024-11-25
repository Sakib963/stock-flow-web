import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';

export interface ModalData {
  message: string;
}

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule, AngularSvgIconModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
})
export class ConfirmationModalComponent {
  constructor(
    @Inject(NZ_MODAL_DATA) public modalData: ModalData,
    private _modalRef: NzModalRef
  ) {}

  handleConfirm(): void {
    this._modalRef.triggerOk();
  }

  closeModal(): void {
    this._modalRef.triggerCancel();
  }
}

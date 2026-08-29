import { Component, EventEmitter, HostListener, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { trigger, style, transition, animate, state } from '@angular/animations';

@Component({
  selector: 'app-image-preview-modal',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  templateUrl: './image-preview-modal.component.html',
  styleUrls: ['./image-preview-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.Eager,
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition('void => *', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('* => void', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ]),
    trigger('zoomIn', [
      state('void', style({ transform: 'scale(0.8)', opacity: 0 })),
      state('*', style({ transform: 'scale(1)', opacity: 1 })),
      transition('void => *', animate('300ms cubic-bezier(0.4, 0, 0.2, 1)')),
      transition('* => void', animate('200ms cubic-bezier(0.4, 0, 0.2, 1)'))
    ])
  ]
})
export class ImagePreviewModalComponent {
  @Input() imageUrl: string = '';
  @Input() title: string = 'Image Preview';
  @Output() closeModal = new EventEmitter<void>();

  zoomLevel = 1;
  rotation = 0;
  isDragging = false;
  startX = 0;
  startY = 0;
  translateX = 0;
  translateY = 0;

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.close();
  }

  close(): void {
    this.closeModal.emit();
  }

  zoomIn(): void {
    if (this.zoomLevel < 3) {
      this.zoomLevel += 0.2;
    }
  }

  zoomOut(): void {
    if (this.zoomLevel > 0.5) {
      this.zoomLevel -= 0.2;
    }
  }

  resetZoom(): void {
    this.zoomLevel = 1;
    this.rotation = 0;
    this.translateX = 0;
    this.translateY = 0;
  }

  rotateLeft(): void {
    this.rotation -= 90;
  }

  rotateRight(): void {
    this.rotation += 90;
  }

  downloadImage(): void {
    const link = document.createElement('a');
    link.href = this.imageUrl;
    link.download = this.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '_' + Date.now();
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onImageClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  onMouseDown(event: MouseEvent): void {
    if (this.zoomLevel > 1) {
      this.isDragging = true;
      this.startX = event.clientX - this.translateX;
      this.startY = event.clientY - this.translateY;
      event.preventDefault();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.translateX = event.clientX - this.startX;
      this.translateY = event.clientY - this.startY;
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isDragging = false;
  }

  getImageTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoomLevel}) rotate(${this.rotation}deg)`;
  }
}

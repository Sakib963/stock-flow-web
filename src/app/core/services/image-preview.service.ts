import { Injectable, ApplicationRef, ComponentRef, createComponent, EnvironmentInjector } from '@angular/core';
import { ImagePreviewModalComponent } from '../../shared/components/image-preview-modal/image-preview-modal.component';

@Injectable({
    providedIn: 'root'
})
export class ImagePreviewService {
    private modalRef: ComponentRef<ImagePreviewModalComponent> | null = null;

    constructor(
        private appRef: ApplicationRef,
        private injector: EnvironmentInjector
    ) {}

    /**
     * Preview a single image with smooth modal transition
     * @param imageUrl - URL of the image to preview
     * @param title - Optional title for the image
     */
    previewImage(imageUrl: string, title?: string): void {
        if (!imageUrl) return;

        // Close existing modal if open
        this.closeModal();

        // Create the modal component
        this.modalRef = createComponent(ImagePreviewModalComponent, {
            environmentInjector: this.injector
        });

        // Set inputs
        this.modalRef.instance.imageUrl = imageUrl;
        this.modalRef.instance.title = title || 'Image Preview';

        // Listen for close event
        this.modalRef.instance.closeModal.subscribe(() => {
            this.closeModal();
        });

        // Attach to the app
        this.appRef.attachView(this.modalRef.hostView);
        const domElem = (this.modalRef.hostView as any).rootNodes[0] as HTMLElement;
        document.body.appendChild(domElem);
    }

    private closeModal(): void {
        if (this.modalRef) {
            this.appRef.detachView(this.modalRef.hostView);
            this.modalRef.destroy();
            this.modalRef = null;
        }
    }
}

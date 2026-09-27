import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, TemplateRef, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideImagePlus, lucideRefreshCw, lucideTrash2 } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzUploadFile, NzUploadModule } from 'ng-zorro-antd/upload';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ProductService } from '@app/modules/configuration/product/services/product.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { LanguageService } from '@app/core/services/language/language.service';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * The product's one photo, uploaded the moment it is picked.
 *
 * The box is a fixed square and the photo is contained, never cropped, so a tall kurti and a wide
 * sandal both show whole and the form does not move when one arrives.
 */
@Component({
    selector: 'product-photo',
    imports: [NgIcon, NzButtonModule, NzUploadModule, TranslatePipe, DigitsPipe],
    providers: [provideIcons({ lucideImagePlus, lucideRefreshCw, lucideTrash2 })],
    templateUrl: './product-photo.component.html',
    styleUrl: './product-photo.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductPhotoComponent {
    private readonly _products = inject(ProductService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly accept = ACCEPT;

    /** The saved photo, or the one uploaded since the form opened. */
    readonly url = input<string | null>(null);

    readonly changed = output<string | null>();
    /** True while a file is travelling, so the form can hold Save until the photo is really there. */
    readonly busy = output<boolean>();

    /** What was picked, shown from the device at once while it uploads. */
    readonly preview = signal<string | null>(null);
    /** Null while idle; preparing while the server signs and the photo is shrunk; then the upload itself. */
    readonly phase = signal<'preparing' | 'uploading' | null>(null);
    /** The percentage on screen, which counts up to the real one. */
    readonly progress = signal<number | null>(null);
    readonly failed = signal<string | null>(null);

    readonly shown = computed(() => this.preview() ?? this.url());
    readonly uploading = computed(() => this.phase() !== null);
    /** Every byte sent is not the photo saved: the last moment is Cloudinary storing it. */
    readonly uploadLabel = computed(() => {
        if (this.phase() === 'preparing') return 'configuration.product.photo.preparing';
        return (this.progress() ?? 0) >= 99 ? 'configuration.product.photo.finishing' : 'configuration.product.photo.uploadingPercent';
    });
    /** A fifth visible from the start, so the person sees at once what they picked. */
    readonly opacity = computed(() => (this.uploading() ? 0.2 + 0.8 * ((this.progress() ?? 0) / 100) : 1));

    private readonly _uploadMessage = viewChild.required<TemplateRef<void>>('uploadMessage');
    /** The message that follows the upload; its template reads the progress signal, so it updates without being sent again. */
    private _messageId: string | null = null;

    private _upload?: Subscription;

    // A shrunk photo is a few hundred KB, which a fast line sends in one or two progress events, so
    // the real number jumps 0 to 99. The number shown counts up to it in quick steps instead: never
    // past what has really been sent, and never holding up the finish.
    private _sent = 0;
    private _counter?: ReturnType<typeof setInterval>;

    readonly percentText = (percent: number): string => localDigits(`${percent}%`, this._language());

    constructor() {
        inject(DestroyRef).onDestroy(() => {
            this._upload?.unsubscribe();
            this.releasePreview();
            this.closeMessage();
            clearInterval(this._counter);
        });
    }

    /** nz-upload asks before it uploads; answering false keeps the upload ours, so it is signed and its progress is real. */
    readonly pick = (file: NzUploadFile): boolean => {
        this.start(file as unknown as File);
        return false;
    };

    remove(): void {
        this._upload?.unsubscribe();
        this.settle();
        this.releasePreview();
        this.failed.set(null);
        this.changed.emit(null);
    }

    private start(file: File): void {
        this.failed.set(null);
        if (!ACCEPT.split(',').includes(file.type)) return this.failed.set('configuration.product.photo.wrongType');
        if (file.size > MAX_BYTES) return this.failed.set('configuration.product.photo.tooLarge');

        this._upload?.unsubscribe();
        this.releasePreview();
        this.preview.set(URL.createObjectURL(file));
        this.phase.set('preparing');
        this.progress.set(0);
        this._sent = 0;
        this.busy.emit(true);
        this.closeMessage();
        this._messageId = this._message.loading(this._uploadMessage(), { nzDuration: 0 }).messageId;

        this._upload = this._products.uploadPhoto(file).subscribe({
            next: (event) => {
                if (event.state === 'uploading') {
                    this.phase.set('uploading');
                    this._sent = event.progress;
                    this.countUp();
                    return;
                }
                this.settle();
                this._message.success(this._translate.instant('configuration.product.photo.uploaded'));
                this.changed.emit(event.url);
                // The uploaded photo replaces the device's copy, so what is shown is what was saved.
                this.releasePreview();
            },
            error: (error: unknown) => {
                this.settle();
                this.releasePreview();
                this.failed.set(this.failureKey(error));
            },
        });
    }

    private countUp(): void {
        if (this._counter) return;
        this._counter = setInterval(() => {
            const shown = this.progress() ?? 0;
            if (shown < this._sent) this.progress.set(Math.min(this._sent, shown + Math.max(1, Math.ceil((this._sent - shown) / 6))));
        }, 40);
    }

    private settle(): void {
        clearInterval(this._counter);
        this._counter = undefined;
        this.phase.set(null);
        this.progress.set(null);
        this.busy.emit(false);
        this.closeMessage();
    }

    private closeMessage(): void {
        if (this._messageId) this._message.remove(this._messageId);
        this._messageId = null;
    }

    private releasePreview(): void {
        const preview = this.preview();
        if (preview) URL.revokeObjectURL(preview);
        this.preview.set(null);
    }

    private failureKey(error: unknown): string {
        if (error instanceof HttpErrorResponse && error.status === 503) return 'configuration.product.photo.notSetUp';
        return `configuration.product.photo.failed.${failureOf(error)}`;
    }
}

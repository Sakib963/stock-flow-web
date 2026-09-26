import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideCopy } from '@ng-icons/lucide';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

const TICK_MS = 1500;

/** The button the `copyable` directive puts after a piece of text. Not placed in templates by hand. */
@Component({
    selector: 'copy-button',
    imports: [NgIcon, NzTooltipModule, TranslatePipe],
    providers: [provideIcons({ lucideCheck, lucideCopy })],
    templateUrl: './copy-button.component.html',
    styleUrl: './copy-button.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CopyButtonComponent {
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    /** Read at the moment of the click, so it copies what is on screen then. */
    readonly text = input.required<() => string>();

    readonly copied = signal(false);
    private _timer: ReturnType<typeof setTimeout> | undefined;

    constructor() {
        inject(DestroyRef).onDestroy(() => clearTimeout(this._timer));
    }

    async copy(event: Event): Promise<void> {
        // Inside a table row or a link, the click is a copy and nothing else.
        event.stopPropagation();
        event.preventDefault();
        try {
            await navigator.clipboard.writeText(this.text()());
            this.copied.set(true);
            this._message.success(this._translate.instant('copy.copied'));
            clearTimeout(this._timer);
            this._timer = setTimeout(() => this.copied.set(false), TICK_MS);
        } catch {
            this._message.error(this._translate.instant('copy.failed'));
        }
    }
}

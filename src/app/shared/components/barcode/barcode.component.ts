import { ChangeDetectionStrategy, Component, ElementRef, effect, input, viewChild } from '@angular/core';
import JsBarcode from 'jsbarcode';

// Replaces the ngx-barcode6 wrapper, which is pinned below Angular 22 and blocked the
// upgrade. JsBarcode is the same renderer that wrapper used, called directly, so the
// printed label and the on-screen preview stay identical.
@Component({
    selector: 'barcode',
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `<svg #target></svg>`,
})
export class BarcodeComponent {
    value = input.required<string>();
    format = input<string>('CODE128');
    width = input<number>(1.2);
    height = input<number>(40);
    displayValue = input<boolean>(true);

    private readonly _target = viewChild.required<ElementRef<SVGElement>>('target');

    constructor() {
        effect(() => {
            const value = this.value();
            const target = this._target().nativeElement;

            // An empty batch code is a real state while a drawer is opening, and JsBarcode
            // throws on it rather than returning, so clear the SVG and wait.
            if (!value) {
                target.replaceChildren();
                return;
            }

            JsBarcode(target, value, {
                format: this.format(),
                width: this.width(),
                height: this.height(),
                displayValue: this.displayValue(),
                margin: 0,
            });
        });
    }
}

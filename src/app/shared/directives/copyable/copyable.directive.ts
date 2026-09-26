import { ApplicationRef, afterNextRender, DestroyRef, Directive, ElementRef, EnvironmentInjector, Injector, createComponent, inject, input } from '@angular/core';
import { CopyButtonComponent } from '@app/shared/components/copy-button/copy-button.component';

/**
 * Click to copy, on any element: `<p copyable>SARE</p>`. Hovering it shows a copy button after the
 * text; clicking copies the element's text, or the value given, `<span [copyable]="row.code">`.
 *
 * The button's space is kept while it is hidden, so a list column using this needs about 24px more.
 */
@Directive({
    selector: '[copyable]',
    host: { class: 'group/copy' },
})
export class CopyableDirective {
    /** What to copy. Empty means the element's own text. */
    readonly copyable = input<string | null | undefined>('');

    constructor() {
        const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
        const app = inject(ApplicationRef);
        // Not through a ViewContainerRef: its view is placed beside the element, and when the element
        // sits in an @if or a template outlet, attaching that block moves the button back out of it,
        // where hovering the text can no longer reveal it.
        const button = createComponent(CopyButtonComponent, { environmentInjector: inject(EnvironmentInjector), elementInjector: inject(Injector) });
        button.setInput('text', () => this.copyable() || (host.textContent ?? '').trim());
        app.attachView(button.hostView);
        // After render, because the element's own content is created after this runs, and appending now
        // put the button in front of the text.
        afterNextRender(() => host.appendChild(button.location.nativeElement));
        inject(DestroyRef).onDestroy(() => button.destroy());
    }
}

import { ChangeDetectionStrategy, Component, TemplateRef, computed, contentChild, input, linkedSignal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTimelineModule } from 'ng-zorro-antd/timeline';
import { TranslatePipe } from '@ngx-translate/core';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

const STEP = 5;

/**
 * The timeline or activity panel of every record page: five entries, See more adds five, and a box
 * that scrolls on its own past a fixed height, so a long history never pushes the page down. The page
 * says what one entry shows, newest first, with an `<ng-template let-entry>`.
 */
@Component({
    selector: 'record-timeline',
    imports: [NgTemplateOutlet, NzButtonModule, NzTimelineModule, TranslatePipe, DigitsPipe],
    templateUrl: './record-timeline.component.html',
    styleUrl: './record-timeline.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecordTimelineComponent<T> {
    readonly entries = input.required<readonly T[]>();
    readonly item = contentChild.required(TemplateRef<{ $implicit: T }>);

    /** Back to five whenever the record reloads. */
    readonly shown = linkedSignal({ source: this.entries, computation: () => STEP });
    readonly visible = computed(() => this.entries().slice(0, this.shown()));
    readonly hidden = computed(() => Math.max(0, this.entries().length - this.shown()));

    more(): void {
        this.shown.update((shown) => shown + STEP);
    }
}

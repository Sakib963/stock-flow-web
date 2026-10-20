import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { localDigits } from '@app/shared/utils/local-digits/local-digits';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

/** One step of a funnel, and what happened between it and the next. Labels are copy keys. */
export interface FunnelStep {
    key: string;
    label: string;
    count: number;
    value: number;
    /** Lines under the step: what was lost on the way to the next one, and what is still on its way. */
    notes?: { key: string; params: Record<string, string | number>; tone: 'lost' | 'open' }[];
}

/** Stepped bars, each as wide as its share of the first step, so the leak shows as the bars narrow. */
@Component({
    selector: 'funnel-chart',
    imports: [NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [MoneyPipe],
    templateUrl: './funnel-chart.component.html',
    styleUrl: './funnel-chart.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FunnelChartComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _money = inject(MoneyPipe);
    private readonly _language = inject(LanguageService).current;

    readonly steps = input.required<FunnelStep[]>();
    readonly hovered = signal<string | null>(null);

    readonly rows = computed(() => {
        const steps = this.steps();
        const first = steps[0]?.count || 1;
        const language = this._language();
        const t = (key: string, params?: object) => this._translate.instant(key, params);
        return steps.map((step, i) => {
            const share = Math.round((step.count / first) * 100);
            const notes = (step.notes ?? []).map((note) => t(note.key, note.params));
            const tip = [t('charts.funnelTip', { label: t(step.label), count: this._money.transform(step.count, 'number'), share, first: t(steps[0].label), value: this._money.transform(step.value, 'number') }), ...notes].join(' ');
            return { ...step, last: i === steps.length - 1, share, width: step.count ? Math.max((step.count / first) * 100, 1) : 0, tip: localDigits(tip, language) };
        });
    });
}

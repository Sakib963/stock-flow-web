import { ChangeDetectionStrategy, Component, effect, inject, input, output, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCircleCheck, lucideList, lucideShieldAlert } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ObservabilityRange, RequestFilters, Signal } from '@app/core/models/observability.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

@Component({
    selector: 'signals-tab',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, NzTooltipModule, TranslatePipe, DigitsPipe, MoneyPipe, RecordDatePipe],
    providers: [provideIcons({ lucideCircleCheck, lucideList, lucideShieldAlert })],
    templateUrl: './signals-tab.component.html',
    styleUrl: './signals-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignalsTabComponent {
    private readonly _service = inject(ObservabilityService);
    readonly language = inject(LanguageService).current;

    readonly range = input.required<ObservabilityRange>();
    readonly openRequests = output<RequestFilters>();

    readonly signals = loader((range: ObservabilityRange) => this._service.signals(range));

    constructor() {
        effect(() => {
            const range = this.range();
            untracked(() => this.signals.run(range));
        });
    }

    hour(value: number | undefined): string {
        if (value === undefined) return '';
        const locale = this.language() === 'bn' ? 'bn-BD' : 'en-GB';
        return new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, 1, value)));
    }

    open(match: Signal['matches'][number]): void {
        this.openRequests.emit(match.ip ? { ip: match.ip } : { person: match.email ?? undefined });
    }
}

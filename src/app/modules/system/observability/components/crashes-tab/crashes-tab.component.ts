import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideEye } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe } from '@ngx-translate/core';
import { ObservabilityRange } from '@app/core/models/observability.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { RequestDrawerComponent } from '@app/modules/system/observability/components/request-drawer/request-drawer.component';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { deviceName } from '@app/modules/system/observability/utils/device-name/device-name';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';

@Component({
    selector: 'crashes-tab',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzTableModule, NzTooltipModule, TranslatePipe, RecordDatePipe, RequestDrawerComponent],
    providers: [provideIcons({ lucideEye })],
    templateUrl: './crashes-tab.component.html',
    styleUrl: './crashes-tab.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CrashesTabComponent {
    private readonly _service = inject(ObservabilityService);
    readonly language = inject(LanguageService).current;

    readonly range = input.required<ObservabilityRange>();
    readonly opened = signal<string | null>(null);
    readonly deviceName = deviceName;

    readonly crashes = loader((range: ObservabilityRange) => this._service.crashes(range));

    constructor() {
        effect(() => {
            const range = this.range();
            untracked(() => this.crashes.run(range));
        });
    }
}

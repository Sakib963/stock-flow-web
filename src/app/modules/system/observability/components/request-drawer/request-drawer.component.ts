import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, untracked } from '@angular/core';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { ObservabilityService } from '@app/modules/system/observability/services/observability.service';
import { loader } from '@app/modules/system/observability/utils/loader/loader';
import { deviceName } from '@app/modules/system/observability/utils/device-name/device-name';
import { statusStyle } from '@app/modules/system/observability/utils/status-style/status-style';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { isPhoneWidth, viewportWidth } from '@app/shared/utils/viewport/viewport';

@Component({
    selector: 'request-drawer',
    imports: [StatusTagComponent, NzDescriptionsModule, NzDrawerModule, NzSkeletonModule, TranslatePipe, DigitsPipe, RecordDatePipe],
    templateUrl: './request-drawer.component.html',
    styleUrl: './request-drawer.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestDrawerComponent {
    private readonly _service = inject(ObservabilityService);
    readonly language = inject(LanguageService).current;

    readonly oid = input<string | null>(null);
    readonly closed = output<void>();

    private readonly _phone = isPhoneWidth(viewportWidth());
    readonly width = computed(() => (this._phone() ? '100%' : '640px'));
    readonly statusStyle = statusStyle;
    readonly deviceName = deviceName;
    readonly request = loader((oid: string) => this._service.request(oid));

    constructor() {
        effect(() => {
            const oid = this.oid();
            if (oid) untracked(() => this.request.run(oid));
        });
    }

    pretty(body: unknown): string {
        return typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    }
}

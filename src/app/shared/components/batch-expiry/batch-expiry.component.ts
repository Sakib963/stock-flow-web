import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideCalendarClock, lucideCalendarX, lucideCheck, lucidePencil, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '@app/core/services/language/language.service';
import { BatchExpiryService } from '@app/shared/services/batch-expiry/batch-expiry.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { expiryState, fromDay, toDay } from '@app/shared/utils/calendar-day/calendar-day';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/**
 * A batch's expiry date with its Expired or Expires soon tag, and, for someone who may edit
 * purchase orders, a dialog to set, change or clear it after the order is verified.
 */
@Component({
    selector: 'batch-expiry',
    imports: [FormsModule, NgIcon, NzButtonModule, NzDatePickerModule, NzModalModule, NzTooltipModule, TranslatePipe, StatusTagComponent, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideCalendarClock, lucideCalendarX, lucideCheck, lucidePencil, lucideX })],
    templateUrl: './batch-expiry.component.html',
    styleUrl: './batch-expiry.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BatchExpiryComponent {
    private readonly _expiry = inject(BatchExpiryService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly language = inject(LanguageService).current;

    /** Without a batch, as on a line not yet verified, the date is shown and cannot be edited. */
    readonly batchOid = input<string | null>(null);
    readonly batchCode = input('');
    readonly day = input<string | null>(null);
    readonly canEdit = input(false);

    readonly changed = output<string | null>();

    readonly editable = computed(() => this.canEdit() && !!this.batchOid());
    readonly state = computed(() => expiryState(this.day()));
    readonly date = computed(() => fromDay(this.day()));
    readonly open = signal(false);
    readonly saving = signal(false);
    readonly picked = signal<Date | null>(null);
    /** The second step of the same dialog, so asking before a save never stacks a second modal. */
    readonly confirming = signal(false);
    readonly pickedDay = computed(() => toDay(this.picked()));
    readonly confirmKey = computed(() => (!this.day() ? 'inventory.expiry.confirmSet' : this.pickedDay() ? 'inventory.expiry.confirmChange' : 'inventory.expiry.confirmClear'));

    edit(): void {
        this.picked.set(fromDay(this.day()));
        this.confirming.set(false);
        this.open.set(true);
    }

    /** Asks before saving; an unchanged date closes without asking or writing. */
    review(): void {
        if (this.pickedDay() === this.day()) {
            this.open.set(false);
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        this.confirming.set(true);
    }

    save(): void {
        if (this.saving()) return;
        const oid = this.batchOid();
        if (!oid) return;
        const day = toDay(this.picked());
        this.saving.set(true);
        this._expiry.update(oid, day).subscribe({
            next: (changed) => {
                this.saving.set(false);
                this.open.set(false);
                this._message[changed ? 'success' : 'info'](this._translate.instant(changed ? 'inventory.expiry.saved' : 'form.nothingChanged'));
                if (changed) this.changed.emit(day);
            },
            error: (error: unknown) => {
                this.saving.set(false);
                const key = error instanceof HttpErrorResponse && error.status === 409 ? 'inventory.expiry.notExpiring' : failureKey(error, 'form.saveFailed');
                this._message.error(this._translate.instant(key));
            },
        });
    }
}

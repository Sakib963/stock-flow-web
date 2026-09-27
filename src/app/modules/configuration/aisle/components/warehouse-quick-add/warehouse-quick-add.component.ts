import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { ShellStateService } from '@app/layout/services/shell-state/shell-state.service';
import { WarehouseFormComponent } from '@app/modules/configuration/warehouse/components/warehouse-form.component';
import { WAREHOUSE_TAKEN } from '@app/modules/configuration/warehouse/constants/warehouse-copy';
import { WarehouseService } from '@app/modules/configuration/warehouse/services/warehouse.service';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey } from '@app/shared/utils/request-failure/request-failure';

/**
 * Adds a warehouse without leaving the aisle form.
 *
 * Someone halfway through an aisle who finds its warehouse missing would otherwise have to
 * abandon what they typed, go and add it, and come back. This is the same warehouse form the
 * Warehouses page uses, so its checks and its code generator come with it.
 */
@Component({
    selector: 'warehouse-quick-add',
    imports: [NgIcon, NzButtonModule, NzDrawerModule, TranslatePipe, WarehouseFormComponent],
    providers: [provideIcons({ lucideCheck, lucideX })],
    templateUrl: './warehouse-quick-add.component.html',
    styleUrl: './warehouse-quick-add.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WarehouseQuickAddComponent {
    private readonly _warehouses = inject(WarehouseService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _modal = inject(NzModalService);

    readonly shell = inject(ShellStateService);

    /** Null while closed; the name to start from while open, empty when nothing was typed. */
    readonly startingName = input<string | null>(null);

    readonly created = output<{ oid: string; name: string }>();
    readonly closed = output<void>();

    readonly editor = viewChild(WarehouseFormComponent);
    private readonly _submitting = signal(false);
    readonly saving = computed(() => this._submitting() || this._warehouses.saving());

    constructor() {
        // The form is built when the drawer opens, so the name someone was searching for is put in
        // once it exists. Typed by them, so leaving it counts as something to lose.
        effect(() => {
            const editor = this.editor();
            if (!editor) return;
            const name = untracked(this.startingName)?.trim();
            if (!name) return;
            editor.form.controls.name.setValue(name);
            editor.form.controls.name.markAsDirty();
        });
    }

    save(): void {
        const editor = this.editor();
        if (!editor || this.saving()) return;

        this._submitting.set(true);
        editor.ready().subscribe((ready) => {
            this._submitting.set(false);
            if (!ready) {
                this._message.error(this._translate.instant('form.fixErrors'));
                return;
            }

            const payload = editor.payload();
            const copy = {
                title: this._translate.instant('configuration.warehouse.confirmCreate.title'),
                body: this._translate.instant('configuration.warehouse.confirmCreate.body', { name: payload.name, code: payload.code }),
                ok: this._translate.instant('configuration.warehouse.add'),
                cancel: this._translate.instant('form.confirm.cancel'),
            };
            confirmAction(this._modal, copy).subscribe((confirmed) => {
                if (!confirmed) return;
                this._submitting.set(true);
                this._warehouses.create(payload).subscribe({
                    next: (oid) => {
                        this._submitting.set(false);
                        this._message.success(this._translate.instant('configuration.warehouse.createdMessage'));
                        this.created.emit({ oid, name: payload.name });
                    },
                    error: (error: unknown) => {
                        this._submitting.set(false);
                        const taken = this._warehouses.conflictOf(error);
                        if (taken) {
                            editor.reject(taken);
                            this._message.error(this._translate.instant(WAREHOUSE_TAKEN[taken]));
                            return;
                        }
                        this._message.error(this._translate.instant(failureKey(error, 'form.saveFailed')));
                    },
                });
            });
        });
    }

    close(): void {
        if (!this.saving()) this.closed.emit();
    }
}

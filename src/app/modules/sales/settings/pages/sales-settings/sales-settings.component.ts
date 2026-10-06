import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideMessageSquareText, lucidePencil, lucidePlus, lucideRotateCw, lucideSave, lucideX } from '@ng-icons/lucide';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { MESSAGE_PLACEHOLDERS, MESSAGE_STAGES, MessageStage, MessageTemplate } from '@app/core/models/message-template.model';
import { SessionService } from '@app/core/services/session/session.service';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { SalesSettingsService } from '@app/modules/sales/settings/services/sales-settings.service';

type Draft = { oid?: string; name: string; language: 'en' | 'bn'; body: string; order_statuses: MessageStage[]; active: boolean };

/** Sales settings: for now the message templates a moderator copies from an order (sales REQ-90). */
@Component({
    selector: 'sales-settings',
    imports: [FormsModule, NgIcon, TranslatePipe, NzButtonModule, NzCardModule, NzDrawerModule, NzFormModule, NzInputModule, NzRadioModule, NzSelectModule, NzSkeletonModule, NzSwitchModule, PageHeaderComponent, StatusTagComponent],
    providers: [provideIcons({ lucideMessageSquareText, lucidePencil, lucidePlus, lucideRotateCw, lucideSave, lucideX })],
    templateUrl: './sales-settings.component.html',
    styleUrl: './sales-settings.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalesSettingsComponent {
    private readonly _settings = inject(SalesSettingsService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);

    readonly canEdit = inject(SessionService).can('sales.settings.edit');
    readonly stages = MESSAGE_STAGES;
    readonly placeholders = MESSAGE_PLACEHOLDERS;
    readonly saving = this._settings.saving;

    readonly templates = signal<MessageTemplate[]>([]);
    readonly state = signal<'loading' | 'ready' | 'failed'>('loading');
    readonly draft = signal<Draft | null>(null);
    readonly incomplete = computed(() => {
        const draft = this.draft();
        return !draft || !draft.name.trim() || !draft.body.trim();
    });

    constructor() {
        this.load();
    }

    load(): void {
        this.state.set('loading');
        this._settings.templates().subscribe({
            next: (templates) => {
                this.templates.set(templates);
                this.state.set('ready');
            },
            error: () => this.state.set('failed'),
        });
    }

    add(): void {
        this.draft.set({ name: '', language: 'en', body: '', order_statuses: [], active: true });
    }

    edit(template: MessageTemplate): void {
        this.draft.set({ oid: template.oid, name: template.name, language: template.language, body: template.body, order_statuses: [...template.order_statuses], active: template.status === 'Active' });
    }

    change(patch: Partial<Draft>): void {
        this.draft.update((draft) => (draft ? { ...draft, ...patch } : draft));
    }

    insert(placeholder: string): void {
        const body = this.draft()?.body ?? '';
        this.change({ body: `${body}${body && !body.endsWith(' ') ? ' ' : ''}{${placeholder}}` });
    }

    save(): void {
        const draft = this.draft();
        if (!draft || this.incomplete() || this.saving()) return;
        confirmAction(this._modal, {
            title: this._translate.instant('sales.settings.templates.confirmTitle', { name: draft.name.trim() }),
            body: this._translate.instant('sales.settings.templates.confirmBody'),
            ok: this._translate.instant('sales.settings.templates.save'),
            cancel: this._translate.instant('form.confirm.cancel'),
        }).subscribe((confirmed) => {
            if (!confirmed) return;
            const { active, ...rest } = draft;
            this._settings.saveTemplate({ ...rest, name: rest.name.trim(), body: rest.body.trim(), status: active ? 'Active' : 'Inactive' }).subscribe({
                next: () => {
                    this.draft.set(null);
                    this._message.success(this._translate.instant('sales.settings.templates.saved'));
                    this.load();
                },
                error: (error: unknown) => this._message.error(error instanceof HttpErrorResponse && error.status === 409 ? error.error?.message : this._translate.instant('form.saveFailed')),
            });
        });
    }
}

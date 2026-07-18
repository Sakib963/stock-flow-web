import { CommonModule, Location } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { FormActions } from '@app/core/interfaces/form-action';
import { HttpService } from '@app/core/services/http.service';
import { ProductDisposeFormComponent } from '@app/modules/inventory/components/product-dispose/product-dispose-form/product-dispose-form.component';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
    selector: 'view-product-dispose',
    imports: [CommonModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, ProductDisposeFormComponent, CurrencyFormatPipe, FormsModule],
    templateUrl: './view-product-dispose.component.html',
    styleUrl: './view-product-dispose.component.scss',
})
export class ViewProductDisposeComponent implements OnInit {
    loading = false;
    actionLoading = false;
    actionLoadingKey = signal<string | null>(null);
    isActionRunning = computed(() => this.actionLoadingKey() !== null);
    editMode = false;
    currentLinesView = 0;

    dispose = signal<any | null>(null);
    lines: any[] = [];
    stats: any = null;
    activity: any[] = [];

    private readonly _reasonLabelByValue = new Map<string, string>(DROPDOWN_OPTIONS.DISPOSAL_REASONS.map((r) => [r.value, r.label]));
    private readonly _methodLabelByValue = new Map<string, string>(DROPDOWN_OPTIONS.DISPOSAL_METHODS.map((m) => [m.value, m.label]));

    private readonly _httpService = inject(HttpService);
    private readonly _destroyRef = inject(DestroyRef);
    private readonly _activatedRoute = inject(ActivatedRoute);
    private readonly _notificationService = inject(NzNotificationService);
    private readonly _modalService = inject(NzModalService);
    private readonly _location = inject(Location);

    ngOnInit(): void {
        this.editMode = typeof window !== 'undefined' && window.history.state?.edit === true;
        this.loadDetails();
    }

    handleSwitchChange(event: boolean): void {
        if (!this.canEdit) {
            this.editMode = false;
            return;
        }
        this.editMode = event;
    }

    get canEdit(): boolean {
        return this.dispose()?.status === 'Submitted';
    }

    get canApprove(): boolean {
        return this.dispose()?.status === 'Submitted';
    }

    get canReject(): boolean {
        return this.dispose()?.status === 'Submitted';
    }

    get canCancel(): boolean {
        return this.dispose()?.status === 'Submitted';
    }

    get canReverse(): boolean {
        return this.dispose()?.status === 'Approved';
    }

    get hasWorkflowActions(): boolean {
        return this.canApprove || this.canReject || this.canCancel || this.canReverse;
    }

    get editFormData(): any {
        const dispose = this.dispose();
        if (!dispose) {
            return null;
        }
        return { ...dispose, products: this.lines };
    }

    get maxReasonValue(): number {
        const values = (this.stats?.byReason || []).map((r: any) => Number(r.value || 0));
        return values.length ? Math.max(...values, 1) : 1;
    }

    getReasonLabel(value: string): string {
        return this._reasonLabelByValue.get(value) || value || '-';
    }

    getMethodLabel(value: string): string {
        return this._methodLabelByValue.get(value) || value || '-';
    }

    reasonBarWidth(value: number): string {
        return `${Math.round((Number(value || 0) / this.maxReasonValue) * 100)}%`;
    }

    loadDetails(): void {
        const oid = this._activatedRoute.snapshot.paramMap.get('oid');
        if (!oid) {
            this._notificationService.error('Product Dispose', 'Invalid disposal identifier');
            return;
        }

        this.loading = true;
        this._httpService
            .get(`${APIEndpoint.GET_PRODUCT_DISPOSE_DETAILS}/${oid}`)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.loading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        const bodyData = res.body.data || {};
                        this.dispose.set(bodyData.details || bodyData);
                        this.lines = bodyData.lines || [];
                        this.stats = bodyData.stats || null;
                        this.activity = bodyData.activity || [];

                        if (this.editMode && !this.canEdit) {
                            this.editMode = false;
                            this._notificationService.warning('Product Dispose', 'Only submitted disposals can be edited.');
                        }
                        return;
                    }
                    this._notificationService.error('Product Dispose', res?.body?.message || 'Unable to load disposal details');
                },
                error: (err: any) => {
                    this._notificationService.error('Product Dispose', err?.error?.message || 'Failed to load disposal details');
                },
            });
    }

    approveDispose(): void {
        this._confirmAction('approve', 'Approve Disposal', 'This will deduct the disposed quantities from stock. Continue?', 'Approve', APIEndpoint.APPROVE_PRODUCT_DISPOSE, 'Disposal approved successfully');
    }

    rejectDispose(): void {
        this._confirmAction('reject', 'Reject Disposal', 'This will reject the disposal. No stock will change. Continue?', 'Reject', APIEndpoint.REJECT_PRODUCT_DISPOSE, 'Disposal rejected successfully');
    }

    cancelDispose(): void {
        this._confirmAction('cancel', 'Cancel Disposal', 'This will cancel the disposal. No stock will change. Continue?', 'Cancel Disposal', APIEndpoint.CANCEL_PRODUCT_DISPOSE, 'Disposal cancelled successfully');
    }

    reverseDispose(): void {
        this._confirmAction('reverse', 'Reverse Disposal', 'This will restore the disposed quantities back to stock. Continue?', 'Reverse', APIEndpoint.REVERSE_PRODUCT_DISPOSE, 'Disposal reversed successfully');
    }

    private _confirmAction(key: string, title: string, content: string, okText: string, url: string, successMessage: string): void {
        const oid = this.dispose()?.oid;
        if (!oid) {
            return;
        }
        this._modalService.confirm({
            nzTitle: title,
            nzContent: content,
            nzOkText: okText,
            nzCancelText: 'Back',
            nzOnOk: () => this._runAction(key, url, oid, successMessage),
        });
    }

    private _runAction(key: string, url: string, oid: string, successMessage: string): void {
        this.actionLoadingKey.set(key);
        this._httpService
            .post(url, { oid })
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.actionLoadingKey.set(null);
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Product Dispose', res?.body?.message || successMessage);
                        this.loadDetails();
                        return;
                    }
                    this._notificationService.error('Product Dispose', res?.body?.message || 'Action could not be completed');
                },
                error: (err: any) => {
                    this._notificationService.error('Product Dispose', err?.error?.message || 'Action could not be completed');
                },
            });
    }

    handleEditFormActions(event: FormActions): void {
        if (event.action === 'cancel') {
            this.editMode = false;
            return;
        }
        this._updateDispose(event.data);
    }

    private _updateDispose(payload: any): void {
        this.actionLoading = true;
        this._httpService
            .post(APIEndpoint.UPDATE_PRODUCT_DISPOSE_DETAILS, payload)
            .pipe(
                takeUntilDestroyed(this._destroyRef),
                finalize(() => {
                    this.actionLoading = false;
                })
            )
            .subscribe({
                next: (res: any) => {
                    if (res?.status === 200 && res?.body?.code === 200) {
                        this._notificationService.success('Product Dispose', res?.body?.message || 'Disposal updated successfully');
                        this.editMode = false;
                        this.loadDetails();
                        return;
                    }
                    this._notificationService.error('Product Dispose', res?.body?.message || 'Unable to update disposal');
                },
                error: (err: any) => {
                    this._notificationService.error('Product Dispose', err?.error?.message || 'Failed to update disposal');
                },
            });
    }

    navigateBack(): void {
        this._location.back();
    }
}

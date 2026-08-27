import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { PrintService } from '@app/core/services/print.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { PaymentStatusLabelPipe, PaymentTypeLabelPipe } from '@app/shared/pipe/payment-label.pipe';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';

@Component({
    selector: 'order-detail',
    imports: [CommonModule, FormsModule, NgZorroCustomModule, PageHeaderComponent, LoaderComponent, PaymentStatusLabelPipe, PaymentTypeLabelPipe],
    templateUrl: './order-detail.component.html',
    styleUrl: './order-detail.component.scss',
})
export class OrderDetailComponent {
    oid = '';
    order = signal<any>(null);
    loading = signal(false);
    busy = signal(false);

    // Shared date-time format (day/month/year, 12-hour).
    readonly dateFormat = 'dd/MM/yyyy hh:mm a';

    // Full one-line delivery address built from the structured parts.
    fullDelivery = computed(() => {
        const o = this.order();
        if (!o) return '';
        const parts = [o.customer_address, o.delivery_area, o.delivery_zone, o.delivery_city].filter((p: any) => p && String(p).trim());
        const line = parts.join(', ');
        return o.delivery_postcode ? `${line} - ${o.delivery_postcode}` : line;
    });

    hasDeliveryInfo = computed(() => {
        const o = this.order();
        return !!(o && (o.customer_address || o.delivery_city || o.delivery_zone || o.delivery_area || o.delivery_postcode));
    });

    // Modal state
    cancelVisible = false;
    cancelReason = '';
    deliverVisible = false;
    paymentCollected = true;
    returnVisible = false;
    returnLines: any[] = [];
    refundDelivery = false;
    returnReason = '';
    returnNote = '';
    readonly returnReasons = ['Damaged on arrival', 'Wrong item sent', 'Size or fit', 'Changed mind', 'Not as described', 'Other'];

    // Returns already raised against this order.
    returns = signal<any[]>([]);
    pendingReturnUnits = signal(0);

    // --- derived flags for which actions to show ---
    isPending = computed(() => this.order()?.status === 'Pending');
    isConfirmed = computed(() => this.order()?.status === 'Confirmed');
    isDispatched = computed(() => !!this.order()?.dispatched_on);
    canConfirm = computed(() => this.isPending());
    canEdit = computed(() => this.isPending() && this.order()?.channel === 'ONLINE');
    canCancel = computed(() => (this.isPending() || this.isConfirmed()) && !this.isDispatched());
    canDispatch = computed(() => this.isConfirmed() && !this.isDispatched());
    canDeliver = computed(() => this.isConfirmed() && this.isDispatched());
    // A return needs a realized sale: POS lands at Purchased, online at Delivered.
    // PartiallyReturned means an earlier return took some units but more can
    // still come back. Units already claimed by an unconfirmed return are
    // excluded, so the button disappears once nothing is left to send back.
    returnableUnits = computed(() => {
        const sold = (this.order()?.items || []).reduce((sum: number, i: any) => sum + (Number(i.quantity) - Number(i.returned_qty || 0)), 0);
        return Math.max(0, sold - this.pendingReturnUnits());
    });
    canReturn = computed(() => ['Purchased', 'Delivered', 'PartiallyReturned'].includes(this.order()?.status) && this.returnableUnits() > 0);

    constructor(
        private _http: HttpService,
        private _route: ActivatedRoute,
        private _router: Router,
        private _notify: NzNotificationService,
        private _modal: NzModalService,
        private _print: PrintService,
        private _destroyRef: DestroyRef
    ) {}

    ngOnInit(): void {
        this.oid = this._route.snapshot.paramMap.get('oid') || '';
        this.load();
    }

    load(): void {
        this.loading.set(true);
        this._http
            .get(APIEndpoint.ORDER_DETAILS, { oid: this.oid })
            .pipe(takeUntilDestroyed(this._destroyRef), finalize(() => this.loading.set(false)))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200) this.order.set(res.body.data);
                },
                error: (err: any) => this._notify.error('Error!', err?.error?.message),
            });
        this.loadReturns();
    }

    // Returns raised against this order. Also gives the pending unit count, which
    // is what keeps the same units from being claimed by two open returns.
    loadReturns(): void {
        this._http
            .get(APIEndpoint.GET_RETURNS_FOR_ORDER, { order_oid: this.oid })
            .pipe(takeUntilDestroyed(this._destroyRef))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this.returns.set(res.body.data?.returns || []);
                        this.pendingReturnUnits.set(Number(res.body.data?.pending_units || 0));
                    }
                },
                error: () => {
                    // Non-fatal: the order is still fully usable without this panel.
                    this.returns.set([]);
                    this.pendingReturnUnits.set(0);
                },
            });
    }

    openReturnRecord(return_oid: string): void {
        this._router.navigate([`/sales/returns/view/${return_oid}`]);
    }

    returnStatusColor(status: string): string {
        const map: Record<string, string> = { Pending: 'orange', Returned: 'blue', Completed: 'green', Cancelled: 'red' };
        return map[status] || 'default';
    }

    private act(endpoint: string, body: any, successMsg: string, after?: () => void): void {
        this.busy.set(true);
        this._http
            .post(endpoint, body)
            .pipe(takeUntilDestroyed(this._destroyRef), finalize(() => this.busy.set(false)))
            .subscribe({
                next: (res: any) => {
                    if (res.status === 200 && res.body?.code === 200) {
                        this._notify.success('Success', successMsg);
                        if (after) after();
                        this.load();
                    } else {
                        this._notify.error('Error!', res.body?.message || 'Action failed');
                    }
                },
                error: (err: any) => this._notify.error('Blocked', err?.error?.message || 'Action failed'),
            });
    }

    confirm(): void {
        this._modal.confirm({
            nzTitle: 'Confirm this order?',
            nzContent: 'Stock is already held; this accepts the order.',
            nzOnOk: () => this.act(APIEndpoint.ORDER_CONFIRM, { oid: this.oid }, 'Order confirmed'),
        });
    }

    // --- Cancel ---
    openCancel(): void {
        this.cancelReason = '';
        this.cancelVisible = true;
    }
    submitCancel(): void {
        if (!this.cancelReason.trim()) {
            this._notify.warning('Reason required', 'Please provide a cancellation reason');
            return;
        }
        this.act(APIEndpoint.ORDER_CANCEL, { oid: this.oid, reason: this.cancelReason.trim() }, 'Order cancelled; stock released', () => (this.cancelVisible = false));
    }

    // --- Send for delivery (state change only) ---
    // Deducts the held stock and marks the order dispatched. This is a lifecycle
    // action, NOT a courier export -- the bulk courier/date-range dispatch export
    // is a separate feature and makes no assumption about which courier is used.
    sendForDelivery(): void {
        this._modal.confirm({
            nzTitle: 'Send this order for delivery?',
            nzContent: 'This deducts the held stock and marks the order as dispatched. It cannot be cancelled afterwards.',
            nzOnOk: () => this.act(APIEndpoint.DELIVERY_SEND_FOR_DELIVERY, { oid: this.oid }, 'Order sent for delivery'),
        });
    }

    // --- Deliver ---
    openDeliver(): void {
        this.paymentCollected = this.order()?.payment_type === 'COD';
        this.deliverVisible = true;
    }
    submitDeliver(): void {
        this.act(APIEndpoint.ORDER_DELIVER, { oid: this.oid, payment_collected: this.paymentCollected }, 'Order marked delivered', () => (this.deliverVisible = false));
    }

    // --- Return ---
    // Raising a return only records it. Nothing moves until it is confirmed on
    // the return's own page, which is what makes a mistake here recoverable.
    openReturn(): void {
        this.refundDelivery = false;
        this.returnReason = '';
        this.returnNote = '';
        this.returnLines = (this.order()?.items || [])
            .map((i: any) => ({
                order_item_oid: i.oid,
                product_name: i.product_name,
                remaining: Number(i.quantity) - Number(i.returned_qty || 0),
                unit_price: Number(i.unit_price || 0),
                discount: Number(i.discount || 0),
                quantity: 0,
                condition: 'Good',
            }))
            // A line with nothing left to send back is noise, not a choice.
            .filter((l: any) => l.remaining > 0);
        this.returnVisible = true;
    }

    // Delivery is a service that was performed, so it is only refundable when the
    // whole order is coming back. Anything less and the toggle is hidden and forced off.
    isFullReturn(): boolean {
        return this.returnLines.length > 0 && this.returnLines.every((l) => l.quantity === l.remaining);
    }

    canRefundDelivery(): boolean {
        return Number(this.order()?.delivery_charge || 0) > 0 && this.isFullReturn();
    }

    // What the goods are worth: unit_price less the per-unit discount, which is
    // exactly what the customer was charged for them.
    returnValuePreview(): number {
        const items = this.returnLines.reduce((sum, l) => sum + l.quantity * Math.max(0, l.unit_price - l.discount), 0);
        return items + (this.canRefundDelivery() && this.refundDelivery ? Number(this.order()?.delivery_charge || 0) : 0);
    }

    // Mirrors utils/return-utils.js: payment_status is authoritative, because
    // amount_paid is not written by every intake path and a fully paid sale can
    // still carry amount_paid = 0.
    effectiveAmountPaid(): number {
        const o = this.order();
        if (o?.payment_status === 'paid') return Number(o?.total_amount || 0);
        if (o?.payment_status === 'partially_paid') return Number(o?.amount_paid || 0);
        return 0;
    }

    // Mirrors the server: the shop can only give back what it received, so the
    // refund is capped at what the customer paid less anything already committed
    // to an earlier return. The rest cancels part of what they still owe.
    returnRefundPreview(): number {
        const paid = this.effectiveAmountPaid();
        const committed = this.returns()
            .filter((r: any) => r.status !== 'Cancelled')
            .reduce((s: number, r: any) => s + Number(r.refund_amount || 0), 0);
        return Math.max(0, Math.min(this.returnValuePreview(), paid - committed));
    }

    returnDueReductionPreview(): number {
        return Math.max(0, this.returnValuePreview() - this.returnRefundPreview());
    }

    submitReturn(): void {
        const items = this.returnLines.filter((l) => l.quantity > 0).map((l) => ({ order_item_oid: l.order_item_oid, quantity: l.quantity, condition: l.condition }));
        if (!items.length) {
            this._notify.warning('Nothing selected', 'Set a return quantity on at least one line');
            return;
        }
        if (!this.returnReason) {
            this._notify.warning('Reason required', 'Pick why the goods are coming back');
            return;
        }
        this.act(
            APIEndpoint.CREATE_RETURN,
            // Guarded on the server too: delivery is only refundable on a full return.
            { order_oid: this.oid, refund_delivery_charge: this.canRefundDelivery() && this.refundDelivery, return_reason: this.returnReason, note: this.returnNote?.trim() || null, items },
            'Return recorded. Confirm it to move the stock',
            () => (this.returnVisible = false)
        );
    }


    editOrder(): void {
        this._router.navigate(['/sales/online'], { state: { editOid: this.oid } });
    }

    // Print / export: three documents, all branded from Settings.
    printReceipt(): void {
        if (this.order()) this._print.printReceipt(this.order());
    }
    printInvoice(): void {
        if (this.order()) this._print.printInvoice(this.order());
    }
    printLabel(): void {
        if (this.order()) this._print.printLabel(this.order());
    }

    goBack(): void {
        this._router.navigate(['/sales/orders/list']);
    }

    statusColor(status: string): string {
        const map: Record<string, string> = { Pending: 'orange', Confirmed: 'blue', Purchased: 'green', Delivered: 'green', PartiallyReturned: 'gold', Returned: 'red', Cancelled: 'red', Refunded: 'red', Draft: 'default' };
        return map[status] || 'default';
    }
}

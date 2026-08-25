/**
 * Turns the stored payment enums into something a person can read.
 *
 * `payment_status` and `payment_type` are stored as raw snake_case / upper-case
 * keys, and those keys must never reach the screen. Anything unrecognised falls
 * back to a title-cased version of the key rather than the key itself, so a new
 * status added on the server degrades to "Awaiting Refund" and not
 * "awaiting_refund".
 *
 * Usage in template:
 *   {{ order.payment_status | paymentStatusLabel }}   // 'partially_paid' -> 'Partially Paid'
 *   {{ order.payment_type | paymentTypeLabel }}       // 'PREPAID' -> 'Prepaid'
 */
import { Pipe, PipeTransform } from '@angular/core';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
    paid: 'Paid',
    partially_paid: 'Partially Paid',
    unpaid: 'Unpaid',
};

// COD stays upper-case on purpose: it is an initialism, not a word.
const PAYMENT_TYPE_LABELS: Record<string, string> = {
    COD: 'COD',
    PREPAID: 'Prepaid',
};

const titleCase = (value: string): string =>
    value
        .split(/[_\s-]+/)
        .filter(Boolean)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');

@Pipe({
    standalone: true,
    name: 'paymentStatusLabel',
})
export class PaymentStatusLabelPipe implements PipeTransform {
    transform(value: any, fallback: string = '--'): string {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        const key = String(value);
        return PAYMENT_STATUS_LABELS[key] ?? titleCase(key);
    }
}

@Pipe({
    standalone: true,
    name: 'paymentTypeLabel',
})
export class PaymentTypeLabelPipe implements PipeTransform {
    transform(value: any, fallback: string = '--'): string {
        if (value === null || value === undefined || value === '') {
            return fallback;
        }
        const key = String(value);
        return PAYMENT_TYPE_LABELS[key] ?? titleCase(key);
    }
}

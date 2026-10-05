import { AbstractControl, ValidationErrors } from '@angular/forms';

const MOBILE = /^01[3-9]\d{8}$/;

/**
 * The phone as the server will store it, or null when it is not yet an 11 digit mobile number. The
 * server normalises it again; this only decides when the counter looks the customer up.
 */
export const normalizePhone = (raw: string): string | null => {
    const digits = raw
        .replace(/[০-৯]/g, (digit) => String(digit.charCodeAt(0) - 0x09e6))
        .replace(/[\s\-.()]/g, '')
        .replace(/^\+?88(?=01)/, '');
    return MOBILE.test(digits) ? digits : null;
};

/** An empty box passes: whether the phone is required is the form's own rule. */
export const mobileValidator = (control: AbstractControl<string>): ValidationErrors | null => (!control.value?.trim() || normalizePhone(control.value) ? null : { phone: true });

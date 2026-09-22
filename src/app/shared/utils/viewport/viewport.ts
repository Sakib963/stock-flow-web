import { Signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { fromEvent, map } from 'rxjs';

/** Tailwind's `md`, less one. Below it the sider is a drawer, a table is cards, and targets go to 44px. */
export const PHONE_MAX = 767;

/**
 * The window width as a signal, and whether that width is a phone.
 */
export function viewportWidth(): Signal<number> {
    return toSignal(fromEvent(window, 'resize').pipe(map(() => window.innerWidth)), { initialValue: window.innerWidth });
}

export function isPhoneWidth(width: Signal<number>): Signal<boolean> {
    return computed(() => width() <= PHONE_MAX);
}

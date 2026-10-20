import { DestroyRef, inject, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** One tab's read: what it holds, whether it is loading, and why it failed. A new run drops the one in flight. */
export const loader = <A, T>(fetch: (arg: A) => Observable<T>) => {
    const data = signal<T | null>(null);
    const loading = signal(false);
    const failed = signal<RequestFailure | null>(null);
    let running: Subscription | undefined;
    inject(DestroyRef).onDestroy(() => running?.unsubscribe());
    const run = (arg: A) => {
        running?.unsubscribe();
        loading.set(true);
        failed.set(null);
        running = fetch(arg).subscribe({
            next: (value) => {
                data.set(value);
                loading.set(false);
            },
            error: (error: unknown) => {
                loading.set(false);
                failed.set(failureOf(error));
            },
        });
    };
    return { data: data.asReadonly(), loading: loading.asReadonly(), failed: failed.asReadonly(), run };
};

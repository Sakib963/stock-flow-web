import { AbstractControl, AsyncValidatorFn, ValidationErrors } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

const SETTLE_MS = 400;

/**
 * Asks the server whether a value is still free, as an async validator.
 *
 * Angular already does the hard parts: it cancels the previous check when the value changes, marks
 * the control PENDING while one is running, and `nz-form-control` reads that to show the spinner
 * and the tip. So this is the whole of it, and no screen keeps its own signals in step.
 *
 * A check that cannot run answers null, not "taken". The database refuses a duplicate either way,
 * and a hint that turns a network blip into "that name is used" would be worse than no hint.
 */
export const uniqueValue = (check: (value: string) => Observable<boolean>, settleMs = SETTLE_MS): AsyncValidatorFn => {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {
        const value = (control.value ?? '').toString().trim();
        if (!value) return of(null);

        return timer(settleMs).pipe(
            switchMap(() => check(value)),
            map((available) => (available ? null : { taken: true })),
            catchError(() => of(null))
        );
    };
};

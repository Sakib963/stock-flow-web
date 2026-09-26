import { FormGroup } from '@angular/forms';

/**
 * Shows every field's error, for a Save pressed on a form that is not ready.
 *
 * `markAllAsTouched` alone is not enough: `nz-form-control` redraws its error tip only when the
 * control's status changes, and touching emits no status. Only the invalid fields are revalidated,
 * so a valid field does not ask the server its availability question again.
 */
export const revealErrors = (form: FormGroup): void => {
    form.markAllAsTouched();
    for (const control of Object.values(form.controls)) {
        if (control.invalid) control.updateValueAndValidity();
    }
};

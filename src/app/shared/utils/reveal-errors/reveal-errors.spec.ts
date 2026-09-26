import { FormControl, FormGroup, Validators } from '@angular/forms';
import { revealErrors } from './reveal-errors';

describe('revealErrors', () => {
    it('touches every field and tells the invalid ones to redraw, so their error shows', () => {
        const form = new FormGroup({ name: new FormControl('', Validators.required), code: new FormControl('SARE', Validators.required) });
        const redrawn: string[] = [];
        form.controls.name.statusChanges.subscribe((status) => redrawn.push(`name:${status}`));
        form.controls.code.statusChanges.subscribe((status) => redrawn.push(`code:${status}`));

        revealErrors(form);

        expect(form.controls.name.touched && form.controls.code.touched).toBe(true);
        expect(redrawn).toEqual(['name:INVALID']);
    });
});

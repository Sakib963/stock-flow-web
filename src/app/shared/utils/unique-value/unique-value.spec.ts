import { FormControl } from '@angular/forms';
import { Observable, of, throwError } from 'rxjs';
import { uniqueValue } from './unique-value';

const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('uniqueValue', () => {
    it('passes a value nothing else holds', async () => {
        const control = new FormControl('Saree', { asyncValidators: [uniqueValue(() => of(true), 0)] });
        await settle(5);
        expect(control.errors).toBe(null);
    });

    it('marks a value something else already holds', async () => {
        const control = new FormControl('Saree', { asyncValidators: [uniqueValue(() => of(false), 0)] });
        await settle(5);
        expect(control.errors).toEqual({ taken: true });
    });

    it('asks nothing at all for an empty value', () => {
        let asked = 0;
        const check = () => {
            asked += 1;
            return of(true);
        };
        new FormControl('   ', { asyncValidators: [uniqueValue(check, 0)] });
        expect(asked).toBe(0);
    });

    it('trims before asking, because the database compares trimmed', async () => {
        let seen = '';
        const control = new FormControl('  Saree  ', {
            asyncValidators: [
                uniqueValue((value) => {
                    seen = value;
                    return of(true);
                }, 0),
            ],
        });
        await settle(5);
        expect(seen).toBe('Saree');
        expect(control.errors).toBe(null);
    });

    // A blip must not turn into "that name is used". The unique index is what decides.
    it('says nothing when the check itself fails', async () => {
        const failing = (): Observable<boolean> => throwError(() => new Error('offline'));
        const control = new FormControl('Saree', { asyncValidators: [uniqueValue(failing, 0)] });
        await settle(5);
        expect(control.errors).toBe(null);
    });

    it('waits for typing to settle before asking', async () => {
        let asked = 0;
        const control = new FormControl('Sar', {
            asyncValidators: [
                uniqueValue(() => {
                    asked += 1;
                    return of(true);
                }, 30),
            ],
        });
        control.setValue('Saree');
        expect(asked).toBe(0);
        await settle(60);
        expect(asked).toBe(1);
    });
});

/** Postgres numeric arrives as a string ("1250.00"), which nz-input-number cannot take. */
export const amount = (value: number | string | null | undefined): number | null => (value === null || value === undefined ? null : Number(value));

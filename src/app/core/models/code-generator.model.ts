import { Observable } from 'rxjs';

/**
 * What the code generator needs to suggest a code for one record.
 *
 * `generate` belongs to the feature that asked, so the modal never knows about categories,
 * sub-categories or brands. Each feature passes its own endpoint call.
 */
export interface CodeRequest {
    /** The name the code is built from. */
    name: string;
    /** Asks the server for one free code. */
    generate: (name: string) => Observable<string>;
}

/** The envelope every endpoint answers in. `total` is present on lists. */
export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
    total?: number;
}

/** How a failed request is told apart, because each asks something different of the person. */
export type RequestFailure = 'network' | 'forbidden' | 'server';

/** The words of a confirmation asked before a mutating action, already translated. */
export interface ConfirmCopy {
    title: string;
    body: string;
    ok: string;
    cancel: string;
}

export interface UniqueValueOptions {
    settleMs?: number;
    /**
     * The value is the one the record being edited already holds. It cannot collide with itself,
     * so opening an edit page does not ask the server about every field it just loaded.
     */
    isOwn?: (value: string) => boolean;
}

/** The words of a confirmation asked before a mutating action, already translated. */
export interface ConfirmCopy {
    title: string;
    body: string;
    ok: string;
    cancel: string;
    /** The confirming button in red, for an action that ends something, like signing a device out. */
    danger?: boolean;
    /** The confirming button's icon, when a check does not say what it does. */
    icon?: string;
    /**
     * Work the dialog waits on before closing: the button shows it is busy, and false keeps the dialog
     * open so the same button tries again. Signing out uses it, since the session ends on the server first.
     */
    run?: () => Promise<boolean>;
}

export interface UniqueValueOptions {
    settleMs?: number;
    /**
     * The value is the one the record being edited already holds. It cannot collide with itself,
     * so opening an edit page does not ask the server about every field it just loaded.
     */
    isOwn?: (value: string) => boolean;
}

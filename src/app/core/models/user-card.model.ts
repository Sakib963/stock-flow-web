/** Who someone is, for the card that opens from their name in a list or on a record. */
export interface UserCard {
    /** The account the row stored, which is what the card was asked for. */
    email: string;
    name: string | null;
    designation: string | null;
    role: string | null;
    photo: string | null;
    /** False when no account answers to that address any more. */
    active: boolean;
}

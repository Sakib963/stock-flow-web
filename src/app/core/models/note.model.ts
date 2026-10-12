/** The fixed set a note can be tagged with; the server and the table's CHECK hold the same list. */
export const NOTE_TAGS = ['important', 'todo', 'follow_up', 'call_back', 'supplier', 'customer', 'order', 'stock', 'payment', 'delivery', 'return', 'price', 'idea', 'reminder', 'meeting', 'personal', 'done'] as const;
export type NoteTag = (typeof NOTE_TAGS)[number];

/** One of the signed-in person's own notes. Either the title or the text may be empty, never both. */
export interface Note {
    oid: string;
    note_title: string | null;
    note_text: string | null;
    /** Optional: null when the note has none. */
    tags: NoteTag[] | null;
    created_on: string;
    edited_on: string | null;
}

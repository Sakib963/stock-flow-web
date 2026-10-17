import { NoteTag } from '@app/core/models/note.model';

const TONE = {
    danger: 'bg-danger-bg border-danger-border text-danger-ink',
    warning: 'bg-warning-bg border-warning-border text-warning-ink',
    success: 'bg-success-bg border-success-border text-success-ink',
    indigo: 'bg-primary-wash border-progress-border text-primary-8',
    teal: 'bg-tag-teal-bg border-tag-teal-border text-tag-teal-ink',
    sky: 'bg-tag-sky-bg border-tag-sky-border text-tag-sky-ink',
    plum: 'bg-tag-plum-bg border-tag-plum-border text-tag-plum-ink',
    rose: 'bg-tag-rose-bg border-tag-rose-border text-tag-rose-ink',
};

/** A tag that is not chosen: plain, so the chosen ones are the only colour in the row. */
export const NOTE_TAG_OFF = 'bg-white border-line text-ink-soft';

/** The filter's All, when it is the one chosen. */
export const NOTE_TAG_ALL = TONE.indigo;

/**
 * Each note tag's tone and icon, drawn like a status tag so notes look like the rest of the app.
 * Several tags share a tone; the icon tells them apart.
 */
export const NOTE_TAG_STYLE: Record<NoteTag, { tone: string; icon: string }> = {
    important: { tone: TONE.danger, icon: 'lucideCircleAlert' },
    todo: { tone: TONE.warning, icon: 'lucideListTodo' },
    follow_up: { tone: TONE.indigo, icon: 'lucideRepeat' },
    call_back: { tone: TONE.teal, icon: 'lucidePhoneCall' },
    supplier: { tone: TONE.plum, icon: 'lucideFactory' },
    customer: { tone: TONE.sky, icon: 'lucideUser' },
    order: { tone: TONE.sky, icon: 'lucideShoppingCart' },
    stock: { tone: TONE.teal, icon: 'lucideBoxes' },
    payment: { tone: TONE.warning, icon: 'lucideWallet' },
    delivery: { tone: TONE.teal, icon: 'lucideTruck' },
    return: { tone: TONE.rose, icon: 'lucideUndo2' },
    price: { tone: TONE.success, icon: 'lucideTag' },
    idea: { tone: TONE.plum, icon: 'lucideLightbulb' },
    reminder: { tone: TONE.warning, icon: 'lucideBell' },
    meeting: { tone: TONE.indigo, icon: 'lucideUsers' },
    personal: { tone: TONE.rose, icon: 'lucideHeart' },
    done: { tone: TONE.success, icon: 'lucideCircleCheck' },
};

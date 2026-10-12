import { NoteTag } from '@app/core/models/note.model';

/**
 * Each note tag's colour and icon. The colours are NG-Zorro's own tag presets, so the tags are themed
 * with the rest of ant: seventeen tags and thirteen preset colours, so the last four take ant's
 * status colours or none. The icon tells two tags apart when their colours are close.
 */
export const NOTE_TAG_STYLE: Record<NoteTag, { color: string; icon: string }> = {
    important: { color: 'red', icon: 'lucideCircleAlert' },
    todo: { color: 'blue', icon: 'lucideListTodo' },
    follow_up: { color: 'geekblue', icon: 'lucideRepeat' },
    call_back: { color: 'cyan', icon: 'lucidePhoneCall' },
    supplier: { color: 'purple', icon: 'lucideFactory' },
    customer: { color: 'magenta', icon: 'lucideUser' },
    order: { color: 'volcano', icon: 'lucideShoppingCart' },
    stock: { color: 'lime', icon: 'lucideBoxes' },
    payment: { color: 'gold', icon: 'lucideWallet' },
    delivery: { color: 'orange', icon: 'lucideTruck' },
    return: { color: 'pink', icon: 'lucideUndo2' },
    price: { color: 'green', icon: 'lucideTag' },
    idea: { color: 'yellow', icon: 'lucideLightbulb' },
    reminder: { color: 'processing', icon: 'lucideBell' },
    meeting: { color: 'warning', icon: 'lucideUsers' },
    personal: { color: 'default', icon: 'lucideHeart' },
    done: { color: 'success', icon: 'lucideCircleCheck' },
};


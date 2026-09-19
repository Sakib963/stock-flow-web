import { ResolvedTone, ToneMap, ToneStyle } from '@app/core/models/config.model';

/** One warning per unmapped value, not one per row that carries it. */
const warned = new Set<string>();

/**
 * Maps a status value to its label, tone and icon. A value the map lacks renders neutral with the
 * raw value, so a surprise status is visible rather than blank, and is logged so someone adds it.
 */
export const resolveTone = (map: ToneMap, value: unknown, fallback?: ToneStyle, where = 'a status'): ResolvedTone | null => {
    if (value === undefined || value === null || value === '') return null;
    const key = String(value);
    const style = map[key];
    if (style) return { style, known: true };

    if (!warned.has(`${where}:${key}`)) {
        warned.add(`${where}:${key}`);
        console.warn(`[status] "${key}" has no tone in ${where}; showing it neutral.`);
    }
    return { style: fallback ?? { label: key, tone: 'neutral' }, known: false };
};

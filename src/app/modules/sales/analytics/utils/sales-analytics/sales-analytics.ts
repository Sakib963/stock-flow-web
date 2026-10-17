import { TranslateService } from '@ngx-translate/core';
import { Insight, PlaceName } from '@app/core/models/sales-analytics.model';
import { AppLanguage } from '@app/core/models/language.model';
import { RATE_FLOOR } from '@app/modules/sales/analytics/constants/sales-analytics';

/** A rate as the person reads it: a percentage over enough, the counts under that, a dash with none. */
export interface Rate {
    text: string;
    /** 0 to 100 for the bar; null draws no bar. */
    bar: number | null;
}

export const rateOf = (part: number, whole: number, number: (n: number) => string): Rate => {
    if (whole <= 0) return { text: '-', bar: null };
    if (whole < RATE_FLOOR) return { text: `${number(part)} / ${number(whole)}`, bar: null };
    const percent = Math.round((part / whole) * 100);
    return { text: `${number(percent)}%`, bar: percent };
};

/** A sentence's params made readable: a place in the language on screen, a param ending in Key translated, a number in the reader's digits. */
export const insightParams = (insight: Insight, language: AppLanguage, translate: TranslateService, number: (n: number) => string): Record<string, string | number> =>
    Object.fromEntries(
        Object.entries(insight.params).map(([name, value]) => {
            if (typeof value === 'object') return [name, language === 'bn' ? (value as PlaceName).bn : (value as PlaceName).en];
            if (name.endsWith('Key') && typeof value === 'string') return [name.slice(0, -3), translate.instant(value)];
            return [name, typeof value === 'number' ? number(value) : value];
        })
    );

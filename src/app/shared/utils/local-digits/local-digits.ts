import { AppLanguage } from '@app/core/models/language.model';

const BENGALI_DIGITS = '০১২৩৪৫৬৭৮৯';

/** Western digits to Bengali ones when the page is in Bengali; everything else in the text is kept. */
export const localDigits = (text: string, language: AppLanguage): string => (language === 'bn' ? text.replace(/[0-9]/g, (digit) => BENGALI_DIGITS[Number(digit)]) : text);

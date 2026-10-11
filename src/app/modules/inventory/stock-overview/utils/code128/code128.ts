/**
 * Code 128, subset B: every printable ASCII character, which covers any batch code. Each symbol is six
 * alternating bar and space widths in modules (eleven modules a symbol); the stop symbol has seven.
 * Values 0 to 102 are data, 104 is Start B, 106 is Stop.
 */
const PATTERNS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];
const START_B = 104;
const STOP = 106;

/** Blank modules each side: a scanner finds the code by the quiet space around it. */
export const QUIET_ZONE = 10;

/**
 * The bar and space widths of `text` in modules, bars first, without the quiet zones. Refuses a
 * character Code 128 B cannot carry rather than printing a code no scanner can read back.
 */
export const code128Widths = (text: string): number[] => {
    if (!text.length) throw new Error('Nothing to encode');
    const values = [...text].map((character) => {
        const code = character.charCodeAt(0);
        if (code < 32 || code > 126) throw new Error(`"${character}" cannot be printed in a Code 128 barcode`);
        return code - 32;
    });
    const check = values.reduce((sum, value, index) => sum + value * (index + 1), START_B) % 103;
    return [START_B, ...values, check, STOP].flatMap((value) => [...PATTERNS[value]].map(Number));
};

/** The whole symbol's width in modules, quiet zones included. */
export const code128Modules = (text: string): number => code128Widths(text).reduce((sum, width) => sum + width, 0) + QUIET_ZONE * 2;

/**
 * Prove every canonicalisation kept the same computed value.
 *
 * The conversion swapped arbitrary pixel utilities for scale steps and theme tokens on the claim
 * that each pair computes identically. This reads the built stylesheet, resolves what the new
 * class actually declares, and compares it against the pixel value the old class carried. A claim
 * like that is worth checking rather than trusting, because nothing else in the pipeline would
 * notice a rail row silently becoming 36px instead of 34px.
 */
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const distDir = path.join(WEB, 'dist/stock-flow-web/browser');
const cssFile = fs.readdirSync(distDir).find((f) => /^styles-.*\.css$/.test(f));
const css = fs.readFileSync(`${distDir}/${cssFile}`, 'utf8');

// old arbitrary class -> new class, and the pixel value the old one meant.
const PAIRS = [
    ['rounded-[6px]', 'rounded-control', '6px'],
    ['rounded-[8px]', 'rounded-container', '8px'],
    ['rounded-[4px]', 'rounded-sm', '4px'],
    ['h-[34px]', 'h-8.5', '34px'],
    ['h-[38px]', 'h-9.5', '38px'],
    ['h-[31px]', 'h-7.75', '31px'],
    ['h-[18px]', 'h-4.5', '18px'],
    ['min-w-[18px]', 'min-w-4.5', '18px'],
    ['size-[30px]', 'size-7.5', '30px'],
    ['size-[26px]', 'size-6.5', '26px'],
    ['size-[22px]', 'size-5.5', '22px'],
    ['w-[262px]', 'w-65.5', '262px'],
    ['max-w-[420px]', 'max-w-105', '420px'],
    ['max-w-[264px]', 'max-w-66', '264px'],
    ['min-w-[340px]', 'min-w-85', '340px'],
    ['min-w-[196px]', 'min-w-49', '196px'],
    ['gap-[11px]', 'gap-2.75', '11px'],
    ['gap-[9px]', 'gap-2.25', '9px'],
    ['gap-[7px]', 'gap-1.75', '7px'],
    ['py-[3px]', 'py-0.75', '3px'],
    ['py-[7px]', 'py-1.75', '7px'],
    ['py-[11px]', 'py-2.75', '11px'],
    ['px-[5px]', 'px-1.25', '5px'],
    ['pt-[5px]', 'pt-1.25', '5px'],
    ['pb-[7px]', 'pb-1.75', '7px'],
    ['pl-[17px]', 'pl-4.25', '17px'],
    ['pl-[7px]', 'pl-1.75', '7px'],
    ['mb-[5px]', 'mb-1.25', '5px'],
    ['my-[5px]', 'my-1.25', '5px'],
    ['mt-[3px]', 'mt-0.75', '3px'],
    ['ml-[22px]', 'ml-5.5', '22px'],
    ['top-[5px]', 'top-1.25', '5px'],
    ['right-[5px]', 'right-1.25', '5px'],
    ['right-[13px]', 'right-3.25', '13px'],
    ['bottom-[7px]', 'bottom-1.75', '7px'],
    ['text-[9.5px]', 'text-shell-badge', '9.5px'],
    ['text-[10px]', 'text-shell-micro', '10px'],
    ['text-[10.5px]', 'text-shell-meta', '10.5px'],
    ['text-[11px]', 'text-shell-hint', '11px'],
    ['text-[11.5px]', 'text-shell-note', '11.5px'],
    ['text-[12.5px]', 'text-shell-row', '12.5px'],
    ['text-[13px]', 'text-shell-title', '13px'],
    ['text-[15px]', 'text-shell-dialog', '15px'],
];

const escape = (c) => c.replace(/[.:/[\]()%,#!*+~='"^$|@&<>{}]/g, (ch) => '\\' + ch);

// Pull the declaration block for a class selector out of the stylesheet.
function declarations(cls) {
    // The stylesheet is minified, so the selector is followed directly by `{` or by `,` / `\/`
    // when it is grouped or carries a line-height suffix.
    const sel = '.' + escape(cls);
    const e = sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Exact selector first. `.text-shell-title{` must win over `.text-shell-title\/9{`, whose
    // line-height would otherwise be read as the font size.
    const m = new RegExp(e + '\\s*[{,]').exec(css) || new RegExp(e + '(?:\\\\\\/[^{,]*)?\\s*[{,]').exec(css);
    if (!m) return null;
    const open = css.indexOf('{', m.index);
    const close = css.indexOf('}', open);
    return css.slice(open + 1, close).trim();
}

// --spacing is 0.25rem; a rem is 16px at the default root size.
const SPACING_REM = 0.25;
function resolve(decl) {
    // calc(var(--spacing) * 8.5)
    let m = decl.match(/calc\(var\(--spacing\)\s*\*\s*([0-9.]+)\)/);
    if (m) return parseFloat(m[1]) * SPACING_REM * 16;
    // var(--text-shell-row) or var(--radius-control)
    m = decl.match(/var\((--[\w-]+)\)/);
    if (m) {
        const tok = new RegExp(`${m[1]}:\\s*([^;}
]+)`).exec(css);
        if (tok) {
            const v = tok[1].trim();
            if (/^[0-9.]+px$/.test(v)) return parseFloat(v);
            if (/^[0-9.]+rem$/.test(v)) return parseFloat(v) * 16;
        }
        return null;
    }
    m = decl.match(/([0-9.]+)px/);
    if (m) return parseFloat(m[1]);
    m = decl.match(/([0-9.]+)rem/);
    if (m) return parseFloat(m[1]) * 16;
    return null;
}

let ok = 0;
const problems = [];

for (const [oldCls, newCls, expected] of PAIRS) {
    const decl = declarations(newCls);
    if (decl === null) {
        problems.push(`${newCls.padEnd(20)} NO RULE FOUND (was ${oldCls})`);
        continue;
    }
    const got = resolve(decl);
    const want = parseFloat(expected);
    if (got === null) {
        problems.push(`${newCls.padEnd(20)} could not resolve "${decl}" (was ${oldCls})`);
    } else if (Math.abs(got - want) > 0.01) {
        problems.push(`${newCls.padEnd(20)} ${got}px, but ${oldCls} was ${expected}   <-- VALUE CHANGED`);
    } else {
        ok++;
    }
}

console.log(`pairs checked : ${PAIRS.length}`);
console.log(`identical     : ${ok}`);
console.log('');
if (!problems.length) console.log('Every replacement computes to the value it replaced.');
else {
    console.log('PROBLEMS:');
    for (const p of problems) console.log('  ' + p);
}

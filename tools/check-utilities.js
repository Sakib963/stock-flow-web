/**
 * Every Tailwind class named in a shell template must produce a rule in the built stylesheet.
 *
 * Tailwind fails silently: a class it does not recognise generates nothing and the element simply
 * renders unstyled. With ~1500 lines of SCSS being retyped as utilities, that is the failure mode
 * that would otherwise reach the browser, so this reads the templates and the built CSS and
 * reports any class that produced no rule.
 */
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');
const ROOTS = [path.join(WEB, 'src/app')];

const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
};

// The built stylesheet.
const distDir = path.join(WEB, 'dist/stock-flow-web/browser');
const cssFile = fs.readdirSync(distDir).find((f) => /^styles-.*\.css$/.test(f));
if (!cssFile) throw new Error('no built stylesheet found; run ng build first');
const css = fs.readFileSync(path.join(distDir, cssFile), 'utf8');

// Classes a component stylesheet defines are styled too; they simply never reach the global
// utilities output, so the built CSS alone would report them as missing.
const componentClasses = new Set();
for (const f of files0()) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/\.([a-zA-Z][\w-]*)/g)) componentClasses.add(m[1]);
}
function files0() {
    const out = [];
    (function w(d) {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
            const q = path.join(d, e.name);
            if (e.isDirectory()) w(q);
            else if (/\.scss$/.test(e.name)) out.push(q);
        }
    })(path.join(WEB, 'src'));
    return out;
}

// Classes that are ours rather than Tailwind's. State hooks and framework prefixes never produce
// a utility rule; anything a component stylesheet defines is handled by componentClasses above.
const OURS = /^(is-|has-|lang-|ng-|ant-|sf-drawer|sf-sheet|sf-flyout|sf-tip|sf-shortcuts|data-)/;

// Marker classes Tailwind reads but never emits a rule for: they exist so a variant on a
// descendant can target them.
const MARKERS = new Set(['group', 'peer']);
// A named marker, `group/copy`, is the same thing.
const isMarker = (c) => MARKERS.has(c.split('/')[0]);

const files = [];
for (const r of ROOTS) walk(r, files);

const candidates = new Map(); // class -> Set(file)

for (const f of files.filter((f) => f.endsWith('.html') || f.endsWith('.ts'))) {
    const src = fs.readFileSync(f, 'utf8');
    const rel = path.relative(WEB, f).replace(/\\/g, '/');

    // Static class="..." in templates, and host: { class: '...' } in component files.
    const chunks = [];
    for (const m of src.matchAll(/\bclass="([^"]*)"/g)) chunks.push(m[1]);
    for (const m of src.matchAll(/\bclass:\s*'([^']*)'/g)) chunks.push(m[1]);
    // Ternary branches inside [class]="cond ? 'a b' : 'c d'".
    // Only the part after the `?`, so the quoted values being *compared* in the condition are not
    // mistaken for class names.
    for (const m of src.matchAll(/\[class\]="([^"]*)"/g)) {
        const branches = m[1].slice(m[1].indexOf('?') + 1);
        for (const q of branches.matchAll(/'([^']*)'/g)) chunks.push(q[1]);
    }

    for (const chunk of chunks) {
        for (const c of chunk.split(/\s+/)) {
            if (!c) continue;
            if (OURS.test(c) || isMarker(c) || componentClasses.has(c)) continue;
            if (/[{}()?]/.test(c)) continue; // interpolation or expression fragment
            if (!candidates.has(c)) candidates.set(c, new Set());
            candidates.get(c).add(rel);
        }
    }
}

// Tailwind escapes these when it writes the selector.
const escapeClass = (c) => c.replace(/[.:/[\]()%,#!*+~='"^$|@&<>{}]/g, (ch) => '\\' + ch);

const missing = [];
for (const [c, where] of candidates) {
    const selector = '.' + escapeClass(c);
    // A rule for the class exists if the escaped selector appears followed by a delimiter, or by
    // another class: `[&.is-active]:transition-none` compiles to `.x.is-active{`.
    const re = new RegExp(selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s,{:>+~.])');
    if (!re.test(css)) missing.push([c, [...where].join(', ')]);
}

console.log(`stylesheet      : ${cssFile}`);
console.log(`classes checked : ${candidates.size}`);
console.log('');
if (!missing.length) {
    console.log('All utilities produced a rule.');
} else {
    console.log(`NO RULE GENERATED (${missing.length}) - these render unstyled:`);
    for (const [c, where] of missing) console.log(`  ${c}\n      ${where}`);
    process.exitCode = 1;
}

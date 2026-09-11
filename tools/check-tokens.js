/**
 * Every `var(--token)` a component stylesheet references must exist in the built CSS.
 *
 * Tailwind only emits a theme token when a utility referencing it survives scanning, and it scans
 * templates for class names, never stylesheets for var(). So a token used only from a component
 * .scss carve-out gets dropped, and the declaration that used it becomes invalid at computed-value
 * time: the whole gradient or shadow silently resolves to nothing, with no build error and no
 * failing test. `@theme static` is the fix; this is the check that proves it is still in place.
 */
const fs = require('fs');
const path = require('path');

const WEB = path.resolve(__dirname, '..');

const walk = (dir, out = []) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else out.push(p);
    }
    return out;
};

const distDir = path.join(WEB, 'dist/stock-flow-web/browser');
const cssFile = fs.readdirSync(distDir).find((f) => /^styles-.*\.css$/.test(f));
const css = fs.readFileSync(path.join(distDir, cssFile), 'utf8');

// Tokens the built stylesheet actually defines.
const defined = new Set();
for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) defined.add(m[1]);

// Angular puts component styles in the JS chunks, so scan the sources instead.
const referenced = new Map(); // token -> Set(file)
for (const f of walk(path.join(WEB, 'src')).filter((f) => /\.(scss|css|less)$/.test(f))) {
    const rel = path.relative(WEB, f).replace(/\\/g, '/');
    if (rel.endsWith('src/styles.css')) continue; // the definitions themselves
    const src = fs.readFileSync(f, 'utf8');
    // A var() with a fallback survives a missing token, and some are bound at runtime rather than
    // declared in @theme, so only bare references can break a declaration.
    for (const m of src.matchAll(/var\((--[\w-]+)\s*([,)])/g)) {
        if (m[2] === ',') continue;
        if (!referenced.has(m[1])) referenced.set(m[1], new Set());
        referenced.get(m[1]).add(rel);
    }
}

const missing = [...referenced.entries()].filter(([t]) => !defined.has(t));

console.log(`stylesheet        : ${cssFile}`);
console.log(`tokens defined    : ${defined.size}`);
console.log(`tokens referenced : ${referenced.size} (from component stylesheets)`);
console.log('');
if (!missing.length) {
    console.log('Every referenced token is defined in the built CSS.');
} else {
    console.log(`UNDEFINED (${missing.length}) - the declarations using these resolve to nothing:`);
    for (const [t, where] of missing) console.log(`  ${t}\n      ${[...where].join(', ')}`);
    process.exitCode = 1;
}

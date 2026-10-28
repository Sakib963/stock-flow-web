// Writes the git-ignored files in src/environments/ for a build that has no laptop copy of them: CI
// and the deploy. Every value ends up in the public bundle, so they are settings, not secrets.
//
//   node tools/write-environment.mjs environment.ts environment.dev.ts
//
// Reads API_BASE_URL, TRACKER_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET and GUEST_ACCESS
// (true or false), and BENGALI_TIME_IN_WORDS when a business wants it. A missing one is an error
// rather than a default, so a build can never quietly point at the wrong server. An existing file is
// never overwritten, so running it on the laptop cannot clobber the local copies.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const NAMES = ['environment.ts', 'environment.dev.ts', 'environment.production.ts'];
const REQUIRED = ['API_BASE_URL', 'TRACKER_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_UPLOAD_PRESET', 'GUEST_ACCESS'];

const targets = process.argv.slice(2);
const unknown = targets.filter((name) => !NAMES.includes(name));
const missing = REQUIRED.filter((key) => !process.env[key]);
if (!targets.length || unknown.length) fail(`Name one or more of ${NAMES.join(', ')}.${unknown.length ? ` Unknown: ${unknown.join(', ')}.` : ''}`);
if (missing.length) fail(`Missing: ${missing.join(', ')}.`);
if (!['true', 'false'].includes(process.env.GUEST_ACCESS)) fail('GUEST_ACCESS must be true or false.');

const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
mkdirSync(new URL('../src/environments/', import.meta.url), { recursive: true });

for (const name of targets) {
    const path = new URL(`../src/environments/${name}`, import.meta.url);
    if (existsSync(path)) fail(`${name} already exists; it is never overwritten.`);
    const environment = {
        production: name !== 'environment.ts',
        guestAccess: process.env.GUEST_ACCESS === 'true',
        baseUrl: process.env.API_BASE_URL,
        version,
        trackerUrl: process.env.TRACKER_URL,
        bengaliTimeInWords: process.env.BENGALI_TIME_IN_WORDS === 'true',
        cloudinary: { cloudName: process.env.CLOUDINARY_CLOUD_NAME, uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET },
    };
    writeFileSync(path, `export const environment = ${JSON.stringify(environment, null, 4)};\n`);
    console.log(`Wrote src/environments/${name}`);
}

function fail(message) {
    console.error(`write-environment: ${message}`);
    process.exit(1);
}

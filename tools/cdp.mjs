/**
 * A browser harness over the Chrome DevTools Protocol, with no dependencies.
 *
 * Node 24 ships a global WebSocket and this machine already has Chrome and Edge, so driving a
 * browser needs nothing installed: no Playwright, no 1.2GB of downloaded builds. Everything the
 * shell checks needs is here - navigate, seed storage, fulfil a request, evaluate, screenshot.
 */
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BROWSERS = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'];

export async function launch({ width = 1440, height = 900, port = 9222 } = {}) {
    const profile = mkdtempSync(join(tmpdir(), 'cdp-'));
    const exe = BROWSERS.find((b) => existsSync(b));
    if (!exe) throw new Error('no Chrome or Edge found');

    const proc = spawn(exe, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--headless=new', `--window-size=${width},${height}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', 'about:blank'], { stdio: 'ignore' });

    // The port is not open the instant the process starts.
    const version = await poll(async () => (await fetch(`http://127.0.0.1:${port}/json/version`)).json(), 20000);

    const browser = await connect(version.webSocketDebuggerUrl);
    const { targetId } = await browser.send('Target.createTarget', { url: 'about:blank' });
    const { targetInfo } = await browser.send('Target.getTargetInfo', { targetId });
    const page = await connect(`ws://127.0.0.1:${port}/devtools/page/${targetInfo.targetId}`);

    await page.send('Page.enable');
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    await page.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

    const api = {
        proc,
        page,
        errors: [],

        /**
         * Runs before any page script, which is how storage is seeded ahead of bootstrap.
         *
         * It runs on every navigation, not just the first, so a seeded token would follow the page
         * onto the sign-in screen and the guest guard would bounce it straight back. Returns the
         * handle so a check can stop the seeding when it wants a signed-out page.
         */
        async onNewDocument(source) {
            const { identifier } = await page.send('Page.addScriptToEvaluateOnNewDocument', { source });
            return identifier;
        },

        async removeNewDocument(identifier) {
            await page.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
        },

        /** Answers matching requests from a handler instead of the network. */
        async intercept(handler) {
            await page.send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
            page.on('Fetch.requestPaused', async (e) => {
                const answer = handler(e.request);
                if (!answer) return page.send('Fetch.continueRequest', { requestId: e.requestId }).catch(() => {});
                const body = Buffer.from(answer.body ?? '').toString('base64');
                const headers = Object.entries({ 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', ...(answer.headers ?? {}) }).map(([name, value]) => ({ name, value: String(value) }));
                await page.send('Fetch.fulfillRequest', { requestId: e.requestId, responseCode: answer.status ?? 200, responseHeaders: headers, body }).catch(() => {});
            });
        },

        async goto(url) {
            await page.send('Page.navigate', { url });
            await poll(async () => ((await api.eval('document.readyState')) === 'complete' ? true : null), 30000);
        },

        async eval(expression) {
            const r = await page.send('Runtime.evaluate', { expression: `(() => (${expression}))()`, returnByValue: true, awaitPromise: true });
            if (r.exceptionDetails) throw new Error(r.exceptionDetails.text + ' :: ' + (r.exceptionDetails.exception?.description ?? ''));
            return r.result.value;
        },

        /** Waits for a selector to exist, the way every check here starts. */
        async waitFor(selector, timeout = 30000) {
            await poll(async () => ((await api.eval(`!!document.querySelector(${JSON.stringify(selector)})`)) ? true : null), timeout, `selector ${selector}`);
        },

        async click(selector) {
            await api.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
        },

        async setViewport(w, h) {
            await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
        },

        async screenshot(file) {
            const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
            writeFileSync(file, Buffer.from(data, 'base64'));
        },

        async close() {
            try {
                proc.kill();
            } catch {}
            try {
                rmSync(profile, { recursive: true, force: true });
            } catch {}
        },
    };

    // Console errors and uncaught exceptions, the same signal Playwright surfaces.
    page.on('Runtime.consoleAPICalled', (e) => {
        if (e.type === 'error') api.errors.push(e.args.map((a) => a.value ?? a.description ?? '').join(' ').slice(0, 140));
    });
    page.on('Runtime.exceptionThrown', (e) => api.errors.push('exception: ' + (e.exceptionDetails?.exception?.description ?? e.exceptionDetails?.text ?? '').slice(0, 140)));

    await api.eval('1'); // prove the channel works before handing it back
    return api;
}

/* Plumbing ----------------------------------------------------------------- */

function connect(url) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);
        const pending = new Map();
        const listeners = new Map();
        let id = 0;

        ws.addEventListener('message', (ev) => {
            const msg = JSON.parse(ev.data);
            if (msg.id != null) {
                const p = pending.get(msg.id);
                if (!p) return;
                pending.delete(msg.id);
                msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
            } else {
                for (const fn of listeners.get(msg.method) ?? []) fn(msg.params);
            }
        });
        ws.addEventListener('error', reject);
        ws.addEventListener('open', () =>
            resolve({
                send: (method, params = {}) =>
                    new Promise((res, rej) => {
                        const n = ++id;
                        pending.set(n, { resolve: res, reject: rej });
                        ws.send(JSON.stringify({ id: n, method, params }));
                    }),
                on: (method, fn) => {
                    if (!listeners.has(method)) listeners.set(method, []);
                    listeners.get(method).push(fn);
                },
            })
        );
    });
}

async function poll(fn, timeout, what = 'condition') {
    const until = Date.now() + timeout;
    let last;
    while (Date.now() < until) {
        try {
            const v = await fn();
            if (v) return v;
        } catch (e) {
            last = e;
        }
        await new Promise((r) => setTimeout(r, 120));
    }
    throw new Error(`timed out waiting for ${what}${last ? ': ' + last.message : ''}`);
}

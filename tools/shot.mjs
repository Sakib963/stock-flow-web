/**
 * Screenshots a signed-in screen at both supported widths, with the API mocked.
 *
 * The app is checked as it ships: the built bundle over a static server, not the dev server, so
 * what is photographed is what a person gets. Nothing reaches a real backend. A session is seeded
 * into storage before bootstrap and every call to environment.baseUrl is answered from here.
 *
 *   node tools/shot.mjs [route] [out-dir]
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './cdp.mjs';

const DIST = 'dist/stock-flow-web/browser';
const ROUTE = process.argv[2] ?? '/app/configuration/categories';
const OUT = process.argv[3] ?? 'tools/shots';
const PORT = 4321;
const SIZES = [
    ['desktop', 1366, 768],
    ['phone', 390, 844],
];

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.png': 'image/png' };

/** The build sets <base href="/stock-flow-web/">, so every asset asks for that prefix. */
const BASE = '/stock-flow-web';

const serve = () =>
    createServer((req, res) => {
        const path = decodeURIComponent(req.url.split('?')[0]).replace(BASE, '') || '/';
        const file = join(DIST, path);
        const target = existsSync(file) && extname(file) ? file : join(DIST, 'index.html');
        res.writeHead(200, { 'content-type': TYPES[extname(target)] ?? 'application/octet-stream' });
        res.end(readFileSync(target));
    }).listen(PORT);

const MENU = [
    { id: 'dashboard', label: { en: 'Dashboard', bn: 'ড্যাশবোর্ড' }, description: { en: null, bn: null }, tags: [], icon: 'lucideLayoutDashboard', order: 1, route: '/app/dashboard', permission: 'dashboard.overview.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] },
    {
        id: 'configuration',
        label: { en: 'Configuration', bn: 'কনফিগারেশন' },
        description: { en: null, bn: null },
        tags: [],
        icon: 'lucideSettings2',
        order: 2,
        route: null,
        permission: null,
        isDisabled: false,
        disabledMessage: { en: null, bn: null },
        isNew: false,
        children: [{ id: 'categories', label: { en: 'Categories', bn: 'ক্যাটাগরি' }, description: { en: 'Create the product groups, like Saree or Cosmetics, that every product is filed under.', bn: 'পণ্যের গ্রুপ তৈরি করুন।' }, tags: [], icon: 'lucideFolderTree', order: 1, route: '/app/configuration/categories', permission: 'configuration.category.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }],
    },
];

const SESSION = {
    version: '1',
    user: { name: 'Nazmus Sakib', email: 'owner@samiha.test', mobile_number: null, photo: null, designation: 'Owner', role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'BOTH' },
    permissions: ['dashboard.overview.view', 'configuration.category.view', 'configuration.category.create', 'configuration.category.edit'],
    menu: MENU,
    counters: { notifications: 0 },
};

const NAMES = ['Accessories', 'Clothing', 'Cosmetics', 'Delivery', 'Footwear', 'Inventory', 'Jersey', 'Packaging', 'Skincare', 'Test Category One', 'Traditional Clothing', 'Winterwear'];

const ROWS = NAMES.map((name, i) => ({
    oid: 'oid-' + i,
    name,
    category_code: 'CODE-' + String(i + 1).padStart(3, '0'),
    description: i % 3 ? 'Stylish and functional ' + name.toLowerCase() + ' to complete your look.' : null,
    status: i === 9 ? 'Inactive' : 'Active',
    created_on: '2026-01-17T10:00:00Z',
    last_action_on: '2026-01-17T10:00:00Z',
    last_action_by: i % 2 ? 'owner@samiha.test' : 'ahmad@samiha.test',
    last_action_by_name: i % 2 ? 'Nazmus Sakib' : 'Ahmad Saif',
    last_action_by_role: 'Owner',
    last_action_is_edit: true,
    allowed_actions: ['view', 'edit'],
}));

/**
 * CORS for a credentialed request, which is stricter than the usual copy-paste headers.
 *
 * `*` is a literal, not a wildcard, once credentials are in play: neither the origin nor the
 * allowed headers may be starred. The requested headers are echoed back instead. Get this wrong
 * and the preflight is answered, the real call is never made, and the app boots to the sign-in
 * screen as though the server were down.
 */
const cors = (request) => ({
    'access-control-allow-origin': `http://127.0.0.1:${PORT}`,
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': request?.headers?.['Access-Control-Request-Headers'] ?? request?.headers?.['access-control-request-headers'] ?? 'authorization,content-type',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
});

const answer = (request, data, extra = {}) => ({ status: 200, headers: cors(request), body: JSON.stringify({ code: 200, message: 'ok', data, ...extra }) });

// Matched on the API path, not the host: a production build points at the deployed server, so
// pinning this to localhost mocked nothing and the app booted straight back to the sign-in screen.
function handle(request) {
    const url = request.url;
    if (!url.includes('/api/v1/')) return null;
    if (request.method === 'OPTIONS') return { status: 204, headers: cors(request), body: '' };
    if (url.includes('/refresh-token')) return answer(request, { access_token: 'access-1', refresh_token: 'refresh-1', refresh_transport: 'body', session_id: 'session-1' });
    if (url.includes('/get-user-info')) return answer(request, SESSION);
    if (url.includes('/get-category-list')) return answer(request, { rows: ROWS }, { total: ROWS.length });
    if (url.includes('/get-user-card')) return answer(request, { name: 'Ahmad Saif', email: 'ahmad@samiha.test', designation: 'Manager', role: 'Manager', photo: null, active: true });
    console.log('  unmocked API call:', url);
    return answer(request, {});
}

const seed = "try { localStorage.setItem('__x9f4c2e8a1b7d6f3c0a5e9b2d4f8a11__', JSON.stringify({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: true })); localStorage.setItem('__x7d2a9f4e1c8b3d6a0f5e2c9b7a41__', 'session-1'); } catch (e) {}";

const PROBE = `(() => {
    const row = document.querySelector('[data-table="row"]');
    const head = document.querySelector('.sf-list-table thead th');
    const cells = row ? [...row.querySelectorAll('td')] : [];
    const toolbar = document.querySelector('[data-table="toolbar"]');
    const header = document.querySelector('header');
    return JSON.stringify({
        columns: cells.length,
        rowHeight: row ? +row.getBoundingClientRect().height.toFixed(1) : null,
        headHeight: head ? +head.getBoundingClientRect().height.toFixed(1) : null,
        cellPadding: cells[1] ? getComputedStyle(cells[1]).padding : null,
        fontSize: cells[1] ? getComputedStyle(cells[1]).fontSize : null,
        toolbarHeight: toolbar ? +toolbar.getBoundingClientRect().height.toFixed(1) : null,
        headerHeight: header ? +header.getBoundingClientRect().height.toFixed(1) : null,
        sizeChanger: !!document.querySelector('nz-pagination nz-select'),
        lead: !!document.querySelector('[data-page-header=lead]'),
        crumbs: [...document.querySelectorAll('[data-page-header=breadcrumb] nz-breadcrumb-item')].map((e) => e.textContent.trim()).join(' / '),
        pageScrollsSideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    });
})()`;

const server = serve();
const browser = await launch({ width: 1366, height: 768 });
mkdirSync(OUT, { recursive: true });

try {
    await browser.onNewDocument(seed);
    await browser.intercept(handle);

    for (const [label, w, h] of SIZES) {
        await browser.setViewport(w, h);
        await browser.goto('http://127.0.0.1:' + PORT + BASE + ROUTE);
        await browser.waitFor('[data-table="row"]');
        await browser.screenshot(join(OUT, label + '.png'));
        console.log(label.padEnd(8), await browser.eval(PROBE));
    }

    if (browser.errors.length) console.log('\nconsole errors:', browser.errors);
} finally {
    await browser.close();
    server.close();
}

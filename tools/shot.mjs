/**
 * Screenshots a signed-in screen at both supported widths, with the API mocked.
 *
 * The app is checked as it ships: the built bundle over a static server, not the dev server, so
 * what is photographed is what a person gets. Nothing reaches a real backend. A session is seeded
 * into storage before bootstrap and every call to environment.baseUrl is answered from here.
 *
 *   node tools/shot.mjs [route] [out-dir] [ready-selector] [click-selector]
 *
 * A click selector is pressed once the page is ready, for a state only a click reaches, such as an
 * image preview; the shot waits for `.cdk-overlay-pane` after it.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { launch } from './cdp.mjs';

const DIST = 'dist/stock-flow-web/browser';
// Git Bash rewrites an argument starting with / into a Windows path (C:/Program Files/Git/app/...),
// which the app does not know and redirects to the root, so only the part from /app/ is kept.
const ROUTE = (process.argv[2] ?? '/app/configuration/categories').replace(/^.*?(?=\/app\/)/, '');
const OUT = process.argv[3] ?? 'tools/shots';
/** What to wait for before the shot. A form or a record page has no table row to wait on. */
const READY = process.argv[4] ?? '[data-table="row"]';
const CLICK = process.argv[5];
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
        children: [{ id: 'products', label: { en: 'Products', bn: 'পণ্য' }, description: { en: null, bn: null }, tags: [], icon: 'lucidePackage', order: 0, route: '/app/configuration/products', permission: 'configuration.product.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'aisles', label: { en: 'Aisles / Zones', bn: 'আইল' }, description: { en: null, bn: null }, tags: [], icon: 'lucideRows3', order: 7, route: '/app/configuration/aisles', permission: 'configuration.aisle.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'warehouses', label: { en: 'Warehouses', bn: 'ওয়্যারহাউজ' }, description: { en: null, bn: null }, tags: [], icon: 'lucideWarehouse', order: 6, route: '/app/configuration/warehouses', permission: 'configuration.warehouse.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'suppliers', label: { en: 'Suppliers', bn: 'সাপ্লায়ার' }, description: { en: null, bn: null }, tags: [], icon: 'lucideFactory', order: 3, route: '/app/configuration/suppliers', permission: 'configuration.supplier.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'brands', label: { en: 'Brands', bn: 'ব্র্যান্ড' }, description: { en: null, bn: null }, tags: [], icon: 'lucideTag', order: 2, route: '/app/configuration/brands', permission: 'configuration.brands.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'categories', label: { en: 'Categories', bn: 'ক্যাটাগরি' }, description: { en: 'Create the product groups, like Saree or Cosmetics, that every product is filed under.', bn: 'পণ্যের গ্রুপ তৈরি করুন।' }, tags: [], icon: 'lucideFolderTree', order: 1, route: '/app/configuration/categories', permission: 'configuration.category.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }],
    },
];

const SESSION = {
    version: '1',
    user: { name: 'Nazmus Sakib', email: 'owner@samiha.test', mobile_number: null, photo: null, designation: 'Owner', role: 'Owner' },
    business: { name: 'Samiha Style Studio', logoUrl: null, orderSystem: 'BOTH' },
    permissions: ['dashboard.overview.view', 'configuration.category.view', 'configuration.category.create', 'configuration.category.edit', 'configuration.category.export', 'configuration.brands.view', 'configuration.brands.create', 'configuration.brands.edit', 'configuration.brands.export', 'configuration.supplier.view', 'configuration.supplier.create', 'configuration.supplier.edit', 'configuration.supplier.export', 'configuration.warehouse.view', 'configuration.warehouse.create', 'configuration.warehouse.edit', 'configuration.warehouse.export', 'configuration.aisle.view', 'configuration.aisle.create', 'configuration.aisle.edit', 'configuration.aisle.export', 'configuration.product.view', 'configuration.product.create', 'configuration.product.edit', 'configuration.product.delete'],
    menu: MENU,
    counters: { notifications: 0 },
};

const PHOTO = 'https://res.cloudinary.com/stockflow/image/upload/v1737223331/stockflow/kurti_uozfxa.png';
const thumb = (url) => url.replace('/image/upload/', '/image/upload/c_fill,w_48,h_48,f_auto,q_auto/');
const PRODUCTS = [
    { oid: 'p-1', name: 'Cotton Kurti, maroon', sku: 'COTTKUR', photo: PHOTO, photo_thumb: thumb(PHOTO), unit_type: 'pcs', restock_threshold: 5, status: 'Active', category_oid: 'c-1', category_name: 'Clothing', sub_category_oid: 'sc-1', sub_category_name: 'Kurti', brand_oid: 'b-1', brand_name: 'Aarong', sellable: 4, description: 'Pure cotton, hand block print, free size.', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-20T10:00:00.000' },
    { oid: 'p-2', name: 'Woolen Scarf', sku: 'WSC002', photo: null, photo_thumb: null, unit_type: 'pcs', restock_threshold: 3, status: 'Active', category_oid: 'c-2', category_name: 'Winterwear', sub_category_oid: 'sc-2', sub_category_name: 'Scarf', brand_oid: null, brand_name: null, sellable: 0, description: null, created_on: '2026-09-02T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-18T10:00:00.000' },
    { oid: 'p-3', name: 'Aloe Vera Moisturiser', sku: '8901030704284', photo: null, photo_thumb: null, unit_type: 'box', restock_threshold: 10, status: 'Active', category_oid: 'c-3', category_name: 'Skincare', sub_category_oid: 'sc-3', sub_category_name: 'Moisturiser', brand_oid: 'b-2', brand_name: 'Cosrx', sellable: 42, description: null, created_on: '2026-09-03T10:00:00.000', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-10T10:00:00.000' },
];

const NAMES = ['Accessories', 'Clothing', 'Cosmetics', 'Delivery', 'Footwear', 'Inventory', 'Jersey', 'Packaging', 'Skincare', 'Test Category One', 'Traditional Clothing', 'Winterwear'];

const WAREHOUSES = [
    ['Chandrabindu', 'W-CHANDRA', 'Mohammadpur, Dhaka', 80000],
    ['Kanthasheelan', 'W-KANTHA', 'Mohammadpur, Dhaka', 85000],
    ['Nilanjana', 'W-NILANJ', null, null],
].map(([name, code, location, capacity_units], i) => ({ oid: 'wh-' + i, name, code, location, capacity_units, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

const AISLES = [
    ['Alokdhara', 'A-ALOK', 'rack', 30000],
    ['Chandrika', 'A-CHANDRIKA', 'shelf', 20000],
    ['Jyotsna', 'A-JYOTSNA', 'other', 30000],
    ['Test Aisle', 'TST', null, null],
].map(([name, code, storage_type, capacity_units], i) => ({ oid: 'ai-' + i, name, code, warehouse_oid: 'wh-0', warehouse_name: 'Chandrabindu', storage_type, capacity_units, special_notes: null, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

const SUPPLIERS = [
    ['Bengal Traditional Garments Ltd.', 'Mahfuz Rahman', '01712345678', 'sales@bengalclothing.com'],
    ['Dhaka Saree House', 'Ritu Akter', '01911223344', 'info@dhakasaree.com'],
    ['Islampur Fabrics', null, '01815667788', null],
    ['Jutti Heaven', 'Fahim Shahriar', '01812997744', 'order@juttibd.com'],
    ['Rajshahi Silk Exporters', 'Farhana Jahan', '01711882299', null],
].map(([name, contact_person, phone_number, email], i) => ({ oid: 'sup-' + i, name, contact_person, phone_number, whatsapp_number: i === 1 ? '01811223344' : null, email, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@samiha.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

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
    if (url.includes('/get-warehouse-list-for-dropdown')) return answer(request, WAREHOUSES.map((w) => ({ value: w.oid, label: w.name })));
    if (url.includes('/get-aisle-list')) return answer(request, { rows: AISLES, stats: { active: 4, inactive: 0, stocked: 3, empty: 1 } }, { total: AISLES.length });
    if (url.includes('/get-aisle-details'))
        return answer(request, {
            details: { ...AISLES[1], special_notes: 'Ground floor, left of the door. Skincare only.', created_by: 'owner@samiha.test' },
            stats: { products: 19, onHand: 1339, sellable: 1338, value: 535508, lowStock: 1, fullRate: 6.7 },
            items: [
                { product_oid: 'p1', name: 'Aloe Vera Face Wash', onHand: 34, sellable: 34, low: false },
                { product_oid: 'p2', name: 'Aloe Vera Moisturizer', onHand: 83, sellable: 82, low: false },
                { product_oid: 'p3', name: 'Rose Water Toner', onHand: 3, sellable: 3, low: true },
            ],
            activity: [],
        });
    if (url.includes('/check-aisle-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-warehouse-list')) return answer(request, { rows: WAREHOUSES, stats: { active: 3, inactive: 0, stocked: 2, empty: 1 } }, { total: WAREHOUSES.length });
    if (url.includes('/get-warehouse-details'))
        return answer(request, {
            details: { ...WAREHOUSES[0], created_by: 'owner@samiha.test' },
            stats: { products: 23, onHand: 1608, sellable: 1605, value: 650650, unplaced: 164, lowStock: 1, zones: 4, fullRate: 2 },
            activity: [],
        });
    if (url.includes('/check-warehouse-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-supplier-list')) return answer(request, { rows: SUPPLIERS, stats: { active: 5, inactive: 0, owing: 2, unused: 1 } }, { total: SUPPLIERS.length });
    if (url.includes('/get-supplier-details'))
        return answer(request, {
            details: { ...SUPPLIERS[1], address: '12/B, New Market, Dhaka-1205', payment_details: 'bKash 01911-223344, Dutch-Bangla Bank, A/C 123.456.7890', created_by: 'owner@samiha.test' },
            stats: { orders: 3, openOrders: 1, spent: 66319, paid: 40069, owed: 26250, receivedValue: 62119, lastPurchaseOn: '2026-03-20T05:06:12Z', leadDays: 2, promisedOrders: 0, onTimeRate: null, unitsOrdered: 123, unitsReceived: 117, shortRate: 4.9, faultyUnits: 0, faultyRate: 0, unitsSold: 10, sellThrough: 8.5, sales: 9740, profit: 3040 },
            activity: [{ oid: 'log-1', date: '2026-09-20T14:22:18Z', user: 'owner@samiha.test', action: 'Created supplier', description: 'Created supplier "Dhaka Saree House" with phone number 01911223344' }],
        });
    if (url.includes('/check-supplier-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-brand-list')) return answer(request, { rows: ROWS, stats: { active: 11, inactive: 1, products: 40, empty: 2 } }, { total: ROWS.length });
    if (url.includes('/get-brand-details')) return answer(request, { details: { ...ROWS[1], origin_country: 'KR', created_by: 'owner@samiha.test' }, stats: { totalProducts: 12, activeProducts: 11, amountSpent: 48250, totalAvailableQuantity: 340, lowStockItems: 2, outOfStockItems: 1, averageProductPrice: 1250 }, activity: [] });
    if (url.includes('/check-brand-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-category-list')) {
        // Counted here the way the endpoint counts them, so the stat strip is photographed with real numbers.
        const stats = { active: ROWS.filter((r) => r.status === 'Active').length, inactive: ROWS.filter((r) => r.status === 'Inactive').length };
        return answer(request, url.includes('include=stats') ? { rows: ROWS, stats } : { rows: ROWS }, { total: ROWS.length });
    }
    if (url.includes('/get-category-details')) {
        const row = ROWS[1];
        return answer(request, {
            details: { ...row, created_by: 'owner@samiha.test' },
            stats: { totalProducts: 12, activeProducts: 11, amountSpent: 48250, totalAvailableQuantity: 340, lowStockItems: 2, outOfStockItems: 1, averageProductPrice: 1250 },
            activity: [
                { oid: 'log-1', date: '2026-09-20T14:22:18Z', user: 'owner@samiha.test', action: 'Updated category', description: 'Status changed from "Inactive" to "Active"' },
                { oid: 'log-2', date: '2026-09-01T10:00:00Z', user: 'ahmad@samiha.test', action: 'Created category', description: 'Created category "Clothing" with code CODE-002' },
            ],
        });
    }
    if (url.includes('/check-category-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-product-list')) return answer(request, { rows: PRODUCTS, stats: { active: 3, inactive: 0, low: 1, out: 1 } }, { total: PRODUCTS.length });
    if (url.includes('/get-product-details'))
        return answer(request, {
            details: { ...PRODUCTS[0], created_by: 'owner@samiha.test' },
            stock: { on_hand: 12, held: 8, sellable: 4, batches: [{ oid: 'i-1', batch_code: 'B-240917-01', warehouse_name: 'Main showroom', received_on: '2026-09-17T10:00:00.000', on_hand: 9, held: 8, sellable: 1, cost_price: 450, selling_price: 890 }, { oid: 'i-2', batch_code: 'B-240922-03', warehouse_name: 'Online store room', received_on: '2026-09-22T10:00:00.000', on_hand: 3, held: 0, sellable: 3, cost_price: 470, selling_price: null }] },
            lifetime: { sold: 31, returned: 2, damaged: 1, last_sold_on: '2026-09-25T15:30:00.000' },
            activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@samiha.test', action: 'Updated product', description: 'Restock level changed from "3" to "5"' }],
        });
    if (url.includes('/get-sub-category-list-for-dropdown')) return answer(request, [{ value: 'sc-1', label: 'Kurti', groupLabel: 'Clothing' }, { value: 'sc-3', label: 'Moisturiser', groupLabel: 'Skincare' }]);
    if (url.includes('/get-brand-list-for-dropdown')) return answer(request, [{ value: 'b-1', label: 'Aarong' }, { value: 'b-2', label: 'Cosrx' }]);
    if (url.includes('/check-product-availability')) return answer(request, { field: 'sku', available: true });
    if (url.includes('/get-user-card')) return answer(request, { name: 'Ahmad Saif', email: 'ahmad@samiha.test', designation: 'Manager', role: 'Manager', photo: null, active: true });
    console.log('  unmocked API call:', url);
    return answer(request, {});
}

const LANG = process.env.SHOT_LANG === 'bn' ? "localStorage.setItem('app_lang', 'bn'); " : '';
const seed = "try { " + LANG + "localStorage.setItem('__x9f4c2e8a1b7d6f3c0a5e9b2d4f8a11__', JSON.stringify({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: true })); localStorage.setItem('__x7d2a9f4e1c8b3d6a0f5e2c9b7a41__', 'session-1'); } catch (e) {}";

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
        await browser.waitFor(READY);
        if (CLICK) {
            await browser.eval(`document.querySelector(${JSON.stringify(CLICK)}).click()`);
            await browser.waitFor('.cdk-overlay-pane');
            await new Promise((resolve) => setTimeout(resolve, 600));
        }
        await browser.screenshot(join(OUT, label + '.png'));
        console.log(label.padEnd(8), await browser.eval(PROBE));
    }

    if (browser.errors.length) console.log('\nconsole errors:', browser.errors);
} finally {
    await browser.close();
    server.close();
}

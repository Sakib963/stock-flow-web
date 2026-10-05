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
 * image preview; the shot waits for `.cdk-overlay-pane` after it, or for SHOT_AFTER_CLICK when set.
 * Several clicks are joined with ` && `. SHOT_EVAL, when set, is an expression whose result is printed per size.
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
        children: [{ id: 'analytics', label: { en: 'Analytics', bn: 'বিশ্লেষণ' }, description: { en: null, bn: null }, tags: [], icon: 'lucideChartLine', order: 8, route: '/app/configuration/analytics', permission: 'configuration.analytics.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'products', label: { en: 'Products', bn: 'পণ্য' }, description: { en: null, bn: null }, tags: [], icon: 'lucidePackage', order: 0, route: '/app/configuration/products', permission: 'configuration.product.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'aisles', label: { en: 'Aisles / Zones', bn: 'আইল' }, description: { en: null, bn: null }, tags: [], icon: 'lucideRows3', order: 7, route: '/app/configuration/aisles', permission: 'configuration.aisle.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'warehouses', label: { en: 'Warehouses', bn: 'ওয়্যারহাউজ' }, description: { en: null, bn: null }, tags: [], icon: 'lucideWarehouse', order: 6, route: '/app/configuration/warehouses', permission: 'configuration.warehouse.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'suppliers', label: { en: 'Suppliers', bn: 'সাপ্লায়ার' }, description: { en: null, bn: null }, tags: [], icon: 'lucideFactory', order: 3, route: '/app/configuration/suppliers', permission: 'configuration.supplier.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'brands', label: { en: 'Brands', bn: 'ব্র্যান্ড' }, description: { en: null, bn: null }, tags: [], icon: 'lucideTag', order: 2, route: '/app/configuration/brands', permission: 'configuration.brands.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'categories', label: { en: 'Categories', bn: 'ক্যাটাগরি' }, description: { en: 'Create the product groups, like Saree or Cosmetics, that every product is filed under.', bn: 'পণ্যের গ্রুপ তৈরি করুন।' }, tags: [], icon: 'lucideFolderTree', order: 1, route: '/app/configuration/categories', permission: 'configuration.category.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }],
    },
    {
        id: 'inventory',
        label: { en: 'Inventory', bn: 'ইনভেন্টরি' },
        description: { en: null, bn: null },
        tags: [],
        icon: 'lucideBoxes',
        order: 3,
        route: null,
        permission: null,
        isDisabled: false,
        disabledMessage: { en: null, bn: null },
        isNew: false,
        children: [{ id: 'stock-overview', label: { en: 'Stock overview', bn: 'স্টক পরিস্থিতি' }, description: { en: null, bn: null }, tags: [], icon: 'lucideLayers', order: 0, route: '/app/inventory/overview', permission: 'inventory.overview.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'stock-movements', label: { en: 'Stock movements', bn: 'স্টকের গতিবিধি' }, description: { en: null, bn: null }, tags: [], icon: 'lucideArrowLeftRight', order: 5, route: '/app/inventory/stock-movements', permission: 'inventory.stock-movement.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }, { id: 'purchase-orders', label: { en: 'Purchase orders', bn: 'ক্রয়াদেশ' }, description: { en: null, bn: null }, tags: [], icon: 'lucideTruck', order: 10, route: '/app/inventory/purchase-orders', permission: 'inventory.purchase-order.view', isDisabled: false, disabledMessage: { en: null, bn: null }, isNew: false, children: [] }],
    },
];

const SESSION = {
    version: '1',
    user: { name: 'Nazmus Sakib', email: 'owner@arithmalabs.test', mobile_number: null, photo: null, designation: 'Owner', role: 'Owner' },
    business: { name: 'Arithma Labs', logoUrl: null, orderSystem: 'BOTH' },
    permissions: ['dashboard.overview.view', 'configuration.category.view', 'configuration.category.create', 'configuration.category.edit', 'configuration.category.export', 'configuration.brands.view', 'configuration.brands.create', 'configuration.brands.edit', 'configuration.brands.export', 'configuration.supplier.view', 'configuration.supplier.create', 'configuration.supplier.edit', 'configuration.supplier.export', 'configuration.warehouse.view', 'configuration.warehouse.create', 'configuration.warehouse.edit', 'configuration.warehouse.export', 'configuration.aisle.view', 'configuration.aisle.create', 'configuration.aisle.edit', 'configuration.aisle.export', 'configuration.product.view', 'configuration.product.create', 'configuration.product.edit', 'configuration.product.delete', 'configuration.analytics.view', 'inventory.purchase-order.view', 'inventory.purchase-order.create', 'inventory.purchase-order.edit', 'inventory.purchase-order.approve', 'inventory.purchase-order.cancel', 'inventory.purchase-order.export', 'inventory.stock-movement.view', 'inventory.overview.view', 'inventory.overview.edit', 'inventory.stock-value.view', 'sales.online.view', 'sales.online.create', 'sales.customer.view', 'sales.settings.edit', 'sales.order.view', 'sales.order.confirm', 'sales.order.cancel', 'sales.order.dispatch', 'sales.order.deliver', 'sales.pos.view'],
    menu: MENU,
    counters: { notifications: 0 },
};

const PHOTO = 'https://res.cloudinary.com/stockflow/image/upload/v1737223331/stockflow/kurti_uozfxa.png';
const thumb = (url) => url.replace('/image/upload/', '/image/upload/c_fill,w_48,h_48,f_auto,q_auto/');
const PRODUCTS = [
    { oid: 'p-1', name: 'Cotton Kurti, maroon', sku: 'COTTKUR', photo: PHOTO, photo_thumb: thumb(PHOTO), unit_type: 'pcs', restock_threshold: 5, status: 'Active', category_oid: 'c-1', category_name: 'Clothing', sub_category_oid: 'sc-1', sub_category_name: 'Kurti', brand_oid: 'b-1', brand_name: 'Aarong', sellable: 4, description: 'Pure cotton, hand block print, free size.', created_on: '2026-09-01T10:00:00.000', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-20T10:00:00.000' },
    { oid: 'p-2', name: 'Woolen Scarf', sku: 'WSC002', photo: null, photo_thumb: null, unit_type: 'pcs', restock_threshold: 3, status: 'Active', category_oid: 'c-2', category_name: 'Winterwear', sub_category_oid: 'sc-2', sub_category_name: 'Scarf', brand_oid: null, brand_name: null, sellable: 0, description: null, created_on: '2026-09-02T10:00:00.000', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-18T10:00:00.000' },
    { oid: 'p-3', name: 'Aloe Vera Moisturiser', sku: '8901030704284', photo: null, photo_thumb: null, unit_type: 'box', restock_threshold: 10, status: 'Active', category_oid: 'c-3', category_name: 'Skincare', sub_category_oid: 'sc-3', sub_category_name: 'Moisturiser', brand_oid: 'b-2', brand_name: 'Cosrx', sellable: 42, description: null, created_on: '2026-09-03T10:00:00.000', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_on: '2026-09-10T10:00:00.000' },
];

// Orders: one in each state the list shows.
const ORDERS = [
    ['2610050004', 'ONLINE', 'Pending', null, 'unpaid', 2960],
    ['2610050003', 'ONLINE', 'Confirmed', 'WithCourier', 'partially_paid', 1510],
    ['2610050002', 'POS', 'Purchased', null, 'paid', 890],
    ['2610050001', 'ONLINE', 'Cancelled', 'Preparing', 'partially_paid', 1510],
].map(([invoice_no, channel, status, delivery_status, payment_status, total_amount], i) => ({ oid: 'o-' + i, invoice_no, channel, status, delivery_status, payment_status, total_amount, amount_paid: 0, refund_status: i === 3 ? 'ToRefund' : 'None', customer_name: channel === 'POS' ? null : 'Person A', customer_phone: channel === 'POS' ? null : '01987654321', units: 2, created_by: 'owner@arithmalabs.test', created_by_name: 'Nazmus Sakib', created_on: '2026-10-05T10:0' + i + ':00.000' }));
const ORDER_DETAILS = { ...ORDERS[0], customer_oid: 'cu-1', subtotal: 2900, discount_total: 0, delivery_charge: 60, amount_refunded: 0, payment_type: 'COD', payment_method: 'cod', refund_due: 0, dispatched_on: null, delivered_on: null, cancelled_on: null, cancel_reason_code: null, cancel_reason: null, sold_on: null, notes: 'Ring before coming', items: [{ oid: 'l-1', product_oid: 'p-1', product_name: 'Cotton Kurti, maroon', batch_code: 'B-7KQ2-91X', quantity: 2, returned_qty: 0, unit_price: 1450, discount: 0, total: 2900 }], status_history: [{ kind: 'Order', from_status: null, to_status: 'Pending', reason: null, performed_by: 'owner@arithmalabs.test', performed_by_name: 'Nazmus Sakib', performed_on: '2026-10-05T10:00:00.000' }], online: { recipient_name: 'Person A', recipient_phone: null, address_line: '5/5 Gaznabi Road', area_text: 'Gaznabi Road', postal_code: '1207', district_name_en: 'Dhaka', district_name_bn: 'ঢাকা', thana_name_en: 'Mohammadpur', thana_name_bn: 'মোহাম্মদপুর', source_name: 'Facebook page', confirmed_via: null, confirmed_note: null, confirmed_on: null, confirmed_by: null, risk_own_delivered_rate: 80, risk_flag: 'None', delivery_status: null, packed_on: null, courier: null, consignment_no: null } };

const NAMES = ['Accessories', 'Clothing', 'Cosmetics', 'Delivery', 'Footwear', 'Inventory', 'Jersey', 'Packaging', 'Skincare', 'Test Category One', 'Traditional Clothing', 'Winterwear'];

const WAREHOUSES = [
    ['Chandrabindu', 'W-CHANDRA', 'Mohammadpur, Dhaka', 80000],
    ['Kanthasheelan', 'W-KANTHA', 'Mohammadpur, Dhaka', 85000],
    ['Nilanjana', 'W-NILANJ', null, null],
].map(([name, code, location, capacity_units], i) => ({ oid: 'wh-' + i, name, code, location, capacity_units, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

const AISLES = [
    ['Alokdhara', 'A-ALOK', 'rack', 30000],
    ['Chandrika', 'A-CHANDRIKA', 'shelf', 20000],
    ['Jyotsna', 'A-JYOTSNA', 'other', 30000],
    ['Test Aisle', 'TST', null, null],
].map(([name, code, storage_type, capacity_units], i) => ({ oid: 'ai-' + i, name, code, warehouse_oid: 'wh-0', warehouse_name: 'Chandrabindu', storage_type, capacity_units, special_notes: null, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

const SUPPLIERS = [
    ['Bengal Traditional Garments Ltd.', 'Mahfuz Rahman', '01712345678', 'sales@bengalclothing.com'],
    ['Dhaka Saree House', 'Ritu Akter', '01911223344', 'info@dhakasaree.com'],
    ['Islampur Fabrics', null, '01815667788', null],
    ['Jutti Heaven', 'Fahim Shahriar', '01812997744', 'order@juttibd.com'],
    ['Rajshahi Silk Exporters', 'Farhana Jahan', '01711882299', null],
].map(([name, contact_person, phone_number, email], i) => ({ oid: 'sup-' + i, name, contact_person, phone_number, whatsapp_number: i === 1 ? '01811223344' : null, email, status: 'Active', created_on: '2026-01-17T10:00:00Z', last_action_on: '2026-01-17T10:00:00Z', last_action_by: 'owner@arithmalabs.test', last_action_by_name: 'Nazmus Sakib', last_action_by_role: 'Owner', last_action_is_edit: true }));

const ROWS = NAMES.map((name, i) => ({
    oid: 'oid-' + i,
    name,
    category_code: 'CODE-' + String(i + 1).padStart(3, '0'),
    description: i % 3 ? 'Stylish and functional ' + name.toLowerCase() + ' to complete your look.' : null,
    status: i === 9 ? 'Inactive' : 'Active',
    created_on: '2026-01-17T10:00:00Z',
    last_action_on: '2026-01-17T10:00:00Z',
    last_action_by: i % 2 ? 'owner@arithmalabs.test' : 'ahmad@arithmalabs.test',
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


const ANALYTICS = {
    counts: { product: { active: 26, added: 3 }, category: { active: 11, added: 0 }, subCategory: { active: 45, added: 1 }, brand: { active: 2, added: 0 }, supplier: { active: 13, added: 0 }, warehouse: { active: 3, added: 0 }, aisle: { active: 10, added: 0 } },
    attention: [
        { key: 'productsWithoutPhoto', total: 15, items: [{ oid: 'p-1', name: 'Aloe Vera Face Wash', detail: null }, { oid: 'p-2', name: 'Anti-Aging Serum', detail: null }, { oid: 'p-3', name: 'Beard Oil', detail: null }, { oid: 'p-4', name: 'Cotton Crew Neck T-Shirt', detail: null }, { oid: 'p-5', name: 'Floral Maxi Dress', detail: null }] },
        { key: 'productsWithoutBrand', total: 25, items: [{ oid: 'p-1', name: 'Aloe Vera Face Wash', detail: null }, { oid: 'p-6', name: 'Aloe Vera Moisturizer', detail: null }] },
        { key: 'productsWithoutThreshold', total: 1, items: [{ oid: 'p-7', name: 'Handmade Gift Box', detail: null }] },
        { key: 'emptyCategories', total: 4, items: [{ oid: 'c-1', name: 'Footwear', detail: null }, { oid: 'c-2', name: 'Jersey', detail: null }] },
        { key: 'emptySubCategories', total: 23, items: [{ oid: 's-1', name: 'Cleanser', detail: 'Skincare' }, { oid: 's-2', name: 'Courier Bags', detail: 'Delivery' }] },
        { key: 'emptyBrands', total: 1, items: [{ oid: 'b-2', name: 'COSRX', detail: null }] },
        { key: 'emptyAisles', total: 7, items: [{ oid: 'a-1', name: 'Anchol (আঁচল)', detail: 'Kanthasheelan' }] },
        { key: 'suppliersNeverBoughtFrom', total: 8, items: [{ oid: 'su-1', name: 'Jutti Heaven', detail: null }, { oid: 'su-2', name: 'Leather Craft BD', detail: null }] },
        { key: 'inactiveCategoriesInUse', total: 0, items: [] },
        { key: 'inactiveBrandsInUse', total: 0, items: [] },
    ],
    spread: {
        category: { total: 26, rows: [{ oid: 'c-3', name: 'Accessories', products: 7 }, { oid: 'c-4', name: 'Skincare', products: 6 }, { oid: 'c-5', name: 'Traditional Clothing', products: 4 }, { oid: 'c-6', name: 'Cosmetics', products: 3 }, { oid: 'c-7', name: 'Clothing', products: 2 }, { oid: 'c-8', name: 'Delivery', products: 2 }, { oid: 'c-9', name: 'Packaging', products: 2 }], other: null },
        brand: { total: 26, rows: [{ oid: null, name: null, products: 25 }, { oid: 'b-1', name: "skin'O", products: 1 }], other: null },
        supplier: { total: 23, rows: [{ oid: 'su-3', name: 'Bengal Traditional Garments Ltd.', products: 18 }, { oid: 'su-4', name: 'Global Distributor Ltd', products: 18 }, { oid: 'su-5', name: 'Deshi Kurtis Co.', products: 5 }, { oid: 'su-6', name: 'Dhaka Saree House', products: 3 }], other: null },
    },
    warehouses: [
        { oid: 'w-1', name: 'Chandrabindu', onHand: 1608, capacity: 2000, fullRate: 80.4 },
        { oid: 'w-2', name: 'Kanthasheelan', onHand: 0, capacity: 85000, fullRate: 0 },
        { oid: 'w-3', name: 'Shop floor', onHand: 42, capacity: null, fullRate: null },
    ],
    activity: [
        { oid: 'l-1', type: 'brand', recordOid: 'b-1', date: '2026-09-27T10:00:00.000', user: 'owner@arithmalabs.test', action: 'Updated brand', description: 'Origin country set to KR' },
        { oid: 'l-2', type: 'sub-category', recordOid: 's-1', date: '2026-09-26T15:20:00.000', user: 'owner@arithmalabs.test', action: 'Created sub-category', description: null },
        { oid: 'l-3', type: 'category', recordOid: 'c-3', date: '2026-09-25T09:10:00.000', user: 'manager@arithmalabs.test', action: 'Updated category', description: 'Status changed from "Inactive" to "Active"' },
    ],
};

// Purchase orders: one order in each state, so every record page can be photographed.
const PO_LINES = [
    ['l-1', 'p-1', 'Cotton Kurti, maroon', 'COTTKUR', 'wh-0', 'Chandrabindu', 'ai-0', 'Alokdhara', 80, 450, 76, 450, 890, 50, 20, 'Eid campaign stock'],
    ['l-2', 'p-2', 'Woolen Scarf', 'WSC002', 'wh-0', 'Chandrabindu', 'ai-1', 'Chandrika', 40, 620, 40, 600, 1250, 100, null, null],
    ['l-3', 'p-3', 'Aloe Vera Moisturiser', '8901030704284', 'wh-1', 'Kanthasheelan', null, null, 60, 540, 60, 540, null, null, null, null],
    ['l-4', 'p-4', 'Courier Bags, medium', 'CBAG-M', 'wh-2', 'Nilanjana', null, null, 500, 12, 500, 12, null, null, null, null],
];
const poLines = (verified) =>
    PO_LINES.map(([oid, product_oid, product_name, sku, warehouse_oid, warehouse_name, aisle_oid, aisle_name, ordered, price, received, billed, selling, discount, ad, remarks], i) => ({
        oid,
        product_oid,
        product_name,
        sku,
        restock_threshold: 20,
        photo_thumb: null,
        warehouse_oid,
        warehouse_name,
        aisle_oid,
        aisle_name,
        ordered_quantity: ordered,
        ordered_unit_price: String(price),
        received_quantity: verified ? received : null,
        received_unit_price: verified ? String(billed) : null,
        sellable: [4, 0, 42, 300][i],
        current_selling_price: selling ? String(selling) : null,
        current_maximum_discount: discount ? String(discount) : null,
        ad_run_cost: verified ? ad : null,
        packaging_cost: null,
        gift_cost: null,
        content_creation_cost: null,
        influencer_cost: null,
        cost_remarks: verified ? remarks : null,
        batches: verified ? [{ oid: 'b-' + i, batch_code: ['B-7KQ4-M2XH', 'B-D9TW-3FRA', 'B-XC5N-8PEJ', 'B-2HVB-QK6M'][i] ?? 'B-R4ZS-9WDN', intended_use: i === 3 ? 'internal_use' : 'for_sale', status: i === 3 ? 'internal_use' : 'ready_for_sale', initial_quantity: received, quantity_available: received, selling_price: i === 3 ? null : String(selling ?? 980), maximum_discount: i === 3 ? null : String(discount ?? 60) }] : [],
    }));
const PO_HEADER = {
    po_number: 'PO-2609-0142',
    purchase_type: 'advance',
    special_notes: 'Call Rafiq before unloading',
    payment_status: 'partially_paid',
    total_amount: '94600',
    paid_amount: '50000',
    expected_delivery_date: '2026-10-02',
    supplier_oid: 'sup-0',
    supplier_name: 'Bengal Traditional Garments Ltd.',
    supplier_phone: '01711-402233',
    supplier_status: 'Active',
    supplier_orders_this_year: 14,
    created_on: '2026-09-26T11:42:00.000',
    created_by: 'owner@arithmalabs.test',
    created_by_name: 'Nusrat Sultana',
    verified_on: null,
    verified_by: null,
    verified_by_name: null,
    cancelled_on: null,
    cancelled_by: null,
    cancelled_by_name: null,
    cancel_reason: null,
};
const PO_OPEN = { received_total: null, received_units: null, lines_short: null, units_short: null, price_changed: null, batches: 0, budgets_total: null };
const PO = {
    'po-sub': { details: { ...PO_HEADER, oid: 'po-sub', status: 'Submitted' }, lines: poLines(false), stats: { ordered_total: 94600, ordered_units: 680, warehouses: 3, ...PO_OPEN } },
    'po-ver': { details: { ...PO_HEADER, oid: 'po-ver', status: 'Verified', verified_on: '2026-10-02T16:05:00.000', verified_by: 'rafiq@arithmalabs.test', verified_by_name: 'Rafiq Hasan' }, lines: poLines(true), stats: { ordered_total: 94600, ordered_units: 680, received_total: 92400, received_units: 676, lines_short: 1, units_short: 4, price_changed: 1, batches: 4, budgets_total: 1520, warehouses: 3 } },
    'po-can': { details: { ...PO_HEADER, oid: 'po-can', status: 'Cancelled', cancelled_on: '2026-09-27T10:18:00.000', cancelled_by: 'owner@arithmalabs.test', cancelled_by_name: 'Nusrat Sultana', cancel_reason: 'The supplier could not deliver before Eid' }, lines: poLines(false), stats: { ordered_total: 94600, ordered_units: 680, warehouses: 3, ...PO_OPEN } },
};
// A draft half typed: the scarf has no warehouse, quantity or price yet, and no payment is set.
PO['po-dra'] = {
    details: { ...PO_HEADER, oid: 'po-dra', status: 'Draft', purchase_type: 'overseas', payment_status: null, paid_amount: '0', total_amount: '36000' },
    lines: poLines(false).slice(0, 2).map((line, i) => (i === 1 ? { ...line, warehouse_oid: null, warehouse_name: null, aisle_oid: null, aisle_name: null, ordered_quantity: null, ordered_unit_price: null } : line)),
    stats: { ordered_total: 36000, ordered_units: 80, warehouses: 1, ...PO_OPEN },
};
const PO_ACTIVITY = [
    { oid: 'a-2', date: '2026-09-26T11:43:00.000', user: 'owner@arithmalabs.test', action: 'Payment recorded', description: 'PO-2609-0142: Unpaid 0 to Partially paid 50000' },
    { oid: 'a-1', date: '2026-09-26T11:42:00.000', user: 'owner@arithmalabs.test', action: 'Raised and submitted', description: 'PO-2609-0142: 4 products, total 94600, partially paid 50000' },
];
const PO_ROWS = ['po-sub', 'po-ver', 'po-can'].map((oid, i) => ({
    oid,
    po_number: 'PO-2609-014' + (2 - i),
    supplier_oid: 'sup-' + i,
    supplier_name: SUPPLIERS[i].name,
    purchase_type: 'advance',
    status: PO[oid].details.status,
    payment_status: ['partially_paid', 'paid', 'unpaid'][i],
    total_amount: '94600',
    paid_amount: ['50000', '94600', '0'][i],
    expected_delivery_date: '2026-10-02',
    product_count: 4,
    created_on: '2026-09-26T11:42:00.000',
    last_action_by: 'owner@arithmalabs.test',
    last_action_by_name: 'Nusrat Sultana',
}));
const PO_PICKER = PRODUCTS.map((p, i) => ({ oid: p.oid, name: p.name, sku: p.sku, restock_threshold: p.restock_threshold, photo_thumb: p.photo_thumb, sellable: p.sellable, sold_30_days: [12, 0, 31][i], last_unit_price: ['450', '620', null][i], last_supplier_name: ['Bengal Traditional Garments Ltd.', 'Dhaka Saree House', null][i], last_bought_on: null }));

// One batch received, then every kind of movement against it and a second batch, newest first.
const MOVE = (oid, created_on, reason, quantity, balance_after, reference, extra = {}) => ({ oid, created_on, reason, quantity, balance_after, product_oid: 'p-1', product_name: 'Cotton Kurti, maroon', sku: 'COTTKUR-MRN', batch_code: 'B-7KQ4-M2XH', warehouse_name: 'Chandrabindu', reference, purchase_oid: null, created_by: 'rafiq@arithmalabs.test', created_by_name: 'Rafiq Hasan', ...extra });
const MOVES = [
    MOVE('m-8', '2026-10-09T17:20:00.000', 'dispose_reversed', 1, 72, 'DSP-0014'),
    MOVE('m-7', '2026-10-09T11:05:00.000', 'disposed', -1, 71, 'DSP-0014'),
    MOVE('m-6', '2026-10-06T15:40:00.000', 'returned', 1, 72, 'INV-1210'),
    MOVE('m-5', '2026-10-05T12:10:00.000', 'dispatched', -1, 71, 'INV-1210'),
    MOVE('m-4', '2026-10-03T18:30:00.000', 'sold', -2, 72, 'INV-1203', { created_by: 'counter@arithmalabs.test', created_by_name: 'Nusrat Sultana' }),
    MOVE('m-3', '2026-10-02T16:05:00.000', 'received', 40, 40, 'PO-2609-0142', { product_oid: 'p-2', product_name: 'Woolen Scarf', sku: 'WOOLSCRF', batch_code: 'B-D9TW-3FRA', purchase_oid: 'po-ver' }),
    MOVE('m-2', '2026-10-02T16:05:00.000', 'received', 74, 74, 'PO-2609-0142', { purchase_oid: 'po-ver' }),
    MOVE('m-1', '2026-09-30T09:00:00.000', 'carried_over', 12, 12, null, { batch_code: 'B-R4ZS-9WDN', warehouse_name: 'Online store room', created_by: 'System', created_by_name: null }),
];

const answer = (request, data, extra = {}) => ({ status: 200, headers: cors(request), body: JSON.stringify({ code: 200, message: 'ok', data, ...extra }) });

// Matched on the API path, not the host: a production build points at the deployed server, so
// pinning this to localhost mocked nothing and the app booted straight back to the sign-in screen.
function handle(request) {
    const url = request.url;
    if (!url.includes('/api/v1/')) return null;
    if (request.method === 'OPTIONS') return { status: 204, headers: cors(request), body: '' };
    if (url.includes('/refresh-token')) return answer(request, { access_token: 'access-1', refresh_token: 'refresh-1', refresh_transport: 'body', session_id: 'session-1' });
    if (url.includes('/get-user-info')) return answer(request, SESSION);
    if (url.includes('/get-stock-movement-list')) {
        const product = new URL(url).searchParams.get('product_oid');
        const rows = product ? MOVES.filter((m) => m.product_oid === product) : MOVES;
        return answer(request, { rows, stats: { units_in: 128, units_out: 4, movements: rows.length } }, { total: rows.length });
    }
    if (url.includes('/get-purchase-list')) return answer(request, { rows: PO_ROWS, stats: { submitted: 1, overdue: 0, verified: 1, cancelled: 1 } }, { total: PO_ROWS.length });
    if (url.includes('/get-purchase-details/')) return answer(request, { ...PO[url.split('/').pop().split('?')[0]], activity: PO_ACTIVITY });
    if (url.includes('/get-product-list-for-purchase')) return answer(request, PO_PICKER);
    if (url.includes('/get-supplier-list-for-dropdown')) return answer(request, SUPPLIERS.map((s, i) => ({ value: s.oid, label: s.name, phone_number: s.phone_number, last_ordered_on: i === 0 ? null : '2026-09-12T10:00:00.000' })));
    if (url.includes('/get-aisle-list-for-dropdown')) return answer(request, AISLES.map((a) => ({ value: a.oid, label: a.name, warehouse_oid: a.warehouse_oid })));
    if (url.includes('/get-warehouse-list-for-dropdown')) return answer(request, WAREHOUSES.map((w) => ({ value: w.oid, label: w.name })));
    if (url.includes('/get-aisle-list')) return answer(request, { rows: AISLES, stats: { active: 4, inactive: 0, stocked: 3, empty: 1 } }, { total: AISLES.length });
    if (url.includes('/get-aisle-details'))
        return answer(request, {
            details: { ...AISLES[1], special_notes: 'Ground floor, left of the door. Skincare only.', created_by: 'owner@arithmalabs.test' },
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
            details: { ...WAREHOUSES[0], created_by: 'owner@arithmalabs.test' },
            stats: { products: 23, onHand: 1608, sellable: 1605, value: 650650, unplaced: 164, lowStock: 1, zones: 4, fullRate: 2 },
            activity: [],
        });
    if (url.includes('/check-warehouse-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-supplier-list')) return answer(request, { rows: SUPPLIERS, stats: { active: 5, inactive: 0, owing: 2, unused: 1 } }, { total: SUPPLIERS.length });
    if (url.includes('/get-supplier-details'))
        return answer(request, {
            details: { ...SUPPLIERS[1], address: '12/B, New Market, Dhaka-1205', payment_details: 'bKash 01911-223344, Dutch-Bangla Bank, A/C 123.456.7890', created_by: 'owner@arithmalabs.test' },
            stats: { orders: 3, openOrders: 1, spent: 66319, paid: 40069, owed: 26250, receivedValue: 62119, lastPurchaseOn: '2026-03-20T05:06:12Z', leadDays: 2, promisedOrders: 0, onTimeRate: null, unitsOrdered: 123, unitsReceived: 117, shortRate: 4.9, faultyUnits: 0, faultyRate: 0, unitsSold: 10, sellThrough: 8.5, sales: 9740, profit: 3040 },
            activity: [{ oid: 'log-1', date: '2026-09-20T14:22:18Z', user: 'owner@arithmalabs.test', action: 'Created supplier', description: 'Created supplier "Dhaka Saree House" with phone number 01911223344' }],
        });
    if (url.includes('/check-supplier-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-brand-list')) return answer(request, { rows: ROWS, stats: { active: 11, inactive: 1, products: 40, empty: 2 } }, { total: ROWS.length });
    if (url.includes('/get-brand-details')) return answer(request, { details: { ...ROWS[1], origin_country: 'KR', created_by: 'owner@arithmalabs.test' }, stats: { totalProducts: 12, activeProducts: 11, amountSpent: 48250, totalAvailableQuantity: 340, lowStockItems: 2, outOfStockItems: 1, averageProductPrice: 1250 }, activity: [] });
    if (url.includes('/check-brand-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-category-list')) {
        // Counted here the way the endpoint counts them, so the stat strip is photographed with real numbers.
        const stats = { active: ROWS.filter((r) => r.status === 'Active').length, inactive: ROWS.filter((r) => r.status === 'Inactive').length };
        return answer(request, url.includes('include=stats') ? { rows: ROWS, stats } : { rows: ROWS }, { total: ROWS.length });
    }
    if (url.includes('/get-category-details')) {
        const row = ROWS[1];
        return answer(request, {
            details: { ...row, created_by: 'owner@arithmalabs.test' },
            stats: { totalProducts: 12, activeProducts: 11, amountSpent: 48250, totalAvailableQuantity: 340, lowStockItems: 2, outOfStockItems: 1, averageProductPrice: 1250 },
            activity: [
                { oid: 'log-1', date: '2026-09-20T14:22:18Z', user: 'owner@arithmalabs.test', action: 'Updated category', description: 'Status changed from "Inactive" to "Active"' },
                { oid: 'log-2', date: '2026-09-01T10:00:00Z', user: 'ahmad@arithmalabs.test', action: 'Created category', description: 'Created category "Clothing" with code CODE-002' },
            ],
        });
    }
    if (url.includes('/check-category-availability')) return answer(request, { field: 'name', available: true });
    if (url.includes('/get-product-list')) return answer(request, { rows: PRODUCTS, stats: { active: 3, inactive: 0, low: 1, out: 1 } }, { total: PRODUCTS.length });
    if (url.includes('/get-product-details'))
        return answer(request, {
            details: { ...PRODUCTS[0], created_by: 'owner@arithmalabs.test' },
            stock: { on_hand: 12, held: 8, sellable: 4, batches: [{ oid: 'i-1', batch_code: 'B-240917-01', warehouse_name: 'Main showroom', received_on: '2026-09-17T10:00:00.000', on_hand: 9, held: 8, sellable: 1, cost_price: 450, selling_price: 890 }, { oid: 'i-2', batch_code: 'B-240922-03', warehouse_name: 'Online store room', received_on: '2026-09-22T10:00:00.000', on_hand: 3, held: 0, sellable: 3, cost_price: 470, selling_price: null }] },
            lifetime: { sold: 31, returned: 2, damaged: 1, last_sold_on: '2026-09-25T15:30:00.000' },
            activity: [{ oid: 'log-1', date: '2026-09-20T10:00:00.000', user: 'owner@arithmalabs.test', action: 'Updated product', description: 'Restock level changed from "3" to "5"' }],
        });
    if (url.includes('/get-sub-category-list-for-dropdown')) return answer(request, [{ value: 'sc-1', label: 'Kurti', groupLabel: 'Clothing' }, { value: 'sc-3', label: 'Moisturiser', groupLabel: 'Skincare' }]);
    if (url.includes('/get-brand-list-for-dropdown')) return answer(request, [{ value: 'b-1', label: 'Aarong' }, { value: 'b-2', label: 'Cosrx' }]);
    if (url.includes('/check-product-availability')) return answer(request, { field: 'sku', available: true });
    if (url.includes('/get-configuration-analytics')) return answer(request, ANALYTICS);
    if (url.includes('/get-order-list')) return answer(request, { rows: ORDERS, stats: { pending: 2, to_dispatch: 1, with_courier: 1, to_refund: 1 } }, { total: ORDERS.length });
    if (url.includes('/get-order-details')) return answer(request, ORDER_DETAILS);
    if (url.includes('/get-online-order-setup')) return answer(request, { sources: [{ oid: 's-1', platform: 'Facebook', name: 'Facebook page' }, { oid: 's-2', platform: 'Instagram', name: 'Instagram' }], delivery_charge_inside: 60, delivery_charge_outside: 120, home_district: { oid: 'BD-Dhaka', name_en: 'Dhaka', name_bn: 'ঢাকা' }, logo_url: null });
    if (url.includes('/find-customer-by-phone'))
        return answer(request, {
            phone: '01987654321',
            customer: { oid: 'cu-1', name: 'Person A', phone: '01987654321', gender: null, age_band: null, flag: 'None', flag_reason: null, status: 'Active' },
            addresses: [{ oid: 'a-1', label: 'Home', recipient_name: 'Person A', recipient_phone: null, address_line: '5/5 Gaznabi Road', district_oid: 'BD-Dhaka', district_name_en: 'Dhaka', district_name_bn: 'ঢাকা', thana_oid: 'T-1', thana_name_en: 'Mohammadpur', thana_name_bn: 'মোহাম্মদপুর', area_text: null, postal_code: null, is_default: true }],
            history: { orders: 5, sales: 4, lifetime_value: 9200, average_order: 1840, delivered: 4, refused_parcels: 1, delivered_rate: 80, last_order_on: '2026-09-28T10:00:00.000', owed: 0, cancelled_fake_or_unreachable: 0 },
            last_orders: [1, 2, 3, 4, 5].map((n) => ({ oid: 'o-' + n, invoice_no: '26092800' + n, channel: 'ONLINE', status: n === 2 ? 'Returned' : 'Delivered', payment_status: 'paid', total_amount: 1200 + n * 150, created_on: '2026-09-2' + n + 'T10:00:00.000', delivery_status: null })),
        });
    if (url.includes('/get-user-card')) return answer(request, { name: 'Ahmad Saif', email: 'ahmad@arithmalabs.test', designation: 'Manager', role: 'Manager', photo: null, active: true });
    console.log('  unmocked API call:', url);
    return answer(request, {});
}

const LANG = process.env.SHOT_LANG === 'bn' ? "localStorage.setItem('app_lang', 'bn'); " : '';
/** SHOT_SEED is more script run before the app starts, such as storage a page restores from. */
const seed = "try { " + LANG + (process.env.SHOT_SEED ?? '') + "localStorage.setItem('__x9f4c2e8a1b7d6f3c0a5e9b2d4f8a11__', JSON.stringify({ transport: 'body', refresh_token: 'refresh-1', session_id: 'session-1', remember: true })); localStorage.setItem('__x7d2a9f4e1c8b3d6a0f5e2c9b7a41__', 'session-1'); } catch (e) {}";

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
            for (const selector of CLICK.split(' && ')) await browser.eval(`document.querySelector(${JSON.stringify(selector)}).click()`);
            await browser.waitFor(process.env.SHOT_AFTER_CLICK ?? '.cdk-overlay-pane');
            if (process.env.SHOT_AFTER_CLICK) await browser.eval(`document.querySelector(${JSON.stringify(process.env.SHOT_AFTER_CLICK)}).scrollIntoView({ block: 'center' })`);
            await new Promise((resolve) => setTimeout(resolve, 600));
        }
        await browser.screenshot(join(OUT, label + '.png'));
        console.log(label.padEnd(8), await browser.eval(PROBE));
        if (process.env.SHOT_EVAL) console.log(label.padEnd(8), await browser.eval(process.env.SHOT_EVAL));
    }

    if (browser.errors.length) console.log('\nconsole errors:', browser.errors);
} finally {
    await browser.close();
    server.close();
}

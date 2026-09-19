import { MenuItem } from '@app/core/models/session.model';

const onRoute = (route: string, path: string) => path === route || path.startsWith(`${route}/`);

/**
 * The menu items from the top down to the page being shown: Sales and orders, then Orders. A
 * record page under /app/sales/orders/42 resolves to the Orders path, so its breadcrumb still
 * reads from the menu. The longest matching route wins, so a feature nested under another's URL is
 * not mistaken for its parent.
 */
export const findMenuPath = (menu: readonly MenuItem[], url: string): MenuItem[] => {
    const path = url.split(/[?#]/)[0];
    let best: MenuItem[] = [];

    const walk = (items: readonly MenuItem[], trail: MenuItem[]) => {
        for (const item of items) {
            const next = [...trail, item];
            if (item.route && onRoute(item.route, path) && item.route.length > (best.at(-1)?.route?.length ?? 0)) best = next;
            walk(item.children, next);
        }
    };

    walk(menu, []);
    return best;
};

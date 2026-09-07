import {
    lucideActivity,
    lucideBookOpen,
    lucideBoxes,
    lucideCalendarClock,
    lucideChartLine,
    lucideChevronDown,
    lucideChevronLeft,
    lucideCircleUser,
    lucideFactory,
    lucideFolder,
    lucideFolderTree,
    lucideHistory,
    lucideKeyRound,
    lucideLayers,
    lucideLayoutDashboard,
    lucideListTree,
    lucidePackage,
    lucideReceipt,
    lucideRows3,
    lucideScanBarcode,
    lucideSettings,
    lucideSettings2,
    lucideShieldCheck,
    lucideShoppingCart,
    lucideTag,
    lucideTerminal,
    lucideTrash2,
    lucideTruck,
    lucideUser,
    lucideUsers,
    lucideWarehouse,
} from '@ng-icons/lucide';

/**
 * Every icon the boot payload is allowed to name on a menu row.
 *
 * @ng-icons resolves at build time, so an icon that is not registered renders nothing. The menu
 * arrives from the server, which means the name is not known until runtime and cannot be
 * tree-shaken from the template: this list is what bounds the palette, and it is why an unknown
 * name falls back to `lucideLayers` rather than leaving a hole in the rail.
 *
 * It lives here rather than in one component because both the sider and the search panel paint
 * menu rows. Two copies would drift, and the copy that fell behind would be the one that silently
 * dropped an icon.
 */
export const SHELL_MENU_ICONS = {
    lucideActivity,
    lucideBookOpen,
    lucideBoxes,
    lucideCalendarClock,
    lucideChartLine,
    lucideChevronDown,
    lucideChevronLeft,
    lucideCircleUser,
    lucideFactory,
    lucideFolder,
    lucideFolderTree,
    lucideHistory,
    lucideKeyRound,
    lucideLayers,
    lucideLayoutDashboard,
    lucideListTree,
    lucidePackage,
    lucideReceipt,
    lucideRows3,
    lucideScanBarcode,
    lucideSettings,
    lucideSettings2,
    lucideShieldCheck,
    lucideShoppingCart,
    lucideTag,
    lucideTerminal,
    lucideTrash2,
    lucideTruck,
    lucideUser,
    lucideUsers,
    lucideWarehouse,
};

/** What a menu row falls back to when the payload names an icon this build does not carry. */
export const MENU_ICON_FALLBACK = 'lucideLayers';

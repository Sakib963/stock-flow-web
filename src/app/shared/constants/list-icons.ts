import {
    lucideArchive,
    lucideBadgeCheck,
    lucideBan,
    lucideBanknote,
    lucideCheck,
    lucideCircleAlert,
    lucideCircleDashed,
    lucideCircleX,
    lucideClock,
    lucideDownload,
    lucideEye,
    lucideFilePen,
    lucideFolderTree,
    lucideInbox,
    lucidePackage,
    lucidePencil,
    lucidePlus,
    lucidePrinter,
    lucideReceipt,
    lucideSearchX,
    lucideStore,
    lucideTrash2,
    lucideTruck,
    lucideUndo2,
    lucideWifiOff,
    lucideLock,
} from '@ng-icons/lucide';

/**
 * Every icon a component config may name: status tags, actions, empty states, stats.
 *
 * A config names an icon by string, so it cannot be tree-shaken from a template, and an icon that
 * is not registered renders nothing. This list bounds the palette. Add the icon here in the same
 * change as the config that first names it; `isListIcon` lets a spec or a component check a name.
 */
export const LIST_ICONS = {
    lucideArchive,
    lucideBadgeCheck,
    lucideBan,
    lucideBanknote,
    lucideCheck,
    lucideCircleAlert,
    lucideCircleDashed,
    lucideCircleX,
    lucideClock,
    lucideDownload,
    lucideEye,
    lucideFilePen,
    lucideFolderTree,
    lucideInbox,
    lucideLock,
    lucidePackage,
    lucidePencil,
    lucidePlus,
    lucidePrinter,
    lucideReceipt,
    lucideSearchX,
    lucideStore,
    lucideTrash2,
    lucideTruck,
    lucideUndo2,
    lucideWifiOff,
};

export const isListIcon = (name: string | null | undefined): name is keyof typeof LIST_ICONS => !!name && name in LIST_ICONS;

/**
 * The shape of the boot payload from `GET /api/v1/auth/get-user-info`.
 *
 * Types live here rather than beside the service that fetches them, because a payload is consumed
 * by guards, the shell, search and every feature page. Putting them in the service would mean
 * importing a service to describe a shape.
 */

/** Copy that arrives from the database in both languages, rather than through i18n keys. */
export interface Localised {
    en: string;
    bn: string;
}

export interface LocalisedNullable {
    en: string | null;
    bn: string | null;
}

export interface MenuItem {
    /** Stable slug, not a UUID, so stored preferences and log lines stay readable. */
    id: string;
    label: Localised;
    description: LocalisedNullable;
    /** Synonyms in both languages, so "refund", "ফেরত" and "godown" all find their feature. */
    tags: string[];
    icon: string | null;
    order: number;
    /** null marks a group header rather than a link. */
    route: string | null;
    /** Sent even though the server already filtered, so a route guard can derive what a URL needs. */
    permission: string | null;
    /** Present but not usable, and says why. Distinct from absent, which means no permission. */
    isDisabled: boolean;
    disabledMessage: LocalisedNullable;
    isNew: boolean;
    children: MenuItem[];
}

export interface SessionUser {
    name: string;
    email: string;
    mobile_number: string | null;
    photo: string | null;
    designation: string | null;
    role: string | null;
}

export interface SessionBusiness {
    name: string | null;
    logoUrl: string | null;
    orderSystem: string;
}

export interface SessionCounters {
    notifications: number;
}

export interface SessionPayload {
    /** Changes when anything the shell renders changes. Drives the ETag. */
    version: string;
    user: SessionUser;
    business: SessionBusiness;
    /** Flat codes. `can()` runs constantly, so the service holds these as a Set. */
    permissions: string[];
    menu: MenuItem[];
    counters: SessionCounters;
}

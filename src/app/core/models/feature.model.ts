export const FEATURE_STATES = ['On', 'Disabled', 'Hidden'] as const;
export type FeatureState = (typeof FEATURE_STATES)[number];
export type FeatureKind = 'Module' | 'Feature';

/** A module or feature of the registry: a menu entry. `state` includes its module's; `own_state` is its own. */
export interface Feature {
    oid: string;
    slug: string;
    label: string;
    label_bn: string;
    description_en: string | null;
    description_bn: string | null;
    tags: string[];
    icon: string | null;
    route: string | null;
    permission_code: string | null;
    is_new: boolean;
    is_disabled: boolean;
    disabled_message_en: string | null;
    disabled_message_bn: string | null;
    kind: FeatureKind;
    state: FeatureState;
    own_state: FeatureState;
    /** The System module and its pages, which are always on. */
    locked: boolean;
    module_oid: string | null;
    module_label: string | null;
    module_label_bn: string | null;
    module_reason_en: string | null;
    module_reason_bn: string | null;
    created_on: string;
    last_action_on: string;
    last_action_by: string;
    last_action_by_name: string | null;
}

export interface FeatureAction {
    code: string;
    action: string;
    roles: string[];
}

export interface FeatureActivity {
    oid: string;
    date: string;
    user: string;
    action: string;
    description: string | null;
}

export interface FeatureDetails {
    details: Feature;
    actions: FeatureAction[];
    /** A module's features. */
    features: { oid: string; label: string; label_bn: string; route: string | null; state: FeatureState }[];
    activity: FeatureActivity[];
}

export interface FeaturePayload {
    oid: string;
    label: string;
    label_bn: string;
    description_en: string | null;
    description_bn: string | null;
    tags: string[];
    is_new: boolean;
}

export interface FeatureSwitch {
    oid: string;
    state: FeatureState;
    reason_en?: string;
    reason_bn?: string;
}

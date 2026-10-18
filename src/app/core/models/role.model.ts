import { FeatureState } from '@app/core/models/feature.model';

export type RoleStatus = 'Active' | 'Inactive';

export interface Role {
    oid: string;
    name: string;
    description: string | null;
    scope: 'system' | 'business';
    is_system: boolean;
    status: RoleStatus;
    /** The role's last change, sent back with a save so one made against an older role is refused. */
    version: string;
    editable: boolean;
    created_on: string;
    last_action_on: string;
    last_action_by: string;
    last_action_by_name: string | null;
}

export interface RoleHolder {
    oid: string;
    name: string;
    email: string;
    status: string;
}

export interface RoleDetails {
    details: Role;
    codes: string[];
    holders: RoleHolder[];
    activity: { oid: string; date: string; user: string; action: string; description: string | null }[];
}

export interface GrantFeature {
    oid: string;
    parent_oid: string | null;
    slug: string;
    label: string;
    label_bn: string;
    permission_code: string | null;
    state: FeatureState;
}

export interface GrantAction {
    code: string;
    module: string;
    feature: string;
    action: string;
    label: string;
    label_bn: string | null;
    is_sensitive: boolean;
    /** Vendor work: never on a business role. */
    restricted?: boolean;
}

export interface GrantTree {
    features: GrantFeature[];
    actions: GrantAction[];
}

export interface RolePayload {
    oid?: string;
    version?: string;
    name: string;
    description: string | null;
    codes: string[];
}

export interface RoleSaved {
    changed: boolean;
    added?: string[];
    removed?: string[];
    holders?: number;
}

import { GrantTree } from '@app/core/models/role.model';

export type UserStatus = 'Active' | 'Inactive' | 'Deleted';

export interface User {
    oid: string;
    name: string;
    email: string;
    mobile_number: string | null;
    designation: string | null;
    photo: string | null;
    status: UserStatus;
    must_change_password: boolean;
    role_oid: string | null;
    role_name: string | null;
    role_status?: string | null;
    is_owner?: boolean;
    /** The person's last change, sent back with a save so one made against an older record is refused. */
    version?: string;
    last_sign_in_on: string | null;
    created_on?: string;
    last_action_on?: string;
    last_action_by?: string;
    last_action_by_name?: string | null;
    /** The person looking is this person. */
    self?: boolean;
    /** Every action of this person's role is one the caller holds, so the caller may change them. */
    within_reach?: boolean;
    last_owner?: boolean;
}

export interface UserSession {
    id: string;
    device: { browser: string | null; os: string | null; type: 'desktop' | 'phone' | 'tablet' };
    ip_address: string | null;
    signed_in_on: string;
    last_used_on: string;
}

export interface UserDetails {
    details: User;
    access: GrantTree;
    sessions: UserSession[];
    activity: { oid: string; date: string; user: string; action: string; description: string | null }[];
}

export interface AssignableRole {
    oid: string;
    name: string;
    description: string | null;
    holders: number;
    sensitive: { code: string; action: string; label: string; label_bn: string | null }[];
}

export interface UserPayload {
    oid?: string;
    version?: string;
    name: string;
    email?: string;
    mobile_number: string;
    designation: string | null;
    photo: string | null;
    role_oid: string;
    password?: string;
}

export type UserField = 'email' | 'mobile_number' | 'role_oid';

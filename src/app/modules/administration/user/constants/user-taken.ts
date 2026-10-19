import { UserField } from '@app/core/models/user.model';

export const USER_TAKEN: Record<UserField, string> = {
    email: 'administration.user.emailTaken',
    mobile_number: 'administration.user.phoneTaken',
    role_oid: 'administration.user.roleRefused',
};

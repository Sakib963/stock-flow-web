/** Every route under Campaigns, in one place, so a page and the list config cannot disagree. */
export const CAMPAIGN_ROUTES = {
    list: '/app/marketing/campaigns',
    create: '/app/marketing/campaigns/new',
    detailPattern: '/app/marketing/campaigns/:oid',
    editPattern: '/app/marketing/campaigns/:oid/edit',
    detail: (oid: string) => `/app/marketing/campaigns/${oid}`,
    edit: (oid: string) => `/app/marketing/campaigns/${oid}/edit`,
} as const;

import { Routes } from '@angular/router';
import { firstChildGuard } from '@app/core/guards/first-child/first-child.guard';
import { permissionGuard } from '@app/core/guards/permission/permission.guard';
import { unsavedChangesGuard } from '@app/core/guards/unsaved-changes/unsaved-changes.guard';
import { CAMPAIGN_LIST } from '@app/modules/marketing/campaign/config/campaign-list.config';
import { PARTNER_LIST } from '@app/modules/marketing/partner/config/partner-list.config';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';

/** Everything under /app/marketing. Each URL is the route of its menu item. */
export const MARKETING_ROUTES: Routes = [
    {
        path: '',
        providers: [...OVERLAY_PROVIDERS],
        children: [
            { path: '', pathMatch: 'full', canActivate: [firstChildGuard], children: [] },
            {
                path: 'partners',
                canActivate: [permissionGuard],
                data: { permission: PARTNER_LIST.permission },
                loadComponent: () => import('./partner/pages/partner-list/partner-list.component').then((m) => m.PartnerListComponent),
            },
            {
                path: 'partners/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'marketing.partner.create' },
                loadComponent: () => import('./partner/pages/partner-create/partner-create.component').then((m) => m.PartnerCreateComponent),
            },
            {
                path: 'partners/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'marketing.partner.edit' },
                loadComponent: () => import('./partner/pages/partner-edit/partner-edit.component').then((m) => m.PartnerEditComponent),
            },
            {
                path: 'partners/:oid',
                canActivate: [permissionGuard],
                data: { permission: PARTNER_LIST.permission },
                loadComponent: () => import('./partner/pages/partner-detail/partner-detail.component').then((m) => m.PartnerDetailComponent),
            },
            {
                path: 'campaigns',
                canActivate: [permissionGuard],
                data: { permission: CAMPAIGN_LIST.permission },
                loadComponent: () => import('./campaign/pages/campaign-list/campaign-list.component').then((m) => m.CampaignListComponent),
            },
            {
                path: 'campaigns/new',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'marketing.campaign.create' },
                loadComponent: () => import('./campaign/pages/campaign-create/campaign-create.component').then((m) => m.CampaignCreateComponent),
            },
            {
                path: 'campaigns/:oid/edit',
                canActivate: [permissionGuard],
                canDeactivate: [unsavedChangesGuard],
                data: { permission: 'marketing.campaign.edit' },
                loadComponent: () => import('./campaign/pages/campaign-edit/campaign-edit.component').then((m) => m.CampaignEditComponent),
            },
            {
                path: 'campaigns/:oid',
                canActivate: [permissionGuard],
                data: { permission: CAMPAIGN_LIST.permission },
                loadComponent: () => import('./campaign/pages/campaign-detail/campaign-detail.component').then((m) => m.CampaignDetailComponent),
            },
            {
                path: 'analytics',
                canActivate: [permissionGuard],
                data: { permission: 'marketing.analytics.view' },
                loadComponent: () => import('./analytics/pages/marketing-analytics/marketing-analytics.component').then((m) => m.MarketingAnalyticsComponent),
            },
        ],
    },
];

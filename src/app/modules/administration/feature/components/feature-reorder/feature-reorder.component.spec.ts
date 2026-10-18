import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { NzFormatBeforeDropEvent, NzTreeNode } from 'ng-zorro-antd/tree';
import { provideTranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { FeatureTree } from '@app/core/models/feature.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { FeatureReorderComponent } from './feature-reorder.component';

const entry = (oid: string, label: string, parent: string | null) => ({ oid, parent_oid: parent, slug: oid, label, label_bn: label, route: parent ? `/app/${oid}` : null, permission_code: parent ? `${parent}.${oid}.view` : null, kind: parent ? ('Feature' as const) : ('Module' as const), state: 'On' as const });
const TREE: FeatureTree = { features: [entry('sales', 'Sales', null), entry('orders', 'Orders', 'sales'), entry('returns', 'Returns', 'sales'), entry('inventory', 'Inventory', null), entry('po', 'Purchase orders', 'inventory')], actions: [] };

const open = async () => {
    await TestBed.configureTestingModule({ imports: [FeatureReorderComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS] }).compileComponents();
    const fixture = TestBed.createComponent(FeatureReorderComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne((r) => r.url.endsWith('/get-feature-tree')).flush({ data: TREE });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    return { fixture, http };
};

const node = (key: string, parent: NzTreeNode | null = null) => new NzTreeNode({ key, title: key }, parent);
const drop = (dragNode: NzTreeNode, target: NzTreeNode, pos: number) => ({ dragNode, node: target, pos }) as NzFormatBeforeDropEvent;

describe('FeatureReorderComponent', () => {
    afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => (overlay.innerHTML = '')));

    it('lets a feature move only before or after a sibling in its own module', async () => {
        const { fixture } = await open();
        const sales = node('sales');
        const inventory = node('inventory');
        const orders = node('orders', sales);
        const returns = node('returns', sales);
        const po = node('po', inventory);
        const allowed = (event: NzFormatBeforeDropEvent) => firstValueFrom(fixture.componentInstance.sameLevel(event));
        expect(await allowed(drop(returns, orders, -1))).toBe(true);
        expect(await allowed(drop(returns, po, 1))).toBe(false);
        expect(await allowed(drop(returns, orders, 0))).toBe(false);
        expect(await allowed(drop(inventory, sales, -1))).toBe(true);
        expect(await allowed(drop(orders, inventory, 1))).toBe(false);
    });

    it('sends nothing when nothing moved', async () => {
        const { fixture, http } = await open();
        fixture.componentInstance.save();
        http.expectNone((r) => r.url.endsWith('/reorder-features'));
    });
});

import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { FeatureTree } from '@app/core/models/feature.model';
import { FeatureTreeComponent } from './feature-tree.component';

const entry = (oid: string, slug: string, label: string, parent: string | null, code: string | null) => ({ oid, parent_oid: parent, slug, label, label_bn: label, route: code ? `/app/${slug}` : null, permission_code: code, kind: code ? ('Feature' as const) : ('Module' as const), state: 'On' as const });
const action = (code: string, label: string) => {
    const [module, feature, verb] = code.split('.');
    return { code, module, feature, action: verb, label };
};
const TREE: FeatureTree = {
    features: [entry('dash', 'dashboard', 'Dashboard', null, 'dashboard.overview.view'), entry('inv', 'inventory', 'Inventory', null, null), entry('po', 'inventory-po', 'Purchase orders', 'inv', 'inventory.purchase-order.view')],
    actions: [action('dashboard.overview.view', 'Dashboard'), action('inventory.purchase-order.view', 'Purchase orders'), action('inventory.purchase-order.approve', 'Purchase orders'), action('inventory.stock-value.view', 'Stock value')],
};

const open = async () => {
    await TestBed.configureTestingModule({ imports: [FeatureTreeComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    const fixture = TestBed.createComponent(FeatureTreeComponent);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    TestBed.inject(HttpTestingController)
        .expectOne((r) => r.url.endsWith('/get-feature-tree'))
        .flush({ data: TREE });
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    return fixture;
};

describe('FeatureTreeComponent', () => {
    afterEach(() => document.querySelectorAll('.cdk-overlay-container').forEach((overlay) => (overlay.innerHTML = '')));

    it('hangs each feature under its module and each action under its feature, with no buttons', async () => {
        await open();
        const tree = document.querySelector('[data-registry="tree"]')!;
        const order = [...tree.querySelectorAll('[data-node], [data-action]')].map((n) => n.getAttribute('data-node') ?? n.getAttribute('data-action'));
        expect(order).toEqual(['dash', 'dashboard.overview.view', 'inv', 'po', 'inventory.purchase-order.view', 'inventory.purchase-order.approve', 'inventory.stock-value', 'inventory.stock-value.view']);
        expect(tree.querySelector('button')).toBeNull();
    });
});

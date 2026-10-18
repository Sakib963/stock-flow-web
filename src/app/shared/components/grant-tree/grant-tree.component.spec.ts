import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { GrantTree } from '@app/core/models/role.model';
import { GrantTreeComponent } from './grant-tree.component';

const entry = (oid: string, slug: string, label: string, parent: string | null, code: string | null) => ({ oid, parent_oid: parent, slug, label, label_bn: label, permission_code: code, state: 'On' as const });
const action = (code: string, label: string, is_sensitive = false) => {
    const [module, feature, verb] = code.split('.');
    return { code, module, feature, action: verb, label, label_bn: label, is_sensitive };
};
const TREE: GrantTree = {
    features: [entry('dash', 'dashboard', 'Dashboard', null, 'dashboard.overview.view'), entry('inv', 'inventory', 'Inventory', null, null), entry('po', 'inventory-po', 'Purchase orders', 'inv', 'inventory.purchase-order.view')],
    actions: [action('dashboard.overview.view', 'Dashboard'), action('inventory.purchase-order.view', 'Purchase orders'), action('inventory.purchase-order.approve', 'Purchase orders'), action('inventory.stock-value.view', 'Stock value', true)],
};

const render = async (inputs: Record<string, unknown> = {}) => {
    await TestBed.configureTestingModule({ imports: [GrantTreeComponent], providers: [provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' })] }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('en', { access: { action: { view: 'View', approve: 'Approve' }, sensitive: 'Sensitive' } });
    TestBed.inject(TranslateService).use('en');
    const fixture = TestBed.createComponent(GrantTreeComponent);
    fixture.componentRef.setInput('tree', TREE);
    for (const [key, value] of Object.entries(inputs)) fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
    return fixture;
};

const text = (el: HTMLElement) => [...el.querySelectorAll('[data-node]')].map((n) => n.querySelector('span')!.textContent!.trim());
const checkbox = (el: HTMLElement, key: string) => el.querySelector(`[data-node="${key}"]`)!.closest('nz-tree-node, .ant-tree-treenode')!.querySelector('.ant-tree-checkbox') as HTMLElement;

describe('GrantTreeComponent', () => {
    it('names actions by their verb, never by their code, and a View-only feature by its own name', async () => {
        const fixture = await render();
        const shown = text(fixture.nativeElement);
        expect(shown).toEqual(['Dashboard', 'Inventory', 'Purchase orders', 'View', 'Approve', 'Stock value']);
        expect(fixture.nativeElement.textContent).not.toContain('inventory.purchase-order');
    });

    it('tags a sensitive action', async () => {
        const fixture = await render();
        const tagged = fixture.nativeElement.querySelector('[data-node="inventory.stock-value.view"] [data-tag="sensitive"]');
        expect(tagged).not.toBeNull();
    });

    it('ticks View along with any other action of the feature', async () => {
        const fixture = await render({ checkable: true });
        checkbox(fixture.nativeElement, 'inventory.purchase-order.approve').click();
        fixture.detectChanges();
        expect(fixture.componentInstance.checked().sort()).toEqual(['inventory.purchase-order.approve', 'inventory.purchase-order.view']);
    });

    it('ticks an action when its label is clicked, not only its checkbox', async () => {
        const fixture = await render({ checkable: true });
        (fixture.nativeElement.querySelector('[data-node="inventory.purchase-order.approve"]') as HTMLElement).click();
        fixture.detectChanges();
        expect(fixture.componentInstance.checked().sort()).toEqual(['inventory.purchase-order.approve', 'inventory.purchase-order.view']);
    });

    it('clears the whole feature when View is cleared', async () => {
        const fixture = await render({ checkable: true, checked: ['inventory.purchase-order.view', 'inventory.purchase-order.approve', 'dashboard.overview.view'] });
        checkbox(fixture.nativeElement, 'inventory.purchase-order.view').click();
        fixture.detectChanges();
        expect(fixture.componentInstance.checked()).toEqual(['dashboard.overview.view']);
    });

    it('leaves out what it is told to keep out, and any module left empty', async () => {
        const fixture = await render({ keep: (a: { code: string }) => a.code === 'dashboard.overview.view' });
        expect(text(fixture.nativeElement)).toEqual(['Dashboard']);
    });
});

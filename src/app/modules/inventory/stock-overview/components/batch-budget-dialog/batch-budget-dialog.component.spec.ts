import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideNzI18n, en_US } from 'ng-zorro-antd/i18n';
import { provideTranslateService } from '@ngx-translate/core';
import { StockBatch } from '@app/core/models/stock-overview.model';
import { OVERLAY_PROVIDERS } from '@app/shared/constants/overlay-providers';
import { BatchBudgetDialogComponent } from './batch-budget-dialog.component';

describe('BatchBudgetDialogComponent', () => {
    it('fills in the saved budgets when the server sends them as text, and knows they are unchanged', async () => {
        await TestBed.configureTestingModule({
            imports: [BatchBudgetDialogComponent],
            providers: [provideHttpClient(), provideHttpClientTesting(), provideNzI18n(en_US), provideTranslateService({ fallbackLang: 'en' }), ...OVERLAY_PROVIDERS],
        }).compileComponents();
        const fixture = TestBed.createComponent(BatchBudgetDialogComponent);
        const batch = { oid: 'i-1', batch_code: 'B-NXD9-0ZGX', purchase_oid: 'po-1', ad_run_cost: null, packaging_cost: '20.00', gift_cost: '5.50', content_creation_cost: null, influencer_cost: null, cost_remarks: null } as unknown as StockBatch;
        fixture.componentRef.setInput('batch', batch);
        fixture.detectChanges();
        const dialog = fixture.componentInstance;
        expect(dialog.form.getRawValue()).toEqual({ ad_run_cost: null, packaging_cost: 20, gift_cost: 5.5, content_creation_cost: null, influencer_cost: null, cost_remarks: '' });
        expect(dialog.perUnit()).toBe(25.5);
        const closed: boolean[] = [];
        dialog.closed.subscribe(() => closed.push(true));
        dialog.review();
        expect(closed).toEqual([true]);
    });
});

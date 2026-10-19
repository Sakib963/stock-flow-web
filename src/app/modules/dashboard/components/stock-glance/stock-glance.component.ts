import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideBanknote, lucideBoxes, lucideCoins, lucideTrendingUp } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { TranslatePipe } from '@ngx-translate/core';
import { StockGlance } from '@app/core/models/dashboard.model';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { MoneyPipe } from '@app/shared/pipes/money/money.pipe';

@Component({
    selector: 'stock-glance',
    imports: [RouterLink, NgIcon, NzButtonModule, NzCardModule, TranslatePipe, DigitsPipe, MoneyPipe],
    providers: [provideIcons({ lucideArrowRight, lucideBanknote, lucideBoxes, lucideCoins, lucideTrendingUp })],
    templateUrl: './stock-glance.component.html',
    styleUrl: './stock-glance.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StockGlanceComponent {
    readonly data = input.required<StockGlance>();

    readonly figures = [
        { key: 'stock_value', icon: 'lucideBanknote' },
        { key: 'expected_revenue', icon: 'lucideTrendingUp' },
        { key: 'profit_full', icon: 'lucideCoins' },
    ] as const;
}

import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'currencyFormat',
    standalone: true,
})
export class CurrencyFormatPipe implements PipeTransform {
    private readonly CURRENCY_SYMBOL_MAP: Record<string, string> = {
        BDT: '৳',
        USD: '$',
        SGD: '$',
    };

    transform(value: any, currency: string = 'BDT', locale: string = 'en-BD', maximumFractionDigits: number = 2, minimumFractionDigits: number = 2): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        const numericValue = Number(value);
        if (isNaN(numericValue)) {
            return String(value);
        }

        const symbol = this.CURRENCY_SYMBOL_MAP[currency] || currency;

        return `${symbol} ${new Intl.NumberFormat(locale, { maximumFractionDigits, minimumFractionDigits }).format(numericValue)}`;
    }
}

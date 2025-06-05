import { Pipe, PipeTransform } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'smartTranslate',
  standalone: true,
  pure: false,
})
export class SmartTranslatePipe implements PipeTransform {
  constructor(private translate: TranslateService) {}

  transform(value: string): string {
    const translated = this.translate.instant(value);
    return translated === value ? value : translated;
  }
}

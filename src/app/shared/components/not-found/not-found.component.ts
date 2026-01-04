import { Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
  selector: 'app-not-found',
  imports: [CommonModule, NgZorroCustomModule, TranslateModule, RouterLink],
  templateUrl: './not-found.component.html',
  styleUrls: ['./not-found.component.scss'],
})
export class NotFoundComponent {
  _title = input<string>('', { alias: 'title' });
  _subTitle = input<string>('', { alias: 'subTitle' });
  routeTo = input<string | any[]>('/');
  redirectButtonLabel = input<string>('Go to Home');

  readonly refresh = output<void>();

  readonly DEFAULT_TITLE = 'Not Found';
  readonly DEFAULT_SUBTITLE = 'The requested resource could not be found.';

  title = computed(() => {
    return this._title() ? this._title() : this.DEFAULT_TITLE;
  });

  subTitle = computed(() => {
    return this._subTitle() ? this._subTitle() : this.DEFAULT_SUBTITLE;
  });

  onRefresh(): void {
    this.refresh.emit();
  }
}

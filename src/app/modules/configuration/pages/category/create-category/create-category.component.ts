import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';

@Component({
  selector: 'create-category',
  imports: [PageHeaderComponent, NgZorroCustomModule],
  templateUrl: './create-category.component.html',
  styleUrl: './create-category.component.scss',
})
export class CreateCategoryComponent {
  private readonly _location = inject(Location);

  goBack(): void {
    this._location.back();
  }
}

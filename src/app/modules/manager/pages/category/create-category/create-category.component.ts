import { Component, DestroyRef } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { CategoryFormComponent } from '@app/modules/manager/components/category/category-form/category-form.component';

@Component({
  selector: 'app-create-category',
  standalone: true,
  imports: [CommonModule, CategoryFormComponent],
  templateUrl: './create-category.component.html',
  styleUrls: ['./create-category.component.scss']
})
export class CreateCategoryComponent {
  loading: boolean = false;

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _location: Location,
    private _notificationService: NzNotificationService
  ) {}

  handleActions(event: any): any {
    if (event.action === 'submit') {
      this.handleCreateCategory(event.value);
    } else if (event.action === 'back') {
      this._location.back();
    }
  }

  handleCreateCategory(payload: any): any {
    this.loading = true;
    console.log(payload);
    
    this._httpService
      .post(APIEndpoint.CREATE_CATEGORY, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          this._notificationService.success("Success!", res?.body?.message)
          this._location.back();
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error("Error!", err?.error?.message)
        },
      });
  }

}

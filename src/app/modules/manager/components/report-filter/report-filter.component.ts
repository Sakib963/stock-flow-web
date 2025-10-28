import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { HttpService } from '@app/core/services/http.service';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { finalize } from 'rxjs';

@Component({
  selector: 'report-filter',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgZorroCustomModule,
    TranslateModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './report-filter.component.html',
  styleUrl: './report-filter.component.scss',
})
export class ReportFilterComponent implements OnInit {
  @Input() filters: string[] = [];
  @Input() isLoading: boolean = false;
  @Output() readonly actionEmitter: EventEmitter<any> = new EventEmitter();
  form: FormGroup = this._fb.group({});

  warehouses: any[] = [];
  filteredWarehouses: any[] = [];
  suppliers: any[] = [];
  filteredSuppliers: any[] = [];
  products: any[] = [];
  filteredProducts: any[] = [];
  categories: any[] = [];
  filteredCategories: any[] = [];
  subcategories: any[] = [];
  filteredSubcategories: any[] = [];

  constructor(
    private _fb: FormBuilder,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _translateService: TranslateService
  ) {}

  ngOnInit(): void {
    this.buildForm();

    if (this.filters.includes('warehouse_oid')) {
      this.loadWarehouse();
    }

    if (this.filters.includes('supplier_oid')) {
      this.loadSuppliers();
    }

    if (this.filters.includes('product_oid')) {
      this.loadProducts();
    }

    if (this.filters.includes('category_oid')) {
      this.loadCategories();
    }

    if (this.filters.includes('sub_category_oid')) {
      if (this.filters.includes('category_oid')) {
        this.form.controls['category_oid'].valueChanges.subscribe((value) => {
          if (value) {
            this.loadSubCategories(value);
          } else {
            this.subcategories = [];
            this.filteredSubcategories = [];
          }
        });
      }
    }
  }

  hasFormControls(): boolean {
    return this.form && Object.keys(this.form.controls).length > 0;
  }

  buildForm(): void {
    this.filters.forEach((key) => {
      this.form.addControl(key, this._fb.control(null)); // optional (no validator)
    });
  }

  onSubmit(): void {
    this.actionEmitter.emit({ action: 'submit', value: this.form.value });
  }

  handleCancel(): void {
    // emit action to parent component if needed
    this.actionEmitter.emit({ action: 'cancel', value: null });
  }

  clearAllocatedTo(): void {
    this.form.get('allocated_to')?.reset(null);
  }

  loadWarehouse(): any {
    this._httpService
      .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.warehouses = [];
            if (res.body?.data?.length) {
              this.warehouses = res.body.data;
              this.filteredWarehouses = res.body.data;
            } else {
              this.warehouses = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadSuppliers(): any {
    this._httpService
      .get(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.suppliers = [];
            if (res.body?.data?.length) {
              this.suppliers = res.body.data;
              this.filteredSuppliers = res.body.data;
            } else {
              this.suppliers = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadProducts(): any {
    this._httpService
      .get(APIEndpoint.GET_PRODUCT_LIST_FOR_DROPDOWN)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.products = [];
            if (res.body?.data?.length) {
              this.products = res.body.data;
              this.filteredProducts = res.body.data;
            } else {
              this.products = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadCategories(): any {
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.categories = [];
            if (res.body?.data?.length) {
              this.categories = res.body.data;
              this.filteredCategories = res.body.data;
            } else {
              this.categories = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadSubCategories(category_oid: any): any {
    this._httpService
      .get(
        APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN +
          `?category_oid=${category_oid}`
      )
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.subcategories = [];
            if (res.body?.data?.length) {
              this.subcategories = res.body.data;
              this.filteredSubcategories = res.body.data;
            } else {
              this.subcategories = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  filterList(event: any, type: string): void {
    switch (type) {
      case 'warehouse':
        this.filteredWarehouses = !event
          ? this.warehouses
          : this.warehouses.filter((item) =>
              item?.label?.toLowerCase().match(event)
            );
        break;
      case 'supplier':
        this.filteredSuppliers = !event
          ? this.suppliers
          : this.suppliers.filter((item) =>
              item?.label?.toLowerCase().match(event)
            );
        break;
      case 'product':
        this.filteredProducts = !event
          ? this.products
          : this.products.filter((item) =>
              item?.label?.toLowerCase().match(event)
            );
        break;
    }
  }
}

import { Component, DestroyRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NZ_MODAL_DATA, NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { HttpService } from '@app/core/services/http.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import {
  checkRequiredValidator,
  markFormGroupTouched,
} from '@app/core/constants/helper';
import { SingleItemCardComponent } from '../single-item-card/single-item-card.component';

export interface ModalData {
  formData: any;
  productsList: any[];
}

@Component({
  selector: 'app-single-item-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    NgZorroCustomModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './single-item-modal.component.html',
  styleUrls: ['./single-item-modal.component.scss'],
})
export class SingleItemModalComponent {
  form!: FormGroup;
  loading: boolean = false;

  productList: any[] = [];
  warehouseList: any[] = [];
  aisleList: any[] = [];

  constructor(
    @Inject(NZ_MODAL_DATA) public modalData: ModalData,
    private _modalRef: NzModalRef,
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();

    this.loadProductList();
    this.loadWarehouseList();

    if (this.modalData?.formData) {
      if (this.modalData?.formData.aisle_oid) {
        this.loadAisleList(this.modalData?.formData.warehouse_oid);
      }
      this.form.patchValue(this.modalData.formData);
    }

    this.form.controls['warehouse_oid'].valueChanges.subscribe((value: any) => {
      this.form.controls['aisle_oid'].setValue(null);
      if (value) {
        this.loadAisleList(value);
        const selectedWarehouse = this.warehouseList.find(
          (item) => item.value === value
        );
        this.form.controls['warehouse_name'].setValue(
          selectedWarehouse?.label || null
        );
      } else {
        this.aisleList = [];
      }
    });

    this.form.controls['product_oid'].valueChanges.subscribe((value: any) => {
      const selectedProduct = this.productList.find(
        (item) => item.value === value
      );
      this.form.controls['product_name'].setValue(
        selectedProduct?.label || null
      );
    });

    this.form.controls['aisle_oid'].valueChanges.subscribe((value: any) => {
      const selectedAisle = this.aisleList.find((item) => item.value === value);
      this.form.controls['aisle_name'].setValue(selectedAisle?.label || null);
    });

    this.handleUnitPriceChange();
  }

  handleUnitPriceChange(): void {
    const quantityControl = this.form.get('quantity');
    const unitPriceControl = this.form.get('unit_price');
    const totalPriceControl = this.form.get('total_price');
    quantityControl?.valueChanges.subscribe((value: any) => {
      if (value && unitPriceControl?.value) {
        totalPriceControl?.setValue(value * unitPriceControl?.value);
      }
    });

    unitPriceControl?.valueChanges.subscribe((value: any) => {
      if (value && quantityControl?.value) {
        totalPriceControl?.setValue(value * quantityControl?.value);
      }
    });
  }

  checkDisabledStatus(value: any): boolean {
    return this.modalData.productsList.find(
      (item) => item.product_oid === value
    );
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      product_oid: [null, [Validators.required]],
      product_name: [null, [Validators.required]],
      warehouse_oid: [null, [Validators.required]],
      warehouse_name: [null, [Validators.required]],
      aisle_oid: [null],
      aisle_name: [null],
      quantity: [null, [Validators.required]],
      unit_price: [null, [Validators.required]],
      total_price: [null, [Validators.required]],
    });
  }

  handleForm(): void {
    if (this.form.valid) {
      this._modalRef.destroy(this.form.value);
    } else {
      markFormGroupTouched(this.form);
    }
  }

  closeModal(): void {
    this._modalRef.destroy();
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  loadProductList(): void {
    this.loading = true;
    this._httpService.get(APIEndpoint.GET_PRODUCT_LIST_FOR_DROPDOWN).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res.body.code === 200) {
          this.productList = res.body.data;
        }
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadWarehouseList(): void {
    this.loading = true;
    this._httpService
      .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
      .subscribe({
        next: (res: any) => {
          this.loading = false;
          if (res.body.code === 200) {
            this.warehouseList = res.body.data;
          }
        },
        error: () => {
          this.loading = false;
        },
      });
  }

  loadAisleList(warehouse_oid: any): void {
    this._httpService
      .get(APIEndpoint.GET_AISLE_LIST_FOR_DROPDOWN, { warehouse_oid })
      .subscribe({
        next: (res: any) => {
          this.aisleList = [];
          if (res.body.code === 200) {
            this.aisleList = res.body.data;
          }
        },
        error: () => {},
      });
  }
}

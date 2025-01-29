import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { HttpService } from '@app/core/services/http.service';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { AngularSvgIconModule } from 'angular-svg-icon';
import { SingleItemModalComponent } from '../single-item-modal/single-item-modal.component';
import { SingleItemCardComponent } from '../single-item-card/single-item-card.component';

@Component({
  selector: 'app-purchase-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
    AngularSvgIconModule,
    SingleItemCardComponent,
  ],
  templateUrl: './purchase-form.component.html',
  styleUrls: ['./purchase-form.component.scss'],
})
export class PurchaseFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  supplierList: any[] = [];

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
    this.loadSupplierList();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      bill_no: [null, [Validators.required]],
      date_of_purchase: [new Date(), [Validators.required]],
      supplier_oid: [null, [Validators.required]],
      total_amount: [null],
      special_notes: [null],
      status: ['Active', [Validators.required]],
      products: [[]],
    });
  }

  handleConfirm(): void {
    let message = 'Are you sure you want to proceed with this purchase?';
    if (this.formData) {
      message = 'Are you sure you want to save these updates?';
    }
    this._modal.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message,
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () =>
        this.actionEmitter.emit({ action: 'submit', value: this.form.value }),
    });
  }

  handleForm(): void {
    if (this.form.valid) {
      this.handleConfirm();
    } else {
      markFormGroupTouched(this.form);
    }
  }

  goBack(): void {
    this.actionEmitter.emit({ action: 'back', value: this.form.value });
  }

  handleAdd(): void {
    const products = this.form.get('products')?.value || [];
    const modal = this._modal.create({
      nzContent: SingleItemModalComponent,
      nzFooter: null,
      nzClosable: false,
      nzWidth: 800,
      nzData: {
        productsList: products,
      },
    });

    modal.afterClose.subscribe((result) => {
      if (result) {
        const products = this.form.get('products')?.value || [];
        products.push(result);
        this.form.get('products')?.setValue(products);

        this.updateTotalAmount();
      }
    });
  }

  updateTotalAmount(): void {
    const products = this.form.get('products')?.value || [];
    const total = products.reduce(
      (sum: any, product: any) => sum + (product.total_price || 0),
      0
    );
    this.form.get('total_amount')?.setValue(total);
  }

  handleCardActions(event: any, index: number): void {
    if (event.action === 'delete') {
      this.removeProduct(index);
    } else if (event.action === 'edit') {
      this.editProduct(index);
    }
  }

  removeProduct(index: number): void {
    const products = this.form.get('products')?.value || [];
    products.splice(index, 1);
    this.form.get('products')?.setValue(products);

    // Update total amount dynamically
    this.updateTotalAmount();
  }

  getEditStatus():boolean {
    if (this.formData) {
      return true;
    } else {
      return false;
    }
  }

  editProduct(index: number): void {
    const products = this.form.get('products')?.value || [];

    // Open the modal and pass the selected product's data
    const modal = this._modal.create({
      nzContent: SingleItemModalComponent,
      nzFooter: null,
      nzClosable: false,
      nzWidth: 800,
      nzData: {
        formData: products[index],
        productsList: products,
      },
    });

    // Handle the result after the modal closes
    modal.afterClose.subscribe((result) => {
      if (result) {
        const products = this.form.get('products')?.value || [];
        products[index] = result;
        this.form.get('products')?.setValue(products);

        this.updateTotalAmount();
      }
    });
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  loadSupplierList(): void {
    this._httpService
      .get(APIEndpoint.GET_SUPPLIER_LIST_FOR_DROPDOWN)
      .subscribe({
        next: (res: any) => {
          if (res.body.code === 200) {
            this.supplierList = res.body.data;
            console.log(res.body.data);
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }
}

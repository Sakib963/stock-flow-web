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
  FormGroup,
  FormBuilder,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  markFormGroupTouched,
  checkRequiredValidator,
  convertImageToBase64,
} from '@app/core/constants/helper';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { finalize } from 'rxjs';
import { HttpService } from '@app/core/services/http.service';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import { DangerButton } from '@app/shared/components/buttons/danger-button/danger-button.component';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { FileService } from '@app/core/services/file.service';
import { LoaderComponent } from '@app/shared/components/loader/loader.component';
import { DisableForGuestDirective } from '@app/shared/directives/guest-user.directive';

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
    DangerButton,
    LoaderComponent,
    DisableForGuestDirective
  ],
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
})
export class ProductFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  imgLoading: boolean = false;

  categoryList: any = [];
  subCategoryList: any = [];
  productNatureList: any = [];
  unitTypes: any = [];

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _fileService: FileService
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }

    this.loadCategoryList();
    this.productNatureList = DROPDOWN_OPTIONS.PRODUCT_NATURE;
    this.unitTypes = DROPDOWN_OPTIONS.MEASUREMENT_UNITS;

    this.form.controls['category_oid'].valueChanges.subscribe((value: any) => {
      if (value) {
        this.loadSubCategoryList(value);
        this.form.controls['sub_category_oid'].setValue(null);
      }
    });
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      name: [null, [Validators.required]],
      sku: [null],
      category_oid: [null, [Validators.required]],
      sub_category_oid: [null, [Validators.required]],
      unit_type: [null],
      description: [null],
      photo: [null],
      product_nature: [null, [Validators.required]],
      restock_threshold: [null, [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create a product?';
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

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    return control ? checkRequiredValidator(control) : false;
  }

  loadCategoryList(): any {
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_LIST_FOR_DROPDOWN)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.categoryList = [];
            if (res.body?.data?.length) {
              this.categoryList = res.body.data;
            } else {
              this.categoryList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  loadSubCategoryList(category_oid: any): any {
    this._httpService
      .get(APIEndpoint.GET_SUB_CATEGORY_LIST_FOR_DROPDOWN, { category_oid })
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.subCategoryList = [];
            if (res.body?.data?.length) {
              this.subCategoryList = res.body.data;
            } else {
              this.subCategoryList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const maxSizeInBytes = 500 * 1024; // 500 KB
      if (file.size > maxSizeInBytes) {
        this._notificationService.error(
          'Error',
          'File size exceeds 500 KB. Please upload a smaller file.'
        );
        return;
      }

      this.imgLoading = true;
      this._fileService.uploadImage(file).subscribe({
        next: (res: any) => {
          const imageUrl = res.secure_url;
          this.form.controls['photo'].setValue(imageUrl);
          this.imgLoading = false;
        },
        error: (err: any) => {
          this._notificationService.error('Error', 'Failed to upload image');
          console.error('Image upload error:', err);
          this.imgLoading = false;
        },
      });
    }
  }

  removePhoto(): void {
    this.form.controls['photo'].setValue(null);
    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
}

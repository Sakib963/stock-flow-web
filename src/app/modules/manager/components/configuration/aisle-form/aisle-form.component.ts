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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PrimaryButton } from '@app/shared/components/buttons/primary-button/primary-button.component';
import { SecondaryButton } from '@app/shared/components/buttons/secondary-button/secondary-button.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { DROPDOWN_OPTIONS } from '@app/core/constants/dropdown-options';
import {
  markFormGroupTouched,
  checkRequiredValidator,
} from '@app/core/constants/helper';
import { HttpService } from '@app/core/services/http.service';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NzModalService } from 'ng-zorro-antd/modal';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-aisle-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './aisle-form.component.html',
  styleUrls: ['./aisle-form.component.scss'],
})
export class AisleFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;

  imgLoading: boolean = false;

  warehouseList: any = [];
  storageTypes: any = [];

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }

    this.loadWarehouseList();
    this.storageTypes = DROPDOWN_OPTIONS.STORAGE_TYPES;
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      name: [null, [Validators.required]],
      code: [null, [Validators.required]],
      warehouse_oid: [null, [Validators.required]],
      capacity: [null],
      type_of_storage: [null],
      special_notes: [null],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create an aisle/zone?';
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

  loadWarehouseList(): any {
    this._httpService
      .get(APIEndpoint.GET_WAREHOUSE_LIST_FOR_DROPDOWN)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.warehouseList = [];
            if (res.body?.data?.length) {
              this.warehouseList = res.body.data;
            } else {
              this.warehouseList = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
        },
      });
  }
}

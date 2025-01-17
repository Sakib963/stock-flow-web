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
  FormArray,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  markFormGroupTouched,
  checkRequiredValidator,
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

@Component({
  selector: 'app-sub-category-form',
  standalone: true,
  imports: [
    CommonModule,
    NgZorroCustomModule,
    ReactiveFormsModule,
    PrimaryButton,
    SecondaryButton,
  ],
  templateUrl: './sub-category-form.component.html',
  styleUrls: ['./sub-category-form.component.scss'],
})
export class SubCategoryFormComponent implements OnInit {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  @Input() formData: any;
  @Input() loading: boolean = false;
  form!: FormGroup;
  categoryList: any = [];

  constructor(
    private _fb: FormBuilder,
    private _modal: NzModalService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.form = this.createForm();
    this.loadCategoryList();

    if (this.formData) {
      this.form.patchValue(this.formData);
    }
  }

  createForm(): FormGroup {
    return this._fb.group({
      oid: [null],
      category_oid: [null, [Validators.required]],
      name: [null, [Validators.required]],
      description: [null],
      category_code: [null, [Validators.required]],
      status: ['Active', [Validators.required]],
    });
  }

  handleConfirm(): void {
    let message = 'Do you want to create a sub category?';
    if (this.formData) {
      message = 'Do you want to update this sub category?';
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
}

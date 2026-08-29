import { CommonModule, Location } from '@angular/common';
import { Component, computed, inject, input, output, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { markFormGroupTouched } from '@app/core/constants/helper';
import { FormActions } from '@app/core/interfaces/form-action';
import { ConfirmationModalComponent } from '@app/shared/components/confirmation-modal/confirmation-modal.component';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { NzModalService } from 'ng-zorro-antd/modal';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'category-form',
  imports: [CommonModule, NgZorroCustomModule, ReactiveFormsModule],
  templateUrl: './category-form.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './category-form.component.scss',
})
export class CategoryFormComponent {
  category = input<any>(undefined);
  readonly actions = output<FormActions>();
  buttonLoading = input(false);

  private readonly _formBuilder = inject(FormBuilder);
  private readonly _modalService = inject(NzModalService);

  mode = computed(() => {
    return this.category() ? 'edit' : 'create';
  });

  confirmationMessage = computed(() => {
    return this.mode() === 'edit'
      ? 'Are you sure you want to update this category?'
      : 'Are you sure you want to create this category?';
  });

  form = this._formBuilder.nonNullable.group({
    oid: [null],
    name: ['', [Validators.required]],
    category_code: ['', [Validators.required]],
    description: [''],
    status: ['Active', [Validators.required]],
  });

  ngOnInit(): void {
    const category = this.category();
    if (category) {
      this._patchForm(category);
    }
  }

  private _patchForm(category: any): void {
    if (!category) return;

    this.form.patchValue(category);
  }

  onSubmit(): void {
    if (this.form.invalid) {
      markFormGroupTouched(this.form);
      return;
    }

    const formValue = this.form.getRawValue();
    this.showConfirmationModal(formValue);
  }

  showConfirmationModal(payload: any): void {
    this._modalService.create({
      nzContent: ConfirmationModalComponent,
      nzData: {
        message: this.confirmationMessage(),
      },
      nzFooter: null,
      nzClosable: false,
      nzOnOk: () => this.handleForm(payload),
    });
  }

  handleForm(payload: any): void {
    const mode = this.mode();
    if (mode === 'create') {
      this.actions.emit({ action: 'save', data: payload });
    } else {
      this.actions.emit({ action: 'update', data: payload });
    }
  }

  resetForm(): void {
    this.form.reset();
  }

  onCancel(): void {
    this.actions.emit({ action: 'cancel' });
  }

  hasRequiredValidator(controlName: string): boolean {
    const control = this.form.get(controlName);
    if (!control) return false;

    return control.hasValidator(Validators.required);
  }
}

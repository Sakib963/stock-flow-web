import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export function markFormGroupTouched(formGroup: FormGroup | FormArray): void {
  Object.values(formGroup.controls).forEach((control) => {
    if (control.invalid) {
      control.markAsDirty();
      control.updateValueAndValidity({ onlySelf: true });
    }
    if (control instanceof FormGroup) {
      Object.values(control.controls).forEach((c) => {
        if (c.invalid) {
          c.markAsDirty();
          c.updateValueAndValidity({ onlySelf: true });
        }
      });
    }
    if (control instanceof FormArray) {
      Object.values(control.controls).forEach((c) => {
        if (c instanceof FormGroup) {
          Object.values(c.controls).forEach((c) => {
            if (c.invalid) {
              c.markAsDirty();
              c.updateValueAndValidity({ onlySelf: true });
            }
          });
        }
      });
    }
  });
}

export function checkRequiredValidator(control: AbstractControl): boolean {
  if (control.validator) {
    const validator = control.validator({} as AbstractControl);
    return validator && validator['required'];
  }
  return false;
}

// custom validator to check that two fields match
export function MustMatch(controlName: string, matchingControlName: string) {
  return (formGroup: FormGroup) => {
    const control = formGroup.controls[controlName];
    const matchingControl = formGroup.controls[matchingControlName];

    if (matchingControl.errors && !matchingControl.errors['mustMatch']) {
      // return if another validator has already found an error on the matchingControl
      return;
    }

    // set error on matchingControl if validation fails
    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ mustMatch: true });
    } else {
      matchingControl.setErrors(null);
    }
  };
}

export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function convertBase64ToBlob(base64: string): Blob {
  const byteString = atob(base64.split(',')[1]);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }

  return new Blob([uint8Array], { type: 'image/png' }); // Change MIME type as needed
}

/* 
const blob = this.convertBase64ToBlob(base64String);
// You can now use the Blob, e.g., to upload it to a server.

*/

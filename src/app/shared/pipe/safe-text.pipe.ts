/**
 * Safely displays a value by falling back to a default placeholder
 * when the input is null, undefined, or an empty string.
 *
 * Usage in template:
 *   {{ value | safeText }}             // Displays 'value' or '--' if empty
 *   {{ value | safeText:'N/A' }}       // Displays 'value' or 'N/A' if empty
 */
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  standalone: true,
  name: 'safeText',
})
export class SafeTextPipe implements PipeTransform {
  transform(value: any, fallback: string = '--'): string {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value;
  }
}

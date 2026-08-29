import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-spinner',
    imports: [CommonModule],
    templateUrl: './spinner.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./spinner.component.scss']
})
export class SpinnerComponent {

}

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-admin',
    imports: [CommonModule, RouterOutlet],
    templateUrl: './admin.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./admin.component.scss']
})
export class AdminComponent {

}

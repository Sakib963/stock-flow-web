import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-auth',
    imports: [CommonModule, RouterOutlet],
    templateUrl: './auth.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./auth.component.scss']
})
export class AuthComponent {

}

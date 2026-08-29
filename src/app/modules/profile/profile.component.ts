import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'profile',
    imports: [CommonModule, RouterOutlet],
    templateUrl: './profile.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {

}

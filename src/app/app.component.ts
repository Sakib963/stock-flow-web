import { Component, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './modules/auth/services/auth.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'stock-flow';
  constructor(public authService: AuthService) {}
}

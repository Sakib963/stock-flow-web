import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class NavbarComponent {
  @Output() readonly actionEmitter: EventEmitter<object> = new EventEmitter();
  handleLogout() {
    this.actionEmitter.emit({ action: 'logout', value: null });
  }
}

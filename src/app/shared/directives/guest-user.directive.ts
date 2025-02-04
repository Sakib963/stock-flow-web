import {
  Directive,
  ElementRef,
  OnInit,
  Output,
  Renderer2,
} from '@angular/core';
import { AuthService } from '@app/modules/auth/services/auth.service';

@Directive({
  selector: '[disableForGuest]',
  standalone: true,
})
export class DisableForGuestDirective implements OnInit {
  constructor(
    private el: ElementRef,
    private renderer: Renderer2,
    private authService: AuthService
  ) {}

  ngOnInit() {
    if (this.authService.getGuestUserStatus()) {
      this.renderer.setAttribute(this.el.nativeElement, 'disabled', 'true');
    }
  }
}

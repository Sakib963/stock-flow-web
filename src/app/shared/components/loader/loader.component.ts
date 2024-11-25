import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.component.html',
  styleUrls: ['./loader.component.scss'],
})
export class LoaderComponent {
  @Input() isVisible: boolean = false;
  showLoader: boolean = false;

  ngOnInit() {
    if (this.isVisible) {
      this.showLoader = true;
      setTimeout(() => {
        this.showLoader = false;
      }, 500);
    }
  }
}

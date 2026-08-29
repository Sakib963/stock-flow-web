import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-loader',
    imports: [CommonModule],
    templateUrl: './loader.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./loader.component.scss']
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

import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-footer',
    imports: [CommonModule],
    templateUrl: './footer.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./footer.component.scss']
})
export class FooterComponent implements OnInit {
  currentYear: any;
  ngOnInit(): void {
    this.currentYear = new Date().getFullYear();
  }
}

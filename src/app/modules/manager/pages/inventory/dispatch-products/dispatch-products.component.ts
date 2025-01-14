import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComingSoonComponent } from '@app/shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-dispatch-products',
  standalone: true,
  imports: [CommonModule, ComingSoonComponent],
  templateUrl: './dispatch-products.component.html',
  styleUrls: ['./dispatch-products.component.scss']
})
export class DispatchProductsComponent {

}

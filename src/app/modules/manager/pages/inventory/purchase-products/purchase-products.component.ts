import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComingSoonComponent } from '@app/shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-purchase-products',
  standalone: true,
  imports: [CommonModule, ComingSoonComponent],
  templateUrl: './purchase-products.component.html',
  styleUrls: ['./purchase-products.component.scss']
})
export class PurchaseProductsComponent {

}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComingSoonComponent } from '@app/shared/components/coming-soon/coming-soon.component';

@Component({
  selector: 'app-inventory-overview',
  standalone: true,
  imports: [CommonModule, ComingSoonComponent],
  templateUrl: './inventory-overview.component.html',
  styleUrls: ['./inventory-overview.component.scss']
})
export class InventoryOverviewComponent {

}

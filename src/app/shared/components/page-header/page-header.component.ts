import { Component, Input, TemplateRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { getBreadcrumbsByKey } from '@app/core/config/breadcrumb.registry';

export interface Breadcrumb {
  label: string;
  url?: string;
  icon?: string;
}

@Component({
  selector: 'page-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NgZorroCustomModule],
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.scss',
})
export class PageHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() description: string = '';
  @Input() breadcrumbs: Breadcrumb[] = [];
  @Input() pageKey?: string; // Format: 'module.feature-pageType' (e.g., 'configuration.category-list')
  @Input() showBackButton: boolean = false;
  @Input() ghost: boolean = false;

  // Template references for custom content
  @Input() extraTemplate?: TemplateRef<any>;
  @Input() contentTemplate?: TemplateRef<any>;

  ngOnInit(): void {
    // If pageKey is provided and breadcrumbs are empty, resolve from global registry
    if (this.pageKey && this.breadcrumbs.length === 0) {
      this.breadcrumbs = getBreadcrumbsByKey(this.pageKey);
    }
  }

  get backIcon(): string | null {
    return this.showBackButton ? '' : null;
  }

  getBreadCrumbIcon(icon: string | undefined): string {
    return icon ? icon : '';
  }
}

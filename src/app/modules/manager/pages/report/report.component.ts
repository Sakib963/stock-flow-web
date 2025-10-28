import { CommonModule } from '@angular/common';
import { Component, DestroyRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { HttpService } from '@app/core/services/http.service';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { ReportFilterComponent } from '../../components/report-filter/report-filter.component';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';

@Component({
  selector: 'report',
  imports: [
    CommonModule,
    TranslateModule,
    NgZorroCustomModule,
    ReportFilterComponent,
  ],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
})
export class ReportComponent {
  reportGroupColumns: any;
  reportGroups = [
    {
      key: 'inventory',
      title: 'manager.report.inventory.title',
      expanded: false,
      sub_reports: [
        {
          key: 'current_stock_report',
          title:
            'manager.report.inventory.sub_reports.current_stock_report.title',
          description:
            'manager.report.inventory.sub_reports.current_stock_report.description',
          url: APIEndpoint.GET_CURRENT_STOCK_REPORT,
          filters: ['warehouse_oid', 'category_oid', 'sub_category_oid'],
        },
        {
          key: 'product_wise_stock_value',
          title:
            'manager.report.inventory.sub_reports.product_wise_stock_value.title',
          description:
            'manager.report.inventory.sub_reports.product_wise_stock_value.description',
          url: APIEndpoint.GET_PRODUCT_WISE_STOCK_REPORT,
          filters: ['product_oid'],
        },
        {
          key: 'low_stock_report',
          title: 'manager.report.inventory.sub_reports.low_stock_report.title',
          description:
            'manager.report.inventory.sub_reports.low_stock_report.description',
          url: APIEndpoint.GET_LOW_STOCK_REPORT,
          filters: ['warehouse_oid', 'category_oid', 'sub_category_oid'],
        },
      ],
    },
    // {
    //   key: 'purchase',
    //   title: 'manager.report.purchase.title',
    //   sub_reports: [
    //     {
    //       key: 'purchase_report',
    //       title: 'manager.report.purchase.sub_reports.purchase_report.title',
    //       description:
    //         'manager.report.purchase.sub_reports.purchase_report.description',
    //       url: '',
    //       filters: ['supplier_oid', 'date_range'],
    //     },
    //     {
    //       key: 'product_wise_purchase',
    //       title:
    //         'manager.report.purchase.sub_reports.product_wise_purchase.title',
    //       description:
    //         'manager.report.purchase.sub_reports.product_wise_purchase.description',
    //       url: '',
    //       filters: ['product_oid', 'supplier_oid', 'date_range'],
    //     },
    //   ],
    // },
    // {
    //   key: 'sales',
    //   title: 'manager.report.sales.title',
    //   sub_reports: [
    //     {
    //       key: 'sales_summary',
    //       title: 'manager.report.sales.sub_reports.sales_summary.title',
    //       description:
    //         'manager.report.sales.sub_reports.sales_summary.description',
    //       url: '',
    //       filters: ['date_range', 'allocated_to'],
    //     },
    //     {
    //       key: 'product_wise_sales',
    //       title: 'manager.report.sales.sub_reports.product_wise_sales.title',
    //       description:
    //         'manager.report.sales.sub_reports.product_wise_sales.description',
    //       url: '',
    //       filters: ['product_oid', 'allocated_to', 'date_range'],
    //     },
    //     {
    //       key: 'sales_return_analysis',
    //       title: 'manager.report.sales.sub_reports.sales_return_analysis.title',
    //       description:
    //         'manager.report.sales.sub_reports.sales_return_analysis.description',
    //       url: '',
    //       filters: ['date_range'],
    //     },
    //   ],
    // },
    // {
    //   key: 'product_return',
    //   title: 'manager.report.product_return.title',
    //   sub_reports: [
    //     {
    //       key: 'product_return_report',
    //       title:
    //         'manager.report.product_return.sub_reports.product_return_report.title',
    //       description:
    //         'manager.report.product_return.sub_reports.product_return_report.description',
    //       url: '',
    //       filters: ['allocated_to', 'date_range'],
    //     },
    //   ],
    // },
    // {
    //   key: 'dispose',
    //   title: 'manager.report.dispose.title',
    //   sub_reports: [
    //     {
    //       key: 'dispose_report',
    //       title: 'manager.report.dispose.sub_reports.dispose_report.title',
    //       description:
    //         'manager.report.dispose.sub_reports.dispose_report.description',
    //       url: '',
    //       filters: ['date_range'],
    //     },
    //   ],
    // },
  ];

  reportKey: string = '';

  isLoading: boolean = false;

  iframeSource!: any;
  iframeShow: boolean = false;
  notFound: boolean = false;

  private _selectedCache: any = null;

  ngOnInit(): void {
    this.getReportGroupColumns();
  }

  toggleGroup(group: any) {
    group.expanded = !group.expanded;
  }

  getReportGroupColumns(): void {
    let colCount = 3;

    const columns: any[][] = Array.from({ length: colCount }, () => []);
    this.reportGroups.forEach((group, i) => {
      columns[i % colCount].push(group);
    });

    this.reportGroupColumns = columns;
  }

  constructor(
    private _translateService: TranslateService,
    private _notificationService: NzNotificationService,
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _sanitizer: DomSanitizer
  ) {}

  getSelectedReport(): any {
    if (!this._selectedCache || this._selectedCache.key !== this.reportKey) {
      this._selectedCache =
        this.reportGroups
          .flatMap((g) => g.sub_reports)
          .find((r) => r.key === this.reportKey) || null;
    }
    return this._selectedCache;
  }

  generateReportForm(key: string): any {
    this.reportKey = key;
  }

  handleCancel(): void {
    this.reportKey = '';
    this.iframeShow = false;
    this.notFound = false;
  }

  handleReportAction(action: any): void {
    if (action.action === 'cancel') {
      this.handleCancel();
    } else if (action.action === 'submit') {
      const report = this.getSelectedReport();
      if (report.url && report.url !== null) {
        this.getReport(report.url, action.value, report.key);
      } else {
        this._notificationService.info(
          this._translateService.instant('notification.title.info'),
          'This report is not available right now, we are working on it.'
        );
        this.handleCancel();
      }
    }
  }

  getReport(path: string, payload?: any, report_key?: string): void {
    this.isLoading = true;

    this._httpService
      .downloadFile(path, payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.isLoading = false))
      )
      .subscribe({
        next: (res: any) => {
          const blob: Blob = res.body;
          if (!blob) {
            this._notificationService.info(
              this._translateService.instant('common.notification.title.info'),
              this._translateService.instant(
                'common.notification.no_data_found'
              )
            );
            return;
          }

          const now = new Date();
          const pad = (n: number) => n.toString().padStart(2, '0');
          const timestamp = `${pad(now.getDate())}${pad(
            now.getMonth() + 1
          )}${now.getFullYear()}${pad(now.getHours())}${pad(now.getMinutes())}`;

          const fileName = `${report_key}_${timestamp}.xlsx`;

          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          if (err.status === 404) {
            this.notFound = true;
            this.iframeShow = false;
            this._notificationService.warning(
              this._translateService.instant(
                'common.notification.title.warning'
              ),
              this._translateService.instant(
                'common.notification.no_content_found_for_report'
              )
            );
            return;
          }
          this._notificationService.error(
            this._translateService.instant('common.notification.title.error'),
            this._translateService.instant(
              'common.notification.something_went_wrong'
            )
          );
        },
      });
  }
}

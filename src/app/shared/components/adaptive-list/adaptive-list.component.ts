import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';
import { TableConfig, TableColumn, TableAction } from '@app/core/interfaces/table';
import { CurrencyFormatPipe } from '@app/shared/pipe/currency-format.pipe';

@Component({
    selector: 'adaptive-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgZorroCustomModule, CurrencyFormatPipe],
    templateUrl: './adaptive-list.component.html',
    styleUrl: './adaptive-list.component.scss',
})
export class AdaptiveListComponent {
    dataSource = input.required<any[]>();
    tableConfig = input.required<TableConfig>();
    loading = input<boolean>(false);
    totalCount = input<number>(0);
    pageSize = input<number>(10);
    pageIndex = input<number>(0);

    private readonly _router = inject(Router);

    // View toggle state (0 = table, 1 = card)
    currentView: number = 0;

    // Outputs
    actionEvent = output<{ action: string; value: any }>();
    paginationChange = output<{ offset: number; limit: number }>();

    // Get data columns (exclude action columns)
    getDataColumns(): TableColumn[] {
        return this.tableConfig().columns.filter((col) => col.column_type !== 'action');
    }

    // Get action column
    getActionColumn(): TableColumn | undefined {
        return this.tableConfig().columns.find((col) => col.column_type === 'action');
    }

    // Get cell value
    getCellValue(item: any, column: TableColumn): any {
        if (!column.source) return '';
        return item[column.source] || '-';
    }

    // Get text color for status columns
    getTextColor(item: any, column: TableColumn): string {
        if (!column.text_color || !column.source) return '';
        const value = item[column.source];
        const colorMap = column.text_color.find((c) => c.name === value);
        return colorMap ? colorMap.color : '';
    }

    getTextIcon(item: any, column: TableColumn): string {
        if (!column.text_color || !column.source) return '';
        const value = item[column.source];
        const iconMap = column.text_color.find((c) => c.name === value);
        return iconMap ? iconMap.icon || '' : '';
    }

    // Get row index for display
    getRowIndex(index: number): number {
        return this.pageIndex() * this.pageSize() + index + 1;
    }

    // Check if column should have tooltip (not long-text or action)
    shouldShowTooltip(column: TableColumn): boolean {
        return column.column_type !== 'long-text' && column.column_type !== 'action';
    }

    // Get grid columns class for desktop card view
    getCardGridClass(): string {
        const columns = this.tableConfig().cardColumnsDesktop || 3;
        const gridColsMap: { [key: number]: string } = {
            1: 'grid-cols-1',
            2: 'md:grid-cols-2',
            3: 'md:grid-cols-3',
            4: 'md:grid-cols-4',
            5: 'md:grid-cols-5',
            6: 'md:grid-cols-6',
        };
        return `grid grid-cols-1 gap-4 ${gridColsMap[columns] || 'md:grid-cols-3'}`;
    }

    // Handle action click
    handleAction(action: string, item: any): void {
        this.actionEvent.emit({ action, value: item });
    }

    // Handle pagination
    onPageChange(pageIndex: number): void {
        const offset = (pageIndex - 1) * this.pageSize();
        this.paginationChange.emit({ offset, limit: this.pageSize() });
    }

    onPageSizeChange(pageSize: number): void {
        this.paginationChange.emit({ offset: 0, limit: pageSize });
    }

    // Navigate to add button URL
    navigateToAdd(): void {
        if (this.tableConfig().noData?.addButtonUrl) {
            this._router.navigate([this.tableConfig().noData.addButtonUrl]);
        }
    }
}

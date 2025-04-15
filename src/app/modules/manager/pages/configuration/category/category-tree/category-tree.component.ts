import { Component, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { APIEndpoint } from '@app/core/constants/api-endpoint';
import { Constants } from '@app/core/constants/constants';
import { HttpService } from '@app/core/services/http.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { finalize } from 'rxjs';
import { SelectionModel } from '@angular/cdk/collections';
import { FlatTreeControl } from '@angular/cdk/tree';
import { NzTreeFlatDataSource, NzTreeFlattener } from 'ng-zorro-antd/tree-view';
import { NgZorroCustomModule } from '@app/shared/ng-zorro-custom.module';


interface TreeNode {
  oid: string;
  name: string;
  description?: string;
  status?: string;
  category_code?: string;
  children?: TreeNode[];
}

interface FlatNode {
  oid: string;
  name: string;
  description?: string;
  status?: string;
  category_code?: string;
  level: number;
  expandable: boolean;
  disabled?: boolean;
}

@Component({
  selector: 'app-category-tree',
  standalone: true,
  imports: [CommonModule, NgZorroCustomModule],
  templateUrl: './category-tree.component.html',
  styleUrls: ['./category-tree.component.scss']
})
export class CategoryTreeComponent implements OnInit {
  loading: boolean = false;
  payload: any = {
    offset: 0,
    limit: Constants.PAGE_SIZE,
    search_text: '',
    status: '',
  };
  isFilter: boolean = false;
  searchControl: FormControl = new FormControl('');
  categoryTreeData: TreeNode[] = [];

  transformer = (node: TreeNode, level: number): FlatNode => ({
    oid: node.oid,
    name: node.name,
    description: node.description,
    status: node.status,
    category_code: node.category_code,
    level,
    expandable: !!node.children && node.children.length > 0,
    disabled: false // or customize if needed
  });
  selectListSelection = new SelectionModel<FlatNode>(true);

  treeControl = new FlatTreeControl<FlatNode>(
    node => node.level,
    node => node.expandable
  );

  treeFlattener = new NzTreeFlattener(
    this.transformer,
    node => node.level,
    node => node.expandable,
    node => node.children
  );

  dataSource = new NzTreeFlatDataSource(this.treeControl, this.treeFlattener);

  constructor(
    private _httpService: HttpService,
    private _destroyRef: DestroyRef,
    private _notificationService: NzNotificationService,
    private _router: Router,
    private _activatedRoute: ActivatedRoute
  ) {
    this.treeControl.expandAll();
  }
  hasChild = (_: number, node: FlatNode): boolean => node.expandable;

  ngOnInit(): void {
    this.loadList();
    // this.dataSource.data = this.categoryTreeData;
  }

  loadList(): any {
    this._httpService
      .get(APIEndpoint.GET_CATEGORY_LIST, this.payload)
      .pipe(
        takeUntilDestroyed(this._destroyRef),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 200) {
            this.categoryTreeData = [];
            if (res.body?.data?.length) {
              this.categoryTreeData = res.body.data;
              this.dataSource.setData(this.categoryTreeData);
              console.log(this.categoryTreeData);
            } else {
              this.categoryTreeData = [];
            }
          }
        },
        error: (err: any) => {
          console.log(err);
          this._notificationService.error('Error!', err?.error?.message);
        },
      });
  }

  handleListActions(event: any): any {
    if (event.action === 'create') {
      this.handleAddCategory();
    } else if (event.action === 'view') {
      this.handleViewCategory(event.value.oid);
    } else if (event.action === 'edit') {
      this.handleEditCategory(event.value.oid);
    }
  }

  handleAddCategory(): any {
    this._router.navigate(['../create-category'], {
      relativeTo: this._activatedRoute,
    });
  }

  handleViewCategory(value: any): any {
    this._router.navigate([`../view-category/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: false },
    });
  }

  handleEditCategory(value: any): any {
    this._router.navigate([`../view-category/${value}`], {
      relativeTo: this._activatedRoute,
      state: { edit: true },
    });
  }

}

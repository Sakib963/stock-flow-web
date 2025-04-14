import { ListModel } from '../models/list.model';

export const AISLE_LIST_CONFIG: ListModel = {
  columns: [
    [
      { type: 'text', label: 'Aisle/Zone Name', key: 'name' },
      { type: 'text', label: 'Warehouse', key: 'warehouse_name' },
    ],
    [
      { type: 'text', label: 'Code', key: 'code' },
      { type: 'text', label: 'Capacity', key: 'capacity' },
    ],
  ],
  actions: ['view', 'edit'],
};


export const CATEGORY_LIST_CONFIG: ListModel = {
  columns: [
    [
      { type: 'text', label: 'Category Name', key: 'name' },
      { type: 'text', label: 'Code', key: 'category_code' },
    ],
    [
      { type: 'text', label: 'Description', key: 'description' },
    ],
  ],
  actions: ['view', 'edit'],
};


export const SUB_CATEGORY_LIST_CONFIG: ListModel = {
  columns: [
    [
      { type: 'text', label: 'Sub Category Name', key: 'name' },
      { type: 'text', label: 'Parent Category', key: 'category_name' },
    ],
    [
      { type: 'text', label: 'Code', key: 'category_code' },
      { type: 'text', label: 'Description', key: 'description' },
    ],
  ],
  actions: ['view', 'edit'],
};
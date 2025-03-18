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

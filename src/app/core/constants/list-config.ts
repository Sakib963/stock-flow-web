import { ListModel } from '../models/list.model';

export const AISLE_LIST_CONFIG: ListModel = {
  columns: [
    { type: 'text', label: 'ID', key: '5%' },
    { type: 'text', label: 'Name', key: '20%' },
    { type: 'text', label: 'Email', key: '25%' },
    { type: 'text', label: 'Role', key: '15%' },
    { type: 'text', label: 'Action', key: '10%' },
  ],
  actions: ['view', 'edit']
};

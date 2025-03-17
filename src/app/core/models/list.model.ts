export interface ColumnModel {
  type: 'text' | 'image'; // Strictly allows only 'text' or 'image'
  label: string;
  key: string;
}

export interface ListModel {
  columns: ColumnModel[];
  actions: ('view' | 'edit')[]; // Ensures the array contains only 'view' or 'edit'
}

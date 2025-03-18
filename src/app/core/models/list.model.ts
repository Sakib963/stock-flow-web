export interface ColumnModel {
  type: 'text' | 'image'; // Only 'text' or 'image' allowed
  label: string;
  key: string;
}

export interface ListModel {
  columns: ColumnModel[][]; // Now an array of arrays of ColumnModel
  actions: ('view' | 'edit')[];
}

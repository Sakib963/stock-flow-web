export type DetailViewAction = 'edit' | 'view';
export interface WindowState {
  edit: boolean;
  detailUrl: string;
  action: DetailViewAction;
}

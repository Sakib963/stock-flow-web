
export type BaseFormAction<T> = { action: 'save' | 'update'; data: Partial<T> } | { action: 'cancel' };
export type ExtendedFormAction<T, Extra = never> = BaseFormAction<T> | Extra;

// Example
// export type AreaFormActions = ExtendedFormAction<AreaForm, { action: 'delete'; id: string }>;

// Product Catalog
export type FormActions = BaseFormAction<any>;

import { SubCategoryField } from '@app/core/models/sub-category.model';

/** The copy for a duplicate the database refused, by the field it refused. */
export const SUB_CATEGORY_TAKEN: Record<SubCategoryField, string> = {
    name: 'configuration.subCategory.nameTaken',
    category_code: 'configuration.subCategory.codeTaken',
};

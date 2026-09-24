import { CategoryField } from '@app/core/models/category.model';

/**
 * The copy for a duplicate the database refused, by the field it refused.
 *
 * The server names the field and says the rest in English. The words belong here, where both
 * languages have them, so a Bengali reader is not handed the server's sentence.
 */
export const CATEGORY_TAKEN: Record<CategoryField, string> = {
    name: 'configuration.category.nameTaken',
    category_code: 'configuration.category.codeTaken',
};

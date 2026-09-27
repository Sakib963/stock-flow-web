import { WarehouseField } from '@app/core/models/warehouse.model';

/**
 * The copy for a duplicate the database refused, by the field it refused.
 *
 * The server names the field and says the rest in English. The words belong here, where both
 * languages have them, so a Bengali reader is not handed the server's sentence.
 */
export const WAREHOUSE_TAKEN: Record<WarehouseField, string> = {
    name: 'configuration.warehouse.nameTaken',
    code: 'configuration.warehouse.codeTaken',
};

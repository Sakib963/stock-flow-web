import { SupplierField } from '@app/core/models/supplier.model';

/**
 * The copy for a duplicate the database refused, by the field it refused.
 *
 * The server names the field and says the rest in English. The words belong here, where both
 * languages have them, so a Bengali reader is not handed the server's sentence.
 */
export const SUPPLIER_TAKEN: Record<SupplierField, string> = {
    name: 'configuration.supplier.nameTaken',
    phone_number: 'configuration.supplier.phoneTaken',
};

import { AisleField } from '@app/core/models/aisle.model';

/** The copy for a duplicate the database refused, by the field it refused. */
export const AISLE_TAKEN: Record<AisleField, string> = {
    name: 'configuration.aisle.nameTaken',
    code: 'configuration.aisle.codeTaken',
};

import { MessageTemplate } from '@app/core/models/message-template.model';
import { fillMessage, templatesFor } from './fill-message';

const template = (over: Partial<MessageTemplate>): MessageTemplate => ({ oid: 't', name: 'T', language: 'en', body: '', order_statuses: [], status: 'Active', ...over });

describe('fillMessage', () => {
    it('fills every placeholder it knows and leaves a mistyped one as written', () => {
        expect(fillMessage('Hi {customer_name}, order {invoice_no} is {total}. {totl}', { customer_name: 'Person A', invoice_no: '2610060004', total: '৳1,570' })).toBe('Hi Person A, order 2610060004 is ৳1,570. {totl}');
    });

    it('offers only active templates for the stage the order is in, and those for every stage', () => {
        const all = [template({ oid: 'any' }), template({ oid: 'sent', order_statuses: ['WithCourier'] }), template({ oid: 'new', order_statuses: ['Pending'] }), template({ oid: 'off', status: 'Inactive' })];
        expect(templatesFor(all, ['Confirmed', 'WithCourier', null]).map((t) => t.oid)).toEqual(['any', 'sent']);
    });
});

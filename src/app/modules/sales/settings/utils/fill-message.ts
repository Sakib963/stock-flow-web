import { MessagePlaceholder, MessageStage, MessageTemplate } from '@app/core/models/message-template.model';

/** Puts the order's values in place of `{placeholder}`; a placeholder it does not know stays as written, so a typo shows. */
export const fillMessage = (body: string, values: Partial<Record<MessagePlaceholder, string>>): string => body.replace(/\{(\w+)\}/g, (whole, key: string) => values[key as MessagePlaceholder] ?? whole);

/** A template fits an order when it names none of the stages, or one the order is in now. */
export const templatesFor = (templates: MessageTemplate[], stages: (string | null | undefined)[]): MessageTemplate[] => templates.filter((template) => template.status === 'Active' && (!template.order_statuses.length || template.order_statuses.some((stage: MessageStage) => stages.includes(stage))));

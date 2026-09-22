import { resolveText } from '@app/shared/utils/resolve-text/resolve-text';

describe('resolveText', () => {
    const translate = (key: string) => `translated:${key}`;

    it('sends a key through the translator', () => {
        expect(resolveText('list.cancel', 'en', translate)).toBe('translated:list.cancel');
    });

    it('gives a Bengali reader the Bengali half of an inline pair, not the English one', () => {
        const text = { en: 'Cancel the order', bn: 'অর্ডার বাতিল করুন' };

        expect(resolveText(text, 'bn', translate)).toBe('অর্ডার বাতিল করুন');
        expect(resolveText(text, 'en', translate)).toBe('Cancel the order');
    });
});

import { ToneMap } from '@app/core/models/config.model';
import { resolveTone } from '@app/shared/utils/tone-map/tone-map';

const STATUS: ToneMap = {
    Active: { label: 'common.status.active', tone: 'success', icon: 'lucideCheck' },
    Inactive: { label: 'common.status.inactive', tone: 'neutral' },
};

describe('resolveTone', () => {
    it('gives a known status its label, tone and icon', () => {
        expect(resolveTone(STATUS, 'Active')).toEqual({ style: STATUS['Active'], known: true });
    });

    it('shows a status nobody mapped as neutral with its raw value, and logs it', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

        expect(resolveTone(STATUS, 'Archived', undefined, 'configuration.category')).toEqual({ style: { label: 'Archived', tone: 'neutral' }, known: false });
        expect(warn).toHaveBeenCalledWith(expect.stringContaining('configuration.category'));
        warn.mockRestore();
    });

    it('shows nothing for a row with no status at all', () => {
        expect(resolveTone(STATUS, null)).toBeNull();
    });
});

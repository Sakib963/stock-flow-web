import { ConfigVersionService } from './config-version.service';

describe('ConfigVersionService', () => {
    it('keeps the newest version named, never going back, and ignores an answer without one', () => {
        const versions = new ConfigVersionService();
        versions.seen('41');
        versions.seen('43');
        versions.seen('42');
        versions.seen(null);
        versions.seen('not a number');
        expect(versions.latest()).toBe(43);
    });
});

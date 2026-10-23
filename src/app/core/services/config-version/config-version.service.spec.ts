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

    it('stamps the kept lists with both versions and the person own saves, the reference one never going back', () => {
        const versions = new ConfigVersionService();
        versions.seen('5');
        versions.seenReference('200');
        const at200 = versions.stamp();

        versions.seenReference('150');
        versions.seenReference(null);
        expect(versions.stamp()).toBe(at200);

        versions.dropReferenceLists();
        expect(versions.stamp()).not.toBe(at200);
    });
});

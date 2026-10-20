import { ActivityDevice } from '@app/core/models/activity-log.model';

export const deviceName = (device: ActivityDevice | null): string => (device ? [device.browser, device.os].filter(Boolean).join(' · ') || '-' : '-');

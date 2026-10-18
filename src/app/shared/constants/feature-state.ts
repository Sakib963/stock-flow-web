import { ToneMap } from '@app/core/models/config.model';

export const FEATURE_STATE: ToneMap = {
    On: { label: 'administration.feature.state.On', tone: 'success', icon: 'lucideCheck' },
    Disabled: { label: 'administration.feature.state.Disabled', tone: 'warning', icon: 'lucideBan' },
    Hidden: { label: 'administration.feature.state.Hidden', tone: 'neutral', icon: 'lucideEyeOff' },
};

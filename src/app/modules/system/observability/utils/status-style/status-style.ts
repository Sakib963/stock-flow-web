import { Tone } from '@app/core/models/config.model';

export const statusStyle = (status: number): { label: { en: string; bn: string }; tone: Tone; icon: string } => {
    const label = { en: String(status), bn: String(status) };
    if (status >= 500) return { label, tone: 'danger', icon: 'lucideCircleX' };
    if (status >= 400) return { label, tone: 'warning', icon: 'lucideBan' };
    if (status >= 300) return { label, tone: 'neutral', icon: 'lucideMinus' };
    return { label, tone: 'success', icon: 'lucideCircleCheck' };
};

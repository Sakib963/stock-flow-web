export interface Change {
    percent: number;
    up: boolean;
}

export const changeOf = (current: number, previous: number): Change | null => {
    if (!previous) return null;
    const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
    return { percent: Math.abs(percent), up: percent >= 0 };
};

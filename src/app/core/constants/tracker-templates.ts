// The page designs the standalone tracker app can render (stock-flow-tracker/src/templates).
// `key` MUST match that repo's registry; the tracker falls back to `classic` for a
// blank or unknown key, so this list is only about what the shop can PICK. Adding a
// template there means adding the same entry here.
//
// `preview` drives the little mock in the Settings picker only. It is a hint at the
// real design, not a live render.
export interface TrackerTemplate {
    key: string;
    label: string;
    description: string;
    preview: {
        bg: string;
        card: string;
        accent: string;
        ink: string;
        line: string;
        radius: string;
        layout: 'horizontal' | 'vertical';
    };
}

export const DEFAULT_TRACKER_TEMPLATE = 'classic';

export const TRACKER_TEMPLATES: TrackerTemplate[] = [
    {
        key: 'classic',
        label: 'Classic',
        description: 'Neutral white card, blue accent, horizontal stepper. Safe for any business.',
        preview: { bg: '#f5f6f8', card: '#ffffff', accent: '#1a56db', ink: '#1a1f2e', line: '#e7e9ef', radius: '10px', layout: 'horizontal' },
    },
    {
        key: 'minimal',
        label: 'Minimal',
        description: 'Editorial black and white, hairline rules, vertical timeline. Premium and quiet.',
        preview: { bg: '#ffffff', card: '#ffffff', accent: '#101114', ink: '#101114', line: '#e6e7ea', radius: '2px', layout: 'vertical' },
    },
    {
        key: 'midnight',
        label: 'Midnight',
        description: 'Dark glass card, mint glow, oversized order number. Modern and techy.',
        preview: { bg: '#0b0d12', card: '#141822', accent: '#4ade80', ink: '#eef1f6', line: '#242a38', radius: '12px', layout: 'horizontal' },
    },
    {
        key: 'boutique',
        label: 'Boutique',
        description: 'Cream paper, serif headings, terracotta accent, vertical timeline. Warm and elegant.',
        preview: { bg: '#faf6f1', card: '#fffdfb', accent: '#b4614b', ink: '#2c2622', line: '#ece2da', radius: '3px', layout: 'vertical' },
    },
    {
        key: 'vibrant',
        label: 'Vibrant',
        description: 'Violet-to-pink gradient hero with an overlapping card. Playful, social-commerce ready.',
        preview: { bg: 'linear-gradient(135deg,#7c3aed 0%,#a855f7 45%,#ec4899 100%)', card: '#ffffff', accent: '#7c3aed', ink: '#1e1b2e', line: '#efecf7', radius: '14px', layout: 'horizontal' },
    },
];

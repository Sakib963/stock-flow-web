/** Inline styles set one property at a time, for documents printed from a frame where no stylesheet of the app applies. */
export const styled = <T extends HTMLElement>(element: T, style: Record<string, string>): T => {
    for (const [property, value] of Object.entries(style)) element.style.setProperty(property, value);
    return element;
};

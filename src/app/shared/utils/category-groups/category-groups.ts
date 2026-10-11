export interface Categorised {
    category_name?: string | null;
    sub_category_name?: string | null;
}

export interface CategoryGroup<T> {
    label: string;
    rows: T[];
}

/**
 * Product picker rows under a "Category / Sub-category" heading, in the order the server sent them.
 * A row without a category (a product drawn from the record being edited) has an empty label and is
 * listed before the groups, without a heading.
 */
export function categoryGroups<T extends Categorised>(rows: T[]): CategoryGroup<T>[] {
    const groups = new Map<string, T[]>();
    for (const row of rows) {
        const label = [row.category_name, row.sub_category_name].filter(Boolean).join(' / ');
        groups.set(label, [...(groups.get(label) ?? []), row]);
    }
    return [...groups].map(([label, grouped]) => ({ label, rows: grouped })).sort((a, b) => Number(!!a.label) - Number(!!b.label));
}

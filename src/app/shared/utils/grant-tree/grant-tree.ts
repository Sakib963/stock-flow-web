import { NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { GrantAction, GrantFeature, GrantTree } from '@app/core/models/role.model';

export const featureOf = (code: string): string => code.slice(0, code.lastIndexOf('.'));

export interface GrantTreeOptions {
    language: string;
    /** The verb's label, such as View or বিস্তারিত. */
    verb: (action: string) => string;
    /** Which actions appear; a feature or module left with none is dropped. */
    keep?: (action: GrantAction) => boolean;
    checkable?: boolean;
}

/**
 * The product as a tree to grant from: each module, its features, and each feature's actions by
 * their verb. A feature with View alone is one leaf under its own name. An action whose code has no
 * menu entry of its own (stock value) sits under its module, under its feature's name.
 */
export const buildGrantTree = (tree: GrantTree, options: GrantTreeOptions): NzTreeNodeOptions[] => {
    const keep = options.keep ?? (() => true);
    const bn = options.language === 'bn';
    const name = (entry: { label: string; label_bn: string | null }) => (bn ? entry.label_bn : entry.label) || entry.label;
    const actionsOf = (prefix: string) => tree.actions.filter((a) => `${a.module}.${a.feature}` === prefix && keep(a));

    const featureNode = (key: string, title: string, actions: GrantAction[], extra: Partial<NzTreeNodeOptions> = {}): NzTreeNodeOptions | null => {
        if (!actions.length) return null;
        if (actions.length === 1 && actions[0].action === 'view') return { key: actions[0].code, title, action: actions[0], isLeaf: true, selectable: false, checkable: options.checkable, ...extra };
        const children = actions.map((action) => ({ key: action.code, title: options.verb(action.action), action, isLeaf: true, selectable: false, checkable: options.checkable }));
        return { key, title, children, expanded: true, selectable: false, checkable: options.checkable, ...extra };
    };
    const ofEntry = (entry: GrantFeature) => (entry.permission_code ? featureNode(`f:${entry.oid}`, name(entry), actionsOf(featureOf(entry.permission_code)), { entry }) : null);

    const owned = new Set(tree.features.filter((f) => f.permission_code).map((f) => featureOf(f.permission_code!)));
    const nodes: NzTreeNodeOptions[] = [];
    for (const top of tree.features.filter((f) => !f.parent_oid)) {
        if (top.permission_code) {
            const node = ofEntry(top);
            if (node) nodes.push(node);
            continue;
        }
        const children = tree.features.filter((f) => f.parent_oid === top.oid).map(ofEntry);
        const unlisted = [...new Set(tree.actions.filter((a) => a.module === top.slug && !owned.has(`${a.module}.${a.feature}`)).map((a) => `${a.module}.${a.feature}`))];
        for (const prefix of unlisted) {
            const actions = actionsOf(prefix);
            children.push(featureNode(`p:${prefix}`, actions[0] ? name(actions[0]) : prefix, actions));
        }
        const kept = children.filter((c): c is NzTreeNodeOptions => !!c);
        if (kept.length) nodes.push({ key: `m:${top.oid}`, title: name(top), entry: top, children: kept, expanded: true, selectable: false, checkable: options.checkable });
    }
    return nodes;
};

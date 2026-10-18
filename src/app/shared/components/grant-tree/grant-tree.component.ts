import { ChangeDetectionStrategy, Component, computed, inject, input, model } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NzFormatEmitEvent, NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';
import { GrantAction, GrantTree } from '@app/core/models/role.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { FEATURE_STATE } from '@app/shared/constants/feature-state';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { buildGrantTree, featureOf } from '@app/shared/utils/grant-tree/grant-tree';

const leavesOf = (node: NzTreeNodeOptions): GrantAction[] => (node['action'] ? [node['action'] as GrantAction] : (node.children ?? []).flatMap(leavesOf));

/**
 * The product as a tree of features and their actions, named by label, never by code, with sensitive
 * actions tagged. Checkable, it holds the role's ticked codes and keeps View the gate: ticking any
 * action ticks its View, and clearing View clears the feature.
 */
@Component({
    selector: 'grant-tree',
    imports: [NzTreeModule, StatusTagComponent],
    templateUrl: './grant-tree.component.html',
    styleUrl: './grant-tree.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GrantTreeComponent {
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;
    // The verbs are translated into the node titles, so a language switch has to rebuild them.
    private readonly _copy = toSignal(this._translate.onLangChange.pipe(map((change) => change.lang)), { initialValue: null });

    readonly tree = input.required<GrantTree>();
    readonly checkable = input(false);
    /** Which actions appear at all. */
    readonly keep = input<(action: GrantAction) => boolean>(() => true);
    readonly showState = input(true);
    readonly search = input('');
    /** The tree scrolls inside this, so a long product never pushes the page's own actions out of reach. */
    readonly maxHeight = input('70vh');
    readonly checked = model<string[]>([]);

    readonly states = FEATURE_STATE;

    readonly nodes = computed(() => {
        this._copy();
        return buildGrantTree(this.tree(), { language: this._language(), verb: (action) => this._translate.instant(`access.action.${action}`), keep: this.keep(), checkable: this.checkable() });
    });

    /** A click on the label ticks it, as a click on its checkbox does. */
    onClick(event: NzFormatEmitEvent): void {
        const node = event.node;
        if (!this.checkable() || !node) return;
        node.isChecked = !node.isChecked;
        this.onCheck(event);
    }

    onCheck(event: NzFormatEmitEvent): void {
        const node = event.node;
        if (!node) return;
        const on = node.isChecked;
        const known = new Set(this.tree().actions.map((a) => a.code));
        const next = new Set(this.checked());
        for (const action of leavesOf(node.origin)) {
            if (on) {
                next.add(action.code);
                const view = `${featureOf(action.code)}.view`;
                if (known.has(view)) next.add(view);
            } else {
                next.delete(action.code);
                if (action.action === 'view') for (const code of [...next]) if (featureOf(code) === featureOf(action.code)) next.delete(code);
            }
        }
        this.checked.set([...next]);
    }
}

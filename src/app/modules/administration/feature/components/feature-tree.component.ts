import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBan, lucideCheck, lucideEyeOff, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzTreeModule, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { FeatureTree } from '@app/core/models/feature.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { FEATURE_STATE } from '@app/modules/administration/feature/config/feature-list.config';
import { FeatureService } from '@app/modules/administration/feature/services/feature.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

type Entry = FeatureTree['features'][number];
type Action = FeatureTree['actions'][number];

const feature_of = (code: string) => code.slice(0, code.lastIndexOf('.'));

/**
 * The whole product as a tree: each module, its features, and each feature's actions, the permissions
 * a role is granted. Read only, and read fresh each time it opens.
 */
@Component({
    selector: 'feature-tree',
    imports: [NgIcon, NzButtonModule, NzDrawerModule, NzSkeletonModule, NzTreeModule, TranslatePipe, StatusTagComponent],
    providers: [provideIcons({ lucideBan, lucideCheck, lucideEyeOff, lucideRotateCw, lucideX })],
    templateUrl: './feature-tree.component.html',
    styleUrl: './feature-tree.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureTreeComponent {
    private readonly _features = inject(FeatureService);
    readonly language = inject(LanguageService).current;

    readonly open = input(false);
    readonly closed = output<void>();

    readonly states = FEATURE_STATE;
    readonly data = signal<FeatureTree | null>(null);
    readonly failed = signal<RequestFailure | null>(null);

    /** Module, feature, action. Actions whose code has no menu entry of its own (stock value) sit under their module, under their label. */
    readonly nodes = computed<NzTreeNodeOptions[]>(() => {
        const data = this.data();
        if (!data) return [];
        const owned = new Set(data.features.filter((f) => f.permission_code).map((f) => feature_of(f.permission_code!)));
        const actionsOf = (prefix: string): NzTreeNodeOptions[] => data.actions.filter((a) => `${a.module}.${a.feature}` === prefix).map((action: Action) => ({ key: action.code, title: action.code, action, isLeaf: true, selectable: false }));
        const node = (entry: Entry, children: NzTreeNodeOptions[]): NzTreeNodeOptions => ({ key: entry.oid, title: this.label(entry), entry, expanded: true, selectable: false, isLeaf: !children.length, children });
        const withActions = (entry: Entry) => node(entry, entry.permission_code ? actionsOf(feature_of(entry.permission_code)) : []);

        return data.features
            .filter((f) => !f.parent_oid)
            .map((top) => {
                if (top.permission_code) return withActions(top);
                const children = data.features.filter((f) => f.parent_oid === top.oid).map(withActions);
                const unlisted = [...new Set(data.actions.filter((a) => a.module === top.slug && !owned.has(`${a.module}.${a.feature}`)).map((a) => `${a.module}.${a.feature}`))];
                for (const prefix of unlisted) {
                    children.push({ key: prefix, title: data.actions.find((a) => `${a.module}.${a.feature}` === prefix)!.label, expanded: true, selectable: false, isLeaf: false, children: actionsOf(prefix) });
                }
                return node(top, children);
            });
    });

    constructor() {
        effect(() => {
            if (this.open()) untracked(() => this.load());
        });
    }

    load(): void {
        this.failed.set(null);
        this.data.set(null);
        this._features.tree().subscribe({ next: (tree) => this.data.set(tree), error: (error: unknown) => this.failed.set(failureOf(error)) });
    }

    label(entry: Entry): string {
        return (this.language() === 'bn' ? entry.label_bn : entry.label) || entry.label;
    }
}

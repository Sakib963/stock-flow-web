import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideGripVertical, lucideRotateCw, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { NzFormatBeforeDropEvent, NzTreeComponent, NzTreeModule, NzTreeNode, NzTreeNodeOptions } from 'ng-zorro-antd/tree';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { RequestFailure } from '@app/core/models/api.model';
import { FeatureOrder, FeatureTree } from '@app/core/models/feature.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { FeatureService } from '@app/modules/administration/feature/services/feature.service';
import { StatusTagComponent } from '@app/shared/components/status-tag/status-tag.component';
import { FEATURE_STATE } from '@app/shared/constants/feature-state';
import { confirmAction } from '@app/shared/utils/confirm-action/confirm-action';
import { failureKey, failureOf } from '@app/shared/utils/request-failure/request-failure';

const levelOf = (nodes: NzTreeNode[], parent: string | null): FeatureOrder[] => [{ parent_oid: parent, oids: nodes.map((n) => n.key) }, ...nodes.filter((n) => n.children.length).flatMap((n) => levelOf(n.children, n.key))];

/**
 * The menu as a tree to drag into a new order. A module moves among modules and a feature within its
 * own module, never into another: its permission code names its module.
 */
@Component({
    selector: 'feature-reorder',
    imports: [NgIcon, NzButtonModule, NzDrawerModule, NzSkeletonModule, NzTreeModule, TranslatePipe, StatusTagComponent],
    providers: [provideIcons({ lucideCheck, lucideGripVertical, lucideRotateCw, lucideX })],
    templateUrl: './feature-reorder.component.html',
    styleUrl: './feature-reorder.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureReorderComponent {
    private readonly _features = inject(FeatureService);
    private readonly _modal = inject(NzModalService);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _language = inject(LanguageService).current;

    readonly open = input(false);
    readonly closed = output<void>();
    readonly saved = output<void>();

    readonly tree = viewChild(NzTreeComponent);
    readonly data = signal<FeatureTree | null>(null);
    readonly failed = signal<RequestFailure | null>(null);
    readonly saving = this._features.saving;
    readonly states = FEATURE_STATE;
    private _loaded: FeatureOrder[] = [];

    readonly nodes = computed<NzTreeNodeOptions[]>(() => {
        const data = this.data();
        if (!data) return [];
        const bn = this._language() === 'bn';
        const node = (f: FeatureTree['features'][number]): NzTreeNodeOptions => {
            const children = data.features.filter((c) => c.parent_oid === f.oid).map(node);
            return { key: f.oid, title: (bn ? f.label_bn : f.label) || f.label, state: f.state, children, isLeaf: !children.length, expanded: true, selectable: false };
        };
        return data.features.filter((f) => !f.parent_oid).map(node);
    });

    constructor() {
        effect(() => {
            if (this.open()) untracked(() => this.load());
        });
    }

    load(): void {
        this.failed.set(null);
        this.data.set(null);
        this._features.tree().subscribe({
            next: (tree) => {
                this.data.set(tree);
                const level = (parent: string | null): FeatureOrder[] => {
                    const oids = tree.features.filter((f) => f.parent_oid === parent).map((f) => f.oid);
                    return oids.length ? [{ parent_oid: parent, oids }, ...oids.flatMap((oid) => level(oid))] : [];
                };
                this._loaded = level(null);
            },
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    /** Before or after a sibling only: never inside another entry, never across modules. */
    readonly sameLevel = (event: NzFormatBeforeDropEvent): Observable<boolean> => of(event.pos !== 0 && (event.dragNode.getParentNode()?.key ?? null) === (event.node.getParentNode()?.key ?? null));

    save(): void {
        const tree = this.tree();
        if (!tree || this.saving()) return;
        const before = new Map(this._loaded.map((g) => [g.parent_oid, g.oids.join()]));
        const groups = levelOf(tree.getTreeNodes(), null).filter((g) => before.get(g.parent_oid) !== g.oids.join());
        if (!groups.length) {
            this._message.info(this._translate.instant('form.nothingChanged'));
            return;
        }
        const t = (key: string) => this._translate.instant(key);
        confirmAction(this._modal, {
            title: t('administration.feature.reorder.confirmTitle'),
            body: t('administration.feature.reorder.confirmBody'),
            ok: t('administration.feature.reorder.save'),
            cancel: t('form.confirm.cancel'),
            icon: 'lucideCheck',
            run: () =>
                new Promise((resolve) =>
                    this._features.reorder(groups).subscribe({
                        next: () => {
                            this._message.success(t('administration.feature.reorder.done'));
                            this.saved.emit();
                            this.closed.emit();
                            resolve(true);
                        },
                        error: (error: unknown) => {
                            this._message.error(t(failureKey(error, 'administration.feature.reorder.failed')));
                            resolve(false);
                        },
                    })
                ),
        }).subscribe();
    }
}

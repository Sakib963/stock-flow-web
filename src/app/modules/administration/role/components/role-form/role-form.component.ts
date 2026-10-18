import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideKeyRound, lucideRotateCw, lucideSearch } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { GrantAction, GrantTree, RoleDetails, RolePayload } from '@app/core/models/role.model';
import { RoleService } from '@app/modules/administration/role/services/role.service';
import { GrantTreeComponent } from '@app/shared/components/grant-tree/grant-tree.component';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';
import { featureOf } from '@app/shared/utils/grant-tree/grant-tree';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

@Component({
    selector: 'role-form',
    imports: [ReactiveFormsModule, NgIcon, NzButtonModule, NzCardModule, NzFormModule, NzInputModule, NzSkeletonModule, TranslatePipe, DigitsPipe, GrantTreeComponent],
    providers: [provideIcons({ lucideKeyRound, lucideRotateCw, lucideSearch })],
    templateUrl: './role-form.component.html',
    styleUrl: './role-form.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleFormComponent {
    private readonly _roles = inject(RoleService);

    readonly formId = 'role-form';
    readonly editing = input<RoleDetails | null>(null);
    readonly submitted = output<void>();

    readonly form = inject(FormBuilder).nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(64)]],
        description: ['', [Validators.maxLength(256)]],
    });

    readonly tree = signal<GrantTree | null>(null);
    readonly treeFailed = signal<RequestFailure | null>(null);
    readonly checked = signal<string[]>([]);
    readonly search = signal('');
    readonly noActions = signal(false);
    private readonly _loaded = signal<string[]>([]);

    /** A business role never shows the vendor's actions, even to the system admin. */
    readonly keep = computed(() => {
        const business = (this.editing()?.details.scope ?? 'business') === 'business';
        return (action: GrantAction) => !(business && action.restricted);
    });

    readonly catalogue = computed(() => new Map((this.tree()?.actions ?? []).map((a) => [a.code, a])));

    readonly count = computed(() => {
        const ticked = this.checked()
            .map((code) => this.catalogue().get(code))
            .filter((a): a is GrantAction => !!a);
        return { actions: ticked.length, features: new Set(ticked.map((a) => featureOf(a.code))).size, sensitive: ticked.filter((a) => a.is_sensitive).length };
    });

    readonly grantsChanged = computed(() => {
        const before = new Set(this._loaded());
        const now = this.checked();
        return now.length !== before.size || now.some((code) => !before.has(code));
    });

    constructor() {
        this.loadTree();
        effect(() => {
            const role = this.editing();
            if (!role) return;
            this.form.setValue({ name: role.details.name, description: role.details.description ?? '' });
            this.form.markAsPristine();
            this.checked.set(role.codes);
            this._loaded.set(role.codes);
        });
        effect(() => {
            if (this.checked().length) this.noActions.set(false);
        });
    }

    loadTree(): void {
        this.treeFailed.set(null);
        this._roles.tree().subscribe({ next: (tree) => this.tree.set(tree), error: (error: unknown) => this.treeFailed.set(failureOf(error)) });
    }

    dirty(): boolean {
        return this.form.dirty || this.grantsChanged();
    }

    valid(): boolean {
        this.form.markAllAsTouched();
        for (const control of Object.values(this.form.controls)) control.updateValueAndValidity();
        this.noActions.set(!this.checked().length);
        return this.form.valid && !!this.checked().length;
    }

    payload(): RolePayload {
        const raw = this.form.getRawValue();
        const role = this.editing()?.details;
        return {
            ...(role ? { oid: role.oid, version: role.version } : {}),
            name: raw.name.trim(),
            description: raw.description.trim() || null,
            codes: this.checked(),
        };
    }

    diff(): { added: GrantAction[]; removed: GrantAction[] } {
        const before = new Set(this._loaded());
        const now = new Set(this.checked());
        const known = (code: string) => this.catalogue().get(code);
        return {
            added: [...now]
                .filter((c) => !before.has(c))
                .map(known)
                .filter((a): a is GrantAction => !!a),
            removed: [...before]
                .filter((c) => !now.has(c))
                .map(known)
                .filter((a): a is GrantAction => !!a),
        };
    }

    reload(codes: string[]): void {
        this.checked.set(codes);
        this._loaded.set(codes);
    }

    markNameTaken(): void {
        const control = this.form.controls.name;
        control.setErrors({ ...(control.errors ?? {}), taken: true });
        control.markAsTouched();
    }

    invalid(field: 'name' | 'description'): boolean | null {
        const control = this.form.controls[field];
        return control.invalid && control.touched ? true : null;
    }
}

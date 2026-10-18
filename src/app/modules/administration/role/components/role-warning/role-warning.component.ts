import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCheck, lucideShieldAlert, lucideTriangleAlert, lucideX } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { TranslatePipe } from '@ngx-translate/core';
import { GrantAction, RoleHolder } from '@app/core/models/role.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { DigitsPipe } from '@app/shared/pipes/digits/digits.pipe';

export interface RoleWarning {
    holders: RoleHolder[];
    added: GrantAction[];
    removed: GrantAction[];
    sensitive: GrantAction[];
    selfLoses: boolean;
    ok: string;
}

@Component({
    selector: 'role-warning',
    imports: [NgIcon, NzButtonModule, TranslatePipe, DigitsPipe],
    providers: [provideIcons({ lucideCheck, lucideShieldAlert, lucideTriangleAlert, lucideX })],
    templateUrl: './role-warning.component.html',
    styleUrl: './role-warning.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RoleWarningComponent {
    private readonly _modal = inject(NzModalRef<RoleWarningComponent, boolean>);
    readonly data = inject<RoleWarning>(NZ_MODAL_DATA);
    readonly language = inject(LanguageService).current;

    feature(action: GrantAction): string {
        return (this.language() === 'bn' ? action.label_bn : action.label) || action.label;
    }

    close(confirmed: boolean): void {
        this._modal.close(confirmed);
    }
}

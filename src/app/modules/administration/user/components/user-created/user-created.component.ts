import { Clipboard } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowRight, lucideCheck, lucideCircleCheck, lucideCopy, lucideInfo } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

export interface UserCreatedData {
    name: string;
    email: string;
    password: string;
}

/**
 * After a user is created: the one time the temporary password is shown, with a button that copies
 * everything the new person needs to sign in, ready to send on WhatsApp.
 */
@Component({
    selector: 'user-created',
    imports: [NgIcon, NzButtonModule, TranslatePipe],
    providers: [provideIcons({ lucideArrowRight, lucideCheck, lucideCircleCheck, lucideCopy, lucideInfo })],
    templateUrl: './user-created.component.html',
    styleUrl: './user-created.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreatedComponent {
    private readonly _clipboard = inject(Clipboard);
    private readonly _message = inject(NzMessageService);
    private readonly _translate = inject(TranslateService);
    private readonly _ref = inject(NzModalRef);

    readonly data = inject<UserCreatedData>(NZ_MODAL_DATA);
    readonly copied = signal(false);
    // The app is served under a base path, so the sign-in address is read from the document, not the origin.
    readonly address = new URL('auth/login', document.baseURI).href;

    readonly text = computed(() => this._translate.instant('administration.user.created.copyText', { name: this.data.name, address: this.address, email: this.data.email, password: this.data.password }));

    copy(): void {
        if (this._clipboard.copy(this.text())) {
            this.copied.set(true);
            this._message.success(this._translate.instant('administration.user.created.copied'));
        } else {
            this._message.error(this._translate.instant('copy.failed'));
        }
    }

    close(): void {
        this._ref.close(true);
    }
}

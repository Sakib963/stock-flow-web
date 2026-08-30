import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { AuthService } from '@app/core/services/auth.service';

// PLACEHOLDER. The app shell (header, sider, navigation, page scaffold) is its own design ticket
// and has not been designed yet. This exists so an authenticated user lands somewhere real and
// can sign out. The boot skeleton in index.html imitates the shell's geometry, so when the shell
// is built, those numbers have to be re-derived from it or the layout will jump on every boot.
@Component({
    selector: 'layout',
    imports: [RouterOutlet, NzButtonModule],
    template: `
        <div class="min-h-screen bg-n-75 p-8">
            <div class="mx-auto max-w-2xl rounded-[8px] border border-n-200 bg-white p-6">
                <h1 class="text-n-900 text-xl font-bold">Signed in</h1>
                <p class="text-n-500 mt-1 text-sm">The app shell has not been designed yet. This placeholder confirms the session and the routing.</p>
                <button nz-button class="mt-5" (click)="signOut()">Sign out</button>
            </div>
            <router-outlet />
        </div>
    `,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LayoutComponent {
    private readonly _auth = inject(AuthService);

    signOut(): void {
        this._auth.logout();
    }
}

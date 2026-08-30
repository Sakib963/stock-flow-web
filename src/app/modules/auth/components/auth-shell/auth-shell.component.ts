import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideLanguages, lucideShieldCheck } from '@ng-icons/lucide';
import { AppLanguage, LanguageService } from '@app/core/services/language.service';

/**
 * The frame every auth screen sits in: the indigo identity panel, the ruled form column, and the
 * language toggle. The page supplies only the card.
 *
 * It is shared rather than copied because the design is explicit that the panel is identical on
 * sign-in and on all three recovery frames. This is the same door, a different key, so there is no
 * screen-specific panel copy to parameterise.
 */
@Component({
    selector: 'auth-shell',
    imports: [TranslatePipe, NgIcon],
    providers: [provideIcons({ lucideLanguages, lucideShieldCheck })],
    templateUrl: './auth-shell.component.html',
    styleUrl: './auth-shell.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthShellComponent {
    readonly language = inject(LanguageService);

    /**
     * Half-height of the clear core punched through the ledger texture, in pixels.
     *
     * It has to cover the whole card: a rule running behind a control or a message slot is what
     * the mask exists to prevent. Taller cards need a taller core, so each page states its own.
     */
    readonly clearCoreHeight = input<number>(340);

    setLanguage(lang: AppLanguage): void {
        this.language.use(lang);
    }
}

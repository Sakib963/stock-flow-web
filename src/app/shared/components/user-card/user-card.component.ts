import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBriefcase, lucideCircleAlert, lucideMail, lucideShieldCheck } from '@ng-icons/lucide';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { UserCard } from '@app/core/models/user-card.model';
import { UserCardService } from '@app/shared/services/user-card/user-card.service';

const initialsOf = (name: string): string =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');

/**
 * Who a colleague is: photo, name, designation and email, fetched when the card opens.

 *
 *   <user-card [email]="'samiha@shop.test'" [fallbackName]="'Samiha Rahman'" />
 */
@Component({
    selector: 'user-card',
    imports: [NgIcon, TranslatePipe],
    providers: [provideIcons({ lucideBriefcase, lucideCircleAlert, lucideMail, lucideShieldCheck })],
    templateUrl: './user-card.component.html',
    styleUrl: './user-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
    private readonly _cards = inject(UserCardService);
    private readonly _destroyRef = inject(DestroyRef);

    readonly email = input.required<string>();
    /** The name the row already carries, shown while the rest is on its way. */
    readonly fallbackName = input<string | null>(null);

    readonly card = signal<UserCard | null>(null);
    readonly failure = signal<RequestFailure | null>(null);
    readonly loading = computed(() => this.card() === null && this.failure() === null);

    readonly name = computed(() => this.card()?.name ?? this.fallbackName() ?? this.email());
    readonly initials = computed(() => initialsOf(this.name()) || '?');

    readonly failureKey = computed(() => {
        const failure = this.failure();
        if (failure === 'forbidden') return 'list.user.forbidden';
        return failure === 'network' ? 'list.user.network' : 'list.user.failed';
    });

    constructor() {
        effect(() => {
            const email = this.email();
            untracked(() => {
                this.card.set(null);
                this.failure.set(null);
                this._cards
                    .card(email)
                    .pipe(takeUntilDestroyed(this._destroyRef))
                    .subscribe({
                        next: (card) => this.card.set(card),
                        error: (failure: RequestFailure) => this.failure.set(failure),
                    });
            });
        });
    }
}

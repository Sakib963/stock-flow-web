import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideBoxes, lucideCheck } from '@ng-icons/lucide';

// TEMPORARY: this root component is a stack check, not the real shell. It renders one of each
// moving part (Tailwind 4 utilities, an ng-zorro component, a lucide icon, and a signal updating
// with no zone.js) so the bootstrap can be seen working. The app shell and design system replace
// all of it, at which point this collapses to a router outlet.
@Component({
    selector: 'app-root',
    imports: [RouterOutlet, NzButtonModule, NzCardModule, NgIcon],
    providers: [provideIcons({ lucideBoxes, lucideCheck })],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
    // A signal is the whole point of the check: with zone.js gone, nothing else would repaint this.
    readonly clicks = signal(0);
}

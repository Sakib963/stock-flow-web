import { Location } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideArrowLeft, lucideImage, lucideInfo, lucidePencil, lucideRotateCw } from '@ng-icons/lucide';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzSkeletonModule } from 'ng-zorro-antd/skeleton';
import { TranslatePipe } from '@ngx-translate/core';
import { RequestFailure } from '@app/core/models/api.model';
import { BusinessSettings } from '@app/core/models/business-settings.model';
import { LanguageService } from '@app/core/services/language/language.service';
import { SessionService } from '@app/core/services/session/session.service';
import { SETTINGS_PAGES } from '@app/modules/settings/constants/settings-routes';
import { BusinessSettingsService } from '@app/modules/settings/services/business-settings.service';
import { ActionFooterComponent } from '@app/shared/components/action-footer/action-footer.component';
import { PageHeaderComponent } from '@app/shared/components/page-header/page-header.component';
import { RecordDatePipe } from '@app/shared/pipes/record-date/record-date.pipe';
import { failureOf } from '@app/shared/utils/request-failure/request-failure';

/** The business details as every receipt, invoice, label and the tracking page carry them, read only. */
@Component({
    selector: 'business-settings',
    imports: [NgIcon, NzButtonModule, NzCardModule, NzSkeletonModule, TranslatePipe, ActionFooterComponent, PageHeaderComponent, RecordDatePipe],
    providers: [provideIcons({ lucideArrowLeft, lucideImage, lucideInfo, lucidePencil, lucideRotateCw })],
    templateUrl: './business-settings.component.html',
    styleUrl: './business-settings.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessSettingsComponent {
    private readonly _settings = inject(BusinessSettingsService);
    private readonly _router = inject(Router);
    private readonly _location = inject(Location);

    readonly language = inject(LanguageService).current;
    readonly canEdit = inject(SessionService).can('settings.business.edit');
    readonly settings = signal<BusinessSettings | null>(null);
    readonly failed = signal<RequestFailure | null>(null);

    constructor() {
        this.load();
    }

    load(): void {
        this.failed.set(null);
        this._settings.settings().subscribe({
            next: (settings) => this.settings.set(settings),
            error: (error: unknown) => this.failed.set(failureOf(error)),
        });
    }

    edit(): void {
        void this._router.navigateByUrl(SETTINGS_PAGES.edit);
    }

    goBack(): void {
        this._location.back();
    }
}

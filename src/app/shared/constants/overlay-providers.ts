import { EnvironmentProviders, Provider, importProvidersFrom } from '@angular/core';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { CodeGeneratorService } from '@app/shared/services/code-generator/code-generator.service';

/**
 * What a feature needs before anything in it can open a modal.
 *
 * `NzModalService` is provided by `NzModalModule` and never by the root injector, so a route guard
 * or a service that opens a modal has nothing to inject without this. It cannot go in
 * `app.config.ts` or `app.routes.ts`: both are in the initial bundle, and putting the modal there
 * cost 146 kB of first load for something no signed-out screen uses. A lazy feature route is where
 * it belongs, so it is loaded with the first feature that needs it.
 */
export const OVERLAY_PROVIDERS: readonly (Provider | EnvironmentProviders)[] = [importProvidersFrom(NzModalModule), CodeGeneratorService];

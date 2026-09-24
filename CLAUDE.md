# stock-flow-web: agent guide

The Angular app, rebuilt from a fresh scaffold on `feat/app-revamp`. The workspace guide
(`../CLAUDE.md`) holds the business rules, access control, engineering practice and writing style;
this file holds what is specific to the web app. Both apply.

**`modules/configuration/category/` is the reference feature**: every other feature copies its
folder layout, list config, create and edit pages over one form component, record page, and how
each loads, confirms, saves and fails. `stock-flow-documents/docs/category/category.md` says why.
`modules/auth` and `layout/` are the references for the shell. The old
generations (`refactor/order-sales-core`, `dev`) are read for business logic only, never for
structure or UI. The one exception is the list page config, whose contract lives in
`stock-flow-documents/docs/list-page/list-page.md` and learns from the old `TableConfig`.

## Stack and toolchain

- Angular 22, zoneless (no zone.js), standalone components, TypeScript 6.
- ng-zorro-antd 22, themed in `src/theme.less`. Tailwind 4, configured in CSS in `src/styles.css`.
- Icons: `@ng-icons/core` + `@ng-icons/lucide`. i18n: `@ngx-translate/core` 18.
- Tests: `ng test` on the `@angular/build:unit-test` builder (Vitest, jsdom).
- **Node `^22.22.3 || ^24.15.0 || >=26`.** The Angular CLI refuses to run below that; it does not warn.
- Prettier: `printWidth 500`, `tabWidth 4`, single quotes, semicolons. Path aliases `@app/*`, `@env/*`.

## Layout

| Where | What |
| --- | --- |
| `src/app/core/` | Cross-cutting: `constants/`, `models/`, `guards/`, `interceptors/`, `services/` |
| `src/app/modules/<module>/` | A menu module (`configuration`, `inventory`, `sales`): `<module>.routes.ts` and one folder per feature. A module that is one feature and always will be (`auth`, `dashboard`) keeps `pages/`, `components/` and `services/` at its root |
| `src/app/modules/<module>/<feature>/` | A feature: `pages/`, `components/`, `services/`, `config/`, `constants/`. Nothing of one feature sits beside another's: `configuration/category/` next to `configuration/brand/` |
| `src/app/shared/` | Components used by more than one feature (`page-header`) |
| `src/app/layout/` | The shell: sider, header bar, panels, `constants/`, `services/` |
| `src/app/app-routes/app.routes.ts` | The map of the app. A module owns its own routes file |
| `public/assets/i18n/en.json`, `bn.json` | The only translation files loaded. The subfolders beside them are from the old app |
| `tools/` | `check-utilities.js`, `check-tokens.js`, `verify-values.js`, and `cdp.mjs` for driving Chrome |

- **Nothing loose at a folder root.** Constants, models and helpers live under `constants/`,
  `models/` or `utils/`, never at a module root: the shell's icon registry is
  `layout/constants/shell-icons.ts`.
- **One unit per directory, as soon as a kind folder holds more than one unit.** A kind folder is
  `pipes/`, `services/`, `guards/`, `interceptors/`, `utils/`, `config/`, `components/`, `pages/`.
  A *unit* is one pipe, service, guard, util, page config or component, with everything that belongs
  to it: its spec, and a component's `.html` and `.scss`.
  - **One unit in the folder: leave it flat.** `modules/auth/services/recovery.service.ts` is the
    only service there, so it needs no folder of its own.
  - **Two or more: every one of them gets a folder**, named for the unit without the kind suffix,
    and nothing stays loose beside them. `shared/pipes/money/money.pipe.ts` +
    `money.pipe.spec.ts`, `core/guards/auth/auth.guard.ts`, `shared/utils/tone-map/tone-map.ts`,
    `modules/configuration/category/pages/category-list/category-list.component.ts`.
  - Adding the second unit to a flat folder is what triggers the split, and moving the first one is
    part of that change, not a later tidy-up.
  - **A unit that owns private children keeps them in its own `components/`**, which is then a kind
    folder like any other: `shared/components/table/table.component.ts` with
    `table/components/table-cell/`, `table-layout/` and `column-picker/` beside it. They stay there
    rather than moving up to `shared/components/`, because nothing outside the table may use them.
  - `core/models/` and `constants/` are the exception: one declaration file each, never a spec or a
    second file, so a folder around each would hold exactly one file.
- **Types live in `core/models/*.model.ts`**, never inside the service that fetches them. A payload
  shape is consumed by guards, the shell and pages; importing a service to describe a shape couples
  them for no reason. There is no `core/interfaces/`.
- **All endpoints in `core/constants/api-endpoint.ts`.** No inline URLs.
- **Pages call their feature service** (`modules/<module>/<feature>/services/`), which calls `HttpClient` with
  `environment.baseUrl` and an `APIEndpoint` constant, as `RecoveryService` does. Components do not
  inject `HttpClient`.

## Components

- Standalone components and **signals** (`input` / `output` / `model` / `computed` / `signal` /
  `toSignal`). The app is zoneless, so state that the template reads must be a signal or it will
  not re-render.
- `ChangeDetectionStrategy.OnPush` for anything new. `Eager` is Angular 22's name for the old
  `Default`; do not write `Default`.
- **Every component is three files: `.ts`, `.html`, `.scss`.** No inline `template:` or `styles:`,
  and `templateUrl` and `styleUrl` are always both present. The `.scss` is created even when empty
  and stays when its last rule leaves: an empty file is a place for the next rule.
- **Selectors carry no prefix and never collide with an HTML element.** `sider`, `search-panel`,
  `badge`. A component selectored `header` would match every `<header>` in the app, which is why
  the shell's is `header-bar`. Check the name against the HTML element list.
- **Built-in control flow only**: `@if` / `@else` / `@for` / `@empty` / `@switch` / `@let`. Never
  `*ngIf`, `*ngFor`, `*ngSwitch`, and never import `NgIf` / `NgFor` / `NgSwitch`. Every `@for`
  needs a `track`. Convert legacy syntax in any template you touch.
- **Build from small pieces, but only where a piece is real.** A component earns its own file when
  it is used in more than one place, owns state of its own, or leaves both halves easier to read.
  A file with one caller and five inputs is harder to follow than the block it replaced. Size is
  measured in responsibilities, not lines.
- A parent cannot style a child component's internals: encapsulation stops the rule at the
  boundary, silently. Pass state in as an input and let the child style itself, or use a Tailwind 4
  `@custom-variant` when the state is a class on an ancestor.

## Styling

- **Tailwind first. A component `.scss` holds only what Tailwind cannot express.** Spacing, colour,
  type, radius, flex and grid, and state through `hover:` / `focus-visible:` / `disabled:` /
  `group-*` / `motion-reduce:` are always utilities. A token changed in `@theme` reaches every
  screen at once; the same value copied into twelve stylesheets reaches none of them.
- Four things may sit in SCSS with no justification: `::before` / `::after` decoration;
  `@keyframes` and transitions over more than one property; `scrollbar-color` / `scrollbar-width`;
  and `.ant-*` overrides, which are global by nature and still never take `!important`. Anything
  else in a stylesheet carries a comment naming what Tailwind could not express.
- **The `@theme static` block in `styles.css` is the only place a colour is defined.** Never
  re-declare a palette value in SCSS. A second token sheet holding a copy of the ramp is why
  `layout/_shell-tokens.scss` was deleted.
- **`@theme` stays `static`.** Tailwind only emits a token when a utility referencing it survives
  scanning, and it scans templates for class names, never stylesheets for `var()`. A token used only
  from a `.scss` carve-out is otherwise dropped and the declaration using it resolves to nothing,
  with no build error. That is how the auth panel lost `--color-primary-10` and the sider lost
  `--color-primary-mark`.
- **A class painted by more than one component is an `@utility` in `styles.css`, not a shared Sass
  partial.** A partial is copied into every importer and cannot cross an encapsulation boundary.
  The existing ones are `sf-icon-btn`, `sf-panel`, `sf-sheet`, `sf-group-head`, `sf-empty`,
  `sf-kbd`, `sf-key`, `sf-auth-card` and `sf-auth-message`. The `sf-` prefix is for these only; a
  component-scoped class is named for its component.
- **The cascade layer order in `theme.less` is load-bearing.** `theme, base, vendor, components,
  utilities`, declared at the top of `theme.less` because it loads before `styles.css`. ng-zorro is
  imported inside `@layer vendor`: unlayered, ant beat the utilities (`a { color: @link-color }`
  won against `text-white` on every anchor); below `base`, Tailwind's preflight zeroes
  `border-width` and strips every ant input. The ant Less variable overrides live **inside** that
  same `@layer` block, because Less scopes an `@import` to its block and overrides outside it are
  shadowed, silently reverting the theme to stock Ant blue.
- **Tailwind fails silently.** An unrecognised class generates no rule. `npm run verify` runs the
  build plus `check-utilities.js` (every class in a template produced a rule) and `check-tokens.js`
  (every `var(--token)` in a stylesheet exists in the built CSS). Run it after any styling change.

## NG-Zorro and icons

- **Use NG-Zorro and ng-icons to the maximum; hand-rolling needs a reason.** Before writing a
  modal, drawer, dropdown, tooltip, popover, table, tag, list, empty state or form control, check
  NG-Zorro. Its overlays render through the CDK into a container on `<body>`, which is why they
  cannot be clipped, restacked or made to scroll the page sideways by the shell. Every hand-rolled
  overlay in this project eventually hit one of those. When you do hand-roll, say why in a comment
  at the top of the file. Deliberate carve-outs: the sider rail (pixel geometry `nz-menu` cannot
  express) and decorative artwork such as the sider wash.
- Import the ng-zorro modules a component uses directly (`NzButtonModule`, `NzInputModule`). There
  is no shared barrel module on this branch.
- **ng-zorro v22 renamed things most online examples still use.** `nz-input-group` is gone: use
  `nz-input-wrapper` with projected `nzInputPrefix` / `nzInputSuffix` / `nzInputAddonBefore` /
  `nzInputAddonAfter`. Textarea autosize is the CDK's `cdkTextareaAutosize` (`TextFieldModule` from
  `@angular/cdk/text-field`), not `nzAutosize`. Message and notification are injectable services
  with no module. Date pickers need `provideNzDateFnsAdapter()`, already in `app.config.ts`.
- **Tooltips are `nz-tooltip`, never the native `title` attribute.** A native tooltip is unstyled,
  late, invisible on touch and cannot carry the design. Set `nzTooltipTrigger` to `null` where a
  tooltip should be off rather than rendering an empty one.
- **Icons:** import `NgIcon` and declare what the component uses with
  `providers: [provideIcons({ lucideBox })]`, which keeps icons tree-shakeable. App-wide size and
  stroke defaults are set once with `provideNgIconsConfig` in `app-config/app.config.ts`. Icons
  named by the menu from the database come from the fixed registry in
  `layout/constants/shell-icons.ts`. Never add a hand-drawn SVG icon file. `nz-icon` stays valid
  where an ng-zorro component expects its own icon input.

## Routing, access and i18n

- A module's routes live in `modules/<module>/<module>.routes.ts`, lazy-loading each feature's pages
  from `./<feature>/pages/`, and are loaded as children of the `app` shell route in `app.routes.ts`. Every signed-in route carries
  `canActivate: [permissionGuard]` and `data: { permission: 'module.feature.view' }`.
- `SessionService.can(code)` hides what a person may not do. **It is UX only.** The endpoint behind
  it checks the same code; assume every request is hand-written.
- Copy goes in both `en.json` and `bn.json` in the same change. Menu labels, descriptions and tags
  are the exception: they come from the database in both languages, because feature search searches
  them.
- `AuthService` must not depend on `SessionService`: that edge is a boot-time `NG0200` through the
  interceptor and `LanguageService`. `app.config.spec.ts` boots the real graph to keep it out.

## UI guidelines

These are the rules every screen follows. They come from the shell brief and handoffs in `Design/`
and from what the built screens already do. Where a pattern belongs to a design round that has not
happened yet (tables, filters, forms, detail pages, charts, POS, see `plan/backlog/backlog.md`), do not
invent it inside a feature: raise it for the next brief with the `design-brief` skill.

### Who it is for

- The people using it are business owners and counter staff. It runs on a modest Windows PC at
  **1366x768**, and owners check it from a phone at **390x844**. Check both widths for every screen.
- It is bilingual. Bengali is what half the users read, not a translation layer.
- The screen is looked at all day. It is **quiet and dense**: more information per screen from
  restraint in chrome, never from cramming.

### Density

- **Do not buy density by shrinking type.** Fix it with layout: fewer containers, less nesting,
  less padding around small things, information where the eye already is.
- Controls are **32px** inside data screens. 40px and 48px are for standing-at-the-counter forms
  (sign-in, POS) only.
- Nothing decorative costs vertical space. A page title is one line, not a card.
- Radius 6px on controls, 8px on containers.

### Colour

- **One accent**, `primary-6`, used for action and state, never decoration. No gradient heroes,
  coloured section headers or tinted cards competing for attention.
- Text colours by role: `n-900` headings, `n-800` body and labels, `n-600` 11 to 12px functional
  copy, `n-500` 13px secondary text. **`n-400` is placeholders and icons only**: it is 2.55:1 on
  white and never carries copy.
- Status: `success` confirms, `warning` asks for attention (low stock), `danger` is a problem. Each
  has `-bg` and `-border` companions for tags and banners.
- `brand-green` is reserved for the stock line motif. It is not a UI colour.
- A colour that is not in `@theme` does not get used. If a design genuinely needs one, the token is
  added to `@theme` with a comment saying what it is for.

### Type

- Mulish for Latin and **Hind Siliguri for Bengali at identical sizes**, so switching language never
  moves the layout. Bengali labels are longer: nothing that matters may truncate.
- IBM Plex Mono for codes, batch numbers, invoice numbers and money columns.
- Numbers follow the language: in Bengali, counts, money and dates are written in Bengali digits.
  `money` and `recordDate` do it themselves; print any other number through the `digits` pipe,
  never raw. Codes, batch and invoice numbers stay Western in both languages: staff cross-reference
  them against a phone.

### States

Every screen that loads data has four designed states: **loading, empty, error, and loaded**. An
empty list says what would appear there and offers the action that fills it. An error says what
went wrong and what to do.

- **No permission means absent, never greyed out.** A disabled control still tells someone a thing
  exists. Disabled means the feature exists and is not usable yet, and it carries a reason.
- Tell a refusal (403), a network failure and a server fault apart. They ask different things of the
  person: "you cannot do that", "check the connection", "try again in a moment".

### Forms

- Rules are shown **before** the person types (a checklist that ticks off), not as an error after.
- Errors sit inline under the field that failed, with `aria-invalid` and `aria-describedby`. The
  outcome of submitting (saved, failed) is an `NzMessageService` message as well.
- **Never clear what someone typed because a request failed.** The password recovery screen keeps
  the code and the password on one screen for exactly this reason.
- A mismatch that is normal halfway through typing (confirm password) reports on blur or submit,
  not on every keystroke.
- A code is one field, never six boxes: boxes fight paste, screen readers and the Bengali keyboard.
  Use `inputmode="numeric"` and `autocomplete="one-time-code"` where they apply.

### Actions and feedback

- **Mutating actions ask first.** The shared confirmation component arrives with the design rounds;
  until it exists, use `NzModalService.confirm`, never a hand-rolled dialog. An action that cannot
  be undone says so in the confirmation.
- A button that starts a round trip shows that it is working and cannot be pressed twice.
- Copy names things the way a shopkeeper would. An error says what went wrong and what to do next.

### Detail pages

- **Business helpful, never a field dump**: stat cards, quick actions, recent activity, and links to
  related records. A disabled quick action says why.

### Accessibility and motion

- The focus ring (`0 0 0 2px rgb(74 63 191 / 0.22)`) is never removed. Style `focus-visible:`.
- Every input has a label. An icon that carries meaning has an accessible name; a decorative one is
  `aria-hidden`.
- Motion is 0.2s `cubic-bezier(.215,.61,.355,1)`, colour and border only, with a `motion-reduce:`
  answer for anything that moves.

### Width

- The page body never scrolls sideways. A wide table scrolls inside its own container.
- On a phone the sider is a drawer over the page, and a completed navigation closes it.

### Old screenshots

`Design/old_app/` shows what a screen must **contain**, never how it should look. Its README lists
what the old screens got wrong so it is not copied.

## Verify

- `npm run verify` must pass: build, utilities check, tokens check.
- `ng test --watch=false` must pass. Anything touching auth, sessions, guards or the interceptor
  keeps its specs green.
- For a visual change, look at it: `tools/cdp.mjs` drives headless Chrome for screenshots at
  1366x768 and 390x844, in English and Bengali.
- The pre-commit hook in the workspace runs the build and the tests before any commit in this repo.

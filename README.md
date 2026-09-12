# Mocknik

<img src="brand/logo-primary.svg" alt="Mocknik — Fake Form Filler" width="420" />

A Chrome Manifest V3 extension that fills web forms with fake data. Fields are classified and filled automatically; per-field rules let you pin exact values, mirror confirm-password fields, randomise from your own lists, or skip fields entirely.

Everything runs locally in the browser:

- Settings are stored in `chrome.storage.local` under the `settings` key.
- No accounts, no cloud sync, no profiles, no network requests, no telemetry.
- There is no popup. The toolbar button, keyboard shortcuts, and the context menu trigger fills directly.

## Privacy

The extension collects no data and makes no network requests. Settings live in `chrome.storage.local` on your device, and page content is processed locally only to fill forms. See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Requirements

- Node.js 20 or newer (npm is bundled)
- Chrome or Chromium with Manifest V3 support

## Commands

| Command | Description |
| --- | --- |
| `npm ci` | Install dependencies from `package-lock.json` |
| `npm run typecheck` | Type-check all source and tests with `tsc --noEmit` |
| `npm test` | Run all Vitest projects once (`unit`, `dom`, `integration`) |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:coverage` | Run tests with v8 coverage (thresholds enforced) |
| `npm run build` | Bundle entry points and copy static assets into `dist/` |
| `npm run watch` | Rebuild automatically when source files change |
| `npm run e2e` | Build, then run the Playwright E2E suite |
| `npm run e2e:ui` | Same, with the Playwright UI |
| `npm run icons` | Regenerate `src/icons/*.png` (dependency-free script) |

## Loading the dev build

1. `npm run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` directory

After changing source files, run `npm run build` (or keep `npm run watch` running) and press the reload button for the extension in `chrome://extensions`. Reload any page you want to fill so the new content script is injected.

## Usage

| Trigger | Scope |
| --- | --- |
| Toolbar button click | Every eligible input on the page |
| `Alt+Shift+F` | Every eligible input on the page |
| `Alt+Shift+G` | The form containing the focused field |
| `Alt+Shift+H` | Only the focused input |
| Right-click → **Fill all inputs** / **Fill this form** / **Fill this input** | The matching scope |

Shortcuts can be remapped at `chrome://extensions/shortcuts`. After filling, the extension dispatches `input`, `change`, and `blur` events so frameworks (React, Vue, etc.) pick up the new values. This is configurable on the options page.

## Configuration

Open the options page via `chrome://extensions` → **Details** → **Extension options**. It has three sections:

- **General** — default max length, whether to dispatch `input`/`change`/`blur` events after filling, ignore settings (skip hidden fields, skip fields that already contain a value, ignored input types, ignored domains), and the global list of attributes rules match against. The ignored-domains list holds regular expressions matched against the current URL; when the current URL matches one, filling is disabled.
- **Rules** — one card per rule. Each rule has a name, match kind, patterns, optional attribute overrides, action, optional field type override, optional literal value, optional template, and a JSON options block. Rules can be reordered (Move up / Move down), added, and deleted.
- **Backup** — export the full settings object as JSON, or import a JSON file. Imports are validated and fall back to defaults when malformed.

### The rule model

A rule matches fields by looking at selected attributes — `name`, `id`, `class`, `label`, `placeholder`, `ariaLabel`, `ariaLabelledBy`, `autocomplete`, `title`, `type` — using one of four match kinds:

- `contains` — normalised substring match (case and punctuation insensitive) against any selected attribute
- `exact` — the whole normalised attribute value must equal the pattern
- `glob` — `*` and `?` wildcards, case-insensitive
- `regex` — a case-insensitive JavaScript regular expression (limited to 200 characters)

Rules are evaluated most-specific first. Specificity is computed from the highest-weighted selected attribute (`id` > `name` > `autocomplete` > `ariaLabel` > `label` > `placeholder` > `class`/`type`), the match kind (`exact` > `glob` > `regex` > `contains`), and the number of patterns. A rule can add a manual `specificity` number to outrank another rule; ties go to the rule declared last. The shipped default rules are ordinary rules in the same list, so your rules can override them by being more specific.

A rule then decides what happens to matching fields:

- `fill` (default) — generate or set a value.
- `skip` — leave the field alone.
- `mirror` — copy the previously filled value; `mirrorSource` is `previous-text` (default) or `previous-password`. This is how confirm-password fields are handled.

For `fill` rules, the value is chosen in this order:

1. **Literal value** — `"value": { "kind": "text", "value": "..." }`. Always wins.
2. **Template** — an alphanumeric pattern expanded with random tokens. Tokens: `X` (1–9), `x` (0–9), `L`/`l` (upper/lowercase letter), `D` (any-case letter), `C`/`c` (consonant), `V`/`v` (vowel). Wrap a character in `[ ]` to emit it literally.
3. **Generator** — chosen by `fieldType` (or the auto-detected type), configured through the rule's `options` object.

Supported `fieldType` values: `text`, `paragraph`, `firstName`, `lastName`, `fullName`, `username`, `email`, `password`, `telephone`, `number`, `integer`, `date`, `time`, `url`, `color`, `search`, `checkbox`, `choice`, `multiChoice`.

Generator `options` by type:

| `fieldType` | Options |
| --- | --- |
| `password` | `mode`: `"random"` or `"defined"`; `value` (for defined mode); `length` (4–128, default 12); `charset`: `"alnum"` or `"ascii"` |
| `telephone` | `template` with `X`/`x` digit placeholders, e.g. `"+351 9XX XXX XXX"` (default `"+1 (XxX) XxX-XxxX"`) |
| `checkbox` | `checked`: `"random"`, `"always"`, or `"never"` |
| `choice`, `multiChoice` | `list`: array of candidate strings (otherwise the page's own `<option>` values are used) |
| `number`, `integer` | `min`, `max`, `decimals` (0–8) |
| `date`, `time` | `minDaysFromToday`, `maxDaysFromToday`, `minDate`, `maxDate`, `format` (`YYYY`, `YY`, `MM`, `M`, `MMM`, `DD`, `D`, `HH`, `mm`, `H`, `m`); date inputs always receive `YYYY-MM-DD` |
| `text`, `paragraph` | `minWords`, `maxWords`, `maxLength` |

The built-in rules are: mirror confirm-password fields, random 12-character alphanumeric passwords, always check agreement/terms checkboxes, skip captchas, and generate 5-digit zip codes. All of them can be edited or removed.

### Examples

The snippets below are individual entries for the `rules` array, as seen in the exported JSON (Backup → Export). Use the rules editor to add them one at a time, or import them as part of a full settings file.

Fixed email address:

```json
{
  "id": "rule-fixed-email",
  "name": "Fixed email",
  "match": {
    "kind": "glob",
    "patterns": ["*email*"],
    "attributes": ["name", "id", "label"]
  },
  "fieldType": "email",
  "value": { "kind": "text", "value": "qa.bot@example.com" }
}
```

Fixed password plus a confirm-password mirror. The `specificity` boosts make sure these rules outrank the built-in password rules:

```json
[
  {
    "id": "rule-fixed-password",
    "name": "Fixed password",
    "match": {
      "kind": "contains",
      "patterns": ["password", "passwd", "pwd"],
      "attributes": ["name", "id", "label", "placeholder"]
    },
    "specificity": 5,
    "fieldType": "password",
    "options": { "mode": "defined", "value": "Hon3y-Badger!" }
  },
  {
    "id": "rule-mirror-confirm-password",
    "name": "Mirror confirm password",
    "match": {
      "kind": "contains",
      "patterns": ["confirm"],
      "attributes": ["name", "id", "label", "placeholder"]
    },
    "specificity": 10,
    "action": "mirror",
    "mirrorSource": "previous-password"
  }
]
```

Skip captcha fields:

```json
{
  "id": "rule-skip-captcha",
  "name": "Skip captcha",
  "match": {
    "kind": "contains",
    "patterns": ["captcha", "recaptcha"],
    "attributes": ["name", "id", "class", "label"]
  },
  "action": "skip"
}
```

Random value from your own list:

```json
{
  "id": "rule-random-country",
  "name": "Random country",
  "match": {
    "kind": "contains",
    "patterns": ["country"],
    "attributes": ["name", "id", "label"]
  },
  "fieldType": "choice",
  "options": { "list": ["Portugal", "Spain", "France", "Germany"] }
}
```

## Architecture

The codebase is split so that all decision-making is pure and testable, and all browser access sits at the edges:

- **`src/domain`** — pure TypeScript with no DOM, no `chrome`, and no I/O: field classification, rule matching and specificity, field resolution, the fill engine, generators, templates, settings defaults/codec/migrations, and ports (interfaces).
- **`src/adapters`** — thin implementations of the domain ports:
  - `chrome/` — `chrome.storage.local` repository, runtime message bus, tab messaging, keyboard commands, context menus, toolbar action
  - `dom/` — form scanning, plain-data field descriptors, and value write-back (with synthetic events)
  - `random/` — cryptographically secure random source backed by `crypto.getRandomValues`
- **`src/entry`** — composition roots: `serviceWorker.main.ts`, `contentScript.main.ts`, and `options/main.ts` build object graphs in `container.ts` and wire events. No business logic lives here.

At runtime the service worker loads settings, broadcasts `SETTINGS_CHANGED` to every tab, and routes `FILL` requests from the toolbar, shortcuts, and context menu to the active tab. Each content script scans eligible fields, resolves every field against the rule layers, writes the results, and reports counts. The options page reads and writes the same settings through the shared storage repository.

Passwords use the secure random source; all other fake data uses a lightweight random source. Nothing is ever sent anywhere.

## Testing

- **Unit** (`npm test`, project `unit`) — Node environment, `src/domain/**/*.test.ts`.
- **DOM** (project `dom`) — jsdom, `src/adapters/**/*.test.ts` and `src/entry/options/**/*.test.ts`.
- **Integration** (project `integration`) — jsdom with Chrome API fakes and a setup shim, `test/integration/**/*.test.ts`.
- **Coverage** (`npm run test:coverage`) — v8 provider with thresholds of 85% lines/statements/functions and 75% branches; `src/entry` is excluded.
- **E2E** (`npm run e2e`) — Playwright launches Chromium with the unpacked `dist/` build and runs the specs in `e2e/` against a local fixture server. The first run requires `npx playwright install chromium`.

Type checking covers the whole project: `npm run typecheck`.

## Repository layout

```
.
├── .github/workflows/ci.yml   # typecheck, tests, build, E2E
├── build.mjs                  # esbuild bundling + static copy to dist/
├── e2e/                       # Playwright specs, fixtures, fixture HTTP server
├── scripts/
│   └── generate-icons.mjs     # dependency-free PNG icon generator (npm run icons)
├── src/
│   ├── adapters/              # Chrome, DOM, and crypto implementations of domain ports
│   ├── domain/                # pure logic: classify, match, resolve, fill, generators, settings
│   ├── entry/                 # composition roots for service worker, content script, options
│   ├── icons/                 # generated extension icons
│   ├── manifest.json          # MV3 manifest
│   └── options.html
├── test/
│   ├── fakes/                 # in-memory Chrome and DOM fakes
│   ├── integration/           # cross-cutting Vitest tests
│   └── setup-chrome.ts
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

Not implemented in this version: cloud sync, and profiles (the `profiles` array is validated but reserved and always empty).

# Mocknik — Chrome Web Store listing

Submission copy for the Chrome Web Store. Values marked **[verify]** must be
confirmed against the built package before submitting.

## Identity

- **Name:** `Mocknik — Fake Form Filler` (26 characters, within the 45-character limit)
- **Short name:** `Mocknik`
- **Tagline:** Fake data. Real progress.
- **Category:** Developer Tools
- **Language:** English
- **Website:** [to host] — the GitHub repo is private, so a public URL must be
  provided here (a hosted landing page, or make the repo public)
- **Support email:** frarredo+mocknik@gmail.com
- **Privacy policy URL:** [to host] — publish `docs/privacy-policy.html` (a
  single self-contained file) anywhere public and paste the URL here

## Summary (132 characters max)

> Fill any web form with fake data in one click. Local-only, no network, with per-field rules for fixed values, templates, mirrors.

## Detailed description

> **Fake data. Real progress.**
>
> Mocknik fills web forms with realistic fake data so you can build, test, and
> ship faster. Designed for developers and QA teams who type the same dummy
> values into the same forms every day.
>
> **One click, every field.** Trigger a fill from the toolbar button, keyboard
> shortcuts (`Alt+Shift+F` for all inputs, `Alt+Shift+G` for the current form,
> `Alt+Shift+H` for the focused input), or the right-click menu. Mocknik
> classifies each field and generates a fitting value: names, emails, phone
> numbers, passwords, dates, numbers, choices, checkboxes, and more.
>
> **Rules that match how you test.** Pin exact values with literal overrides,
> mirror confirm-password fields automatically, generate values from your own
> lists, use alphanumeric templates, or skip fields entirely. Rules are matched
> by `name`, `id`, `label`, `placeholder`, `aria-label`, `autocomplete`, and
> more, then resolved most-specific-first, so overrides always win. Import and
> export the whole rule set as JSON.
>
> **Private by design.** Everything runs locally in your browser. No accounts,
> no cloud sync, no network requests, no telemetry. Settings live in
> `chrome.storage.local` on your device, and page content is processed in
> memory only to fill the forms you trigger.
>
> **Works with modern frameworks.** After filling, Mocknik dispatches `input`,
> `change`, and `blur` events so React, Vue, Angular, Svelte, and other
> framework-bound forms pick up the new values.
>
> Build. Test. Ship.

## Single purpose

> Fill web forms with locally generated fake data so developers and testers can
> exercise forms quickly.

## Test instructions

No account or credentials are needed. To verify the core flow:

1. Open any page with a form, or the fixture page used in CI.
2. Press `Alt+Shift+F` (fill all), `Alt+Shift+G` (fill the focused form), or
   `Alt+Shift+H` (fill the focused input), or click the toolbar button.
3. Every eligible field is filled with generated fake data. Fields that already
   contain a value, hidden fields, and the ignored input types are skipped.
4. Open the options page to add, edit, reorder, or delete rules, and to export or
   import settings as JSON.

## Permission justifications

- **`storage`** — Saves rules, ignore lists, and preferences locally in
  `chrome.storage.local`. No data leaves the browser.
- **`contextMenus`** — Adds "Fill all inputs", "Fill this form", and "Fill this
  input" to Chrome's right-click menu.
- **Content script on `<all_urls>`** — Required to detect and fill form fields on
  whatever page the user triggers a fill on. The script reads field metadata and
  writes generated values; it makes no network requests and collects no data.
- **Remote code:** none. All code is bundled in the package.

## Privacy practices (dashboard answers)

- Does the extension collect user data? **No.**
- Does it sell data to third parties? **No.**
- Does it use data for purposes unrelated to the single purpose? **No.**
- Does it use remote code? **No.**
- Does it handle authentication information? **No** — generated passwords are
  written to the page being tested; nothing is stored or transmitted.

## Brand assets

- `brand/logo-primary.svg` — primary lockup (mark + wordmark)
- `brand/logo-stacked.svg` — vertical lockup
- `brand/logo-icon.svg` — icon / favicon mark
- `brand/logo-monochrome.svg` — single-color lockup
- `brand/palette.mjs` — palette: `#000000`, `#14213d`, `#fca311`, `#e5e5e5`, `#ffffff`

## Pre-submission checklist

- [ ] Create the developer account, enable 2-Step Verification, verify the
      contact email, and declare trader/non-trader status.
- [ ] Confirm the name against the Web Store search UI and run a USPTO XSearch
      (classes 9/42) plus an attorney clearance search.
- [x] Fill in the support email, privacy policy contact email, and effective date.
- [ ] Host `docs/privacy-policy.html` at a public URL and copy it into the
      Website and Privacy policy URL fields.
- [ ] Regenerate assets: `npm run icons && npm run store:assets`.
- [ ] Build the submission ZIP: `npm run package` (writes
      `release/mocknik-v<version>.zip` with `manifest.json` at the root).
- [ ] Verify screenshots show no real personal data.
- [ ] Fill every permission justification in the Privacy tab; select
      "No, I am not using remote code." and declare no data collection.
- [ ] Decide whether to keep the `<all_urls>` content script or refactor to
      `activeTab` + `chrome.scripting`.
- [ ] Set distribution (public, all regions, free) and submit for review.

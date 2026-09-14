# Mocknik — Chrome Web Store listing

Submission copy for the Chrome Web Store.

## Identity

- **Name:** `Mocknik — Fake Form Filler` (26 characters, within the 45-character limit)
- **Short name:** `Mocknik`
- **Tagline:** Fake data. Real progress.
- **Category:** Developer Tools
- **Language:** English
- **Website:** https://github.com/frarredondo/mocknik
- **Support URL:** https://github.com/frarredondo/mocknik/issues
- **Support email:** frarredo+mocknik@gmail.com
- **Privacy policy URL:** https://frarredondo.github.io/mocknik/privacy-policy.html

## Summary (132 characters max)

This text must live in the manifest `description` field — the Chrome Web Store
uses it as the listing summary. There is no separate summary field in the
dashboard, and it cannot be changed after upload without a version bump.

> Fill any web form with fake data in one click. Local-only, no network, with per-field rules for fixed values, templates, mirrors.

## Detailed description

> Stop typing the same dummy data into the same forms.
>
> Mocknik fills web forms with realistic fake data in one click, so you can test
> sign-ups, checkouts, logins, onboarding flows, and any other flow without
> wasting time on manual entry. It's built for developers, QA engineers, and
> testers who do this dozens of times a day.
>
> HOW IT WORKS
> Click the toolbar button, press Alt+Shift+F (all fields), Alt+Shift+G (the
> current form), or Alt+Shift+H (the focused field), or use the right-click
> menu. Mocknik inspects every eligible field, works out what it expects — first
> name, last name, email, phone, password, date, address, quantity, card number,
> and more — and writes a fitting value. Confirm-password fields are mirrored
> automatically, captchas are left alone, and framework-bound inputs (React,
> Vue, Angular, Svelte) update correctly because input, change, and blur events
> are dispatched after filling.
>
> RULES THAT MATCH HOW YOU TEST
> Every field is resolved against your rules, most specific first:
> - Pin exact values: always use the same test email or account ID
> - Generate from templates: order codes like XX-1234
> - Randomise from your own lists: countries, plans, products
> - Mirror confirm-password fields automatically
> - Skip fields entirely: captchas, file uploads, anything you don't want touched
>
> Add, edit, reorder, and delete rules in the options page, and export or import
> everything as JSON to share test setups with your team.
>
> PRIVATE BY DESIGN
> Everything runs locally in your browser. There are no accounts, no cloud sync,
> no profiles, and no network requests. Page content is processed in memory only
> to fill the fields you trigger, and your rules stay in local browser storage.
> No telemetry, no tracking, no data collection — ever.
>
> WHY INSTALL MOCKNIK?
> - Fill an entire page in one click instead of typing for minutes
> - Get deterministic, repeatable test data with per-field rules
> - Test validation, error states, and edge cases with realistic values
> - Keep test environments free of your real personal data
> - Works offline — nothing leaves your machine
>
> Free and open source (MIT). Requires Chrome or Chromium with Manifest V3.

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
- [x] Host `docs/privacy-policy.html` at a public URL and copy it into the
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

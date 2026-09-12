# Store assets

Chrome Web Store listing assets for **Mocknik**, captured from the real
built extension over fictional "Acme" demo pages. Nothing here is hand-edited:
regenerate everything with one command.

Brand sources live in [`../brand`](../brand): `logo-primary.svg`, `logo-stacked.svg`,
`logo-icon.svg`, `logo-monochrome.svg`, and `palette.mjs`. The extension icons in
`src/icons/` are rasterized from `brand/logo-icon.svg` with `npm run icons`
(the 128px store icon is inset to ~76% artwork with a subtle glow, per the
Chrome Web Store image guidance).

Submission ZIPs are produced with `npm run package`, which builds first and then
writes `release/mocknik-v<version>.zip` with `manifest.json` at the root.
Listing copy lives in [`listing.md`](listing.md).

## Regenerate

```sh
npm run store:assets
```

This builds `dist/`, starts an ephemeral static server for `store-assets/demo/`,
launches persistent Chromium with the unpacked extension, seeds override rules
through the service worker, triggers real `FILL` messages, and verifies every
output PNG's dimensions. It exits non-zero if a field is not filled or a
dimension is wrong.

## Assets

| File | Dimensions | Purpose |
| --- | --- | --- |
| `screenshots/01-fill-all-1280x800.png` | 1280×800 | Signup form after "fill all", with a "One click. Every field." caption. |
| `screenshots/02-overrides-1280x800.png` | 1280×800 | Same form using configured overrides: fixed `qa+demo@example.com`, defined password, mirrored confirmation. |
| `screenshots/03-options-1280x800.png` | 1280×800 | Extension options page showing the "Fixed demo email" rule and its JSON options. |
| `screenshots/04-checkout-1280x800.png` | 1280×800 | Checkout form after "fill all" (address, ZIP, quantity, date, card number, notes). |
| `promo/small-tile-440x280.png` | 440×280 | Required store small tile: icon, wordmark, tagline "Fake data. Real progress.". |
| `promo/marquee-1400x560.png` | 1400×560 | Optional marquee: icon, wordmark, tagline, and a mock "Create an Account" form. |

## Listing copy

`listing.md` holds the submitted listing text: name, summary, detailed
description, category, single purpose, permission justifications, and privacy
answers.

## Demo pages

`demo/signup.html` and `demo/checkout.html` (plus `demo/demo.css`) are standalone,
dependency-free, fictional SaaS pages used as screenshot subjects. They are only
served while `scripts/capture-store-assets.mjs` runs; they are never bundled into
the extension.

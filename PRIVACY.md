# Privacy Policy — Mocknik

**Effective date:** September 13, 2026

This policy applies to the **Mocknik** browser extension.

## What the extension does

Mocknik is a Chrome extension that fills web forms on pages you visit with randomly generated fake data, using rules and preferences you configure.

## Data we collect: none

We do not collect, transmit, sell, or share any personal data. Precisely what happens inside your browser:

- **Page content and form field values.** The extension reads the form fields on the pages you visit — for example field type, name, ID, label, and placeholder text — and writes generated values into them. This happens locally in your browser, in memory, and only to fill the forms you ask it to fill. Page content is not stored or sent anywhere.
- **Settings.** Your rules, ignored domains, and other preferences are stored locally on your device using `chrome.storage.local` under the `settings` key. They never leave your browser.
- **No accounts.** There is no sign-in, no user account, and no profile system.
- **No analytics, cookies, or tracking.** The extension contains no analytics, telemetry, tracking pixels, or advertising. It sets no cookies and does not track your browsing.
- **No transmission.** The extension makes no network requests. No data is sent to us or to any third party.

Settings you export from the options page (for example, as JSON) are created on your device only when you ask for them, and they stay on your device.

## Permissions

The extension requests only the permissions it needs to work:

- **`storage`** — to save your settings locally in your browser.
- **`contextMenus`** — to add the "Fill all inputs", "Fill this form", and "Fill this input" items to Chrome's right-click menu.
- **Content script access on all sites** — declared for `<all_urls>`, in all frames. This is what lets the extension find and fill forms on whatever page you are viewing. It is used only for that purpose: reading form fields and writing fake values into them when you trigger a fill. It does not run in the background to collect or transmit anything.

## Third parties

None. The extension includes no third-party analytics, advertising, or tracking services, and shares data with no one.

## Data retention

Settings remain on your device until you change or delete them, or uninstall the extension. Uninstalling the extension removes its local data.

## Security

All extension code is bundled in the package you install. The extension does not download or execute remote code, and it runs under Chrome's Manifest V3 security model.

## Children's privacy

The extension is not directed at children and collects no personal information from anyone, including children.

## Changes to this policy

If this policy changes, the updated version will be posted at this same URL with a new effective date. Material changes will also be noted in the extension's Chrome Web Store listing or release notes. Continuing to use the extension after an update means you accept the updated policy.

## Contact

Questions about this policy: frarredo+mocknik@gmail.com.

# Privacy Policy — Okta App Launcher

_Last updated: 23 August 2026_

## Summary

Okta App Launcher does not collect, transmit, or sell your data. It has no backend server and
no analytics. The developer receives nothing.

## What the extension stores

| Data | Where | Why |
|---|---|---|
| The list of Okta apps assigned to you (names, links, logo URLs) | `chrome.storage.local` — your browser, on this device | So the popup opens instantly instead of waiting on a network request |
| Your Okta domain (e.g. `yourorg.okta.com`) | `chrome.storage.sync` — your browser | So you only configure it once |

`chrome.storage.sync` is Chrome's own settings-sync feature. If you have Chrome sync enabled,
your Okta domain is synced between your own signed-in Chrome profiles by Google, under
[Google's privacy policy](https://policies.google.com/privacy) — the same way your bookmarks
are. The developer of this extension has no access to it.

## What the extension sends, and where

Exactly one network request, to your own Okta organization:

```
GET https://<your-configured-domain>/api/v1/users/me/appLinks
```

This is Okta's own API. The request is authenticated by the Okta **session cookie already in
your browser** — the same session you use to browse Okta normally.

- No passwords, API tokens, or admin credentials are used, requested, or stored.
- The response is treated strictly as data (parsed as JSON). No code from any remote source is
  ever downloaded or executed.
- No data is sent to the developer, to any third party, or to any server other than the Okta
  domain you configure.

## Permissions and why they are needed

- **`storage`** — to keep the two items in the table above. It grants no access to browsing
  history, cookies, or page content.
- **Host access to `*.okta.com` / `*.oktapreview.com`** — this is an *optional* permission,
  requested at runtime for the single domain you enter, not granted at install. It is used
  solely for the API request above. The extension cannot read any other website: it has no
  content scripts and runs on no page.

## What the extension does not do

- No analytics, telemetry, crash reporting, or usage tracking.
- No advertising, and no data used for advertising.
- No sale or transfer of user data to third parties.
- No use of data for creditworthiness or lending purposes.
- No access to browsing history, other tabs, page content, or your clipboard.
- No remote code execution.

## Deleting your data

Uninstalling the extension removes everything it stored. To clear it without uninstalling, use
Chrome's "Clear browsing data" for site/extension storage. Nothing persists anywhere else,
because nothing was ever sent anywhere else.

## Source code

This extension is open source — every claim above can be verified by reading it:
<https://github.com/alegmal/okta-app-launcher>

## Contact

Questions or concerns: open an issue at
<https://github.com/alegmal/okta-app-launcher/issues>

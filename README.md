# Okta App Launcher (wide)

A small Chrome extension that shows your assigned Okta apps in a **wide popup with fuzzy
search** — so long, near-identical app names are actually readable and findable.

## Why

The official Okta browser plugin popup is ~450px wide. Apps that share a long prefix get
truncated to look identical:

```
Observability - eu-west-1 - Application Troub…   ← which one is this?
Observability - eu-west-1 - Application Monit…   ← …and this?
```

This launcher shows the **full name**, and lets you type across it:

```
aws prod     → AWS Console - Production
obs eu trou  → Observability - eu-west-1 - Application Troubleshooting
```

Every term must match, in any order, so a couple of fragments narrow a long list fast.
Matches are highlighted; word-boundary and contiguous hits rank first.

## Install

Not on the Chrome Web Store yet — load it unpacked:

1. Clone or download this repo (keep the folder; Chrome loads the extension from it).
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. **Load unpacked** → select the repo folder.
5. Pin it (puzzle-piece icon → pin).

Optional: set a keyboard shortcut at `chrome://extensions/shortcuts`.

## First run

1. Click the icon → **⚙** → enter your Okta domain, e.g. `yourorg.okta.com`
   (no `https://`, no path).
2. Approve the permission prompt. It is scoped to that one domain.
3. Be signed in to Okta in the same browser profile.

Supports Okta-hosted domains — `*.okta.com` and `*.oktapreview.com`. Orgs that front Okta on
their own vanity domain aren't supported, because that would require a broad all-sites
permission.

## Use

| Key / control | Action |
|---|---|
| type | filter (fuzzy, multi-term, any order) |
| ↑ / ↓ | move |
| Enter | open highlighted app |
| Esc | clear the query |
| click a row | open that app in a new tab |
| ⭘ | open your Okta dashboard |
| ⤢ | open the same list in a full-width tab |
| ⚙ | settings — change your Okta domain |

## How it works / privacy

- Calls `GET https://<your-domain>/api/v1/users/me/appLinks` using your existing Okta
  **session cookie** — no passwords, no API tokens, no admin access.
- The app list is cached in `chrome.storage.local` so the popup opens instantly, then
  refreshes in the background on each open.
- Your domain setting lives in `chrome.storage.sync`.
- Nothing is sent anywhere except to your own Okta org. There is no third-party server, and
  no analytics.

Permissions requested: `storage`, plus an **optional** host permission for the single Okta
domain you configure (requested at runtime, not at install).

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Set your Okta domain" | Click **⚙**, enter your domain, approve the permission. |
| "Not signed in to Okta" | Open Okta in the same browser, sign in, reopen the popup. |
| "Enter an Okta domain" on save | Only `*.okta.com` / `*.oktapreview.com` are supported. |
| Empty despite being signed in | Open **⚙** and re-save the domain (re-grants permission). |
| Changed Okta orgs | **⚙** → enter the new domain → Save. |

## Privacy

No data leaves your device except the one API call to your own Okta org.
See [PRIVACY.md](PRIVACY.md).

## License

MIT — see [LICENSE](LICENSE).

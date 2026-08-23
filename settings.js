// Shared settings + defaults. Imported by the pages (options + app).
export const DEFAULTS = {
  oktaDomain: "", // e.g. "yourorg.okta.com" — no scheme, no path
};

export async function getSettings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

export async function setSettings(patch) {
  await chrome.storage.sync.set(patch);
}

// Normalize whatever the user typed into a bare host: "https://x.okta.com/app" -> "x.okta.com"
export function normalizeDomain(input) {
  if (!input) return "";
  return input.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "").trim().toLowerCase();
}

export function originForDomain(domain) {
  return domain ? `https://${domain}/*` : "";
}

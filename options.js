import { getSettings, setSettings, normalizeDomain, originForDomain } from "./settings.js";

const $domain = document.getElementById("domain");
const $status = document.getElementById("status");
const $save = document.getElementById("save");

async function load() {
  const s = await getSettings();
  $domain.value = s.oktaDomain;
}

function flash(msg, ok = true) {
  $status.textContent = msg;
  $status.style.color = ok ? "var(--accent)" : "#c0392b";
}

$save.addEventListener("click", async () => {
  const domain = normalizeDomain($domain.value);
  // Must stay in sync with optional_host_permissions in manifest.json — Chrome refuses to even
  // prompt for an origin the manifest didn't declare, so accepting a wider set here would
  // strand the user with a Save button that does nothing.
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.okta(preview)?\.com$/.test(domain)) {
    flash("Enter an Okta domain, e.g. yourorg.okta.com", false);
    return;
  }
  $domain.value = domain;

  // Request site access for this domain only (optional permission → asked at runtime).
  let granted;
  try {
    granted = await chrome.permissions.request({ origins: [originForDomain(domain)] });
  } catch (e) {
    flash(`Couldn't request access to ${domain}: ${e.message}`, false);
    return;
  }
  if (!granted) {
    flash("Permission denied — the launcher can't read your apps without it.", false);
    return;
  }

  await setSettings({ oktaDomain: domain });
  flash("Saved ✓");
});

load();

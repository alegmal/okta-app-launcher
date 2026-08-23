"use strict";

import { getSettings } from "./settings.js";

const CACHE_KEY = "appLinks";
let OKTA_ORG = ""; // https://<domain> — resolved from settings at startup

const $search = document.getElementById("search");
const $results = document.getElementById("results");
const $empty = document.getElementById("empty");
const $count = document.getElementById("count");
const $wide = document.getElementById("wide");
const $home = document.getElementById("home");
const $settings = document.getElementById("settings");

// This same page is used both as the toolbar popup and, via ?wide=1, as a
// full-width tab. In wide mode drop the fixed popup dimensions.
const IS_WIDE = new URLSearchParams(location.search).get("wide") === "1";
if (IS_WIDE) document.body.classList.add("wide");

let apps = []; // full list {label, linkUrl, logoUrl, sortOrder, ...}
let view = []; // current filtered+ranked list of {app, marks}
let active = 0; // highlighted index in `view`

// ---------------------------------------------------------------------------
// Fuzzy matching
// A query is split on whitespace into terms; EVERY term must fuzzy-match the
// label (order-independent across terms). Within a term, chars must appear in
// order (subsequence). Score rewards contiguous runs and word-boundary starts.
// Returns { score, positions:Set<number> } or null if any term fails.
// ---------------------------------------------------------------------------
function matchTerm(label, term) {
  const L = label.toLowerCase();
  const t = term.toLowerCase();

  // Fast path: contiguous substring. This is what users expect for short
  // terms (us, eu, ts, cross) and beats a loose subsequence hands down —
  // e.g. "eu" should match "svc-EU-02" strongly, not "svc-Us" loosely.
  const sub = L.indexOf(t);
  if (sub !== -1) {
    const before = sub === 0 ? " " : L[sub - 1];
    const boundary = /[\s\-/_.]/.test(before) ? 10 : 0;
    const score = 6 * t.length + boundary - sub * 0.05;
    const positions = [];
    for (let k = 0; k < t.length; k++) positions.push(sub + k);
    return { score, positions };
  }

  // Fallback: fuzzy subsequence — but a real typo-tolerant hit is COMPACT. Without a
  // gap cap, "eu" matches "Obs[e]rvability - [u]s-east-1" across 13 chars, so a search
  // for the eu-west region also returns us-east. Allow a few chars of drift per gap
  // (fat-finger, missing letter) and no more.
  const MAX_GAP = 3;
  let li = 0;
  let score = 0;
  let prevMatch = -2;
  const positions = [];
  for (let ti = 0; ti < t.length; ti++) {
    const c = t[ti];
    const found = L.indexOf(c, li);
    if (found === -1) return null;
    if (ti > 0 && found - prevMatch - 1 > MAX_GAP) return null;
    positions.push(found);
    // contiguous with previous matched char
    if (found === prevMatch + 1) score += 6;
    else score += 1;
    // bonus for start-of-word (after space, dash, slash, start)
    const before = found === 0 ? " " : L[found - 1];
    if (/[\s\-/_.]/.test(before)) score += 8;
    // small penalty for how far we had to skip
    score -= Math.min(found - li, 4) * 0.5;
    prevMatch = found;
    li = found + 1;
  }
  return { score, positions };
}

function matchLabel(label, terms) {
  let total = 0;
  const positions = new Set();
  for (const term of terms) {
    const m = matchTerm(label, term);
    if (!m) return null;
    total += m.score;
    for (const p of m.positions) positions.add(p);
  }
  // shorter labels rank slightly higher when scores tie (more specific)
  total -= label.length * 0.05;
  return { score: total, positions };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------
function highlight(label, positions) {
  const frag = document.createDocumentFragment();
  let open = false;
  let mark = null;
  for (let i = 0; i < label.length; i++) {
    if (positions.has(i)) {
      if (!open) {
        mark = document.createElement("mark");
        frag.appendChild(mark);
        open = true;
      }
      mark.appendChild(document.createTextNode(label[i]));
    } else {
      frag.appendChild(document.createTextNode(label[i]));
      open = false;
    }
  }
  return frag;
}

function initials(label) {
  const words = label.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/);
  return (words[0]?.[0] || "?").toUpperCase() + (words[1]?.[0] || "").toUpperCase();
}

function render() {
  $results.textContent = "";
  if (view.length === 0) {
    $count.textContent = apps.length ? "no matches" : "";
    return;
  }
  $count.textContent = `${view.length} / ${apps.length}`;
  const frag = document.createDocumentFragment();
  view.forEach((entry, i) => {
    const { app, positions } = entry;
    const row = document.createElement("a");
    row.className = "row" + (i === active ? " active" : "");
    row.href = app.linkUrl;
    row.target = "_blank";
    row.rel = "noopener noreferrer";
    row.dataset.index = i;

    if (app.logoUrl) {
      const img = document.createElement("img");
      img.src = app.logoUrl;
      img.alt = "";
      img.loading = "lazy";
      img.onerror = () => {
        const fb = document.createElement("span");
        fb.className = "logo-fallback";
        fb.textContent = initials(app.label);
        img.replaceWith(fb);
      };
      row.appendChild(img);
    } else {
      const fb = document.createElement("span");
      fb.className = "logo-fallback";
      fb.textContent = initials(app.label);
      row.appendChild(fb);
    }

    const label = document.createElement("span");
    label.className = "label";
    label.appendChild(positions ? highlight(app.label, positions) : document.createTextNode(app.label));
    row.appendChild(label);

    const open = document.createElement("span");
    open.className = "open";
    open.textContent = "open ↗";
    row.appendChild(open);

    row.addEventListener("mouseenter", () => setActive(i, false));
    frag.appendChild(row);
  });
  $results.appendChild(frag);
}

function setActive(i, scroll = true) {
  if (view.length === 0) return;
  active = Math.max(0, Math.min(i, view.length - 1));
  const rows = $results.children;
  for (let k = 0; k < rows.length; k++) rows[k].classList.toggle("active", k === active);
  if (scroll && rows[active]) rows[active].scrollIntoView({ block: "nearest" });
}

// ---------------------------------------------------------------------------
// Filter
// ---------------------------------------------------------------------------
function filter() {
  const q = $search.value.trim();
  if (!q) {
    view = apps.map((app) => ({ app, positions: null }));
  } else {
    const terms = q.split(/\s+/);
    const scored = [];
    for (const app of apps) {
      const m = matchLabel(app.label, terms);
      if (m) scored.push({ app, positions: m.positions, score: m.score });
    }
    scored.sort((a, b) => b.score - a.score || a.app.label.localeCompare(b.app.label));
    view = scored;
  }
  active = 0;
  render();
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------
function normalize(list) {
  return list
    .map((a) => ({
      label: a.label || a.appName || "(unnamed)",
      linkUrl: a.linkUrl,
      logoUrl: a.logoUrl || "",
      sortOrder: typeof a.sortOrder === "number" ? a.sortOrder : 9999,
    }))
    .filter((a) => a.linkUrl)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

function showEmpty(html, onClick) {
  $empty.hidden = false;
  $empty.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.innerHTML = html; // trusted static strings only
  $empty.appendChild(wrap);
  const btn = $empty.querySelector("button");
  if (btn) {
    btn.addEventListener("click", onClick || (() => chrome.tabs.create({ url: OKTA_ORG })));
  }
}

async function loadFromCache() {
  try {
    const { [CACHE_KEY]: cached } = await chrome.storage.local.get(CACHE_KEY);
    if (Array.isArray(cached) && cached.length) {
      apps = cached;
      filter();
    }
  } catch (_) {
    /* storage unavailable — ignore */
  }
}

async function fetchLive() {
  let res;
  try {
    res = await fetch(`${OKTA_ORG}/api/v1/users/me/appLinks`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    });
  } catch (_) {
    if (apps.length === 0) {
      showEmpty(
        `<h2>Can't reach Okta</h2>
         <p>Check your connection, then reload this tab.</p>
         <button>Open Okta</button>`
      );
    }
    return;
  }

  if (res.status === 401 || res.status === 403) {
    if (apps.length === 0) {
      showEmpty(
        `<h2>Not signed in to Okta</h2>
         <p>Open Okta and sign in, then reload this tab.</p>
         <button>Open Okta</button>`
      );
    }
    return;
  }
  if (!res.ok) {
    if (apps.length === 0) {
      showEmpty(
        `<h2>Okta returned an error (${res.status})</h2>
         <p>Try reloading this tab.</p>
         <button>Open Okta</button>`
      );
    }
    return;
  }

  const data = await res.json();
  apps = normalize(data);
  $empty.hidden = true;
  filter();
  try {
    await chrome.storage.local.set({ [CACHE_KEY]: apps });
  } catch (_) {
    /* ignore */
  }
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
$wide.addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("app.html?wide=1") });
  window.close(); // close the popup once the wide tab opens
});

$home.addEventListener("click", () => {
  if (OKTA_ORG) chrome.tabs.create({ url: OKTA_ORG });
});

// Always reachable — a wrong domain lands in the error path, which has no settings link.
$settings.addEventListener("click", () => chrome.runtime.openOptionsPage());

$search.addEventListener("input", filter);

$search.addEventListener("keydown", (e) => {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    setActive(active + 1);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    setActive(active - 1);
  } else if (e.key === "Enter") {
    e.preventDefault();
    const entry = view[active];
    if (entry) chrome.tabs.create({ url: entry.app.linkUrl });
  } else if (e.key === "Escape") {
    if ($search.value) {
      e.preventDefault();
      $search.value = "";
      filter();
    }
  }
});

// ---------------------------------------------------------------------------
// Startup: resolve the configured Okta domain, then load.
// ---------------------------------------------------------------------------
async function init() {
  const { oktaDomain } = await getSettings();
  if (!oktaDomain) {
    showEmpty(
      `<h2>Set your Okta domain</h2>
       <p>Open settings and enter your org's Okta domain to get started.</p>
       <button>Open settings</button>`,
      () => chrome.runtime.openOptionsPage()
    );
    return;
  }
  OKTA_ORG = `https://${oktaDomain}`;
  await loadFromCache(); // paint cache instantly (stale-while-revalidate)
  await fetchLive();
}

init();

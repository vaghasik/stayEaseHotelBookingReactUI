// Remembers the person's last search (city + dates + guests) in
// localStorage, so navigating away and back - "Browse more hotels" from
// the booking confirmation page, or the login round-trip when booking
// while logged out - doesn't force them to re-enter dates they already
// picked.

const KEY = "stayease.lastSearch";

export interface SearchPrefs {
  city?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

export function loadSearchPrefs(): SearchPrefs {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed ? parsed : {};
  } catch {
    return {};
  }
}

export function saveSearchPrefs(patch: SearchPrefs) {
  try {
    const current = loadSearchPrefs();
    window.localStorage.setItem(KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    // localStorage can throw in private-browsing/quota-exceeded edge cases -
    // not remembering the search isn't worth crashing the page over.
  }
}

// Wipe the remembered search. Called on login/logout so one person's search
// (city + dates) never leaks into the next person's session on a shared
// browser - the remembered search is a per-visit convenience, not something
// that should survive a change of user.
export function clearSearchPrefs() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore - nothing we can do, and it's not worth crashing over
  }
}

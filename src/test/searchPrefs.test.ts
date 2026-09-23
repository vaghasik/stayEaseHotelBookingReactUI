import { describe, it, expect, beforeEach } from "vitest";
import { clearSearchPrefs, loadSearchPrefs, saveSearchPrefs } from "../utils/searchPrefs";

describe("searchPrefs", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty object when nothing has been saved", () => {
    expect(loadSearchPrefs()).toEqual({});
  });

  it("saves and reloads a search", () => {
    saveSearchPrefs({ city: "Goa", checkIn: "2027-01-01", checkOut: "2027-01-03" });
    expect(loadSearchPrefs()).toEqual({ city: "Goa", checkIn: "2027-01-01", checkOut: "2027-01-03" });
  });

  it("merges a partial patch onto the existing prefs instead of replacing them", () => {
    saveSearchPrefs({ city: "Goa" });
    saveSearchPrefs({ checkIn: "2027-02-01" });
    expect(loadSearchPrefs()).toEqual({ city: "Goa", checkIn: "2027-02-01" });
  });

  it("clearSearchPrefs wipes everything (regression: search must not leak between users)", () => {
    // This is exactly the bug reported: user A's search stayed in
    // localStorage and user B inherited it after logging in on the same
    // browser. clearSearchPrefs() is called on login/register/logout to fix
    // that - this test locks that behaviour in.
    saveSearchPrefs({ city: "Goa", checkIn: "2027-01-01", checkOut: "2027-01-03" });
    expect(loadSearchPrefs()).not.toEqual({});

    clearSearchPrefs();

    expect(loadSearchPrefs()).toEqual({});
    expect(window.localStorage.getItem("stayease.lastSearch")).toBeNull();
  });

  it("does not throw if localStorage.getItem returns malformed JSON", () => {
    window.localStorage.setItem("stayease.lastSearch", "{not json");
    expect(loadSearchPrefs()).toEqual({});
  });
});

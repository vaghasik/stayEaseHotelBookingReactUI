import { describe, it, expect } from "vitest";
import { ensureWorkingLocalStorage, hasWorkingLocalStorage, MemoryStorage } from "./localStoragePolyfill";

describe("MemoryStorage", () => {
  it("implements get/set/remove/clear/length correctly", () => {
    const s = new MemoryStorage();
    s.setItem("a", "1");
    s.setItem("b", JSON.stringify({ x: 1 }));

    expect(s.getItem("a")).toBe("1");
    expect(s.getItem("missing")).toBeNull();
    expect(s.length).toBe(2);

    s.removeItem("a");
    expect(s.getItem("a")).toBeNull();
    expect(s.length).toBe(1);

    s.clear();
    expect(s.length).toBe(0);
    expect(s.getItem("b")).toBeNull();
  });
});

describe("hasWorkingLocalStorage", () => {
  it("returns true for a real Storage-like object", () => {
    expect(hasWorkingLocalStorage({ localStorage: new MemoryStorage() })).toBe(true);
  });

  it("returns false when localStorage is undefined", () => {
    expect(hasWorkingLocalStorage({ localStorage: undefined })).toBe(false);
  });

  it("returns false when localStorage exists but isn't a real Storage (no .clear)", () => {
    expect(hasWorkingLocalStorage({ localStorage: {} as Storage })).toBe(false);
  });

  it("does not throw even if accessing localStorage throws", () => {
    const hostile = {
      get localStorage(): Storage {
        throw new Error("SecurityError");
      },
    };
    expect(() => hasWorkingLocalStorage(hostile)).not.toThrow();
    expect(hasWorkingLocalStorage(hostile)).toBe(false);
  });
});

describe("ensureWorkingLocalStorage", () => {
  it("installs a working localStorage when the target has none (the exact bug reported)", () => {
    // This reproduces the actual failure: window.localStorage is undefined,
    // so window.localStorage.clear() throws "Cannot read properties of
    // undefined (reading 'clear')".
    const brokenWindow: { localStorage?: Storage } = { localStorage: undefined };
    expect(() => brokenWindow.localStorage!.clear()).toThrow();

    ensureWorkingLocalStorage(brokenWindow);

    expect(brokenWindow.localStorage).toBeDefined();
    expect(() => brokenWindow.localStorage!.clear()).not.toThrow();
    brokenWindow.localStorage!.setItem("k", "v");
    expect(brokenWindow.localStorage!.getItem("k")).toBe("v");
  });

  it("leaves an already-working localStorage untouched", () => {
    const workingStorage = new MemoryStorage();
    workingStorage.setItem("existing", "value");
    const target = { localStorage: workingStorage };

    ensureWorkingLocalStorage(target);

    // Same instance, not replaced - and its data survived.
    expect(target.localStorage).toBe(workingStorage);
    expect(target.localStorage.getItem("existing")).toBe("value");
  });
});

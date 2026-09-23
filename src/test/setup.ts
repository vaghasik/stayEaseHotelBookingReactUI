import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { ensureWorkingLocalStorage } from "./localStoragePolyfill";

// RTL normally auto-registers cleanup via a global afterEach, but that
// detection relies on test-globals being injected (vitest.config's
// `globals: true`), which is intentionally OFF here so test-only types
// don't leak into the production `tsc -b` type-check. So clean up
// explicitly instead - otherwise each test's render() accumulates in the
// DOM and later assertions in the same file see duplicate elements.
afterEach(() => {
  cleanup();
});

// Node 22+ ships its own experimental global `localStorage` (backed by a
// SQLite file you opt into via --localstorage-file - hence the
// "ExperimentalWarning: localStorage is not available..." warning some
// people see). On some Node/jsdom version combinations that experimental
// global ends up shadowing jsdom's own window.localStorage instead of
// jsdom providing a real one, leaving window.localStorage undefined and
// every call like window.localStorage.clear() throwing "Cannot read
// properties of undefined". This isn't something the tests themselves can
// control (it depends on the Node version running them), so fall back to a
// real in-memory implementation - it only kicks in when jsdom's own
// localStorage is missing/broken, and does nothing where jsdom already
// works correctly (see localStoragePolyfill.test.ts for both cases).
ensureWorkingLocalStorage(window);



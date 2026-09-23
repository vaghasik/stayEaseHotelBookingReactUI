// Installs a working in-memory localStorage on `target` (normally `window`)
// only when the existing one is missing or broken. See setup.ts for the
// full explanation of why this is needed (a Node/jsdom version interaction
// that can leave window.localStorage undefined).
export function hasWorkingLocalStorage(target: { localStorage?: Storage }): boolean {
  try {
    return typeof target.localStorage?.clear === "function";
  } catch {
    return false;
  }
}

export class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  clear() {
    this.store.clear();
  }
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
  setItem(key: string, value: string) {
    this.store.set(key, String(value));
  }
}

export function ensureWorkingLocalStorage(target: { localStorage?: Storage }): void {
  if (hasWorkingLocalStorage(target)) return;
  Object.defineProperty(target, "localStorage", {
    value: new MemoryStorage(),
    writable: true,
    configurable: true,
  });
}

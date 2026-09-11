// browserStorage.spec.ts — the IndexedDB-backed localStorage facade and
// initBrowserStorage: facade reads/writes (incl. the fractional-index tail),
// write-through failures, IDB seed success/failure, every migration arm
// (fresh/stale/null-value/null-key/failing-put/clear-throws/no-native/
// throwing-native), and the install-failure arm. IDB is absent in node, so
// a minimal in-memory fake globalThis.indexedDB drives the open/
// onupgradeneeded/onsuccess/transaction/cursor/put/delete/clear paths; the
// indexedDB-undefined degradation arm deletes it. Globals are restored in
// afterEach. NOTE: the install-failure test redefines globalThis.localStorage
// as non-configurable and MUST stay last in this file.
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  _resetBrowserStorageForTests,
  initBrowserStorage,
} from "../src/browserStorage.ts";

const g = globalThis as unknown as Record<string, unknown>;

function flush(): Promise<void> {
  return new Promise((r) => setTimeout(r, 10));
}

// ─── Minimal in-memory fake IndexedDB ──────────────────────────────────────

interface FakeOpts {
  failOpen?: unknown;
  cursorError?: unknown;
  txOutcome?: "complete" | "error" | "abort";
}

function makeFakeIndexedDB(
  data: Map<string, string>,
  opts: FakeOpts = {},
): { open: (name: string, version: number) => unknown; creates: () => number } {
  let storeExists = false;
  let creates = 0;

  const store = {
    openCursor(): unknown {
      const req = {} as Record<string, unknown>;
      queueMicrotask(() => {
        if (opts.cursorError !== undefined) {
          req["error"] = opts.cursorError;
          (req["onerror"] as (() => void) | undefined)?.();
          return;
        }
        const entries = [...data.entries()];
        let i = 0;
        const pump = (): void => {
          if (i >= entries.length) {
            req["result"] = null;
            (req["onsuccess"] as (() => void) | undefined)?.();
            return;
          }
          const [key, value] = entries[i++];
          req["result"] = {
            key,
            value,
            continue(): void {
              queueMicrotask(pump);
            },
          };
          (req["onsuccess"] as (() => void) | undefined)?.();
        };
        pump();
      });
      return req;
    },
    put(value: string, key: string): void {
      data.set(String(key), String(value));
    },
    delete(key: string): void {
      data.delete(String(key));
    },
    clear(): void {
      data.clear();
    },
  };

  const db = {
    objectStoreNames: {
      contains: (): boolean => storeExists,
    },
    createObjectStore: (): void => {
      storeExists = true;
      creates += 1;
    },
    transaction: (): unknown => {
      const tx = {} as Record<string, unknown>;
      tx["objectStore"] = () => store;
      tx["error"] = undefined;
      queueMicrotask(() => {
        if (opts.txOutcome === "error") {
          tx["error"] = new Error("tx error");
          (tx["onerror"] as (() => void) | undefined)?.();
        } else if (opts.txOutcome === "abort") {
          tx["error"] = new Error("tx abort");
          (tx["onabort"] as (() => void) | undefined)?.();
        } else {
          (tx["oncomplete"] as (() => void) | undefined)?.();
        }
      });
      return tx;
    },
  };

  return {
    open(_name: string, _version: number): unknown {
      const req = {} as Record<string, unknown>;
      queueMicrotask(() => {
        if (opts.failOpen !== undefined) {
          req["error"] = opts.failOpen;
          (req["onerror"] as (() => void) | undefined)?.();
          return;
        }
        req["result"] = db;
        (req["onupgradeneeded"] as (() => void) | undefined)?.();
        (req["onsuccess"] as (() => void) | undefined)?.();
      });
      return req;
    },
    creates: () => creates,
  };
}

// ─── Native-localStorage stand-in ──────────────────────────────────────────

interface NativeOpts {
  clearThrows?: boolean;
  nullKeys?: boolean;
}

function makeNative(
  initial: Record<string, string | null>,
  opts: NativeOpts = {},
): Storage & { cleared: () => boolean } {
  const map = new Map<string, string | null>(Object.entries(initial));
  let wasCleared = false;
  return {
    get length(): number {
      return map.size;
    },
    key(i: number): string | null {
      if (opts.nullKeys) return null;
      return [...map.keys()][i] ?? null;
    },
    getItem(k: string): string | null {
      return map.get(k) ?? null;
    },
    setItem(k: string, v: string): void {
      map.set(k, v);
    },
    removeItem(k: string): void {
      map.delete(k);
    },
    clear(): void {
      wasCleared = true;
      if (opts.clearThrows) throw new Error("storage denied");
      map.clear();
    },
    cleared: () => wasCleared,
  };
}

function facade(): Storage {
  return g["localStorage"] as Storage;
}

// ─── Harness ───────────────────────────────────────────────────────────────

const origConsoleError = console.error;
let errors: unknown[][];
let savedLocal: unknown;
let savedHadLocal: boolean;

beforeEach(() => {
  savedHadLocal = Object.prototype.hasOwnProperty.call(
    globalThis,
    "localStorage",
  );
  savedLocal = g["localStorage"];
  errors = [];
  console.error = (...args: any[]) => {
    errors.push(args);
  };
  delete g["indexedDB"];
  _resetBrowserStorageForTests();
});

afterEach(() => {
  console.error = origConsoleError;
  const desc = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  if (desc && desc.configurable) delete g["localStorage"];
  if (savedHadLocal) g["localStorage"] = savedLocal;
  else if (desc && !desc.configurable) g["localStorage"] = undefined;
  delete g["indexedDB"];
  _resetBrowserStorageForTests();
});

describe("facade reads and writes", () => {
  it("serves length/key/getItem from the seeded cache and writes through", async () => {
    const data = new Map<string, string>([["seed", "s"]]);
    g["indexedDB"] = makeFakeIndexedDB(data);
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    const f = facade();
    assert.equal(f.length, 1);
    assert.equal(f.key(0), "seed");
    assert.equal(f.key(-1), null);
    assert.equal(f.key(7), null);
    assert.equal(f.getItem("seed"), "s");
    assert.equal(f.getItem("missing"), null);

    f.setItem("a", "1");
    f.setItem("b", "2");
    await flush();
    assert.equal(f.getItem("a"), "1");
    assert.equal(f.length, 3);
    assert.equal(f.key(1.5), null);
    assert.equal(data.get("a"), "1");

    f.removeItem("a");
    await flush();
    assert.equal(f.getItem("a"), null);
    assert.equal(data.has("a"), false);

    f.clear();
    await flush();
    assert.equal(f.length, 0);
    assert.equal(data.size, 0);
    assert.deepEqual(errors, []);
  });

  it("reports write-through failures without throwing", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map(), { txOutcome: "error" });
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    const f = facade();
    f.setItem("a", "1");
    f.removeItem("a");
    f.clear();
    await flush();
    assert.equal(errors.length, 3);
    assert.match(String(errors[0][0]), /failed to persist 'a'/);
    assert.match(String(errors[2][0]), /failed to persist '\*'/);
  });

  it("reports aborted transactions without throwing", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map(), { txOutcome: "abort" });
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    const f = facade();
    f.setItem("a", "1");
    f.removeItem("a");
    f.clear();
    await flush();
    assert.equal(errors.length, 3);
  });
});

describe("seed from IndexedDB", () => {
  it("loads every dumped row into the cache", async () => {
    g["indexedDB"] = makeFakeIndexedDB(
      new Map([["a", "1"], ["b", "2"]]),
    );
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    assert.equal(facade().getItem("a"), "1");
    assert.equal(facade().getItem("b"), "2");
    assert.deepEqual(errors, []);
  });

  it("degrades to memory-only when indexedDB is absent", async () => {
    g["localStorage"] = makeNative({ n: "v" });
    await initBrowserStorage();
    assert.equal(facade().getItem("n"), "v");
    assert.ok(errors.some((e) => /failed to load IndexedDB cache/.test(String(e[0]))));
  });

  it("logs when open fails", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map(), {
      failOpen: new Error("nope"),
    });
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    assert.ok(errors.some((e) => /failed to load IndexedDB cache/.test(String(e[0]))));
  });

  it("logs when the dump cursor fails", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map(), {
      cursorError: new Error("cursor boom"),
    });
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    assert.ok(errors.some((e) => /failed to load IndexedDB cache/.test(String(e[0]))));
  });

  it("creates the store once, then reuses it", async () => {
    const fake = makeFakeIndexedDB(new Map());
    g["indexedDB"] = fake;
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    _resetBrowserStorageForTests();
    await initBrowserStorage();
    assert.equal(fake.creates(), 1);
  });

  it("early-returns once installed", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    g["localStorage"] = makeNative({});
    await initBrowserStorage();
    const f = facade();
    f.setItem("x", "1");
    await initBrowserStorage();
    assert.equal(facade(), f);
    assert.equal(facade().getItem("x"), "1");
  });
});

describe("native migration", () => {
  it("migrates fresh keys and clears native once fully moved", async () => {
    const data = new Map<string, string>([["keep", "k"]]);
    g["indexedDB"] = makeFakeIndexedDB(data);
    const native = makeNative({ fresh: "1" });
    g["localStorage"] = native;
    await initBrowserStorage();
    assert.equal(facade().getItem("fresh"), "1");
    assert.equal(facade().getItem("keep"), "k");
    assert.equal(data.get("fresh"), "1");
    assert.equal(native.cleared(), true);
  });

  it("never lets stale native keys regress fresher IDB data", async () => {
    const data = new Map<string, string>([["s", "idb"]]);
    g["indexedDB"] = makeFakeIndexedDB(data);
    const native = makeNative({ s: "native" });
    g["localStorage"] = native;
    await initBrowserStorage();
    assert.equal(facade().getItem("s"), "idb");
    assert.equal(native.cleared(), false);
  });

  it("skips null values and null keys without migrating", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    const native = makeNative({ n: null });
    g["localStorage"] = native;
    await initBrowserStorage();
    assert.equal(facade().getItem("n"), null);
    assert.equal(native.cleared(), false);

    _resetBrowserStorageForTests();
    const nullKeyed = makeNative({ a: "1" }, { nullKeys: true });
    g["localStorage"] = nullKeyed;
    await initBrowserStorage();
    assert.equal(facade().getItem("a"), null);
    assert.equal(nullKeyed.cleared(), false);
  });

  it("keeps native when a write fails mid-migration", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map(), { txOutcome: "error" });
    const native = makeNative({ fresh: "1" });
    g["localStorage"] = native;
    await initBrowserStorage();
    assert.equal(facade().getItem("fresh"), "1");
    assert.equal(native.cleared(), false);
  });

  it("swallows a native clear failure after a full move", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    const native = makeNative({ fresh: "1" }, { clearThrows: true });
    g["localStorage"] = native;
    await initBrowserStorage();
    assert.equal(facade().getItem("fresh"), "1");
    assert.equal(native.cleared(), true);
  });

  it("skips migration with no native or a length-less global", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    g["localStorage"] = undefined;
    await initBrowserStorage();
    assert.equal(facade().length, 0);

    _resetBrowserStorageForTests();
    g["localStorage"] = {};
    await initBrowserStorage();
    assert.equal(facade().length, 0);
    assert.deepEqual(errors, []);
  });

  it("logs when migration itself throws", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    g["localStorage"] = {
      get length(): number {
        throw new Error("denied");
      },
    };
    await initBrowserStorage();
    assert.ok(
      errors.some((e) => /failed to migrate native localStorage/.test(String(e[0]))),
    );
  });
});

describe("install failure (non-configurable global; stays last)", () => {
  it("logs and still marks installed when the facade cannot be set", async () => {
    g["indexedDB"] = makeFakeIndexedDB(new Map());
    const native = makeNative({ n: "v" });
    Object.defineProperty(globalThis, "localStorage", {
      value: native,
      configurable: false,
      writable: true,
    });
    _resetBrowserStorageForTests();
    await initBrowserStorage();
    assert.ok(
      errors.some((e) =>
        /failed to install IndexedDB-backed localStorage/.test(String(e[0])),
      ),
    );
    assert.equal(native.cleared(), true);
    assert.equal(g["localStorage"], native);
    await initBrowserStorage();
    assert.ok(
      errors.filter((e) =>
        /failed to install IndexedDB-backed localStorage/.test(String(e[0])),
      ).length === 1,
    );
  });
});

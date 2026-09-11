/**
 * Unit tests for lib/browserStorage.ts — the IDB-backed localStorage facade.
 *
 * happy-dom has no IndexedDB, so we install a hand-rolled in-memory IDB fake
 * (same contract as inpaint-project-store.test.ts, plus openCursor support for
 * the dump). Verifies the four contracts that keep the whole app's persistence
 * on IndexedDB:
 *
 *   1. initBrowserStorage seeds the cache from IDB, then swaps the global.
 *   2. Native localStorage is migrated into IDB once and cleared after.
 *   3. Facade writes write-through to IDB and survive a fresh init (reload).
 *   4. IndexedDB unavailable → facade degrades to in-memory-only (never
 *      throws) — the "autosave never breaks the editor" contract.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import {
  initBrowserStorage,
  _resetBrowserStorageForTests,
} from "@melite/contracts"

// ── In-memory IndexedDB fake with cursor support ────────────────────────────
type IDBListener = ((ev: Event) => void) | null
type KV = [string, string]

class FakeGetRequest {
  result: unknown
  private _onsuccess: IDBListener = null
  constructor(result: unknown) { this.result = result }
  set onsuccess(fn: IDBListener) {
    this._onsuccess = fn
    queueMicrotask(() => fn?.(new Event("success")))
  }
  get onsuccess(): IDBListener { return this._onsuccess }
}

class FakeCursor {
  key: string
  value: string
  private store: FakeObjectStore
  private request: FakeCursorRequest
  private idx: number
  constructor(
    store: FakeObjectStore,
    request: FakeCursorRequest,
    idx: number,
    key: string,
    value: string,
  ) {
    this.store = store
    this.request = request
    this.idx = idx
    this.key = key
    this.value = value
  }
  continue(): void {
    // Real IDB fires the next success event asynchronously; the module's
    // handler reads `request.result`, so re-emit through the request.
    this.store.emitCursor(this.request, this.idx + 1)
  }
}

class FakeCursorRequest {
  result: FakeCursor | null
  private store: FakeObjectStore
  private _onsuccess: IDBListener = null
  constructor(store: FakeObjectStore) {
    this.store = store
    this.result = null
  }
  set onsuccess(fn: IDBListener) {
    this._onsuccess = fn
    // Fire the first cursor on the next microtask so the module's handler is
    // assigned before any callback runs (real IDB's async dispatch).
    queueMicrotask(() => this.store.emitCursor(this, 0))
  }
  get onsuccess(): IDBListener { return this._onsuccess }
}

class FakeObjectStore {
  private data: KV[] = []
  put(value: string, key: string): unknown {
    const i = this.data.findIndex(([k]) => k === key)
    if (i >= 0) this.data[i] = [key, value]
    else this.data.push([key, value])
    return {}
  }
  get(key: string): FakeGetRequest {
    const found = this.data.find(([k]) => k === key)
    return new FakeGetRequest(found ? found[1] : undefined)
  }
  delete(key: string): unknown {
    this.data = this.data.filter(([k]) => k !== key)
    return {}
  }
  clear(): unknown {
    this.data = []
    return {}
  }
  openCursor(): FakeCursorRequest {
    return new FakeCursorRequest(this)
  }
  emitCursor(request: FakeCursorRequest, idx: number): void {
    if (idx >= 0 && idx < this.data.length) {
      const [k, v] = this.data[idx]
      // The module's handler reads `request.result` (real IDB semantics) —
      // set it BEFORE firing the event, or the dump sees null forever.
      request.result = new FakeCursor(this, request, idx, k, v)
      request.onsuccess?.(new Event("success"))
    } else {
      request.result = null // cursor === null → dump complete
      request.onsuccess?.(new Event("success"))
    }
  }
  entries(): KV[] { return [...this.data] }
}

class FakeTransaction {
  oncomplete: IDBListener = null
  onerror: IDBListener = null
  onabort: IDBListener = null
  error: Error | null = null
  private store: FakeObjectStore
  constructor(store: FakeObjectStore) {
    this.store = store
    queueMicrotask(() => this.oncomplete?.(new Event("complete")))
  }
  objectStore(): FakeObjectStore { return this.store }
}

class FakeDB {
  objectStoreNames = { contains: () => true }
  private store = new FakeObjectStore()
  // Real IDB signature: transaction(storeNames, mode) — tests pass both.
  transaction(_storeNames?: string | string[], _mode?: string): FakeTransaction {
    return new FakeTransaction(this.store)
  }
  createObjectStore(): FakeObjectStore { return this.store }
  storeEntries(): KV[] { return this.store.entries() }
}

class FakeIDBOpenRequest {
  result: FakeDB
  onupgradeneeded: IDBListener = null
  onsuccess: IDBListener = null
  onerror: IDBListener = null
  constructor(db: FakeDB) {
    this.result = db
    queueMicrotask(() => {
      this.onupgradeneeded?.(new Event("upgradeneeded"))
      this.onsuccess?.(new Event("success"))
    })
  }
}

class FakeIndexedDB {
  dbs = new Map<string, FakeDB>()
  open(name: string): FakeIDBOpenRequest {
    let db = this.dbs.get(name)
    if (!db) { db = new FakeDB(); this.dbs.set(name, db) }
    return new FakeIDBOpenRequest(db)
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────
let fake: FakeIndexedDB
let nativeMock: Storage
const realLocalStorage = globalThis.localStorage

/** A Storage-shaped object standing in for the browser's native localStorage. */
function makeNative(): Storage {
  const store = new Map<string, string>()
  return {
    get length() { return store.size },
    key: (i: number) => [...store.keys()][i] ?? null,
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
    removeItem: (k: string) => { store.delete(k) },
    clear: () => { store.clear() },
  } as Storage
}

function installFake(): void {
  fake = new FakeIndexedDB()
  ;(globalThis as Record<string, unknown>).indexedDB = fake
  _resetBrowserStorageForTests()
}

beforeEach(() => {
  installFake()
  nativeMock = makeNative()
  Object.defineProperty(globalThis, "localStorage", {
    value: nativeMock,
    configurable: true,
    writable: true,
  })
})

afterEach(() => {
  // Restore the environment's default localStorage for the next test file.
  _resetBrowserStorageForTests()
  delete (globalThis as Record<string, unknown>).indexedDB
  Object.defineProperty(globalThis, "localStorage", {
    value: realLocalStorage,
    configurable: true,
    writable: true,
  })
})

// ── Tests ──────────────────────────────────────────────────────────────────
describe("browserStorage — seed from IndexedDB + install", () => {
  it("seeds the cache from IndexedDB and swaps the global", async () => {
    // Pre-populate the fake IDB backing store directly.
    const db = fake.open("melite:browser-storage:v1").result
    const tx = db.transaction("kv", "readwrite")
    tx.objectStore().put("gpt-4o", "tech_noir_enhance")
    tx.objectStore().put("done", "inpaint:onboarding:v1")

    await initBrowserStorage()
    expect(globalThis.localStorage).not.toBe(nativeMock)
    expect(localStorage.getItem("tech_noir_enhance")).toBe("gpt-4o")
    expect(localStorage.getItem("inpaint:onboarding:v1")).toBe("done")
    expect(localStorage.getItem("missing")).toBeNull()
  })

  it("migrates native localStorage into IDB and clears it on success", async () => {
    nativeMock.setItem("melite:flow:v2:agent", '{"stages":[]}')
    nativeMock.setItem("tech_noir_prompt_history", '{"perSegment":{},"global":[]}')
    nativeMock.setItem("inpaint:onboarding:v1", "done")

    await initBrowserStorage()
    expect(localStorage.getItem("melite:flow:v2:agent")).toBe('{"stages":[]}')
    expect(localStorage.getItem("tech_noir_prompt_history")).toBe('{"perSegment":{},"global":[]}')
    expect(localStorage.getItem("inpaint:onboarding:v1")).toBe("done")
    // Native was cleared — the 5MB quota is freed.
    expect(nativeMock.length).toBe(0)
  })

  it("does NOT let stale native data regress fresher IndexedDB data", async () => {
    const db = fake.open("melite:browser-storage:v1").result
    db.transaction("kv", "readwrite").objectStore().put("fresher", "melite:tag-map:v1")
    nativeMock.setItem("melite:tag-map:v1", "stale")

    await initBrowserStorage()
    expect(localStorage.getItem("melite:tag-map:v1")).toBe("fresher")
  })

  it("is idempotent — a second call installs once", async () => {
    await initBrowserStorage()
    const first = globalThis.localStorage
    await initBrowserStorage()
    expect(globalThis.localStorage).toBe(first)
  })
})

describe("browserStorage — write-through facade", () => {
  it("setItem persists to IDB and survives a reload (fresh init)", async () => {
    await initBrowserStorage()
    localStorage.setItem("tn:copilot:activeThread", '{"agent":"a","threadId":"t1"}')
    localStorage.setItem("motion-card-thumbnails", '{"s1":"data:image/png;base64,AAAA"}')

    // "Reload": reset the module but keep the SAME fake instance — in real
    // IDB the data persists across open() calls for a db name; the fake
    // instance IS the backing store, so a fresh FakeIndexedDB() would be a
    // different (empty) database.
    _resetBrowserStorageForTests()
    await initBrowserStorage()

    expect(localStorage.getItem("tn:copilot:activeThread")).toBe('{"agent":"a","threadId":"t1"}')
    expect(localStorage.getItem("motion-card-thumbnails")).toBe('{"s1":"data:image/png;base64,AAAA"}')
  })

  it("removeItem and clear delete from IDB", async () => {
    await initBrowserStorage()
    localStorage.setItem("a", "1")
    localStorage.setItem("b", "2")
    localStorage.removeItem("a")
    expect(localStorage.getItem("a")).toBeNull()

    localStorage.clear()
    expect(localStorage.length).toBe(0)
    expect(localStorage.getItem("b")).toBeNull()
  })

  it("implements the Storage length + key(i) interface", async () => {
    await initBrowserStorage()
    localStorage.setItem("one", "1")
    localStorage.setItem("two", "2")
    expect(localStorage.length).toBe(2)
    const keys: Array<string | null> = []
    for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i))
    expect(keys.sort()).toEqual(["one", "two"])
    expect(localStorage.key(5)).toBeNull()
  })

  it("never throws synchronously and logs write failures NO-SILENT-SWALLOW", async () => {
    await initBrowserStorage()
    // Simulate a corrupted connection: swap in an IDB whose open() errors.
    const badStore = {
      open: () => {
        const req: Record<string, unknown> = {
          result: null,
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          error: new Error("boom"),
        }
        // Real IDB fires onerror when the open fails — without this the
        // module's openDb() promise never settles and the failure is silent.
        queueMicrotask(() => (req.onerror as (ev: Event) => void)?.(new Event("error")))
        return req
      },
    }
    ;(globalThis as Record<string, unknown>).indexedDB = badStore
    _resetBrowserStorageForTests()

    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => localStorage.setItem("k", "v")).not.toThrow()
    expect(localStorage.getItem("k")).toBe("v") // in-memory still works
    await new Promise((r) => setTimeout(r, 0))
    expect(error).toHaveBeenCalled()
    expect(String(error.mock.calls[0][0])).toMatch(/failed to persist/)
    error.mockRestore()
  })
})

describe("browserStorage — IndexedDB unavailable (degradation)", () => {
  it("installs an in-memory facade that works for the session", async () => {
    delete (globalThis as Record<string, unknown>).indexedDB
    _resetBrowserStorageForTests()
    nativeMock.setItem("tech_noir_timeline", '{"segments":[]}')
    const error = vi.spyOn(console, "error").mockImplementation(() => {})

    await initBrowserStorage()
    // Native keys still served from the in-memory overlay.
    expect(localStorage.getItem("tech_noir_timeline")).toBe('{"segments":[]}')
    // Writes work in-memory; failures are logged, never thrown.
    expect(() => localStorage.setItem("x", "y")).not.toThrow()
    expect(localStorage.getItem("x")).toBe("y")
    await new Promise((r) => setTimeout(r, 0))
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })
})

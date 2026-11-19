// tag-map.spec.ts — the tag registry + forward index: colors, slugs,
// registry/index actions, the boundary ratchet (via server hydrate),
// init gating, and the debounced server PUT. Runs WITHOUT localStorage
// (node default) — the persisted-cache arms live in tag-map-init-*.spec.ts.
import { describe, it, beforeEach, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { until } from "../../../../tests/helpers/until.ts";
import {
  TAG_COLOR_META,
  TAG_COLOR_VALUES,
  initTagSync,
  isTagColor,
  tagsOf,
  useTagMap,
} from "../src/tagMap.ts";
import type { TagMapState } from "../src/tagMap.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});
beforeEach(() => {
  useTagMap.setState({ tags: {}, map: {} });
});

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const state = (): { tags: Record<string, { name: string }>; map: Record<string, string[]> } =>
  useTagMap.getState() as unknown as {
    tags: Record<string, { name: string }>;
    map: Record<string, string[]>;
  };

describe("isTagColor + palette", () => {
  it("gates the closed color vocabulary", () => {
    assert.equal(isTagColor("brand"), true);
    assert.equal(isTagColor("nope"), false);
    assert.equal(isTagColor(7), false);
    assert.equal(isTagColor(null), false);
    assert.equal(TAG_COLOR_VALUES.length, 7);
    assert.ok(TAG_COLOR_META.brand.dot.length > 0);
  });
});

describe("createTag", () => {
  it("slugs names, refuses blanks, cycles colors", () => {
    const s = useTagMap.getState();
    assert.equal(s.createTag("   "), "");
    const a = s.createTag("My Tag!");
    assert.equal(a, "my-tag");
    assert.equal(state().tags["my-tag"].name, "My Tag!");
    const b = s.createTag("My Tag!");
    assert.equal(b, "my-tag-2");
    const c = s.createTag("My Tag!");
    assert.equal(c, "my-tag-3");
    const weird = s.createTag("!!!");
    assert.equal(weird, "tag");
    const explicit = s.createTag("Blue", "cyan");
    assert.equal(useTagMap.getState().tags["Blue".toLowerCase()] !== undefined, true);
    assert.equal(state().tags["blue"].name, "Blue");
    void explicit;
  });
});

describe("renameTag + recolorTag + deleteTag", () => {
  it("edits the registry defensively", () => {
    const s = useTagMap.getState();
    const id = s.createTag("Old");
    s.renameTag(id, "   ");
    assert.equal(state().tags[id].name, "Old");
    s.renameTag("missing", "X");
    s.renameTag(id, "New");
    assert.equal(state().tags[id].name, "New");
    s.recolorTag(id, "nope" as never);
    s.recolorTag("missing", "rose");
    s.recolorTag(id, "rose");
    s.deleteTag("missing");
    s.setItemTags("item-1", [id, "ghost", id]);
    assert.deepEqual(useTagMap.getState().tagsOf("item-1"), [id]);
    s.deleteTag(id);
    assert.deepEqual(useTagMap.getState().tagsOf("item-1"), []);
    assert.ok(!(id in state().tags));
  });
});

describe("setItemTags + addTagToItem + removeTagFromItem", () => {
  it("ratchets item tags onto registered ids", () => {
    const s = useTagMap.getState();
    const a = s.createTag("A");
    const b = s.createTag("B");
    s.setItemTags("k", [a, b, "ghost", a]);
    assert.deepEqual(useTagMap.getState().tagsOf("k"), [a, b]);
    assert.equal(useTagMap.getState().hasTag("k", a), true);
    assert.equal(useTagMap.getState().hasTag("k", "ghost"), false);
    assert.equal(useTagMap.getState().hasTag("missing", a), false);
    s.setItemTags("k", ["ghost"]);
    assert.deepEqual(useTagMap.getState().tagsOf("k"), []);
    assert.deepEqual(tagsOf("k"), []);
    assert.deepEqual(tagsOf("missing"), []);
  });

  it("adds idempotently and removes with empty-key cleanup", () => {
    const s = useTagMap.getState();
    const a = s.createTag("A");
    const b = s.createTag("B");
    s.addTagToItem("k", "ghost");
    assert.deepEqual(useTagMap.getState().tagsOf("k"), []);
    s.addTagToItem("k", a);
    s.addTagToItem("k", a);
    assert.deepEqual(useTagMap.getState().tagsOf("k"), [a]);
    s.addTagToItem("k", b);
    s.removeTagFromItem("missing", a);
    s.removeTagFromItem("k", "ghost");
    s.removeTagFromItem("k", a);
    assert.deepEqual(useTagMap.getState().tagsOf("k"), [b]);
    s.removeTagFromItem("k", b);
    assert.deepEqual(useTagMap.getState().tagsOf("k"), []);
    assert.ok(!("k" in state().map));
  });

  it("deleteTag scrubs the forward index, keeping non-empty keys", () => {
    const s = useTagMap.getState();
    const a = s.createTag("A");
    const b = s.createTag("B");
    s.setItemTags("k1", [a, b]);
    s.setItemTags("k2", [a]);
    s.deleteTag(a);
    assert.deepEqual(useTagMap.getState().tagsOf("k1"), [b]);
    assert.deepEqual(useTagMap.getState().tagsOf("k2"), []);
  });
});

describe("store plumbing (subscribe + selector contract)", () => {
  it("notifies subscribers on mutations, stops after unsubscribe", () => {
    let calls = 0;
    const unsub = useTagMap.subscribe(() => {
      calls++;
    });
    useTagMap.getState().createTag("Notify");
    assert.equal(calls, 1);
    unsub();
    useTagMap.getState().createTag("Silent");
    assert.equal(calls, 1); // nobody notified after unsubscribe
  });

  it("pins the hook's selector contract through getState", () => {
    // The hook (v8-ignored, renderer-only) is selector(getState()) with no
    // selector yielding the full state — pin both readings here, no React.
    const id = useTagMap.getState().createTag("Sel");
    const tagsOfState = (s: TagMapState): TagMapState["tags"] => s.tags;
    assert.ok(id in tagsOfState(useTagMap.getState()));
    assert.deepEqual(tagsOfState(useTagMap.getState()), useTagMap.getState().tags);
  });
});

describe("initTagSync gating", () => {
  it("stays local when fetch is absent, the server 404s, or JSON breaks", async () => {
    globalThis.fetch = undefined as unknown as typeof fetch;
    await initTagSync();
    globalThis.fetch = (async () => new Response("no", { status: 404 })) as typeof fetch;
    await initTagSync();
    globalThis.fetch = (async () => ({
      ok: true,
      json: async () => {
        throw new Error("parse fail");
      },
    })) as unknown as typeof fetch;
    await initTagSync();
    assert.deepEqual(state().tags, {});
  });

  it("THE TRANSIENT-500 ARM (audit R-S9): a boot 500 defers pushes, and the NEXT mutation retries the sync + PUT eventually fires", async () => {
    // A 500 at boot used to conflate with offline mode — pushes stayed
    // off for the WHOLE session (silent cross-device divergence).
    // Fresh module: this arm latches serverSyncEnabled, which must not
    // leak into the idempotence arms below.
    vi.resetModules();
    const fresh = await import("../src/tagMap.ts");
    const seen: Array<{ method: string }> = [];
    let getStatus = 500;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      seen.push({ method });
      if (method === "GET") {
        return getStatus === 200
          ? json({ tags: { t: { name: "T", color: "brand" } }, map: { k: ["t"] } } as never)
          : new Response("server exploded", { status: getStatus });
      }
      return json({ ok: true });
    }) as typeof fetch;
    const warns: unknown[][] = [];
    const realWarn = console.warn;
    console.warn = (...a: unknown[]) => { warns.push(a); };
    try {
      await fresh.initTagSync(); // 500 — pushes deferred, NOT disabled
      assert.ok(warns.some((a) => String(a[0]).includes("not offline")));
      getStatus = 200; // the transient fault heals before the next mutation
      // The next mutation fires the retry hook (GET 200 → pushes on)…
      fresh.useTagMap.getState().createTag("Retry", "brand");
      // …and the debounce PUT then lands with the state aboard —
      // polled, never a fixed 700ms guess at the debounce (audit
      // item 7): the wait ends the moment the PUT is observed and
      // keeps an 8s ceiling for a loaded machine.
      await until(() => seen.some((c) => c.method === "PUT"), { turns: 800, intervalMs: 10 });
      assert.ok(seen.some((c) => c.method === "PUT"), "the session's pushes resumed");
    } finally {
      console.warn = realWarn;
    }
  }, 10_000);

  it("hydrates through the boundary ratchet, then stays idempotent", async () => {
    // NOTE: the first SUCCESSFUL hydrate latches serverSyncEnabled, so the
    // ratchet shapes (null/tagless/mapless docs) live in tag-map-init-*.spec.ts
    // (one module init per file); here exactly one hydrate runs.
    globalThis.fetch = (async () =>
      json({
        tags: {
          good: { name: "Good", color: "brand" },
          badcolor: { name: "Bad", color: "hotpink" },
          noname: { name: 7, color: "sky" },
          nulldef: null,
        },
        map: {
          k1: ["good", "orphan", 5],
          k2: "nope",
          k3: ["orphan"],
          k4: ["good"],
        },
      })) as typeof fetch;
    await initTagSync();
    assert.deepEqual(Object.keys(state().tags), ["good"]);
    assert.deepEqual(state().map, { k1: ["good"], k4: ["good"] });
    // Idempotent: a second call neither fetches nor resets.
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return json({});
    }) as typeof fetch;
    await initTagSync();
    assert.equal(calls, 0);
    assert.deepEqual(Object.keys(state().tags), ["good"]);
  });
});

describe("debounced server PUT", () => {
  it("pushes mutations after the debounce, collapsing bursts", async () => {
    globalThis.fetch = (async () => json({ tags: {}, map: {} })) as typeof fetch;
    await initTagSync();
    const puts: string[] = [];
    globalThis.fetch = (async (_url: unknown, init?: RequestInit) => {
      if (String(init?.method ?? "GET").toUpperCase() === "PUT") {
        puts.push(String(init?.body ?? ""));
      }
      return json({ tags: {}, map: {} });
    }) as typeof fetch;
    const s = useTagMap.getState();
    s.createTag("Putter");
    s.createTag("Putter Two");
    // polled condition, not a 700ms guess at the 500ms debounce
    await until(() => puts.length === 1, { turns: 200, intervalMs: 10 });
    assert.equal(puts.length, 1);
    const doc = JSON.parse(puts[0]) as { tags: Record<string, unknown> };
    assert.ok("putter" in doc.tags && "putter-two" in doc.tags);
  });

  it("skips the push when fetch is absent", async () => {
    globalThis.fetch = (async () => json({ tags: {}, map: {} })) as typeof fetch;
    await initTagSync();
    globalThis.fetch = undefined as unknown as typeof fetch;
    useTagMap.getState().createTag("Offline");
    // No wait at all (audit item 7): the old 700ms sleep "waited" for
    // a debounce that src never mints — schedulePush returns at its
    // fetch-absent guard (tagMap.ts:195) BEFORE the timer exists, so
    // the local-state assertion holds the moment createTag returns.
    assert.ok("offline" in state().tags);
  });

  it("warns and keeps local state when the PUT fails", async () => {
    globalThis.fetch = (async () => json({ tags: {}, map: {} })) as typeof fetch;
    await initTagSync();
    const realRandom = Math.random;
    const realWarn = console.warn;
    const warns: string[] = [];
    Math.random = () => 0; // full-jitter backoff → the ladder's shortest waits
    console.warn = (...args: unknown[]) => {
      warns.push(args.map((a) => String(a)).join(" "));
    };
    try {
      let putAttempts = 0;
      globalThis.fetch = (async () => {
        putAttempts += 1;
        throw new Error("server down");
      }) as typeof fetch;
      useTagMap.getState().createTag("Doomed");
      // The wait is LOAD-BEARING and it must outlast the RETRY
      // LADDER: apiFetch makes 5 attempts (4 retries) and only then
      // rejects, which is what reaches the PUT's .catch — a 750ms
      // wait ended the arm before its own path ran. Poll the attempt
      // counter (never a fixed sleep) so the arm waits exactly as
      // long as the ladder needs and no longer.
      const deadline = Date.now() + 10_000;
      while (putAttempts < 5 && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 25));
      }
      assert.ok(putAttempts >= 5, "the ladder exhausted its 5 attempts before the check");
      // the rejection reached the .catch: the warn names the failure
      // and the local state (the offline fallback) is intact
      await new Promise((r) => setTimeout(r, 0));
      assert.ok(
        warns.some((w) => w.includes("[tagMap] server sync failed:") && w.includes("server down")),
        `expected the sync-failure warn, got ${JSON.stringify(warns)}`,
      );
      assert.ok("doomed" in state().tags);
    } finally {
      Math.random = realRandom;
      console.warn = realWarn;
    }
  }, 20_000);
});

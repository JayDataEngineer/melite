// store.spec.ts — the drafts store's own laws, unit-grain: the loud
// no-facility refusal, the one-time legacy import (corrupt rows skip,
// non-objects skip, missing draft_id stamps the filename, pre-seeded
// docs never overwrite), the per-facility open cache, and the
// failed-open purge (a rejected open clears the slot — the retry
// re-attempts).
//
// The facility fake registers the way the real one does —
// ctx.provide("storageDomain", plainObject) (dsh-storage-domain's own
// seam) — NOT a Service subclass: cordis exposes Service subclasses
// through per-access scoped proxies (unstable identity), while provided
// objects keep theirs, and the store's WeakMap keys on that identity.
import { onTestFinished, test } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";
import { DraftsDomainSeatService } from "../src/store.ts";

// TMP OWNERSHIP (stroke 13): every minted tree is disposed with its
// test — see tests/global-sweep.ts for the tree-wide net.
/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "drafts-store-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

/** The minimal domain face the store touches: the epoch marker + the
 * docs table (the spec's own shape — no more, no fake extra). */
class FakeDomain {
  markerValue = 0;
  markerSetAt: number | null = null;
  docs = new Map<string, unknown>();
  puts: { id: string; row: unknown }[] = [];
  global = {
    get: (): number => this.markerValue,
    set: (v: number): Promise<void> => {
      this.markerValue = v;
      this.markerSetAt = v;
      return Promise.resolve();
    },
  };
  table(name: string): FakeDomain {
    assert.equal(name, "docs", "the store reads the docs table only");
    return this;
  }
  get(id: string): unknown {
    return this.docs.get(id);
  }
  put(id: string, row: unknown): Promise<void> {
    this.puts.push({ id, row });
    this.docs.set(id, row);
    return Promise.resolve();
  }
  entries(): IterableIterator<[string, unknown]> {
    return this.docs.entries();
  }
}

/** The facility, provided like the real one: a plain object with
 * open(), countable and (on demand) failing the first attempt. */
interface FakeFacility {
  domain: FakeDomain;
  opens: number;
  failFirstOpen: boolean;
  open(): Promise<Domain<DraftsDomainSpec>>;
}

function mountFacility(ctx: Context): FakeFacility {
  const facility: FakeFacility = {
    domain: new FakeDomain(),
    opens: 0,
    failFirstOpen: false,
    open(): Promise<Domain<DraftsDomainSpec>> {
      facility.opens += 1;
      if (facility.failFirstOpen && facility.opens === 1) {
        return Promise.reject(new Error("storage/junit-first-open-fails"));
      }
      return Promise.resolve(facility.domain as unknown as Domain<DraftsDomainSpec>);
    },
  };
  ctx.provide("storageDomain", facility);
  return facility;
}

function legacyRoot(files: Record<string, string>): string {
  const root = mintRoot();
  mkdirSync(join(root, "drafts"), { recursive: true });
  mkdirSync(join(root, "storage"), { recursive: true });
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(root, "drafts", name), body);
  }
  return root;
}

/** The seat's config for a minted root (J12: the storage root is
 *  call data on the seat — the MELITE_STATE_ROOT / MELITE_STORAGE_ROOT
 *  env seam retired; the config is as owned as the tree it names,
 *  and nothing leaks across tests). */
function env(root: string): { storageRoot: string } {
  return { storageRoot: join(root, "storage") };
}

test("no storage facility mounted: the loud earliest refusal", async () => {
  const ctx = new Context();
  const root = mintRoot();
  new DraftsDomainSeatService(ctx, env(root));
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage domain facility not mounted/,
  );
});

test("no seat mounted: the open refuses LOUD (never a silent undefined domain)", async () => {
  // The seat IS the domain's only door (J5): a Context without
  // DraftsDomainSeatService has no drafts plane at all — the open
  // names the missing service and the constructor that mounts it,
  // so a mounting-order break dies at the first open, not at the
  // first use of undefined.
  const ctx = new Context();
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /drafts domain seat not mounted \(new DraftsDomainSeatService\(ctx\)\)/,
  );
});

test("the one-time legacy import: good rows land, corrupt and non-object rows skip", async () => {
  const legacy = {
    "d_good.json": JSON.stringify({ intent: "keep me" }),
    "corrupt.json": "{not json",
    "arr.json": "[1,2]",
    "d_noname.json": JSON.stringify({ note: "no draft_id here" }),
    "notes.txt": "not a draft row",
    "d_pre.json": JSON.stringify({ intent: "already inside" }),
  };
  const root = legacyRoot(legacy);
  // THE BYTES AS FOUND, read BEFORE the import runs — the comparison
  // below is against what the tree held, not against what the import
  // rewrote it into
  const legacyBytes: Record<string, string> = Object.fromEntries(
    Object.keys(legacy).map((name) => [name, readFileSync(join(root, "drafts", name), "utf8")]),
  );
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  // d_pre is ALREADY in the domain — the import never overwrites it
  // (its legacy file is skipped), and non-.json files never import.
  facility.domain.docs.set("d_pre", { seeded: true });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  assert.equal(facility.opens, 1, "one open");
  // The epoch stamp landed — the import ran exactly once.
  assert.notEqual(drafts.markerSetAt, null);
  // d_good imported; d_noname stamped with its filename.
  const ids = drafts.puts.map((p) => p.id).sort();
  assert.deepEqual(ids, ["d_good", "d_noname"]);
  const noname = drafts.puts.find((p) => p.id === "d_noname")!.row as {
    updated_at: number;
    doc: { draft_id: string; note: string };
  };
  assert.equal(noname.doc.draft_id, "d_noname", "filename stamps the missing id");
  // corrupt.json / arr.json skipped loudly-silently (evidence on disk,
  // never truth); d_pre untouched (no put row for it).
  assert.equal(drafts.puts.some((p) => p.id === "d_pre"), false);
  // EVIDENCE, NEVER TRUTH (store.ts:10-11): the import READS the
  // legacy tree and writes only the domain — the files themselves are
  // left exactly as they were, byte for byte, and none is moved
  // aside. (Every legacy row above, imported or skipped, keeps its
  // bytes; d_pre's file was never even read.)
  for (const name of ["d_good.json", "d_noname.json", "corrupt.json", "arr.json", "notes.txt"]) {
    assert.deepEqual(
      readFileSync(join(root, "drafts", name), "utf8"),
      legacyBytes[name],
      name + " is untouched by the import",
    );
  }
});

test("same facility + same root reuses the open; a foreign root refuses", async () => {
  const root = legacyRoot({});
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  await openDraftsDomain(ctx);
  await openDraftsDomain(ctx);
  assert.equal(facility.opens, 1, "cache hit — no re-open");
  // A foreign root on the same facility (J12): the seat's config is
  // immutable per boot, so the drifting-mid-process root that the old
  // env seam made reachable is no longer constructible — a second
  // seat with a foreign config opens its OWN root, never
  // cross-writing the first's units.
  const foreignCtx = new Context();
  new DraftsDomainSeatService(foreignCtx, { storageRoot: join(root, "elsewhere") });
  (foreignCtx as unknown as Record<string, unknown>)["storageDomain"] = undefined;
  foreignCtx.provide("storageDomain", facility);
  const foreignSeat = foreignCtx.get("meliteDraftsDomain") as unknown as { open: () => Promise<unknown> };
  const foreignHandle = await foreignSeat.open();
  assert.ok(foreignHandle !== undefined, "the foreign root opens its own handle");
  assert.equal(facility.opens, 2, "a foreign root is its own open — the first root's handle is untouched");
});

test("a rejected open purges the cache: the retry re-attempts", async () => {
  const root = legacyRoot({});
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  facility.failFirstOpen = true;
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage\/junit-first-open-fails/,
  );
  // The slot was purged — the second call OPENS AGAIN (and succeeds).
  const drafts = await openDraftsDomain(ctx);
  assert.equal(facility.opens, 2, "the failed open did not poison the cache");
  assert.ok(drafts, "the retry returned the domain");
});

test("a pre-stamped epoch skips the import entirely (a wiped unit never re-imports ghosts)", async () => {
  const root = legacyRoot({ "d_ghost.json": JSON.stringify({ intent: "frozen" }) });
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  // A previous boot stamped the epoch — the legacy tree is evidence,
  // never truth, so this open imports NOTHING.
  facility.domain.markerValue = 1;
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  assert.equal(drafts.puts.length, 0, "no legacy row touched");
});

test("the open HEALS a poisoned row: an unstated-required refusal never stays a terminal failure", async () => {
  // THE REPLAYED-REFUSAL ROW (2026-09-14 carry, cured 2026-10-18):
  // the old carry wrote the refusal for a word not yet typed onto
  // the stage row as runStatus 'failed' — every later drill open
  // replayed it. The open rewrites the row to the never-ran face.
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-s1", {
    updated_at: 100,
    doc: {
      draft_id: "bench-s1", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        {
          id: "s_0",
          runStatus: "failed",
          result: {
            error:
              "card_compose phase 1: lane 'krea-2/turbo' refuses the state: " +
              "this lane requires 'prompt' — 'prompt' is not stated — " +
              "every image lane states WHAT the picture is — write the prompt",
          },
        },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const healed = (drafts.docs.get("bench-s1") as { doc: { stages: Array<Record<string, unknown>> } })
    .doc.stages[0]!;
  assert.equal(healed["runStatus"], "", "the poison died at open");
  assert.deepEqual(healed["result"], {}, "the refusal voice is gone from the row");
  assert.equal(drafts.puts.length, 1, "exactly the one poisoned doc rewritten");
});

test("the open heals the 'error' word too, and leaves a stated-wrong failure untouched", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-a", {
    updated_at: 100,
    doc: {
      draft_id: "bench-a", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        { id: "s_0", runStatus: "error", result: { error: "lane refuses: this lane requires 'style'" } },
      ],
    },
  });
  facility.domain.docs.set("bench-b", {
    updated_at: 100,
    doc: {
      draft_id: "bench-b", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        { id: "s_0", runStatus: "failed", result: { error: "card_compose phase 1: unknown quant 'xq'" } },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const a = (drafts.docs.get("bench-a") as { doc: { stages: Array<Record<string, unknown>> } }).doc.stages[0]!;
  const b = (drafts.docs.get("bench-b") as { doc: { stages: Array<Record<string, unknown>> } }).doc.stages[0]!;
  assert.equal(a["runStatus"], "", "the 'error' word heals with the class");
  assert.equal(b["runStatus"], "failed", "a stated-wrong failure is authored state — it stays");
  assert.equal(drafts.puts.length, 1, "only the matching doc touched disk");
});

test("a MIXED carry (the stem joined with a stated-wrong half) never heals (the client-plane audit cure, 2026-10-18)", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  facility.domain.docs.set("bench-mixed", {
    updated_at: 100,
    doc: {
      draft_id: "bench-mixed", status: "live", createdAt: 1, completedAt: null,
      intent: "bench",
      stages: [
        {
          id: "s_0",
          runStatus: "failed",
          result: {
            error:
              "this lane requires 'prompt' — 'prompt' is not stated; " +
              "stated cfg 3.5 is OUTSIDE the route envelope for variant \"turbo\" — the declared envelope is [1, 2]",
          },
        },
      ],
    },
  });
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  const mixed = (drafts.docs.get("bench-mixed") as { doc: { stages: Array<Record<string, unknown>> } })
    .doc.stages[0]!;
  assert.equal(mixed["runStatus"], "failed", "the mixed carry keeps its failed face — only whole-stem texts heal");
  assert.equal(drafts.puts.length, 0, "the mixed doc never touched disk");
});

test("a root with no legacy drafts dir imports nothing, cleanly", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  env(root);
  const ctx = new Context();
  new DraftsDomainSeatService(ctx, env(root));
  const facility = mountFacility(ctx);
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  assert.equal(drafts.puts.length, 0, "no dir, no rows");
  assert.notEqual(drafts.markerSetAt, null, "the epoch still stamps");
});

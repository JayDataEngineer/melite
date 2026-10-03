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
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import type { Domain } from "@deepseek-ai/dsh-storage-domain";
import { openDraftsDomain } from "../src/store.ts";
import type { DraftsDomainSpec } from "../src/spec.js";

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

/** Point the store at a root — and OWN the change (2026-10-13, the
 *  flake audit's worst leak). These two keys were set and never
 *  restored, while mintRoot's onTestFinished DELETES the very tree
 *  MELITE_STATE_ROOT still named: a later test in the same fork read a
 *  deleted path. The restore is registered per call, beside the mint
 *  that owns the tree. */
function env(root: string): void {
  const previous = {
    state: process.env["MELITE_STATE_ROOT"],
    storage: process.env["MELITE_STORAGE_ROOT"],
  };
  process.env["MELITE_STATE_ROOT"] = root;
  process.env["MELITE_STORAGE_ROOT"] = "";
  onTestFinished(() => {
    for (const [key, value] of [["MELITE_STATE_ROOT", previous.state], ["MELITE_STORAGE_ROOT", previous.storage]] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test("no storage facility mounted: the loud earliest refusal", async () => {
  const ctx = new Context();
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage domain facility not mounted/,
  );
});

test("the one-time legacy import: good rows land, corrupt and non-object rows skip", async () => {
  const root = legacyRoot({
    "d_good.json": JSON.stringify({ intent: "keep me" }),
    "corrupt.json": "{not json",
    "arr.json": "[1,2]",
    "d_noname.json": JSON.stringify({ note: "no draft_id here" }),
    "notes.txt": "not a draft row",
    "d_pre.json": JSON.stringify({ intent: "already inside" }),
  });
  env(root);
  const ctx = new Context();
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
});

test("same facility + same root reuses the open; a foreign root refuses", async () => {
  const root = legacyRoot({});
  env(root);
  const ctx = new Context();
  const facility = mountFacility(ctx);
  await openDraftsDomain(ctx);
  await openDraftsDomain(ctx);
  assert.equal(facility.opens, 1, "cache hit — no re-open");
  // A foreign root on the same facility: the boot-root-only law.
  process.env["MELITE_STORAGE_ROOT"] = join(root, "elsewhere");
  await assert.rejects(
    () => openDraftsDomain(ctx),
    /storage serves the boot root only/,
  );
});

test("a rejected open purges the cache: the retry re-attempts", async () => {
  const root = legacyRoot({});
  env(root);
  const ctx = new Context();
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
  const facility = mountFacility(ctx);
  // A previous boot stamped the epoch — the legacy tree is evidence,
  // never truth, so this open imports NOTHING.
  facility.domain.markerValue = 1;
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  assert.equal(drafts.puts.length, 0, "no legacy row touched");
});

test("a root with no legacy drafts dir imports nothing, cleanly", async () => {
  const root = mintRoot();
  mkdirSync(join(root, "storage"), { recursive: true });
  env(root);
  const ctx = new Context();
  const facility = mountFacility(ctx);
  const drafts = (await openDraftsDomain(ctx)) as unknown as FakeDomain;
  assert.equal(drafts.puts.length, 0, "no dir, no rows");
  assert.notEqual(drafts.markerSetAt, null, "the epoch still stamps");
});

// bench-picks.spec.ts — THE LIVE BENCH selector's own walls (roadmap
// §16's deepest debt: bench.ts at 43–46%, hit only incidentally
// through skillPlane). Every arm of the law is pinned here directly:
// the boot cutoff (a dead session's doc NEVER speaks into a fresh
// process — the poisoned-session law), the 5s grace, the two doc
// shapes (record.doc.stages + bare doc.stages), the card/model null
// laws, and the never-crash arms (malformed JSON, a bench entry that
// vanishes between readdir and stat — a broken symlink is that race,
// made deterministic). Since the dry-sweep's J18 the sync twin is
// the ONLY seat (the async pair and the fingerprint fed a poll that
// never landed — zero production importers); every arm rides it.
// ONE ROOT (audit 004/C1, 2026-10-22 — the bench split-brain cure):
// the reader rides the WRITER's tree, <storageRoot>/drafts/docs —
// the drafts store's own root, never a second tree under the DSH
// home (the retired seam left 181 files there with no writer). The
// root pins below moved with it.
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { benchBootMs, benchDir, benchPicksSync } from "../src/bench.ts";

let ROOT = "";
const docs = (): string => join(ROOT, "drafts", "docs");

beforeEach(() => {
  // the drafts STORE's shape: <storageRoot>/drafts/docs — what the
  // estate's melite-estate mount opens (join(stateRoot, "storage"))
  ROOT = mkdtempSync(join(tmpdir(), "bench-picks-"));
  mkdirSync(docs(), { recursive: true });
});
afterEach(() => {
  rmSync(ROOT, { recursive: true, force: true });
});

/** Write a bench doc with a chosen mtime (seconds ago). */
const doc = (name: string, body: unknown, ageSec: number): string => {
  const p = join(docs(), name);
  writeFileSync(p, JSON.stringify(body));
  const at = new Date(Date.now() - ageSec * 1000);
  utimesSync(p, at, at);
  return p;
};

describe("benchDir + benchBootMs", () => {
  it("benchDir rides the WRITER's storage root — explicit and default (the C1 one-root law)", () => {
    assert.equal(benchDir("/state/storage"), join("/state/storage", "drafts", "docs"));
    // the default is the drafts store's own default law (CWD-relative
    // data/runs/storage) — writer and reader resolve the SAME tree
    assert.equal(benchDir(), join("data", "runs", "storage", "drafts", "docs"));
  });

  it("the boot instant pins ONCE per process (the re-apply churn can never reset it)", () => {
    const first = benchBootMs();
    assert.equal(benchBootMs(), first); // same value forever in this process
    const g = globalThis as { __meliteBenchBootMs?: number };
    assert.equal(g.__meliteBenchBootMs, first); // pinned on globalThis — the churn law
  });
});

describe("benchPicksSync — the live seat's law", () => {
  it("a LIVE doc's stages become picks: card + model verbatim, empty/absent → null", () => {
    doc("bench-live.json", { doc: { stages: [
      { card: "tts", params: { model: "qwen3-tts" } },
      { card: "", params: {} },            // empty card → null
      { params: { model: "krea-2" } },     // absent card, model present
    ] } }, 1);
    assert.deepEqual(benchPicksSync(ROOT), [
      { card: "tts", model: "qwen3-tts" },
      { card: null, model: null },
      { card: null, model: "krea-2" },
    ]);
  });

  it("the record.doc.stages shape parses too (the drafts store's wrapper)", () => {
    doc("bench-wrapped.json", { record: { doc: { stages: [{ card: "image-gen" }] } } }, 1);
    assert.deepEqual(benchPicksSync(ROOT), [{ card: "image-gen", model: null }]);
  });

  it("THE POISONED-SESSION LAW: a dead session's doc is invisible (mtime < boot − 5s grace)", () => {
    doc("bench-stale.json", { doc: { stages: [{ card: "tts" }] } }, 120); // 2min old — dead
    assert.deepEqual(benchPicksSync(ROOT), []);
  });

  it("the 5s grace admits a same-tick write (mtime just under the boot instant)", () => {
    doc("bench-grace.json", { doc: { stages: [{ card: "tts" }] } }, 3); // inside the grace
    assert.deepEqual(benchPicksSync(ROOT), [{ card: "tts", model: null }]);
  });

  it("a malformed doc contributes nothing — never a crash", () => {
    doc("bench-garbage.json", "not-json{", 1);
    doc("bench-live.json", { doc: { stages: [{ card: "tts" }] } }, 1);
    assert.deepEqual(benchPicksSync(ROOT), [{ card: "tts", model: null }]);
  });

  it("a bench entry that vanishes before stat (a broken symlink IS that race) contributes nothing", () => {
    symlinkSync(join(docs(), "gone-target.json"), join(docs(), "bench-broken.json")); // stat → ENOENT
    doc("bench-live.json", { doc: { stages: [{ card: "sfx" }] } }, 1);
    assert.deepEqual(benchPicksSync(ROOT), [{ card: "sfx", model: null }]);
  });

  it("a missing docs dir answers empty (readdir's catch arm)", () => {
    rmSync(docs(), { recursive: true, force: true });
    assert.deepEqual(benchPicksSync(ROOT), []);
  });
});

describe("benchPicksSync — the whole law in one pass", () => {
  it("live, stale, malformed, and vanished docs ride one call", () => {
    doc("bench-live.json", { doc: { stages: [{ card: "tts", params: { model: "m" } }] } }, 1);
    doc("bench-stale.json", { record: { doc: { stages: [{ card: "DEAD" }] } } }, 300);
    doc("bench-garbage.json", "{nope", 1);
    symlinkSync(join(docs(), "gone.json"), join(docs(), "bench-broken.json"));
    assert.deepEqual(benchPicksSync(ROOT), [{ card: "tts", model: "m" }]);
  });
});

// bench-picks.spec.ts — THE LIVE BENCH selector's own walls (roadmap
// §16's deepest debt: bench.ts at 43–46%, hit only incidentally
// through skillPlane). Every arm of the law is pinned here directly:
// the boot cutoff (a dead session's doc NEVER speaks into a fresh
// process — the poisoned-session law), the 5s grace, the fingerprint
// (stale docs DO retrigger the poll — cutoff never applies there),
// the two doc shapes (record.doc.stages + bare doc.stages), the
// card/model null laws, and the never-crash arms (malformed JSON, a
// bench entry that vanishes between readdir and stat — a broken
// symlink is that race, made deterministic).
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, utimesSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { benchBootMs, benchDir, benchFingerprint, benchPicks, benchPicksSync } from "../src/bench.ts";

let HOME = "";
const realDsh = process.env["DSH_HOME"];
const docs = (): string => join(HOME, "storages", "drafts", "docs");

beforeEach(() => {
  HOME = mkdtempSync(join(tmpdir(), "bench-picks-"));
  process.env["DSH_HOME"] = HOME;
  mkdirSync(docs(), { recursive: true });
});
afterEach(() => {
  if (realDsh === undefined) delete process.env["DSH_HOME"];
  else process.env["DSH_HOME"] = realDsh;
  rmSync(HOME, { recursive: true, force: true });
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
  it("benchDir honors DSH_HOME and falls back to ~/.dsh", () => {
    assert.equal(benchDir(), join(HOME, "storages", "drafts", "docs"));
    delete process.env["DSH_HOME"];
    assert.equal(benchDir(), join(process.env["HOME"] ?? "", ".dsh", "storages", "drafts", "docs"));
  });

  it("the boot instant pins ONCE per process (the re-apply churn can never reset it)", () => {
    const first = benchBootMs();
    assert.equal(benchBootMs(), first); // same value forever in this process
    const g = globalThis as { __meliteBenchBootMs?: number };
    assert.equal(g.__meliteBenchBootMs, first); // pinned on globalThis — the churn law
  });
});

describe("benchPicks (async)", () => {
  it("a LIVE doc's stages become picks: card + model verbatim, empty/absent → null", async () => {
    doc("bench-live.json", { doc: { stages: [
      { card: "tts", params: { model: "qwen3-tts" } },
      { card: "", params: {} },            // empty card → null
      { params: { model: "krea-2" } },     // absent card, model present
    ] } }, 1);
    assert.deepEqual(await benchPicks(), [
      { card: "tts", model: "qwen3-tts" },
      { card: null, model: null },
      { card: null, model: "krea-2" },
    ]);
  });

  it("the record.doc.stages shape parses too (the drafts store's wrapper)", async () => {
    doc("bench-wrapped.json", { record: { doc: { stages: [{ card: "image-gen" }] } } }, 1);
    assert.deepEqual(await benchPicks(), [{ card: "image-gen", model: null }]);
  });

  it("THE POISONED-SESSION LAW: a dead session's doc is invisible (mtime < boot − 5s grace)", async () => {
    doc("bench-stale.json", { doc: { stages: [{ card: "tts" }] } }, 120); // 2min old — dead
    assert.deepEqual(await benchPicks(), []);
  });

  it("the 5s grace admits a same-tick write (mtime just under the boot instant)", async () => {
    doc("bench-grace.json", { doc: { stages: [{ card: "tts" }] } }, 3); // inside the grace
    assert.deepEqual(await benchPicks(), [{ card: "tts", model: null }]);
  });

  it("a malformed doc contributes nothing — never a crash", async () => {
    doc("bench-garbage.json", "not-json{", 1);
    doc("bench-live.json", { doc: { stages: [{ card: "tts" }] } }, 1);
    assert.deepEqual(await benchPicks(), [{ card: "tts", model: null }]);
  });

  it("a bench entry that vanishes before stat (a broken symlink IS that race) contributes nothing", async () => {
    symlinkSync(join(docs(), "gone-target.json"), join(docs(), "bench-broken.json")); // stat → ENOENT
    doc("bench-live.json", { doc: { stages: [{ card: "sfx" }] } }, 1);
    assert.deepEqual(await benchPicks(), [{ card: "sfx", model: null }]);
  });

  it("a missing docs dir answers empty (readdir's reject arm)", async () => {
    rmSync(docs(), { recursive: true, force: true });
    assert.deepEqual(await benchPicks(), []);
    assert.equal(await benchFingerprint(), "");
  });
});

describe("benchFingerprint", () => {
  it("fingerprints EVERY doc — the cutoff NEVER applies here (any write retriggers the poll)", async () => {
    doc("bench-stale.json", { doc: { stages: [{ card: "old" }] } }, 120); // stale but fingerprinted
    const fp1 = await benchFingerprint();
    assert.ok(fp1.includes("bench-stale.json"), "a stale doc still rides the fingerprint");
    assert.ok(fp1.includes("|") === false || fp1.split("|").length >= 1);
    // a write changes it
    doc("bench-second.json", { doc: {} }, 1);
    const fp2 = await benchFingerprint();
    assert.notEqual(fp1, fp2);
    assert.ok(fp2.includes("bench-second.json"));
    assert.ok(fp2.indexOf("bench-second.json") < fp2.indexOf("bench-stale.json"), "sorted by name (second < stale)");
  });

  it("a vanished entry (broken symlink) contributes nothing to the fingerprint", async () => {
    symlinkSync(join(docs(), "gone.json"), join(docs(), "bench-broken.json"));
    const fp = await benchFingerprint();
    assert.ok(!fp.includes("bench-broken.json"), "the stat-failure arm skips the entry");
    assert.equal(fp, "");
  });

  it("non-bench files in the docs dir never fingerprint", async () => {
    doc("other-session.json", { doc: {} }, 1); // no bench- prefix
    assert.equal(await benchFingerprint(), "");
  });
});

describe("benchPicksSync — the sync twin, same law", () => {
  it("live docs parse, stale docs die, malformed contributes nothing — all in one pass", () => {
    doc("bench-live.json", { doc: { stages: [{ card: "tts", params: { model: "m" } }] } }, 1);
    doc("bench-stale.json", { record: { doc: { stages: [{ card: "DEAD" }] } } }, 300);
    doc("bench-garbage.json", "{nope", 1);
    symlinkSync(join(docs(), "gone.json"), join(docs(), "bench-broken.json"));
    assert.deepEqual(benchPicksSync(), [{ card: "tts", model: "m" }]);
  });

  it("a missing docs dir answers empty synchronously", () => {
    rmSync(docs(), { recursive: true, force: true });
    assert.deepEqual(benchPicksSync(), []);
  });
});

// run-door-single-resolve.spec.ts — §7 P7 SINGLE-RESOLVE + STRICT-RESURRECT (the wall).
// @contract infra-runs-single-resolve
//
// THE LAW (purge §7 P7): a run door's defaults are resolved at ONE named
// seat per door — no hidden `??` invents state the estate never stated;
// resurrect's reconcile surface lists every `run-*` row it refuses; tool
// presenters ride defineTool's validation gate. Each arm below reds on the
// current tree (the silent seat) and greens only on its named cure; every
// cure's toggle is recorded as the arm's receipt at fix time.
//
// Pre-registration: the registry row infra-runs-single-resolve is seated
// when the cures land (canon: arms first, row + receipt post-commit).

import { describe, it, afterEach, vi } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { submitEnvelopeStructuralRefusal } from "../../../../packages/harness/estate-queue/src/queueSubmit.ts";
import { compileFlowInline } from "../../../../packages/harness/estate-queue/src/runsStart.ts";
import { planResurrect } from "../../../../packages/harness/estate-queue/src/queueResurrect.ts";
import { loadPersistedTimeline } from "../../../../packages/web-kit/timeline/src/store/timelinePersistence.ts";
import { primeCatalog } from "@melite/catalog";
import { DEFAULT_SEGMENT_PARAMS } from "@melite/contracts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("run-door single resolve + strict resurrect (purge §7 P7)", () => {
  // ARM F-1a — the resolve seat (queueSubmit.ts:195 + the
  // checkFlowsStartEnvelope twin at runsGates.ts:287 — the "ONE LAW"
  // twin walker). The absent/null test-flag leg must ride a NAMED
  // resolve — any inline `??` on ["test"] is the hidden default the
  // purge kills. Reds while either hides it; greens when the single
  // seat owns both.
  it("the test-flag default rides a named seat — no inline `??` on body[\"test\"]", () => {
    for (const f of [
      "packages/harness/estate-queue/src/queueSubmit.ts",
      "packages/harness/estate-queue/src/runsGates.ts",
    ]) {
      const src = readFileSync(join(ROOT, f), "utf8");
      assert.ok(
        !src.includes('["test"] ?? false'),
        // (journey F-1 LOW finding: dot-syntax twins evade a
        // bracket-only scan — both spellings barred)
        `${f} still hides the test-flag default inline — route through the named resolve`,
      );
      assert.ok(
        !/\.test\s*\?\?\s*false/.test(src),
        `${f} hides the test-flag default in dot syntax — route through the named resolve`,
      );
    }
  });

  // ARM F-1b — the VALUE guard (green first run, characterization):
  // the named seat must preserve the live-lane receipt 2026-09-12 —
  // test:null proceeds (the registry walk refuses draft-unknown, never
  // bad-test), non-bool still refuses loud. Witness for the pinned
  // behavior: packages/harness/estate-queue/tests/runs-registry-start.spec.ts:186-187.
  it("absent/null test still proceeds — non-bool still refuses (the 2026-09-12 receipt)", () => {
    assert.equal(
      submitEnvelopeStructuralRefusal({ test: null, draft_id: "ghost" }),
      null,
    );
    assert.equal(
      submitEnvelopeStructuralRefusal({ draft_id: "ghost" }),
      null,
    );
    const bad = submitEnvelopeStructuralRefusal({ test: "yes", draft_id: "ghost" });
    assert.ok(bad !== null);
    // envelope-level code (the service walk maps it to
    // runs/bad-envelope — witness runs-registry-start.spec.ts:182)
    assert.equal(bad.payload["code"], "bad_envelope");
  });

  // ARM F-2 — the absence voice (runsStart.ts:256). An id-less stage's
  // refusal must name the ABSENCE — `String(st["id"] ?? "")` renders an
  // invented empty-string id that reads as present-but-empty. Reds
  // today (`stage id "" ...`); greens on the absence-naming voice.
  it("an id-less stage refusal names the absence — never an invented empty id", () => {
    const res = compileFlowInline({ id: "f1", stages: [{ engine: "card-plane" }] });
    assert.ok(!("stages" in res), "an id-less stage must refuse, not compile");
    assert.equal(res.status, 400);
    assert.equal(
      (res.payload as Record<string, unknown>)["error"],
      'stage id "<absent>" is not a legal identifier',
    );
  });

  // ARM F-3 — the store restore voice (timelinePersistence.ts:256-258).
  // A catalog-miss model reset is a lane change with no voice: the
  // restored timeline must warn naming the segment id, the persisted
  // id, and the reset target (the R-S9 quarantine precedent). Reds
  // today (silent reset); greens on the voiced reset. The VALUE half
  // (reset to default) is already walled at
  // timeline/test/timelineStorePersist.spec.ts ("resets models..."),
  // and the cold-catalog silence at R-E2 — witnesses, not duplicated.
  it("a catalog-miss model reset voices itself (segment id, persisted id, reset target)", async () => {
    const lsData = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string): string | null => (lsData.has(k) ? (lsData.get(k) as string) : null),
      setItem: (k: string, v: string): void => void lsData.set(k, v),
      removeItem: (k: string): void => void lsData.delete(k),
      clear: (): void => void lsData.clear(),
    };
    primeCatalog({ families: {}, models: { h3: { name: "h3" } } } as never);
    const D = DEFAULT_SEGMENT_PARAMS as unknown as Record<string, unknown>;
    lsData.set(
      "tech_noir_timeline",
      JSON.stringify({
        segments: [
          {
            id: "seg-7", order: 0, start: 0, duration: 5, prompt: "p", negativePrompt: "",
            thumbnailUrl: null, videoUrl: null, firstFrameB64: null, lastFrameB64: null,
            params: { ...DEFAULT_SEGMENT_PARAMS, model: "stale-route" },
            trimStart: 0, sourceStepId: null, status: "empty", error: null,
            controlVideoUrl: null, lipSyncedVideoUrl: null, lipSyncPreferOriginal: false,
            promptBeats: [], keyframes: [],
          },
        ],
        audioCues: [],
        audioTracks: [],
        relayVideoUrl: null,
        relaySegmentIds: [],
        relayAssetId: null,
        globalConsistencyAnchor: null,
      }),
    );
    const warns: string[] = [];
    vi.spyOn(console, "warn").mockImplementation((...a: unknown[]) => {
      warns.push(a.map(String).join(" "));
    });
    const loaded = await loadPersistedTimeline();
    assert.ok(loaded !== null, "the foreign-model payload must still load (reset, not refuse)");
    assert.ok(
      warns.some(
        (w) => w.includes("seg-7") && w.includes("stale-route") && w.includes(String(D["model"])),
      ),
      "no voiced reset — the catalog-miss model rewrite stays silent: " + JSON.stringify(warns),
    );
  });

  // ARM SR — the resurrect reconcile surface (queueResurrect.ts:226-227).
  // A `run-*` dir whose sidecar is unreadable (no _flow.json on disk —
  // the default probe's read-failure null) must ORPHAN (the ROW 28
  // road), never `continue` into invisibility. Reds today (vanishes
  // from both order and orphans); greens on the orphan.
  it("an unreadable sidecar orphans — never vanishes from the resurrect plan", () => {
    const root = mkdtempSync(join(tmpdir(), "sr-wall-"));
    try {
      mkdirSync(join(root, "output", "run-ghost"), { recursive: true });
      const plan = planResurrect(root);
      assert.ok(
        plan.orphans.includes("run-ghost"),
        "unreadable sidecar vanished — expected in orphans, got: " + JSON.stringify(plan),
      );
      // (journey SR MINOR: an orphan+order double-listing cure would
      // pass the arm above — the ghost rides ONE surface, orphans.)
      assert.ok(
        !plan.order.includes("run-ghost"),
        "unreadable sidecar double-listed — orphans only, got: " + JSON.stringify(plan),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

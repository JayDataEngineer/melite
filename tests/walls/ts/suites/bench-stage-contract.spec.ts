import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  BIRTH_STRIP_KEYS,
  RESTORE_STRIP_KEYS,
  CARD_PLANE_ENGINE,
  RUN_MEDIA_PREFIX,
  LEGACY_RUN_MEDIA_PREFIX,
  canonicalRunMediaUrl,
  healRunMediaPaths,
  normalizeBenchStage,
  stageEngineOf,
  stripKeys,
} from "../../../../packages/web-kit/contracts/src/benchStage.ts";

// THE BENCH STAGE CONTRACT (operator, 2026-10-10: "The bench media
// flow is always the same, no matter if the AI agent OR the human
// edits it. There is no distinction in the bench." and "THERE IS NO
// FILTER, NO BREAKAGE FROM THIS. EVER.").
//
// Four writers used to default a stage row — the bench normalizer,
// the add-card door, the gallery restore, the run door — and each
// invented its own values, so a GUI row, an agent row and a restored
// row reached the compiler as different documents. These pin ONE
// answer, and pin the writers to it.
describe("the bench stage contract — one row, one shape, one spelling", () => {
  it("the engine is DERIVED, never authored: three spellings of the same row agree", () => {
    const raw = { card: "image-edit", params: { prompt: "x" } };
    const fromBench = normalizeBenchStage(raw, 0);
    const fromRestore = normalizeBenchStage({ ...raw }, 3);
    const fromAgent = normalizeBenchStage({ ...raw }, 7);
    expect(fromBench["engine"]).toBe(CARD_PLANE_ENGINE);
    expect(fromRestore["engine"]).toBe(fromAgent["engine"]);
    // an explicitly named engine is the caller's, verbatim
    expect(stageEngineOf({ engine: "blender" })).toBe("blender");
    expect(normalizeBenchStage({ card: "c", engine: "mcp:unity" }, 0)["engine"]).toBe("mcp:unity");
  });

  it("the id law: a caller's id is verbatim (including ''), a missing one is minted", () => {
    expect(normalizeBenchStage({ id: "hero" }, 0)["id"]).toBe("hero");
    // '' is ADDRESSABLE-NOTHING and the wire admission reads it that
    // way — the contract must not quietly rename it
    expect(normalizeBenchStage({ id: "" }, 0)["id"]).toBe("");
    expect(normalizeBenchStage({ id: 5 }, 2)["id"]).toBe("s_2");
    expect(normalizeBenchStage({}, 1)["id"]).toBe("s_1");
  });

  it("run media: ONE spelling out, both spellings accepted in, nothing else touched", () => {
    expect(canonicalRunMediaUrl(LEGACY_RUN_MEDIA_PREFIX + "/run-1/a.png")).toBe(RUN_MEDIA_PREFIX + "/run-1/a.png");
    expect(canonicalRunMediaUrl(RUN_MEDIA_PREFIX + "/run-1/a.png")).toBe(RUN_MEDIA_PREFIX + "/run-1/a.png");
    // deep, and total: a bag heals, a spell and a local file ride
    const healed = healRunMediaPaths({
      image1: [LEGACY_RUN_MEDIA_PREFIX + "/run-1/a.png"],
      src: { item: LEGACY_RUN_MEDIA_PREFIX + "/run-1/b.flac" },
      keep: ["/home/user/a.png", "$spell", "https://x.test/a.png"],
    }) as Record<string, unknown>;
    expect(JSON.stringify(healed)).toContain(RUN_MEDIA_PREFIX + "/run-1/a.png");
    expect(JSON.stringify(healed)).toContain(RUN_MEDIA_PREFIX + "/run-1/b.flac");
    expect(healed["keep"]).toEqual(["/home/user/a.png", "$spell", "https://x.test/a.png"]);
  });

  it("run memory: the BIRTH arm strips it, the RESTORE arm strips it, result is the one lawful birth memory", () => {
    const row = { result: { url: "/a.png" }, history: [{ url: "/b.png" }], runStatus: "done", resultParams: { q: [] }, resolved: { x: 1 }, card: "c" };
    // the contract's lists are the arms' lists — named once
    expect(BIRTH_STRIP_KEYS).not.toContain("result");
    expect(BIRTH_STRIP_KEYS).toContain("history");
    expect(RESTORE_STRIP_KEYS).toContain("result");
    // row normalization does NOT decide (the arm does)
    expect(normalizeBenchStage(row, 0)["history"]).toBeDefined();
    const born = normalizeBenchStage(row, 0);
    stripKeys(born, BIRTH_STRIP_KEYS);
    expect(born["history"]).toBeUndefined();
    expect(born["result"]).toBeDefined();
  });

  it("IDEMPOTENT + total: normalize(normalize(x)) === normalize(x), and junk in is a row out", () => {
    const rows = [
      { id: "a", card: "c", params: { image1: LEGACY_RUN_MEDIA_PREFIX + "/r/a.png" } },
      { id: "", params: "junk" },
      { id: 7, model: "x" },
      null,
      "not-a-row",
    ];
    for (const [i, r] of rows.entries()) {
      const once = normalizeBenchStage(r, i);
      const twice = normalizeBenchStage(once, i);
      expect(twice, JSON.stringify(r)).toEqual(once);
      expect(typeof once["id"]).toBe("string");
    }
  });
});

// ── THERE IS NO STALE TAB (operator, 2026-10-10: "THE TAB IS NEVER
// STALE, IT IS LITERALLY IMPOSSIBLE FOR THE BENCH TO BE STALE. WHEN
// THE USER DOES SOMETHING TO IT, IT UPDATES. WHEN THE AI DOES
// SOMETHING TO IT, IT UPDATES EVERYTIME. THIS REGRESSION IS
// EXTREME.") ─────────────────────────────────────────────────────
// The banner compared this tab's baked build stamp against the
// lane's served stamp — but every client bundle appends the SAME
// global assignment, so whichever bundle evaluated last owned the
// value: the tab compared itself against a SIBLING package's hash
// (live receipt: infer-gallery's cdf44c31 against melite-card-view's
// 8c2dfa26) and warned that "edits made here may run old code" over
// a bench that is, by construction, a live server document.
//
// The regression was in the COMPARISON (two unrelated domains), and
// its claim was false (the bench is never stale). So: the face is
// gone and this wall keeps it gone — a client source may not claim
// the operator's edits are stale, and the build stamp may not be
// read back out of a shared global.
describe("the stale-tab regression (it may not come back)", () => {
  it("no client source claims the tab is stale or the bench is old", () => {
    const roots = [
      "packages/web/melite-card-view/src",
      "packages/web/card-base/src",
      "packages/web/infer-gallery/src",
    ];
    const banned = [/STALE TAB/i, /stale tab/i, /cards-stale-build/, /staleBuild/, /buildVerdict/];
    const offenders: string[] = [];
    // THE WALK IS COUNTED (the walls audit's M3, 2026-10-10): a
    // renamed root made the walk read nothing and the arm passed
    // under a title that says "no client source claims…".
    let read = 0;
    const walk = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx|css)$/.test(e.name)) continue;
        read++;
        // CODE only: a comment may NAME the regression (this file
        // does), a rendered string or a read may not.
        const code = readFileSync(p, "utf8")
          .split("\n")
          .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
          .join("\n");
        for (const re of banned) {
          if (re.test(code)) offenders.push(p + " matches " + String(re));
        }
      }
    };
    for (const r of roots) {
      if (!existsSync(r)) continue;
      walk(r);
    }
    expect(read, `the walk read the client trees (${String(read)} files — a renamed root empties the arm)`).toBeGreaterThan(20);
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  it("the build stamp is not read back out of a shared global (the collision that fed it)", () => {
    // The build appends `globalThis.__MELITE_BUILD_STAMP__=<hex>` to
    // EVERY client bundle, so the value is whichever bundle ran
    // last. Nothing may compare it against the lane's stamps again;
    // the lane still serves them as its own diagnostic.
    const client = readFileSync(
      "packages/web/melite-card-view/src/client/cards-tab-body.tsx",
      "utf8",
    )
      .split("\n")
      .filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
      .join("\n");
    expect(client).not.toContain("__MELITE_BUILD_STAMP__");
    expect(client).not.toContain("card-build");
  });
});

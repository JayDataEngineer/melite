import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { mediaPrefixOf, canonicalMediaUrl, MEDIA_PREFIX, LEGACY_MEDIA_PREFIX } from "../../../../packages/estate/media/src/index.ts";

// THE RUN-MEDIA PATH LAW (operator, 2026-10-10: "When the card goes
// into history, and is reloaded, it doesn't preserve the paths for
// the inputs and image inputs, everything breaks on reloading a
// historical flow" and "THERE IS NO FILTER, NO BREAKAGE FROM THIS.
// EVER.").
//
// The paths WERE preserved — they addressed `/v1/assets/runs/`, the
// spelling that died with the gateway app, so a reloaded flow pointed
// every image and audio input at a route that answered nothing. The
// law: BOTH spellings address the same bytes (one route, two names),
// and no writer mints the dead one.
describe("the run-media path law — no stored path ever breaks", () => {
  it("both spellings resolve to one run-relative path", () => {
    const live = "/melite-media/runs/run-abc/generate/img_00001_.png";
    const legacy = "/v1/assets/runs/run-abc/generate/img_00001_.png";
    expect(mediaPrefixOf(live)).toBe(MEDIA_PREFIX);
    expect(mediaPrefixOf(legacy)).toBe(LEGACY_MEDIA_PREFIX);
    // the relative part is identical — the confinement, the loud 404
    // and the realpath containment are ONE handler's
    expect(canonicalMediaUrl(legacy)).toBe(live);
    // a path that is not run media rides verbatim (a local file, an
    // https URL, a $spell — the heal is not a filter)
    for (const keep of [
      "/home/user/data/inputs/a.png",
      "https://example.test/a.png",
      "$input_images",
      "generate/img_00001_.png",
      "/v1/assets/inputs/a.png",
    ]) {
      expect(canonicalMediaUrl(keep), keep).toBe(keep);
      expect(mediaPrefixOf(keep), keep).toBeNull();
    }
  });

  it("the LIVE bench's own paths resolve (the corpus the operator reloads)", (t) => {
    // The operator's benches live in the profile's storage, not the
    // runs tree. This walks the real bench docs and asks the only
    // question code can answer about each: does the path ADDRESS a
    // run artifact under a manifest root? (An artifact deleted by the
    // queue's own sweep is a data fact, not a code law — it is
    // counted and printed, never failed here.)
    const benchRoots = [
      "data/runtime/dsh-harness-home/storages/drafts",
      "data/runs/drafts",
    ].filter((r) => existsSync(r));
    const runRoots = ["data/runs/output", "data/runs/test-output"].filter((r) => existsSync(r));
    if (benchRoots.length === 0 || runRoots.length === 0) {
      // A bare return here counted as PASS on a fresh clone (the
      // audit's GAP 4) — a sweep that cannot run says SKIPPED.
      t.skip(true, "no bench docs or runs tree on this clone — the live-bench sweep cannot run");
      return;
    }
    const pat = /\/(?:melite-media|v1\/assets)\/runs\/([A-Za-z0-9_-]+)\/([^"\\\s]+)/g;
    let total = 0;
    let live = 0;
    let swept = 0;
    const malformed: string[] = [];
    for (const dir of benchRoots) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        const text = readFileSync(join(dir, f), "utf8");
        for (const m of text.matchAll(pat)) {
          total += 1;
          const rel = m[2] ?? "";
          if (rel === "" || rel.includes("..")) { malformed.push(f + " " + m[0]); continue }
          if (runRoots.some((r) => existsSync(join(r, m[1] ?? "", rel)))) live += 1;
          else swept += 1;
        }
      }
    }
    console.log(`live benches: ${String(total)} path(s) — ${String(live)} resolve, ${String(swept)} point at swept artifacts`);
    expect(malformed, malformed.join("\n")).toEqual([]);
    // THE LAW: every path is well-formed and addresses the run-media
    // grammar. Whether the artifact still exists is the queue's
    // retention, reported above — never a code refusal.
    expect(total > 0, "the sweep saw no bench paths at all — is the corpus path right?").toBe(true);
  });
});

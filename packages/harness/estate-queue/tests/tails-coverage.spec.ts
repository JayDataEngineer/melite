// tails-coverage.spec.ts — the estate's small dark tails, each
// one a real behavioral row: the CardArmError optional-field
// law, the inline edge/skip shapes, the artifact rim's tolls,
// and the model validate arm's voice.
import { describe, it, expect, vi } from "vitest";
import { CardArmError, phaseRefusal } from "../src/cardsArmError.ts";
import { inlineEdge, inlineSkip, inlineKind } from "../src/runsValidateInline.ts";
import { resolveArtifactFile, refLocations, findCardDangling, sweepOutputRoots } from "../src/cardsDangling.ts";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

describe("CardArmError (the optional-field law)", () => {
  it("omitted optionals never land; present optionals ride", () => {
    const bare = new CardArmError(400, "boom", "code_only");
    expect(bare.status).toBe(400);
    expect(bare.message).toBe("boom");
    expect(bare.code).toBe("code_only");
    expect(bare.loc).toBeUndefined();
    expect(bare.expected).toBeUndefined();
    expect(bare.got).toBeUndefined();
    const full = new CardArmError(400, "boom", "c", "loc-v", "exp-v", "got-v");
    expect(full.loc).toBe("loc-v");
    expect(full.expected).toBe("exp-v");
    expect(full.got).toBe("got-v");
  });
  it("phaseRefusal stamps the phase voice at 400", () => {
    const e = phaseRefusal("2", "the detail");
    expect(e).toBeInstanceOf(CardArmError);
    expect(e.status).toBe(400);
    expect(e.message).toBe("card_compose phase 2: the detail");
  });
});

describe("inlineEdge (the edge shapes)", () => {
  it("initial edges stringify their key; stage edges stringify both members", () => {
    expect(inlineEdge("w", { initial: 7 })).toEqual({ kind: "initial", key: "7" });
    expect(inlineEdge("w", { initial: null })).toEqual({ kind: "initial", key: "" });
    expect(inlineEdge("w", { stage: 7, output: null })).toEqual({ kind: "stage", stage: "7", output: "" });
  });
});

describe("inlineSkip (the branch shape)", () => {
  it("the initial key stringifies; a wrong key set refuses with the branch voice", () => {
    expect(() => inlineSkip("w", { initial: "k", when: "maybe" })).toThrow(/is not a branch condition/);
    expect(() => inlineSkip("w", { initial: 7, when: "present" })).toThrow(/skip initial 7 is not a non-empty string/);
  });
});

describe("inlineKind (the kind voice)", () => {
  it("non-string kinds refuse with the where voice", () => {
    expect(inlineKind("w out", "image")).toBe("image");
    expect(() => inlineKind("w out", 7)).toThrow(/w out: kind 7 is not a string/);
  });
});

describe("the artifact rim (tolls and roots)", () => {
  const ROOT = mkdtempSync(join(tmpdir(), "melite-tails-"));
  it("sweepOutputRoots serves the canonical pair (§23 manifest: output then test-output)", () => {
    const roots = sweepOutputRoots();
    expect(roots[0]).toContain("output");
    expect(roots[1].endsWith(join("data", "runs", "test-output"))).toBe(true);
  });
  it("malformed URLs refuse with the want voice; traversal refuses", () => {
    expect(() => resolveArtifactFile("/v1/assets/runs/", ROOT)).toThrow(/malformed artifact URL/);
    expect(() => resolveArtifactFile("/v1/assets/runs/no-file-part", ROOT)).toThrow(/malformed artifact URL/);
    expect(() => resolveArtifactFile("/v1/assets/runs/run-1", ROOT)).toThrow(/malformed artifact URL/);
    expect(() => resolveArtifactFile("/v1/assets/runs/../escape.png", ROOT)).toThrow(/refuses traversal/);
  });
  it("refLocations walks objects, arrays, and prefixed strings (dotted and indexed paths)", () => {
    const body = {
      a: { deep: "/v1/assets/runs/run-1/x.png" },
      b: ["/v1/assets/runs/run-1/y.png", 7],
      c: "not-a-ref",
    };
    const rows = refLocations(body).sort((x, y) => x.location.localeCompare(y.location));
    expect(rows).toEqual([
      { location: "$.a.deep", ref: "/v1/assets/runs/run-1/x.png" },
      { location: "$.b[0]", ref: "/v1/assets/runs/run-1/y.png" },
    ]);
  });
  it("findCardDangling quotes the primary root lookup; a live file rides clean", () => {
    const outRoot = sweepOutputRoots()[0];
    mkdirSync(join(outRoot, "run-tails"), { recursive: true });
    writeFileSync(join(outRoot, "run-tails", "live.png"), "x");
    try {
      const ghost = findCardDangling({ deep: [{ ghost: "/v1/assets/runs/run-ghost/ghost.png" }] });
      expect(ghost).not.toBeNull();
      expect(ghost?.[2]).toMatch(/run-ghost/);
      expect(findCardDangling({ deep: [{ live: "/v1/assets/runs/run-tails/live.png" }] })).toBeNull();
    } finally {
      const { rmSync } = require("node:fs") as typeof import("node:fs");
      rmSync(join(outRoot, "run-tails"), { recursive: true, force: true });
    }
  });
});

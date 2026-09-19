// cards-dangling.spec.ts — the artifact-ref resolver's refusal
// voices (TEST-2 breadth, the deterministic census of 2026-09-19).
// resolveArtifactFile is the compose gate's rim: every malformed
// ref must refuse LOUD with its own message. The two v8-ignore
// fences (the empty rim, the post-traversal escape) stay ignored
// by proof, not by absence of tests.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifactFile } from "../src/cardsDangling.ts";

const ROOT = join(tmpdir(), "melite-dangling-" + process.pid);
mkdirSync(ROOT, { recursive: true });
mkdirSync(join(ROOT, "run-1"), { recursive: true });
writeFileSync(join(ROOT, "run-1", "out.png"), "x");

describe("resolveArtifactFile (the artifact rim)", () => {
  it("a live artifact URL resolves inside the root", () => {
    const p = resolveArtifactFile("/v1/assets/runs/run-1/out.png", ROOT);
    assert.equal(p, join(ROOT, "run-1", "out.png"));
  });
  it("a traversal ref refuses", () => {
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/../escape.png", ROOT),
      /refuses traversal/,
    );
  });
  it("a missing run segment refuses malformed", () => {
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/", ROOT),
      /malformed artifact URL/,
    );
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/onlyone", ROOT),
      /malformed artifact URL/,
    );
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/run-1/", ROOT),
      /malformed artifact URL/,
    );
  });
  it("a non-artifact URL refuses the shape", () => {
    assert.throws(
      () => resolveArtifactFile("https://host/x.png", ROOT),
      /not an artifact URL/,
    );
    assert.throws(
      () => resolveArtifactFile("relative.png", ROOT),
      /not an artifact URL/,
    );
  });
  it("a well-formed URL to a MISSING file refuses not-found (run id voiced)", () => {
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/run-9/ghost.png", ROOT),
      /run-9/,
    );
  });
  it("a directory target refuses not-found (files only)", () => {
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/run-1", ROOT),
      /run-1/,
    );
  });
});

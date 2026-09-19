// cards-dangling.spec.ts — the artifact-ref resolver's refusal
// voices (TEST-2 breadth, the deterministic census of 2026-09-19).
// resolveArtifactFile is the compose gate's rim: every malformed
// ref must refuse LOUD with its own message. The two v8-ignore
// fences (the empty rim, the post-traversal escape) stay ignored
// by proof, not by absence of tests.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifactFile, findCardDangling, sweepRoots } from "../src/cardsDangling.ts";

const ROOT = join(tmpdir(), "melite-dangling-" + process.pid);
mkdirSync(ROOT, { recursive: true });
mkdirSync(join(ROOT, "run-1"), { recursive: true });
writeFileSync(join(ROOT, "run-1", "out.png"), "x");

describe("findCardDangling (the deep walk)", () => {
  it("a live ref nested in arrays/objects rides (refLocations walk)", () => {
    // findCardDangling probes the REPO's real sweep roots — the live
    // fixture must land there (mkdir + file, swept after)
    const { outRoot } = sweepRoots();
    mkdirSync(join(outRoot, "run-walk"), { recursive: true });
    writeFileSync(join(outRoot, "run-walk", "out.png"), "x");
    try {
      const body = {
        gallery: [{ image: "/v1/assets/runs/run-walk/out.png" }, { other: 5 }],
        plain: "not a ref",
      };
      assert.equal(findCardDangling(body), null, "the live ref resolves in the real root");
    } finally {
      rmSync(join(outRoot, "run-walk"), { recursive: true, force: true });
    }
  });
  it("a dangling ref returns location + ref + the first refusal message", () => {
    const body = { deep: [{ ghost: "/v1/assets/runs/run-9/ghost.png" }] };
    const out = findCardDangling(body);
    assert.ok(Array.isArray(out));
    assert.equal((out as unknown[])[1], "/v1/assets/runs/run-9/ghost.png");
    assert.match(String((out as unknown[])[2]), /run-9/);
  });
});

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

// cards-dangling.spec.ts — the artifact-ref resolver's refusal
// voices (TEST-2 breadth, the deterministic census of 2026-09-19)
// + THE CROSS-ROOTS WALL (§23, 2026-09-24 — receipt transcript-034
// step 18: the compose gate refused a LIVE portrait ref because
// the sweep only knew data/runs/output while the maker lane mints
// under MELITE_STATE_ROOT/output). resolveArtifactFile is the
// compose gate's rim: every malformed ref must refuse LOUD with
// its own message. The two v8-ignore fences (the empty rim, the
// post-traversal escape) stay ignored by proof, not by absence of
// tests.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveArtifactFile,
  findCardDangling,
  sweepOutputRoots,
} from "../src/cardsDangling.ts";

const ROOT = join(tmpdir(), "melite-dangling-" + process.pid);
mkdirSync(ROOT, { recursive: true });
mkdirSync(join(ROOT, "run-1"), { recursive: true });
writeFileSync(join(ROOT, "run-1", "out.png"), "x");

describe("findCardDangling (the deep walk)", () => {
  it("a live ref nested in arrays/objects rides (refLocations walk)", () => {
    // findCardDangling probes the manifest sweep roots — the live
    // fixture must land there (mkdir + file, swept after). The
    // default root for THIS process is whatever MELITE_STATE_ROOT
    // says (repo-anchored default when unset) — the sweep's own
    // first tree is the honest target.
    const outRoot: string = sweepOutputRoots()[0] as string;
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

  it("dedupes lexically identical manifest output roots", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-dangling-roots-"));
    const previousRoot = process.env["MELITE_STATE_ROOT"];
    const previousExtras = process.env["MELITE_STATE_ROOTS"];
    process.env["MELITE_STATE_ROOT"] = root;
    process.env["MELITE_STATE_ROOTS"] = root + "/./";
    try {
      const roots = sweepOutputRoots();
      assert.equal(new Set(roots).size, roots.length);
      assert.deepEqual(roots, [join(root, "output"), join(root, "test-output")]);
    } finally {
      if (previousRoot === undefined) delete process.env["MELITE_STATE_ROOT"];
      else process.env["MELITE_STATE_ROOT"] = previousRoot;
      if (previousExtras === undefined) delete process.env["MELITE_STATE_ROOTS"];
      else process.env["MELITE_STATE_ROOTS"] = previousExtras;
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("THE RECEIPT WALL (transcript-034 step 18): a live ref under MELITE_STATE_ROOT/output, BOTH spellings, rides — and a miss names every searched tree", () => {
    // The maker lane's exact shape: state root = repo root, run
    // output at <stateRoot>/output/<run>/. With the env injected,
    // the sweep must resolve refs minted there under EITHER estate
    // prefix (the assets spelling the h3 card docs teach AND the
    // media spelling the receipts serve).
    const prevRoot: string | undefined = process.env["MELITE_STATE_ROOT"];
    const prevExtras: string | undefined = process.env["MELITE_STATE_ROOTS"];
    const lane: string = join(tmpdir(), "melite-dangling-lane-" + process.pid);
    const extra: string = join(tmpdir(), "melite-dangling-extra-" + process.pid);
    mkdirSync(join(lane, "output", "run-live", "generate"), { recursive: true });
    writeFileSync(join(lane, "output", "run-live", "generate", "portrait.png"), "x");
    mkdirSync(join(extra, "output", "run-extra", "music"), { recursive: true });
    writeFileSync(join(extra, "output", "run-extra", "music", "score.mp3"), "x");
    process.env["MELITE_STATE_ROOT"] = lane;
    process.env["MELITE_STATE_ROOTS"] = extra;
    try {
      assert.deepEqual(sweepOutputRoots(), [
        join(lane, "output"),
        join(lane, "test-output"),
        join(extra, "output"),
        join(extra, "test-output"),
      ], "the manifest walk, own root first, both trees");
      // the assets spelling (the receipt's refused ref):
      assert.equal(
        findCardDangling({ ref_images: ["/v1/assets/runs/run-live/generate/portrait.png"] }),
        null,
        "assets-spelled ref to a live MELITE_STATE_ROOT run rides (the false refusal is dead)",
      );
      // the media spelling (first-class, same trees):
      assert.equal(
        findCardDangling({ ref_images: ["/melite-media/runs/run-live/generate/portrait.png"] }),
        null,
        "media-spelled refs sweep too",
      );
      // an extras-tree run (the shared-everything lane):
      assert.equal(
        findCardDangling({ src: "/v1/assets/runs/run-extra/music/score.mp3" }),
        null,
        "extras-manifest trees sweep",
      );
      // a miss refuses naming EVERY searched tree (NAME-THE-ROOT):
      const miss = findCardDangling({ src: "/v1/assets/runs/run-ghost/ghost.png" });
      assert.ok(miss !== null, "the ghost dangles");
      const voice: string = (miss as unknown[])[2] as string;
      assert.match(voice, /searched/, "the miss names the searched trees");
      assert.match(voice, /melite-dangling-lane/, "…including the lane's own root");
      assert.match(voice, /melite-dangling-extra/, "…and the extras root");
      assert.equal(
        findCardDangling({ src: "/melite-media/runs/run-live/generate/portrait.png" }),
        null,
        "the media spelling rides clean",
      );
    } finally {
      if (prevRoot === undefined) delete process.env["MELITE_STATE_ROOT"];
      else process.env["MELITE_STATE_ROOT"] = prevRoot;
      if (prevExtras === undefined) delete process.env["MELITE_STATE_ROOTS"];
      else process.env["MELITE_STATE_ROOTS"] = prevExtras;
      rmSync(lane, { recursive: true, force: true });
      rmSync(extra, { recursive: true, force: true });
    }
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
  it("one voice for non-swept shapes: a bare name refuses; runs-relative and absolute paths resolve", () => {
    // The resolver's ported shapes (artifact_refs.py): a
    // runs-relative <run>/<file> joins the root, an absolute path
    // is its own candidate, and only a BARE name refuses — the
    // ComfyUI input dir is the caller's staging concern, never a
    // disk lookup.
    assert.throws(
      () => resolveArtifactFile("relative.png", ROOT),
      /artifact ref is a bare "relative.png" — not an absolute path, an artifact URL/,
    );
    assert.throws(
      () => resolveArtifactFile("https://host/x.png", ROOT),
      /artifact not found on disk/,
    );
    // a runs-relative miss voices its OWN run id (the first
    // segment); an absolute miss carries no run to name.
    assert.throws(
      () => resolveArtifactFile("run-absent/ghost.png", ROOT),
      /never an output of run run-absent/,
    );
    assert.throws(
      () => resolveArtifactFile(join(ROOT, "nowhere", "g.png"), ROOT),
      /never an output of run \?/,
    );
    mkdirSync(join(ROOT, "run-rel"), { recursive: true });
    writeFileSync(join(ROOT, "run-rel", "x.png"), "x");
    assert.equal(resolveArtifactFile("run-rel/x.png", ROOT), join(ROOT, "run-rel", "x.png"));
    assert.equal(resolveArtifactFile(join(ROOT, "run-rel", "x.png"), ROOT), join(ROOT, "run-rel", "x.png"));
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

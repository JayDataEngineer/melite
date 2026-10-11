// cards-dangling.spec.ts — the artifact-ref resolver's refusal
// voices (TEST-2 breadth, the deterministic census of 2026-09-19)
// + THE CROSS-ROOTS WALL (§23, 2026-09-24 — receipt transcript-034
// step 18: the compose gate refused a LIVE portrait ref because
// the sweep only knew data/runs/output while the maker lane mints
// under its own state root's output). resolveArtifactFile is the
// compose gate's rim: every malformed ref must refuse LOUD with
// its own message. The two v8-ignore fences (the empty rim, the
// post-traversal escape) stay ignored by proof, not by absence of
// tests. J12: the manifest arrives as call data (the queue seat's
// stateRoots), never an env seam.
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
    // manifest is the caller's call data (J12): this test names
    // the fixture tree directly, the sweep's own first tree is
    // the honest target.
    const manifest = [mkdtempSync(join(tmpdir(), "melite-dangling-walk-"))];
    const outRoot: string = sweepOutputRoots(manifest)[0] as string;
    mkdirSync(join(outRoot, "run-walk"), { recursive: true });
    writeFileSync(join(outRoot, "run-walk", "out.png"), "x");
    try {
      const body = {
        gallery: [{ image: "/v1/assets/runs/run-walk/out.png" }, { other: 5 }],
        plain: "not a ref",
      };
      assert.equal(findCardDangling(body, manifest), null, "the live ref resolves in the named root");
    } finally {
      rmSync(manifest[0] as string, { recursive: true, force: true });
    }
  });
  it("a dangling ref returns location + ref + the first refusal message", () => {
    const body = { deep: [{ ghost: "/v1/assets/runs/run-9/ghost.png" }] };
    const out = findCardDangling(body, [ROOT]);
    assert.ok(Array.isArray(out));
    assert.equal((out as unknown[])[1], "/v1/assets/runs/run-9/ghost.png");
    assert.match(String((out as unknown[])[2]), /run-9/);
  });

  it("dedupes lexically identical manifest output roots", () => {
    const root = mkdtempSync(join(tmpdir(), "melite-dangling-roots-"));
    try {
      const roots = sweepOutputRoots([root, root + "/./"]);
      assert.equal(new Set(roots).size, roots.length);
      assert.deepEqual(roots, [join(root, "output"), join(root, "test-output")]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("THE RECEIPT WALL (transcript-034 step 18): a live ref under the lane's state-root output, BOTH spellings, rides — and a miss names every searched tree", () => {
    // The maker lane's exact shape: state root = repo root, run
    // output at <stateRoot>/output/<run>/. With the manifest named
    // as call data, the sweep must resolve refs minted there under
    // EITHER estate prefix (the assets spelling the h3 card docs
    // teach AND the media spelling the receipts serve).
    const lane: string = join(tmpdir(), "melite-dangling-lane-" + process.pid);
    const extra: string = join(tmpdir(), "melite-dangling-extra-" + process.pid);
    const manifest = [lane, extra];
    mkdirSync(join(lane, "output", "run-live", "generate"), { recursive: true });
    writeFileSync(join(lane, "output", "run-live", "generate", "portrait.png"), "x");
    mkdirSync(join(extra, "output", "run-extra", "music"), { recursive: true });
    writeFileSync(join(extra, "output", "run-extra", "music", "score.mp3"), "x");
    try {
      assert.deepEqual(sweepOutputRoots(manifest), [
        join(lane, "output"),
        join(lane, "test-output"),
        join(extra, "output"),
        join(extra, "test-output"),
      ], "the manifest walk, own root first, both trees");
      // the assets spelling (the receipt's refused ref):
      assert.equal(
        findCardDangling({ ref_images: ["/v1/assets/runs/run-live/generate/portrait.png"] }, manifest),
        null,
        "assets-spelled ref to a live state-root run rides (the false refusal is dead)",
      );
      // the media spelling (first-class, same trees):
      assert.equal(
        findCardDangling({ ref_images: ["/melite-media/runs/run-live/generate/portrait.png"] }, manifest),
        null,
        "media-spelled refs sweep too",
      );
      // an extras-tree run (the shared-everything lane):
      assert.equal(
        findCardDangling({ src: "/v1/assets/runs/run-extra/music/score.mp3" }, manifest),
        null,
        "extras-manifest trees sweep",
      );
      // a miss refuses naming EVERY searched tree (NAME-THE-ROOT):
      const miss = findCardDangling({ src: "/v1/assets/runs/run-ghost/ghost.png" }, manifest);
      assert.ok(miss !== null, "the ghost dangles");
      const voice: string = (miss as unknown[])[2] as string;
      assert.match(voice, /searched/, "the miss names the searched trees");
      assert.match(voice, /melite-dangling-lane/, "…including the lane's own root");
      assert.match(voice, /melite-dangling-extra/, "…and the extras root");
      assert.equal(
        findCardDangling({ src: "/melite-media/runs/run-live/generate/portrait.png" }, manifest),
        null,
        "the media spelling rides clean",
      );
    } finally {
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
  it("an empty ref refuses; an absolute path outside the root refuses", () => {
    assert.throws(() => resolveArtifactFile("  ", ROOT), /empty artifact ref/);
    assert.throws(() => resolveArtifactFile("/etc/passwd", ROOT), /escapes the output root/);
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
    // The resolver's shapes (ported from the RETIRED artifact_refs.py): a runs-relative <run>/<file> joins the root, an absolute path is its own candidate, and only a BARE name refuses.
    // The ComfyUI input dir is the caller's staging concern, never a disk lookup.
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

// ROUND-23 GALLERY-TWINS HARDENING (audit round23-gallery-chain
// F5 + the sweep twins of F2/F3/F4): the compose gate sweeps the
// gallery face, case-insensitively, through the segment law — a
// dead gallery ref dangles at compose, never sails to start.
describe("the gallery face at the sweep (F5 + segment/decode twins)", () => {
  const gal = (tail: string): string =>
    "/infer-gallery/artifact?path=" + encodeURIComponent(tail);
  mkdirSync(join(ROOT, "run-1", "g"), { recursive: true });
  writeFileSync(join(ROOT, "run-1", "g", "out 1.png"), "x");
  writeFileSync(join(ROOT, "run-1", "g", "still..frame.png"), "x");

  it("a live gallery URL resolves inside the root", () => {
    assert.equal(
      resolveArtifactFile(gal("run-1/g/out 1.png"), ROOT),
      join(ROOT, "run-1", "g", "out 1.png"),
    );
  });
  it("a dead gallery URL refuses not-found naming its run", () => {
    assert.throws(
      () => resolveArtifactFile(gal("run-ghost/g/gone.png"), ROOT),
      /never an output of run run-ghost/,
    );
  });
  it("a dead gallery ref dangles at compose (the sweep yields the face)", () => {
    const manifest = [mkdtempSync(join(tmpdir(), "melite-dangling-gal-"))];
    const miss = findCardDangling({ image: gal("run-ghost/g/gone.png") }, manifest);
    assert.ok(miss !== null, "the dead gallery ref dangles");
    assert.match((miss as unknown[])[2] as string, /run-ghost/);
    const liveRoot: string = sweepOutputRoots(manifest)[0] as string;
    mkdirSync(join(liveRoot, "run-g"), { recursive: true });
    writeFileSync(join(liveRoot, "run-g", "x.png"), "x");
    assert.equal(findCardDangling({ image: gal("run-g/x.png") }, manifest), null);
    rmSync(manifest[0] as string, { recursive: true, force: true });
  });
  it("the estate prefixes match either case", () => {
    assert.equal(
      resolveArtifactFile("/V1/ASSETS/RUNS/run-1/out.png", ROOT),
      join(ROOT, "run-1", "out.png"),
    );
    assert.equal(
      resolveArtifactFile("/MELITE-MEDIA/RUNS/run-1/out.png", ROOT),
      join(ROOT, "run-1", "out.png"),
    );
  });
  it("a per-segment-escaped space resolves (no false dangle on a live ref)", () => {
    assert.equal(
      resolveArtifactFile("/v1/assets/runs/run-1/g/out%201.png", ROOT),
      join(ROOT, "run-1", "g", "out 1.png"),
    );
  });
  it("a ..-inside-name resolves (traversal is segments, not substrings)", () => {
    assert.equal(
      resolveArtifactFile("/v1/assets/runs/run-1/g/still..frame.png", ROOT),
      join(ROOT, "run-1", "g", "still..frame.png"),
    );
    assert.equal(
      resolveArtifactFile(gal("run-1/g/still..frame.png"), ROOT),
      join(ROOT, "run-1", "g", "still..frame.png"),
    );
  });
  it("a traversal gallery tail refuses (the segment law)", () => {
    assert.throws(
      () => resolveArtifactFile(gal("run-1/../../escape.png"), ROOT),
      /refuses traversal/,
    );
    assert.throws(
      () => resolveArtifactFile("/v1/assets/runs/run-1/g/%2E%2E/x.png", ROOT),
      /refuses traversal/,
    );
  });
});

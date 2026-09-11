// @melite/3d-clothing-placement — the COMPOSE gate (2026-09-12,
// TEST-2 breadth). The estate-file contract is the card's own law:
// file-typed params must EXIST at compose time; $spells and linked
// output URLs ride verbatim; out_path is a write target (non-empty
// + an existing parent, never a pre-existing file). Every refusal
// is loud, and the happy path emits the two-node macro graph.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadCardDefs } from "@melite/comfyui-cordis";
// Deep-relative (the package's own precedent — composition.spec
// imports toolProjection the same way; card-kit is not this
// package's dependency, so no bare specifier resolves here).
import { GraphBuilder } from "../../../engines/comfyui-card-kit/src/graph.ts";

const DUMMY_MODEL = { id: "", card: "", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } as never;

async function composeOf(): Promise<(p: Record<string, unknown>, g: GraphBuilder) => void> {
  const defs = await loadCardDefs();
  const def = defs.get("clothing-placement");
  assert.ok(def, "the composition root serves the card");
  return (p, g): void => def!.compose(p, DUMMY_MODEL, g, "run_1");
}

function tmpFiles(): { body: string; garment: string; out: string } {
  const dir = mkdtempSync(join(tmpdir(), "place-"));
  const body = join(dir, "b.glb");
  const garment = join(dir, "g.glb");
  writeFileSync(body, "b");
  writeFileSync(garment, "g");
  return { body, garment, out: join(dir, "placed.glb") };
}

describe("the estate-file contract (file-typed params exist NOW)", () => {
  it("a missing body refuses by name", async () => {
    const compose = await composeOf();
    const { garment, out } = tmpFiles();
    assert.throws(
      () => compose({ garment, out_path: out }, new GraphBuilder()),
      /required param 'body' missing or empty/,
    );
  });

  it("a missing garment refuses by name", async () => {
    const compose = await composeOf();
    const { body, out } = tmpFiles();
    assert.throws(
      () => compose({ body, out_path: out }, new GraphBuilder()),
      /required param 'garment' missing or empty/,
    );
  });

  it("a staged file rides as its absolute path; a missing file refuses", async () => {
    const compose = await composeOf();
    const { body, garment, out } = tmpFiles();
    const g = new GraphBuilder();
    compose({ body, garment, out_path: out, snap_to: "chest", mirror_x: true }, g);
    const graph = g.toJSON();
    const call = graph["MeliteBlenderMCPCall.0"];
    assert.ok(call, "the macro node is emitted");
    const args = JSON.parse(String(call.inputs.args)) as Record<string, unknown>;
    assert.equal(args.body, body, "absolute path rides");
    assert.equal(args.snap_to, "chest");
    assert.equal(args.mirror_x, true);
    assert.ok(graph["SaveText.0"], "the result node is emitted");
    assert.equal(graph["SaveText.0"].inputs.filename_prefix, "run_1/placement");
    // A file that is not on the estate refuses loudly.
    assert.throws(
      () => compose({ body, garment: "/nonexistent/g.glb", out_path: out }, new GraphBuilder()),
      /garment '.*' is not a file on this estate/,
    );
  });

  it("a $spell rides verbatim (a wired stage input)", async () => {
    const compose = await composeOf();
    const { garment, out } = tmpFiles();
    const g = new GraphBuilder();
    compose({ body: "$body_out", garment, out_path: out }, g);
    const args = JSON.parse(String(g.toJSON()["MeliteBlenderMCPCall.0"].inputs.args)) as Record<string, unknown>;
    assert.equal(args.body, "$body_out");
  });

  it("a linked output URL rides verbatim (the uploader stages it)", async () => {
    const compose = await composeOf();
    const { body, out } = tmpFiles();
    const g = new GraphBuilder();
    compose({ body, garment: "https://estate.local/media/runs/r1/g.glb", out_path: out }, g);
    const args = JSON.parse(String(g.toJSON()["MeliteBlenderMCPCall.0"].inputs.args)) as Record<string, unknown>;
    assert.equal(args.garment, "https://estate.local/media/runs/r1/g.glb");
  });

  it("a relative path resolves against the cwd", async () => {
    const compose = await composeOf();
    const { body, garment, out } = tmpFiles();
    const g = new GraphBuilder();
    const cwd = process.cwd();
    process.chdir(join(body, ".."));
    try {
      compose({ body: "b.glb", garment: "g.glb", out_path: out }, g);
    } finally {
      process.chdir(cwd);
    }
    const args = JSON.parse(String(g.toJSON()["MeliteBlenderMCPCall.0"].inputs.args)) as Record<string, unknown>;
    assert.equal(args.body, body, "resolved to the same absolute file");
  });
});

describe("out_path is a WRITE target (parent exists, file need not)", () => {
  it("a missing out_path refuses by name", async () => {
    const compose = await composeOf();
    const { body, garment } = tmpFiles();
    assert.throws(
      () => compose({ body, garment, out_path: " " }, new GraphBuilder()),
      /required param 'out_path' missing or empty/,
    );
  });

  it("a parent that is not a directory refuses (stage it first)", async () => {
    const compose = await composeOf();
    const { body, garment } = tmpFiles();
    assert.throws(
      () => compose({ body, garment, out_path: join(body, "nested", "out.glb") }, new GraphBuilder()),
      /is not a directory on this estate/,
    );
  });

  it("the out parent may pre-exist empty (the mkdir -p posture)", async () => {
    const compose = await composeOf();
    const { body, garment } = tmpFiles();
    const dir = mkdtempSync(join(tmpdir(), "place-out-"));
    const g = new GraphBuilder();
    compose({ body, garment, out_path: join(dir, "placed.glb") }, g);
    const args = JSON.parse(String(g.toJSON()["MeliteBlenderMCPCall.0"].inputs.args)) as Record<string, unknown>;
    assert.equal(args.out, join(dir, "placed.glb"));
  });
});

/**
 * no-lanpaint — THE RETIREMENT WALL (operator 2026-11-12: "remove
 * lanpaint, it is bad when we have the image edit and masking
 * anyways").
 *
 * THE LAW: no edit lane inpaints in place. The LanPaint pack, its
 * sampler arm, its lanpaint and outpaint knob surface, its flavor
 * boarding, its brick seat, its manifest/facts pins, its tsconfig
 * aliases, and its orphaned preset are GONE — every plane or this
 * wall reds naming the plane. Masked edits ride mask_mode
 * crop_stitch (the region detailer); a wider canvas is the
 * pad-and-instruct recipe (never outpaint knobs — none exist on any
 * door).
 *
 * THE LAYERS (a retirement crosses all three, each arm its own):
 *   1. pack taxonomy + fate (the engine's registration plane)
 *   2. kit field surface (the declared knob vocabulary)
 *   3. DECL boardings (no family boards the retired pack)
 *   4. the compose door (stale keys refuse as undeclared params)
 *   5. shipped data pins (manifest + facts extension map)
 *   6. alias + preset residue (tsconfigs, facade rows, 2511 exports)
 *
 * RED-PROOF: restore the retired nodes.yaml pin (a ComfyUI-LanPaint
 * row under models/image/qwen-img-edit-2511/), regen the manifest,
 * and arm 5 reds naming ComfyUI-LanPaint. Delete the pin, regen,
 * green restored. Receipt:
 * dev_docs/contracts/receipts/2026-11-12-cards-no-lanpaint.md.
 */
import "../../../helpers/boot-models.ts";
import assert from "node:assert/strict";
import { test } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadCardDefs, theService } from "../../../../packages/engines/comfyui-cordis/src/index.ts";
import { getModel, registryIds } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

await loadCardDefs();
const svc = theService();
const ROOT = join(import.meta.dirname, "../../../..");

/** every nodes.yaml / extensions.yaml declaration under models (the
 *  pack-pin plane — the engine tree's live install is the operator's
 *  restart, never this wall's judge). */
function nodesYaml(): Array<{ file: string; text: string }> {
  const out: Array<{ file: string; text: string }> = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      let st;
      try { st = statSync(full); } catch { continue; }
      if (st.isDirectory()) {
        if (name === "node_modules" || name === "lib" || name === "dist") continue;
        walk(full);
        continue;
      }
      if (name !== "nodes.yaml" && name !== "extensions.yaml") continue;
      out.push({ file: full, text: readFileSync(full, "utf8") });
    }
  };
  walk(join(ROOT, "packages"));
  return out;
}

test("THE RETIREMENT, pack plane: no lanpaint pack is registered and no fate names it", async () => {
  assert.ok(!svc.packNames().includes("lanpaint"), "lanpaint retired from the pack taxonomy");
  const guard = await import("../../../../packages/engines/comfyui-card-kit/src/mods/guard.ts");
  assert.ok(!("lanpaint" in guard.PACK_FATE), "lanpaint retired from the fate table");
});

test("THE RETIREMENT, knob plane: the kit field surface names no lanpaint/outpaint knob", async () => {
  const fields = await import("../../../../packages/engines/comfyui-card-kit/src/pack-fields.ts");
  for (const key of Object.keys(fields)) {
    assert.ok(!/lanpaint|outpaint/i.test(key), `kit export '${key}' names the retired surface`);
  }
  const kits = [fields.LorasFields, fields.MaskFields, fields.ControlNetFields, fields.IPAdapterFields, fields.QvoiceFields, fields.QvoiceSaveFields];
  for (const schema of kits) {
    const dict = (schema as { dict?: Record<string, unknown> }).dict ?? {};
    for (const knob of Object.keys(dict)) {
      assert.ok(!/lanpaint|outpaint/i.test(knob), `declared knob '${knob}' names the retired surface`);
    }
  }
  for (const riders of [fields.LORAS_RIDERS, fields.MASK_RIDERS]) {
    for (const knob of riders as readonly string[]) {
      assert.ok(!/lanpaint|outpaint/i.test(knob), `rider '${knob}' names the retired surface`);
    }
  }
});

test("THE RETIREMENT, boarding plane: no DECL boards the retired pack", () => {
  let judged = 0;
  for (const id of registryIds()) {
    for (const entry of ((getModel(id).mods ?? []) as readonly (string | { pack: string })[])
      .map((m) => (typeof m === "string" ? m : m.pack))) {
      judged++;
      assert.ok(!/lanpaint/i.test(entry), `model '${id}' boards the retired pack '${entry}'`);
    }
  }
  assert.ok(judged > 0, "the boarding walk judged real rows (an emptied mods table is an empty pass)");
});

test("THE RETIREMENT, door plane: stale inpaint keys refuse as undeclared params", async () => {
  const { GraphBuilder } = await import("../../../../packages/engines/comfyui-cordis/src/index.ts");
  const def = svc.getCardDef("image-edit") as unknown as {
    schema: (p: unknown) => unknown;
    compose: (p: unknown, m: unknown, g: unknown, r: string) => unknown;
  };
  const model = getModel("qwen-img-edit-2511") as never;
  for (const stale of ["lanpaint_enabled", "lanpaint_num_steps", "lanpaint_lambda", "outpaint_top", "outpaint_overlap"]) {
    assert.throws(
      () => def.compose(def.schema({ prompt: "x", image1: "/m/i.png", [stale]: 1 }), model, new GraphBuilder(), "r_no_lanpaint"),
      new RegExp(`undeclared param\\(s\\): ${stale}`),
      `the stale ${stale} knob refuses at admission`,
    );
  }
});

test("THE RETIREMENT, data plane: the shipped pins name no LanPaint pack", () => {
  const manifest = JSON.parse(readFileSync(join(ROOT, "packages/engines/comfyui-cordis/data/extension-manifest.json"), "utf8")) as Array<{ name: string }>;
  assert.ok(manifest.length > 0, "the manifest walk read real rows (an emptied file is an empty pass)");
  assert.ok(!manifest.some((r) => /lanpaint/i.test(r.name)), "the shipped manifest declares no LanPaint pack");
  const facts = JSON.parse(readFileSync(join(ROOT, "packages/engines/comfyui-cordis/data/model-facts.json"), "utf8")) as {
    extension_node_types?: Record<string, unknown>;
  };
  for (const key of Object.keys(facts.extension_node_types ?? {})) {
    assert.ok(!/lanpaint/i.test(key), `the facts extension map names the retired pack '${key}'`);
  }
  for (const { file, text } of nodesYaml()) {
    assert.ok(!/lanpaint/i.test(text), `declaration pin survives in ${file}`);
  }
});

test("THE RETIREMENT, residue plane: no alias, export, or preset names the retired mod", () => {
  const base = readFileSync(join(ROOT, "tsconfig.base.json"), "utf8");
  assert.ok(!/mods\/lanpaint/i.test(base), "tsconfig.base.json carries a lanpaint alias");
  const facade = readFileSync(join(ROOT, "tools/facade-rows.json"), "utf8");
  assert.ok(!/mods\/lanpaint/i.test(facade), "tools/facade-rows.json carries a lanpaint row");
  const pkg = JSON.parse(readFileSync(join(ROOT, "packages/models/qwen-img-edit-2511/package.json"), "utf8")) as {
    exports?: Record<string, unknown>;
  };
  for (const key of Object.keys(pkg.exports ?? {})) {
    assert.ok(!/lanpaint/i.test(key), `the 2511 package exports the retired mod '${key}'`);
  }
  for (const { file } of nodesYaml()) {
    assert.ok(!/inpaint_lanpaint/i.test(file), `the orphaned preset survives at ${file}`);
  }
});

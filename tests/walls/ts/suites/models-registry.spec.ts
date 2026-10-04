// models-registry.spec.ts — THE RESURRECTED MODEL REGISTRY WALL.
//
// The registry contract (ported from melite_models @ git 034e1f97):
// frozen data + cascade semantics + served rows. This wall pins the
// resurrection so it can never silently die again: counts, the
// cascade merge, resolve-with-artifact (DOWNLOAD LINKS), the mods
// set, and the unoffered exclusions.
//
// Run: npx vitest run tests/walls/ts/suites/models-registry.spec.ts

import "../../../helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { LANE_TOPOLOGY as VD_TOPOLOGY } from "../../../../packages/models/qwen3-tts-voicedesign/src/index.ts";
import {
  modelCatalog,
  modelIds,
  registryIds,
  registryModel,
  mergedDefaults,
  resolve,
  getModel,
  ModelError,
} from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";


// ── the DERIVED expectations (the flake audit, 2026-10-15) ───────
// The registry's shape is a function of the tree: every family
// package under packages/models declares a DECL with a literal id,
// and the flat route set is what those declarations mint. Asserting
// the DERIVED values keeps every real regression (a family that stops
// registering, a variant that loses its flat address, a route nobody
// declares) while surviving a legitimate addition with no edit here.
const REPO_ROOT = new URL("../../../../", import.meta.url).pathname

/** Every family id a package under packages/models declares, read
 *  from each DECL's own literal — the tree, never a count. */
function declaredFamilyIds(): string[] {
  const dir = join(REPO_ROOT, "packages", "models");
  const ids: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const decl = join(dir, name, "src", "index.ts");
    if (!existsSync(decl)) continue;
    const hit = /"id"\s*:\s*"([^"]+)"/.exec(readFileSync(decl, "utf8"));
    assert.ok(hit !== null, `${name}/src/index.ts declares no literal id — the wall cannot derive it`);
    ids.push(hit[1] as string);
  }
  return ids.sort();
}

/** The flat route set every registered family mints. This mirrors the
 *  flattening in models/service.ts:408-424 EXACTLY — a family whose
 *  default variant carries cells (or, failing that, its first
 *  variant) self-addresses unless a variant or cell already claims
 *  the family id, and each variant mints its own ROUTE plus each
 *  cell's route when that differs from its variant's. A variant's
 *  LABEL (an id like "512" or "bf16") never mints an address — that
 *  is the difference this wall exists to keep honest. */
function declaredRouteIds(): string[] {
  const out = new Set<string>();
  for (const fam of registryIds()) {
    const row = registryModel(fam);
    const variants = row.variants ?? [];
    const resolving = variants.find((v) => (v.cells ?? []).length > 0) ?? variants[0];
    if (
      resolving !== undefined &&
      !variants.some((v) => v.route === row.id) &&
      !variants.some((v) => (v.cells ?? []).some((c) => c.route === row.id))
    ) {
      out.add(row.id);
    }
    for (const variant of variants) {
      if (variant.route) out.add(variant.route);
      for (const cell of variant.cells ?? []) {
        if (cell.route && cell.route !== variant.route) out.add(cell.route);
      }
    }
    out.add(row.id);
  }
  return [...out].sort();
}

/** The comfyui side of a route set — engine absent ≡ comfyui, the
 *  service's own spelling. */
function comfySide(ids: readonly string[]): string[] {
  return ids.filter((id) => {
    const e = getModel(id).engine ?? "";
    return e === "" || e === "comfyui";
  });
}

describe("the resurrected model registry (families/variants/cells/links)", () => {
  it("carries the hierarchy: every declared family is registered, and the served route set is exactly what the declarations mint", (): void => {
    // DERIVED, NOT A LITERAL (the flake audit, 2026-10-15): this
    // tree is designed to grow, and the hand-maintained "+/-" log
    // beside each literal WAS the ratchet — its own it() title had
    // already drifted (97 routes named, 101 asserted). The contract
    // is COVERAGE of the tree: every family package under
    // packages/models is registered, and the served route set is
    // exactly what those declarations mint.
    assert.deepEqual(registryIds(), declaredFamilyIds());
    // every declared route is served, and no served route exists that
    // no declaration mints — the flattening is exhaustive in both
    // directions, so a variant that loses its flat address fails here.
    assert.deepEqual(modelIds(), declaredRouteIds());
    const comfy = modelIds().filter((id) => {
      const e = getModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.deepEqual(comfy, comfySide(declaredRouteIds()));
    const rcomfy = registryIds().filter((id) => {
      const e = registryModel(id).engine ?? "";
      return (e ?? "") === "" || e === "comfyui";
    });
    assert.deepEqual(rcomfy, comfySide(declaredFamilyIds()));
  });

  it("serves only offered routes; the unoffered are excluded loud-side", (): void => {
    const cat = modelCatalog();
    // the catalog serves ADDRESSES, not names of its own: every key
    // it offers resolves through the same route table.
    assert.deepEqual(
      [...Object.keys(cat)].sort(),
      [...Object.keys(cat)].filter((id) => modelIds().includes(id)).sort(),
    );
    for (const id of ["basic_resize", "ltx-2-3", "ltx-director-distilled", "mask-select", "pixel_upscale", "auto-detect", "concat", "dwpose", "flux-fill-dev", "flux-fill-onereward", "gem_soma", "latentsync", "mesh_refine", "rtx-vsr", "see-through", "somax", "step1x_texture", "stretchy-rig", "trellis_native"]) {
      assert.equal(cat[id], undefined, `${id} must not serve (unoffered)`);
    }
  });

  it("every served row carries its source (the catalog contract — the card plane serves forms)", (): void => {
    // THE ALWAYS-TRUE DISJUNCTION DIED (the walls audit's row 3,
    // 2026-10-10): the old arm read `file === "" || file === null
    // || typeof file === "string"` — every possible value of a
    // `?? ""` default passes that, and the if-guard skipped the
    // source-less rows entirely: the arm had no refusing state. The
    // contract, pinned for real: a row that DOWNLOADS (repo_id
    // stated) names its file; a row that serves no source says so
    // with NO source object at all — never a half row.
    // (The emitter always serves a source object: `type` is its
    // spine, and repo_id/filename ride only for the rows that
    // DOWNLOAD — anima, the HF-provisioned family, declares a type
    // with no repo. The old if-guard skipped exactly those rows and
    // asserted a tautology on the rest.)
    // E-C1 (the wall audit, 2026-09-28): the arm's `typeof
    // src.type === "string"` was satisfied by "" — 58 of 60 rows
    // carried type:"" and the titled law could not fail. The
    // censuses are EXACT now: typed/untyped/repo-without-file are
    // named sets, and their sum is the row census (no skip-guard:
    // a row losing its source object fails presence below). The
    // untyped mass is a DELIBERATE carve, visible here: those
    // atoms' origins live in the provisioner catalog (provision
    // rows / lane_inputs), outside the DECL — typing them here
    // would fabricate provenance, so the wall names them instead
    // of pretending the column is full.
    const TYPED_IDS = ["music3", "yue2"]; // huggingface — the two DECL-stated origins
    const REPO_WITHOUT_FILE_IDS = ["anny", "kimodo"]; // vendored pack / assets-only repo
    let downloads = 0;
    const typedIds: string[] = [];
    const untypedIds: string[] = [];
    const repoNoFileIds: string[] = [];
    const rows = Object.values(modelCatalog());
    for (const row of rows) {
      const src = row.source as { type?: unknown; repo_id?: unknown; filename?: unknown } | undefined | null;
      assert.ok(src !== undefined && src !== null,
        `${row.id} serves NO source object — a row that names no origin at all`);
      assert.equal(typeof src.type, "string", `${row.id}: source.type is a string`);
      if (src.type !== "") { typedIds.push(row.id); }
      else { untypedIds.push(row.id); }
      if (typeof src.repo_id === "string" && src.repo_id !== "") {
        if (typeof src.filename === "string" && src.filename !== "") {
          downloads++;
        } else {
          // A REPO WITHOUT A FILE IS A PACK, not a half download:
          // the emitter's wire carries type/repo_id/filename only.
          // The named carve is EXACT (the wall audit found the
          // single-name wave while TWO rows lived).
          repoNoFileIds.push(row.id);
        }
      } else {
        assert.equal(src.filename, undefined,
          `${row.id} names a file without naming a repo — the file belongs to nobody`);
      }
    }
    // the arithmetic is closed: typed + untyped = rows (the skip
    // guard is dead — every row is judged)
    assert.equal(typedIds.length + untypedIds.length, rows.length,
      `every row is judged: ${String(typedIds.length)} typed + ${String(untypedIds.length)} untyped = ${String(rows.length)} rows`);
    assert.deepEqual(typedIds, TYPED_IDS,
      `the DECL-stated origins are the named pair (saw ${JSON.stringify(typedIds)}) — a family stating its origin is a deliberate edit`);
    assert.deepEqual(repoNoFileIds, REPO_WITHOUT_FILE_IDS,
      `the repo-without-file carve is the named pair (saw ${JSON.stringify(repoNoFileIds)}) — a third pack-row is a deliberate edit`);
    assert.equal(untypedIds.length, 58,
      `the untyped census is exact (${String(untypedIds.length)} — atoms whose origins ride the provisioner catalog; growth or shrinkage is a deliberate edit)`);
    assert.equal(downloads, 2,
      `the repo+filename rows are pinned (${String(downloads)} today — a new family download is a deliberate edit)`);
  });

  it("the cascade merge: family defaults ← variant stamps (krea-2 raw)", (): void => {
    const merged = mergedDefaults("krea-2", "raw");
    // family layer
    assert.equal(merged["width"], 1024);
    assert.equal(merged["sampler"], "euler");
    // variant layer wins
    assert.equal(merged["steps"], 52);
    assert.equal(merged["cfg"], 3.5);
    assert.equal(merged["model"], "krea-2-raw");
  });

  it("resolve returns the DOWNLOAD ARTIFACT (url + sha256 + size)", (): void => {
    const r = resolve("krea-2");
    assert.equal(r.route, "krea-2");
    assert.equal(r.engine, "comfyui");
    const art = r.cell?.artifact;
    assert.ok(art !== undefined && art !== null, "krea-2 default cell must download");
    assert.ok(art.source_url.startsWith("https://huggingface.co/Comfy-Org/Krea-2/"));
    assert.equal(art.size_bytes, 13492686496);
    assert.match(art.sha256, /^[0-9a-f]{64}$/);
    assert.equal(art.dest_sub, "diffusion_models");
  });

  it("the mods set survived (9 families declare capability packs — h3 boards loras with the mod-plane stroke, renamed with the survivor-id correction 2026-09-22; voicedesign boards qvoice_save, 2026-09-21; qwen-img-edit-21 boards the mask pack with the 2.1 region-detailer re-scope, 2026-09-23)", (): void => {
    const withMods = registryIds().filter((id) => (registryModel(id).mods ?? []).length > 0);
    assert.deepEqual(withMods, [
      "anny",
      "h3",
      "krea-2",
      "qwen-img-edit-21",
      "qwen-img-edit-2511",
      "qwen3-tts",
      "qwen3-tts-voicedesign",
      "z-image",
    ]);
  });

  it("unknown family refuses LOUD (ModelError, never a silent miss)", (): void => {
    assert.throws(() => getModel("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("krea-2", "no-such-variant"), ModelError);
  });

  it("FIRST SELF-ROUTE WINS when two variants claim the family head (the 1.7B head theft, transcript-014: customvoice declares first, voicedesign second — the second claimant must never silently flip the family default)", (): void => {
    // the derived head view composes through the FIRST head-claiming
    // variant in declaration order — the same default law as the
    // resolving pick at registration (declaration order IS intent)
    const head = getModel("qwen3-tts-voicedesign");
    assert.equal((head.defaults as Record<string, unknown>).variant, "customvoice", "the head serves the family default (customvoice), not the last claimant");
    assert.equal(VD_TOPOLOGY.customvoice?.synth_lane, "speak", "the head lane is the default variant's lane — THE FLOW's lane");
    // the design lane stays reachable through its STATED variant (the
    // stamp overlay + the variant's own lane truth), and the clone
    // lane through its own flat route
    const clone = getModel("qwen3-tts-voicedesign-base");
    assert.equal(VD_TOPOLOGY.base?.synth_lane, "clone");
    assert.equal((clone.defaults as Record<string, unknown>).variant, "base");
  });

  it("variant matrices ride (the hierarchy: 48 serving variants — yue2's int8 cell, 2026-09-20; the qwen 2.1 pair adds its quant tiers, 2026-09-21)", (): void => {
    // registry plane: serving variants (cells > 0) and quant cells;
    // recipe rows are routing recipes, not serving variants
    // the engine rides the variant (the moss meld) — a variant
    // serves when its composed engine (variant || model) is comfyui
    let variants = 0, cells = 0;
    for (const id of registryIds()) {
      const d = registryModel(id);
      const meng = d.engine ?? "";
      for (const v of d.variants) {
        if (v.cells.length === 0) continue;
        const veng = (v.engine ?? "") !== "" ? v.engine : meng;
        if (veng !== undefined && veng !== "" && veng !== "comfyui") continue;
        variants += 1;
        cells += v.cells.length;
      }
    }
    // 44 since stroke 90 (anny's Standard/Native row was template
    // chrome — the family serves ONE identity_model through ONE
    // route; the variant matrix was noise the operator named)
    // 71 since 2026-09-22: the uncommitted tree had grown +23 past
    // the stale 48 (the multimodal boardings — joycaption, florence2,
    // wd14, the tagger lanes, z-image, the qwen edit pairs — landed
    // without their wall bump; the pre-commit hook caught the drift)
    assert.equal(variants, 75); // +2: the 1:1 1.7B matrix — customvoice + base variants on qwen3-tts-voicedesign (operator 2026-09-23) // +2: fit + skin's Standard rows (stroke 4 — the unoffered verb families each declare one)
    assert.equal(cells, 83);
  });
});

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
import { LANE_TOPOLOGY as QWEN_TOPOLOGY } from "../../../../packages/models/qwen3-tts/src/index.ts";
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
    // 6 -> 4 (2026-10-12, the operator's five-family kill: ltx-2-3
    // and ltx-director-distilled died with the sweep)
    for (const id of ["mask-select", "concat", "gem-soma", "somax"]) {
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
    // pair -> quad (2026-10-13, the four audio families' URL
    // cures): music3 and yue2's served rows carry the family
    // Comfy-Org repo + provisions rows — their stale GGUF
    // cell filenames died with the cure
    const REPO_WITHOUT_FILE_IDS = ["anny", "kimodo", "music3", "yue2"]; // vendored pack / assets-only repo / Comfy-Org provisions
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
    // 58 -> 60 (2026-10-22, audit 006/U1): flux-klein's four
    // split-file atoms ride the provisioner catalog untyped
    // 60 -> 59 (2026-10-13, the autoremesher excision): the family's
    // untyped atom left with the pack the owner removed.
    // 59 -> 61 (2026-10-23, the operator's turbo call): the qwen 2.1
    // turbo lane serves turbo-int8 + turbo-bf16 — the same untyped
    // carve (the weights' origin is the cell artifacts).
    // 61 -> 65 (2026-10-24, THE 2.1 MATRIX RESHAPE): the fold to
    // Base/Turbo x int8_convrot/bf16 splits each family's flat four
    // into two variant heads over two cells — the tier routes stay,
    // the two new turbo-head rows ride the same untyped carve.
    // 65 -> 49 (2026-11-02, the folded-lanes + mesh-trio
    // retirements): the sixteen retired address rows leave the
    // served set (h3's folded lanes and their cells; both mesh
    // families' 1536/512 rows with their bf16/int8 cells).
    assert.equal(untypedIds.length, 49,
      `the untyped census is exact (${String(untypedIds.length)} — atoms whose origins ride the provisioner catalog; growth or shrinkage is a deliberate edit)`);
    // 2 -> 0 (2026-10-13, the four audio families' URL cures):
    // music3 and yue2's stale GGUF cell filenames died — their
    // downloads ride the provisions rows, not cell sources
    assert.equal(downloads, 0,
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

  it("the mods set survived (10 families declare capability packs — h3 boards loras with the mod-plane stroke, renamed with the survivor-id correction 2026-09-22; qwen3-tts boards qvoice_save across its folded lanes, 2026-09-21; qwen-img-edit-21 boards the mask pack with the 2.1 region-detailer re-scope, 2026-09-23; qwen-img-21 boards the mask pack with the bare edit-21 twin flavor, mask-c 2026-10-12; THE LORAS REFUSAL 2026-11-06 8153a8a37 — every image family boards the pack, anima + flux-klein's authored nothing cured with DECL.mods += loras + first-party adapter seeds)", (): void => {
    const withMods = registryIds().filter((id) => (registryModel(id).mods ?? []).length > 0);
    assert.deepEqual(withMods, [
      "anima",
      "anny",
      "flux-klein",
      "h3",
      "krea-2",
      "qwen-img-21",
      "qwen-img-edit-21",
      "qwen-img-edit-2511",
      "qwen3-tts",
      "z-image",
    ]);
  });

  it("unknown family refuses LOUD (ModelError, never a silent miss)", (): void => {
    assert.throws(() => getModel("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("no-such-family"), ModelError);
    assert.throws(() => mergedDefaults("krea-2", "no-such-variant"), ModelError);
  });

  it("THE LICENCE LAW (004/C6): a family carrying a non-commercial licence says so structurally — every free-text non-commercial mention owns a licence row with commercial_use false", (): void => {
    // The wall kills the free-text-hint class: prose that names
    // non-commercial use (variant hints, labels, descriptions) is
    // only honest when the DECL carries the structural twin — a
    // licence row whose commercial_use is false. Absent row, or a
    // row that permits commercial use: LOUD.
    const offenders: string[] = [];
    for (const fam of registryIds()) {
      const decl = registryModel(fam);
      const texts = [
        decl.description ?? "",
        decl.label,
        ...(decl.variants ?? []).flatMap((v) => [v.label, (v as { hint?: string }).hint ?? ""]),
      ];
      const saysNonCommercial = texts.some((t) => /non-?commercial/i.test(t));
      const row = decl.licence;
      if (saysNonCommercial && (row === undefined || row === null || row.commercial_use !== false)) {
        offenders.push(`${fam}: free-text non-commercial mention with no structural licence row`);
      }
    }
    assert.deepEqual(offenders, [], `licence rows missing:\n  ${offenders.join("\n  ")}`);
    // no declared non-commercial family today: FLUX.1-Fill's
    // checkpoint (the one declarer) died with the 2026-10-12
    // family-kill sweep — its licence block died with it (growth is
    // argued here — a new declarer names itself)
  });

  it("THE SIZE-AT-QUANT ADDRESSES (operator 2026-10-26: MODEL = QWEN, VARIANT = FLAVOR, QUANT = SIZE): every retained size address resolves to its own cell", (): void => {
    // The large-CustomVoice ADDRESS is the family's large cell; the
    // retained family address is the small CustomVoice cell.
    const large = getModel("qwen3-tts-voicedesign");
    assert.equal((large.defaults as Record<string, unknown>).variant, "customvoice", "the large address serves CustomVoice");
    assert.equal((large.lane_inputs as Record<string, unknown>).model_path, "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    const small = getModel("qwen3-tts");
    assert.equal((small.defaults as Record<string, unknown>).variant, "customvoice", "the retained family address serves the small CustomVoice cell");
    assert.equal((small.lane_inputs as Record<string, unknown>).model_path, "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.equal(QWEN_TOPOLOGY.customvoice?.synth_lane, "speak", "the CustomVoice lane is the perform lane — THE FLOW's lane");
    // the design lane stays reachable through its own address, and
    // the clone lane through both size addresses
    const design = getModel("qwen3-tts-voicedesign-design");
    assert.equal((design.defaults as Record<string, unknown>).variant, "voicedesign");
    const cloneLarge = getModel("qwen3-tts-voicedesign-base");
    assert.equal(QWEN_TOPOLOGY.base?.synth_lane, "clone");
    assert.equal((cloneLarge.defaults as Record<string, unknown>).variant, "base");
    assert.equal((cloneLarge.lane_inputs as Record<string, unknown>).model_path, "Qwen3-TTS-12Hz-1.7B-Base-merged");
    const cloneSmall = getModel("qwen3-tts-base");
    assert.equal((cloneSmall.defaults as Record<string, unknown>).variant, "base");
    assert.equal((cloneSmall.lane_inputs as Record<string, unknown>).model_path, "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base");
  });

  it("variant matrices ride (the hierarchy: 64 serving variants — yue2's int8 cell, 2026-09-20; the qwen 2.1 pair folds to the 2x2 matrix, 2026-10-24; the Qwen TTS fold lands one family with three serving variants, 2026-10-26; the family-kill sweep takes ten, 2026-10-12)", (): void => {
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
    // 75 -> 77, 83 -> 85 (2026-10-22, audit 006/U1): flux-klein
    // serves the distilled + base 4B tiers, one bf16 cell each
    // (the same day's recipe rows ride the same array with cells []
    // — this census counts serving variants only, so it does not move)
    // 77 -> 76 (2026-10-13, the autoremesher excision): the family's
    // one serving variant left with the pack the owner removed.
    // 76 -> 78 (2026-10-23, the operator's turbo call): the qwen 2.1
    // turbo lane adds turbo-int8 + turbo-bf16 serving rows.
    // 78 -> 76 (2026-10-24, THE 2.1 MATRIX RESHAPE): the flat
    // four variant-per-quant rows per family fold into the 2x2
    // matrix (Base/Turbo x int8_convrot/bf16) — 2 serving variant
    // rows per family instead of 4; the cell census below does NOT
    // move (every tier still has its cell).
    // 76 -> 74 (2026-10-26, THE QWEN TTS FOLD): the two Qwen atoms
    // (two serving CustomVoice/Base rows + three 1.7B lane rows)
    // fold into one family with three serving variants
    // (CustomVoice/VoiceDesign/Base); all five size cells survive, so
    // the cell census below does NOT move.
    // 74 -> 64 (2026-10-12, the family-kill sweep): ten of the
    // twelve dead families carried one serving variant each
    // (flux-fill-dev and pixel_upscale carried none — empty cells).
    // 64 -> 62 (2026-10-12, the operator's five-family kill):
    // ace-step's standard + turbo-bf16 die with the family (moss
    // and skintokens ride non-comfyui engines — the census never
    // counted them; the ltx pair carried no cells).
    // 62 -> 57 (2026-11-02): h3-keyframe (its one serving variant)
    // and both mesh families' 1536/512 rows leave — the h3 turbo
    // folds never carried cells, so only five serving rows die.
    assert.equal(variants, 57); // +2: fit + skin's Standard rows (stroke 4 — the unoffered verb families each declare one)
    // 85 -> 84 (2026-10-13, the autoremesher excision): the family's
    // one cell left with the pack the owner removed.
    // 84 -> 86 (2026-10-23): the turbo cells join (turbo_int8_convrot + turbo_bf16).
    // 86 -> 88 (2026-10-24, THE 2.1 MATRIX RESHAPE): the edit lane's
    // turbo cells join with the fold (the t2i turbo cells rode the
    // 2026-10-23 ratchet; both families now carry the full 2x2 —
    // 4 cells each, the fold itself moves no cell).
    // 88 -> 78 (2026-10-12, the family-kill sweep): the ten dead
    // serving variants each rode exactly one native cell.
    // 78 -> 74 (2026-10-12, the operator's five-family kill):
    // ace-step's four gguf cells die with the family.
    // 74 -> 65 (2026-11-02): keyframe's one cell plus the mesh
    // 1536/512 rows' eight cells (bf16 + int8 each) leave with the
    // retirements.
    assert.equal(cells, 65);
  });
});

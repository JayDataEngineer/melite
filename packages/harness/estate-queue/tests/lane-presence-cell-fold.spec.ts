// lane-presence-cell-fold.spec.ts — THE QWEN CELL-FOLD (the estate
// half; the wall).
//
// THE BURN (stuck-run receipt, 2026-11-09, remainder 3): a family's
// weight rows may ride variants[].cells[].lane_inputs ONLY — the gate's
// resolved row merged family ∪ variant (the h¹ law) and never the
// STATED cell, so the qwen image families' bf16/turbo tiers, and the
// qwen3-tts head address's own 0.6B cell, sailed through the presence
// gate on the family's default-tier files straight into the engine's
// validation. The same burn class the variant-lane presence law
// (models-variant-lane-presence, h¹) cured for variant overrides, one
// axis down.
//
// THE LAW: the gate probes the RESOLVED lane inputs — family rows
// under the stated variant under the STATED CELL's per-key override,
// the same cascade the compose stamps (getModel's derived route read,
// service.ts:772-783) and the client mirror's resolvedLaneSurface
// rides (the ONE RESOLVER's coordinate: resolveVariantRow +
// resolveCellRow in @melite/contracts/laneRelations — never a second
// resolution). A cell whose override file is missing refuses
// lane_input_missing naming THAT file; a cell whose files stand rides;
// variant-level weights still gate (the h¹ arms hold); and the gate's
// resolved row never splits from the engine's own route view — for
// every family × variant × cell the gate is silent exactly when the
// engine's derived files stand and names exactly one of them when one
// does not.
//
// Arms (all over the REAL booted DECLs and a fixture store):
//  CF-1 THE CELL MISS — the int8 defaults stand; the bf16 cell
//      address refuses naming the bf16 unet (born red: null).
//  CF-2 THE CASCADE — the bf16 unet landed: the refusal names the
//      cell's bf16 TEXT ENCODER override, never the family's int8
//      spelling; the family's vae row still rides.
//  CF-3 THE GREEN CELL — every bf16 file landed: silence (pin).
//  CF-4 THE TURBO LADDER — turbo-bf16 and turbo-int8 addresses gate
//      their own cell files (born red: null).
//  CF-5 THE STATED QUANT — the body-carried coordinate (variant +
//      quant stated, family address) rides the same resolver;
//      the legacy 'native' quant rides unstated.
//  CF-6 THE HEAD ADDRESS — qwen3-tts's own id is its 0.6B cell's
//      route: the family-addressed run gates the 0.6B model_path, not
//      the family row's 1.7B spelling (born red: the family file
//      gated alone).
//  CF-7 THE h¹ ARMS HOLD — the variant-level law rides through the
//      fold: h3's singularity override still refuses, then rides.
//  CF-8 THE NO-SPLIT VERDICT (the census) — every family × visible
//      variant × visible cell: landing EXACTLY the engine route
//      view's gated files silences the gate, and dropping one of them
//      re-arms it naming that file. A gate that judges any other file
//      set than the engine loads is the split verdict, named.
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { lanePresenceMiss, LANE_FOLDERS } from "../src/cardsLanes.ts";
import { cardRefusal, toRemoteError } from "../src/runsRefusalVoices.ts";
import { getModel, registryIds } from "@melite/comfyui-cordis";
import type { ModelDecl } from "@melite/comfyui-card-kit/model-contract";

const DIR = join(tmpdir(), "melite-lane-cell-fold-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

beforeAll(() => {
  mkdirSync(MODELS, { recursive: true });
  writeFileSync(CFG, JSON.stringify({ url: "http://127.0.0.1:8188", model_base_path: MODELS }));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  process.env["MELITE_REPO_ROOT"] = DIR;
});

afterAll(() => {
  if (PREV_CFG === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
  else process.env["COMFYUI_ENDPOINT_CONFIG"] = PREV_CFG;
  if (PREV_SBX === undefined) delete process.env["INFERENCE_TEST_SANDBOX"];
  else process.env["INFERENCE_TEST_SANDBOX"] = PREV_SBX;
  if (PREV_ROOT === undefined) delete process.env["MELITE_REPO_ROOT"];
  else process.env["MELITE_REPO_ROOT"] = PREV_ROOT;
  rmSync(DIR, { recursive: true, force: true });
});

/** Land one lane file at its stock folder's first spelling (the gate
 *  probes the stock set first — one landing is one probe's hit).
 *  Landings are tracked per name: the census's drop arm must remove
 *  EVERY copy the store holds (the probe walks a folder SET). */
const landedByName = new Map<string, string[]>();
const land = (folder: string, name: string): string => {
  const p = join(MODELS, folder, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, "x");
  const copies = landedByName.get(name) ?? [];
  if (!copies.includes(p)) copies.push(p);
  landedByName.set(name, copies);
  return p;
};
const dropEveryCopy = (name: string): void => {
  for (const p of landedByName.get(name) ?? []) rmSync(p);
};

const QWEN = "qwen-img-edit-21";
const QWEN_INT8_UNET = "qwen_image_2.1_int8_convrot.safetensors";
const QWEN_INT8_TE = "qwen3vl_8b_int8_convrot.safetensors";
const QWEN_VAE = "qwen_image_2.1_vae_bf16.safetensors";
const QWEN_BF16_UNET = "qwen_image_2.1_bf16.safetensors";
const QWEN_BF16_TE = "qwen3vl_8b_bf16.safetensors";
const QWEN_TURBO_BF16_UNET = "qwen_image_2.1_turbo_bf16.safetensors";
const QWEN_TURBO_INT8_UNET = "qwen_image_2.1_turbo_int8_convrot.safetensors";

/** The family's default-tier files (what the pre-cure gate judged). */
const landFamilyDefaults = (): void => {
  land("diffusion_models", QWEN_INT8_UNET);
  land("text_encoders", QWEN_INT8_TE);
  land("vae", QWEN_VAE);
};

/** The structured lane row of a refusal (the popup's keying face). */
const detailsOf = (miss: NonNullable<ReturnType<typeof lanePresenceMiss>>): Record<string, unknown> =>
  ((toRemoteError(cardRefusal(miss)).details ?? {}) as Record<string, unknown>);

describe("THE QWEN CELL-FOLD (the gate probes the stated cell's lane inputs)", () => {
  it("CF-1 the bf16 cell address refuses its own unet while the family defaults stand (the burn's face)", () => {
    landFamilyDefaults();
    const miss = lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-bf16");
    assert.ok(miss !== null, "the bf16 cell's weight rode the family's green — the pre-cure null is the burn");
    assert.equal(miss.code, "lane_input_missing");
    // THE ONE FACE: every resolved-row miss rides the single refusal —
    // the cell's unet AND its TE override, never one per wedged run.
    assert.match(miss.message, new RegExp(QWEN_BF16_UNET.replaceAll(".", "\\.")));
    assert.match(miss.message, new RegExp(QWEN_BF16_TE.replaceAll(".", "\\.")));
    const details = detailsOf(miss);
    const all = (details["missing_all"] ?? []) as Array<Record<string, unknown>>;
    const names = all.map((r) => r["name"]).sort();
    assert.deepEqual(names, [QWEN_BF16_TE, QWEN_BF16_UNET].sort(),
      "the structured face carries the cell's whole missing list");
    assert.equal(details["family"], QWEN);
  });

  it("CF-2 the cascade: the cell's stated keys override the family's spelling, the unstated keys still ride", () => {
    landFamilyDefaults();
    land("diffusion_models", QWEN_BF16_UNET);
    const miss = lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-bf16");
    assert.ok(miss !== null, "landing the cell unet must move the probe to the next resolved row");
    assert.match(miss.message, new RegExp("declares text_encoder '" + QWEN_BF16_TE + "'"),
      "the cell's own TE override gates — never the family's int8 spelling");
    assert.ok(!miss.message.includes(QWEN_INT8_TE), "the overridden family spelling must not re-gate");
    const landed = land("text_encoders", QWEN_BF16_TE);
    try {
      const vaeMiss = lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-bf16");
      assert.ok(vaeMiss === null || !vaeMiss.message.includes("vae"),
        "the family's vae row (never cell-stated) already stands: " + (vaeMiss?.message ?? "null"));
    } finally {
      rmSync(landed);
    }
  });

  it("CF-3 the green cell: every resolved file on the store rides in silence", () => {
    landFamilyDefaults();
    land("diffusion_models", QWEN_BF16_UNET);
    land("text_encoders", QWEN_BF16_TE);
    assert.equal(lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-bf16"), null,
      "the gate refuses, it never nags a green cell");
  });

  it("CF-4 the turbo ladder: each tier's cell gates its own unet", () => {
    landFamilyDefaults();
    const turboBf16 = lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-turbo-bf16");
    assert.ok(turboBf16 !== null, "the turbo-bf16 cell's unet rode the family's green");
    assert.match(turboBf16.message, new RegExp(QWEN_TURBO_BF16_UNET));
    land("diffusion_models", QWEN_TURBO_BF16_UNET);
    assert.equal(lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-turbo-bf16"), null);
    const turboInt8 = lanePresenceMiss(QWEN, {}, "qwen-img-edit-21-turbo-int8");
    assert.ok(turboInt8 !== null, "the turbo-int8 cell's unet rode the family's green");
    assert.match(turboInt8.message, new RegExp(QWEN_TURBO_INT8_UNET));
  });

  it("CF-5 the stated quant rides the body: the wire coordinate and the legacy native fold", () => {
    landFamilyDefaults();
    // order-safe: earlier arms may have landed the cell's files — the
    // coordinate's own files come down for the miss half, then ride
    // back up for the native half.
    dropEveryCopy(QWEN_BF16_UNET);
    dropEveryCopy(QWEN_BF16_TE);
    const miss = lanePresenceMiss(QWEN, { variant: "base", quant: "bf16" }, QWEN);
    assert.ok(miss !== null, "a body-stated bf16 coordinate rode the family's green");
    assert.match(miss.message, new RegExp(QWEN_BF16_UNET.replaceAll(".", "\\.")));
    land("diffusion_models", QWEN_BF16_UNET);
    land("text_encoders", QWEN_BF16_TE);
    assert.equal(
      lanePresenceMiss(QWEN, { variant: "base", quant: "native" }, QWEN),
      null,
      "the legacy 'native' quant rides unstated (the family's own tier gates)",
    );
  });

  it("CF-6 the head address: qwen3-tts's own id is its 0.6B cell's route — the 0.6B model_path gates", async () => {
    const decl = getModel("qwen3-tts") as ModelDecl;
    const head = (decl.variants ?? []).find((v) => (v.cells ?? []).some((c) => c.route === "qwen3-tts"));
    assert.ok(head !== undefined, "the DECL routes its head id through a cell");
    const headCell = (head?.cells ?? []).find((c) => c.route === "qwen3-tts");
    const cellPath = headCell?.lane_inputs?.["model_path"];
    assert.equal(typeof cellPath, "string", "the head cell states its own model_path");
    // the RAW atom's family row (the derived head pre-folds the cell):
    const { modelsService } = await import("@melite/comfyui-cordis/models-service");
    const famPath = modelsService().registryModel("qwen3-tts").lane_inputs?.["model_path"];
    assert.notEqual(famPath, cellPath, "the burn's shape: the cell overrides the family's model_path");
    // the family row's file stands alone — the head address must STILL
    // refuse, because the addressed cell loads a different file:
    const home = (decl.lane_homes ?? {})["model_path"] as string;
    land(home, famPath as string);
    const miss = lanePresenceMiss("qwen3-tts", {}, "qwen3-tts");
    assert.ok(miss !== null, "the head address gated the family row alone — the engine loads the cell's file");
    assert.match(miss.message, new RegExp((cellPath as string).replaceAll("/", "/")));
    // the cell's file lands (both home spellings the probe walks):
    land(home, cellPath as string);
    const cut = (cellPath as string).lastIndexOf("/");
    if (cut > 0) land(home + "/" + (cellPath as string).slice(0, cut), (cellPath as string).slice(cut + 1));
    assert.equal(lanePresenceMiss("qwen3-tts", {}, "qwen3-tts"), null);
  });

  it("CF-7 the h¹ arms hold: variant-level weights still gate through the fold", () => {
    rmSync(join(MODELS, "diffusion_models"), { recursive: true, force: true });
    rmSync(join(MODELS, "loras"), { recursive: true, force: true });
    const decl = getModel("h3") as ModelDecl;
    const famUnet = decl.lane_inputs?.["unet"] as string;
    const varRow = (decl.variants ?? []).find((v) => v.id === "singularity");
    const varUnet = varRow?.lane_inputs?.["unet"] as string;
    assert.notEqual(famUnet, varUnet, "the h¹ shape: the variant overrides the unet file");
    land("diffusion_models", famUnet);
    const famLoras = decl.lane_inputs?.["loras"] as string | undefined;
    if (typeof famLoras === "string" && famLoras.trim() !== "") land("loras/h3", famLoras);
    const miss = lanePresenceMiss("h3", { variant: "singularity" }, "h3");
    assert.ok(miss !== null, "the variant override stopped gating — the h¹ law regressed");
    assert.match(miss.message, new RegExp(varUnet.replaceAll(".", "\\.")));
    land("diffusion_models", varUnet);
    assert.equal(lanePresenceMiss("h3", { variant: "singularity" }, "h3"), null);
  });

  it("CF-8 THE NO-SPLIT VERDICT: the gate's row is the engine's route view, every family × variant × cell", () => {
    // (burn d, 2026-10-26): the engine loads the RESOLVED cascade —
    // family ∪ the STATED variant's rows ∪ the stated cell's — the
    // same merge the gate probes (florence2/wd14 declare their
    // backing weights at the variant seat). A family-level-only read
    // split the verdict the other way: it blessed files the engine
    // never loads and starved files it does.
    const engineFiles = (viewId: string, vId?: string, quant?: string): Array<[string, string]> => {
      const view = getModel(viewId) as ModelDecl;
      const vRow = vId === undefined ? undefined : (view.variants ?? []).find((v) => v.id === vId);
      const cRow = vRow === undefined || quant === undefined ? undefined : vRow.cells.find((c) => c.quant === quant);
      const li = {
        ...((view.lane_inputs ?? {}) as Record<string, unknown>),
        ...((vRow?.lane_inputs ?? {}) as Record<string, unknown>),
        ...((cRow?.lane_inputs ?? {}) as Record<string, unknown>),
      };
      const homes = (view.lane_homes ?? {}) as Record<string, string>;
      const rows: Array<[string, string]> = [];
      for (const [key, folders] of Object.entries(LANE_FOLDERS)) {
        const v = li[key];
        if (typeof v === "string" && v.trim() !== "") rows.push([folders[0] as string, v]);
      }
      for (const [key, home] of Object.entries(homes)) {
        const v = li[key];
        if (typeof v === "string" && v.trim() !== "") rows.push([home, v]);
      }
      return rows;
    };
    let coordinates = 0;
    for (const fam of registryIds()) {
      const decl = getModel(fam) as ModelDecl;
      for (const v of decl.variants ?? []) {
        if (v.hide_from_dropdown === true) continue;
        for (const c of v.cells ?? []) {
          if (c.hide_from_dropdown === true) continue;
          // the census walks the coordinates the compose can stamp:
          // an addressed cell, or the variant's first cell (the
          // default arm). A stated route-less NON-first cell is a
          // compose-less shape (the engine never folds it) — none
          // exists on the live tree; the census refuses to invent a
          // coordinate the doors cannot reach.
          if ((c.route === undefined || c.route === "") && (v.cells ?? [])[0] !== c) continue;
          coordinates += 1;
          const viewId = (c.route !== undefined && c.route !== "" ? c.route : v.route) || fam;
          const files = engineFiles(viewId, v.id, c.quant);
          const body = { variant: v.id, quant: c.quant };
          // THE VIEW LANDED: the gate must be silent — it judges the
          // same files the engine's derived route view loads.
          for (const [folder, name] of files) land(folder, name);
          const silent = lanePresenceMiss(fam, body, fam);
          assert.equal(silent, null,
            "SPLIT VERDICT (false gate) at " + fam + "/" + v.id + "/" + c.quant + ": the engine view (" +
            viewId + ") stands but the gate refuses: " + (silent?.message ?? ""));
          // ONE FILE GONE: the gate must name exactly that file — it
          // never rides a file set the engine does not load.
          if (files.length > 0) {
            const [, name] = files[0] as [string, string];
            dropEveryCopy(name);
            const miss = lanePresenceMiss(fam, body, fam);
            assert.ok(miss !== null,
              "SPLIT VERDICT (silent burn) at " + fam + "/" + v.id + "/" + c.quant + ": the engine's " +
              name + " is gone and the gate stayed green");
            assert.ok(miss.message.includes(name),
              "the refusal must name the engine view's missing file: " + miss.message);
            for (const [folder, landed] of files) {
              if (landed === name) land(folder, landed);
            }
          }
        }
      }
    }
    assert.ok(coordinates >= 20, "the census walked a real matrix (got " + coordinates + ")");
  });
});

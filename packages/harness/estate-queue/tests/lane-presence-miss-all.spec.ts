// lane-presence-miss-all.spec.ts — THE SEQUENTIAL MISSING-WEIGHT
// REVEAL (the estate half; the wall).
//
// THE BURN (operator, 2026-11-09 night): the moss run died on the
// text encoder mid-graph, the popup fetched ONE file, the next press
// died on the NEXT file — the gate named one miss per refusal, so a
// two-weight fetch cost one run-wedge per weight. The moss DECL
// already declares its three weight slots at family level; the defect
// is the gate's voice: firstLaneMiss RETURNS at the first miss
// (cardsLanes.ts stock + declared-home loops), so a refusal ever
// names one file and the operator learns of the next weight only
// through the next wedged run.
//
// THE LAW: ONE face per press. The presence gate lists EVERY missing
// declared weight — name and size — in the single refusal the press
// raises; and after one download lands, the re-check names only the
// REMAINING list, never a re-listed fetched file, never a second
// surprise. The verdict derives from the durable truth: the DECL's
// declared rows probed against the live store on every call — never
// a memo of earlier misses.
//
// The arms walk the reveal itself over the REAL moss DECL and a
// fixture store that fills file by file:
//  R-1 THE ONE-FACE LAW — empty store: one refusal naming all three
//      declared weights with sizes and fetch rows (missing_all).
//  R-2 THE REMAINING LAW — the text encoder lands: the same press
//      names only the still-missing vae + unet. (Green on today's
//      first-miss shape by accident of ordering; it is the pin for
//      the re-check half — any memoized miss list or stale re-list
//      reds here.)
//  R-3 THE BURN'S FACE — unet lands too: the refusal names exactly
//      the two shared files the burn died on, sizes 7.0 GB + 249 MB.
//  R-4 THE GREEN SILENCE — all three on the store: no refusal at all
//      (the gate refuses, it never nags).
//
// Reds today on R-1 and R-3; R-2/R-4 pin the other halves. The toggle
// is firstLaneMiss/lanePresenceMiss in cardsLanes.ts.
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { laneFetchAnchor, lanePresenceMiss } from "../src/cardsLanes.ts";
import { getModel } from "@melite/comfyui-cordis";

const DIR = join(tmpdir(), "melite-lane-miss-all-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

const MOSS = "moss-image";
const MOSS_TE = "qwen3.5_9b_w4a8_gptq.safetensors";
const MOSS_VAE = "flux2-vae_small.safetensors";
const MOSS_UNET = "moss_image_sft_int8_convrot.safetensors";
const ALL_THREE = [MOSS_TE, MOSS_VAE, MOSS_UNET];

const land = (folder: string, name: string): void => {
  mkdirSync(join(MODELS, folder), { recursive: true });
  writeFileSync(join(MODELS, folder, name), "x");
};

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
});

const rowsOf = (arm: { lane?: { missingAll?: unknown } }): Array<Record<string, unknown>> => {
  const all = arm.lane?.missingAll;
  return Array.isArray(all) ? (all as Array<Record<string, unknown>>) : [];
};

describe("lane-presence-miss-all: one face lists every missing declared weight", () => {
  // ARM R-1 — THE ONE-FACE LAW. Reds today: the prose names only the
  // first miss (text_encoder) and the details carry no missing_all.
  it("an empty store refuses once, naming all three declared weights with sizes", () => {
    const arm = lanePresenceMiss(MOSS);
    assert.ok(arm !== null, "the gate refused nothing over an empty store");
    for (const name of ALL_THREE) {
      assert.ok(
        arm.message.includes(name),
        "the refusal named only '" + (arm.lane?.missing ?? "?") + "' — the operator learns of '" +
          name + "' one wedged run later",
      );
    }
    assert.match(arm.message, /3 (files|weights|missing)/, "the face counts the list");
    const all = rowsOf(arm);
    assert.ok(all.length === 3, "the structured lane row lists all three");
    assert.deepEqual(all.map((r) => r["name"]).sort(), [...ALL_THREE].sort());
    for (const r of all) {
      // THE ANCHOR-AT-THE-DOOR LAW (the kroma cure, 2026-10-26): the
      // DECL's own channel is the size/fetch truth, WHICHEVER row
      // declares it — a family provisions row OR a family cell
      // artifact (the moss unet's URL lives on its cell; before the
      // cure the refusal stayed silent over a DECLared URL — the
      // burn's exact shape). Expected values ride the gate's own
      // resolver, ONE spelling; a file with NO channel anywhere
      // still carries neither — never an invented size, never a
      // dead URL.
      const anchor = laneFetchAnchor(getModel(MOSS), [], String(r["name"]));
      if (anchor !== undefined) {
        assert.equal(r["fetchUrl"], anchor.url, "the row carries the channel's fetch address");
        assert.equal(
          r["sizeBytes"], anchor.sizeBytes,
          "the row carries the channel's declared size when the channel states one",
        );
      } else {
        assert.equal(r["sizeBytes"], undefined, "no invented size for a weight no channel names");
        assert.equal(r["fetchUrl"], undefined, "no invented fetch for a weight no channel names");
      }
    }
    // THE MOSS UNET LITERAL PIN (kroma audit F12, 2026-10-26): the
    // loop above rides the gate's own resolver — safe plumbing, but
    // partly tautological (gate output vs. the resolver the gate
    // calls). This pin holds the unet row against the DECL's CELL
    // ARTIFACT LITERALS — the URL the operator would actually fetch
    // and the size the channel declares — so a resolver regression
    // that echoes a wrong coordinate reds HERE even if the gate and
    // the resolver agree with each other.
    {
      const unetRow = all.find((r) => r["name"] === MOSS_UNET);
      assert.ok(unetRow !== undefined, "the unet row is present for the literal pin");
      assert.equal(
        unetRow["fetchUrl"],
        "https://huggingface.co/Comfy-Org/MOSS-Image/resolve/main/diffusion_models/moss_image_sft_int8_convrot.safetensors",
        "the unet's fetch address is the DECL cell artifact's own URL — the literal, not the resolver's echo",
      );
      assert.equal(unetRow["sizeBytes"], 5413698958, "the unet's size is the DECL cell artifact's declared bytes");
    }
  });

  // ARM R-2 — THE REMAINING LAW: the text encoder lands; the same
  // press names only the vae + unet, never the landed file.
  it("after the text encoder lands, the refusal names only the remaining two", () => {
    land("text_encoders", MOSS_TE);
    const arm = lanePresenceMiss(MOSS);
    assert.ok(arm !== null, "two weights are still missing — the gate must refuse");
    assert.ok(arm.message.includes(MOSS_VAE) && arm.message.includes(MOSS_UNET), "the remaining misses are named");
    assert.ok(
      !arm.message.includes(MOSS_TE),
      "the landed file re-listed — a second surprise for a weight already on the store",
    );
    assert.deepEqual(rowsOf(arm).map((r) => r["name"]).sort(), [MOSS_VAE, MOSS_UNET].sort());
  });

  // ARM R-3 — THE BURN'S FACE: the store holds ONLY the unet (the
  // text encoder's earlier landing is removed — each arm sets its own
  // store truth); the refusal names exactly the two shared files the
  // burn died on, with the DECL's declared sizes.
  it("with only the unet on the store, the face is exactly the burn's two files", () => {
    land("diffusion_models", MOSS_UNET);
    rmSync(join(MODELS, "text_encoders", MOSS_TE));
    const arm = lanePresenceMiss(MOSS);
    assert.ok(arm !== null, "the pair is missing — the gate must refuse");
    for (const name of [MOSS_TE, MOSS_VAE]) {
      assert.ok(arm.message.includes(name), "the burn's face must name '" + name + "'");
    }
    assert.ok(!arm.message.includes(MOSS_UNET), "the present unet re-listed — not a miss");
    const all = rowsOf(arm);
    assert.deepEqual(all.map((r) => r["name"]).sort(), [MOSS_TE, MOSS_VAE].sort());
    const sizes = Object.fromEntries(all.map((r) => [r["name"], r["sizeBytes"]]));
    assert.equal(sizes[MOSS_TE], 7343591088, "the TE row carries the declared 7.0 GB");
    assert.equal(sizes[MOSS_VAE], 249521340, "the VAE row carries the declared 249 MB");
  });

  // ARM R-4 — THE GREEN SILENCE: all three on the store, no refusal.
  it("a fully stocked store passes the gate in silence", () => {
    land("text_encoders", MOSS_TE);
    land("vae", MOSS_VAE);
    assert.equal(lanePresenceMiss(MOSS), null, "the gate refused a green store");
  });
});

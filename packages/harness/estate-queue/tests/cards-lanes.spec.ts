// cards-lanes.spec.ts — the lane presence gate's every arm (TEST-2
// breadth, the deterministic census of 2026-09-19): pack-folder
// reads (good config / no extras / broken config), the sandbox
// stand-down, the re-armed gate with a fixture endpoint, present
// files riding, missing files refusing with folders + provision
// URL, and the non-string / empty lane rows skipping.
import "../../../../tests/helpers/boot-models.ts";
import { afterAll, beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LANE_FOLDERS, laneFilesStatus, lanePackFolders, lanePresenceMiss, lanePresenceRefusal } from "../src/cardsLanes.ts";
import { CardArmError } from "../src/cardsArmError.ts";
import { cardRefusal, toRemoteError } from "../src/runsRefusalVoices.ts";
import { getModel, registryIds } from "@melite/comfyui-cordis";
import { EngineFacts } from "@melite/comfyui-cordis/model-contract";

const DIR = join(tmpdir(), "melite-lanes-" + process.pid);
const CFG = join(DIR, "endpoint.json");
const MODELS = join(DIR, "models");
const PREV_CFG = process.env["COMFYUI_ENDPOINT_CONFIG"];
const PREV_SBX = process.env["INFERENCE_TEST_SANDBOX"];
const PREV_ROOT = process.env["MELITE_REPO_ROOT"];

beforeAll(() => {
  mkdirSync(MODELS, { recursive: true });
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

const arm = (extra: Record<string, unknown> | null): void => {
  const doc = extra === null
    ? { url: "http://127.0.0.1:8188", model_base_path: MODELS }
    : { url: "http://127.0.0.1:8188", model_base_path: MODELS, extra_model_folders: extra };
  writeFileSync(CFG, JSON.stringify(doc));
  process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
  delete process.env["INFERENCE_TEST_SANDBOX"];
  // HERMETIC repo root: the runtime tree + the root-config
  // inheritance read never touch the developer's real store
  process.env["MELITE_REPO_ROOT"] = DIR;
};

describe("lanePackFolders (the pack homes, one truth with the mount leg)", () => {
  it("a config with extra_model_folders yields its keys", () => {
    arm({ SEEDVR2: "/x", anny: "/y" });
    const packs = lanePackFolders();
    assert.ok(packs.includes("SEEDVR2"));
    assert.ok(packs.includes("anny"));
  });
  it("a config without extras yields none", () => {
    arm(null);
    assert.deepEqual([...lanePackFolders()], []);
  });
  it("a non-object extras row yields none (never a crash)", () => {
    writeFileSync(CFG, JSON.stringify({ url: "http://x", extra_model_folders: [1, 2] }));
    process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
    assert.deepEqual([...lanePackFolders()], []);
  });
  it("a broken config yields none (the gate errs loud elsewhere)", () => {
    writeFileSync(CFG, "{not json");
    process.env["COMFYUI_ENDPOINT_CONFIG"] = CFG;
    assert.deepEqual([...lanePackFolders()], []);
  });
});

describe("laneFilesStatus", () => {
  it("uses the endpoint store when no checker is supplied", () => {
    arm(null);
    const dir = join(MODELS, "checkpoints");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "present.bin"), "x");
    assert.equal(laneFilesStatus({ lane_inputs: { checkpoint: "present.bin" } }), true);
  });

  // The test above answers true whether the gate CONSULTED the store
  // or simply returned true (audit 2026-10-13, mutation-proven:
  // replacing laneFilesStatus' whole body with `return true` left the
  // entire estate-queue suite green). These two pin the answer the
  // GPU receipt rows consume: the MISS is false, and the checker seam
  // is the store the default path reads.
  it("a family whose mapped lane file is ABSENT answers false", () => {
    arm(null);
    assert.equal(laneFilesStatus({ lane_inputs: { checkpoint: "never-written.bin" } }), false);
  });

  it("consults the check seam with the store path the default builds", () => {
    // LaneCheck answers the path when the file is PRESENT and null when
    // it is ABSENT (the shape checkModelPresent itself returns).
    const seen: Array<[string, string]> = [];
    const present = laneFilesStatus(
      { lane_inputs: { checkpoint: "present.bin" } },
      (folder, name) => {
        seen.push([folder, name]);
        return folder === "checkpoints" ? "models/" + folder + "/" + name : null;
      },
    );
    assert.equal(present, true, "a checker that finds the file in one folder means present");
    // the seam is consulted for the lane's stock folder FIRST, then the
    // endpoint's pack folders — the raw folder name, no "models/"
    // prefix (the DEFAULT check adds that, not the caller)
    assert.equal(seen[0]?.[0], "checkpoints");
    assert.equal(seen[0]?.[1], "present.bin");
    // one call only: the stock folder hit short-circuits the probe, so
    // a hit never walks the pack folders (a miss does — that is the
    // probe's whole point)
    assert.deepEqual(seen, [["checkpoints", "present.bin"]]);
    // and a checker that finds it nowhere answers the miss
    assert.equal(
      laneFilesStatus(
        { lane_inputs: { checkpoint: "present.bin" } },
        () => null,
      ),
      false,
    );
  });
});

describe("lanePresenceRefusal (the gate)", () => {
  it("a sandboxed world with no fixture endpoint stands down", () => {
    delete process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["INFERENCE_TEST_SANDBOX"] = "1";
    assert.equal(lanePresenceRefusal("anny-hmr"), null);
  });
  it("a fixture endpoint re-arms the gate: a family with every lane file present rides", () => {
    arm(null);
    const fam = "anny";
    const view = getModel(fam) as {
      lane_inputs?: Record<string, unknown>;
      lane_homes?: Record<string, string>;
    };
    const li = (view?.lane_inputs ?? {}) as Record<string, unknown>;
    for (const v of Object.values(li)) {
      if (typeof v !== "string" || v.trim() === "") continue;
      // place it in every stock folder the gate probes
      for (const folder of ["checkpoints", "unet", "vae", "clip_vision", "text_encoders", "diffusion_models"]) {
        const d = join(MODELS, folder);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, v), "x");
      }
      // and under the declared home, both probe spellings
      for (const home of Object.values(view?.lane_homes ?? {})) {
        const cut = v.lastIndexOf("/");
        const spellings: Array<[string, string]> = cut > 0
          ? [[home, v.slice(cut + 1)], [join(home, v.slice(0, cut)), v.slice(cut + 1)]]
          : [[home, v]];
        for (const [folder, name] of spellings) {
          const d = join(MODELS, folder);
          mkdirSync(d, { recursive: true });
          writeFileSync(join(d, name), "x");
        }
      }
    }
    assert.equal(lanePresenceRefusal(fam), null);
  });
  it("a real lane file present in the mount rides (hit arm)", () => {
    arm(null);
    // krea-2 carries REAL lane rows (text_encoder + unet files) —
    // place them in the hermetic mount stock folders
    const fam = "krea-2";
    const li = (getModel(fam)?.lane_inputs ?? {}) as Record<string, unknown>;
    for (const [key, raw] of Object.entries(li)) {
      if (typeof raw !== "string" || raw.trim() === "") continue;
      for (const folder of ["text_encoders", "clip", "unet", "diffusion_models", "vae", "checkpoints", "clip_vision", "background_removal"]) {
        const d = join(MODELS, folder);
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, raw), "x");
      }
      void key;
    }
    assert.equal(lanePresenceRefusal(fam), null);
  });
  it("a real lane file missing refuses with folders + the provision hint", () => {
    arm(null);
    // same family, EMPTIED mount: every real lane row misses — the
    // refusal carries the folders checked and (when the family
    // declares provisions for the name) the fetch hint
    rmSync(MODELS, { recursive: true, force: true });
    try {
      lanePresenceRefusal("krea-2");
      assert.fail("a missing lane file refuses");
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.match((e as Error).message, /folders checked:/);
      assert.equal((e as { code?: string }).code, "lane_input_missing");
    }
  });
  it("a missing lane file with a matching provision carries the fetch hint", () => {
    arm({ SEEDVR2: "/pack" }); // extras ride the folder union too
    rmSync(MODELS, { recursive: true, force: true });
    try {
      lanePresenceRefusal("qwen-img-edit-2511");
      assert.fail("the missing lane file refuses");
    } catch (e) {
      assert.match((e as Error).message, /fetch it: /);
    }
  });
  it("a family without lane_inputs stands down (the ?? toll)", () => {
    arm(null);
    assert.equal(lanePresenceRefusal("anycreature"), null);
  });
  it("a missing lane file without a provision row omits the hint", async () => {
    // REPLACES a vacuous pin (audit 2026-10-13): the old body called
    // lanePresenceRefusal("transfer_rig"), whose ONLY lane key is
    // model_path — a key LANE_FOLDERS does not map — so it returned
    // null at the stand-down and could never throw. The honest probe
    // registers a family that maps a lane file and declares NO
    // provisions row: the refusal must name the folders and carry
    // no fetch hint (the ?? [] arm's own contract).
    arm(null);
    const { modelsService } = await import("@melite/comfyui-cordis/models-service");
    const svc = modelsService();
    const { actions: _a, defaults: _d, ...base } =
      getModel("krea-2") as unknown as Record<string, unknown>;
    const probe = structuredClone(base) as Record<string, unknown>;
    delete probe["provisions"];
    probe["id"] = "probe-noprov-lanes";
    probe["label"] = "Probe No-Provision Lanes";
    probe["lane_inputs"] = {
      ...(probe["lane_inputs"] as Record<string, unknown>),
      checkpoint: "probe.bin",
    };
    // actions are dropped for the clone (functions do not survive
    // structuredClone), so the variants ride fresh and routeless —
    // no resolver_defaults to validate against a missing surface,
    // no cell artifact for the recipe↔weights law to spell
    probe["variants"] = [
      { id: "v", label: "V", description: "", hint: "", group: "Variant", route: "", engine: "", order: 0,
        resolver_defaults: {}, lane_inputs: {}, wire_defaults: null,
        cells: [{ quant: "fp16", label: "FP16", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false, artifact: null }] },
    ];
    const off = svc.registerFamily(probe as never);
    try {
      assert.throws(
        () => lanePresenceRefusal("probe-noprov-lanes"),
        (e: Error & { code?: string }) => {
          assert.equal(e.code, "lane_input_missing");
          assert.match(e.message, /folders checked:/);
          assert.ok(!/fetch it:/.test(e.message), "no provision hint without a provisions row");
          return true;
        },
      );
    } finally {
      off();
    }
  });
  it("a missing lane file refuses with folders + the law code", () => {
    arm(null);
    // THE PROBE FINDS ITS OWN FAMILY (the walls audit's H5,
    // 2026-10-10): the old arm pointed at "anycreature", which
    // declares NO lane_inputs at all — so `wants.length === 0` fired
    // on every run and the arm asserted nothing under a title that
    // claims a pin. The honest probe: find a family that DOES
    // declare lane files, and ask about it in the temp store where
    // those files do not exist.
    // Gate-visible slots only: LANE_FOLDERS names the slots the gate
    // judges; declaration-only keys (model_path, texture_vae) ride
    // pack-specific loaders the estate deliberately does not map, so
    // a family declaring only those is outside the gate's contract
    // and would stand the wall up against nothing (the ace-step
    // find, 2026-10-23).
    const fam = registryIds()
      .map((id) => ({ id, li: (getModel(id)?.lane_inputs ?? {}) as Record<string, unknown> }))
      .find(({ li }) => Object.entries(li).some(
        ([k, v]) => k in LANE_FOLDERS && typeof v === "string" && v.trim() !== "",
      ));
    assert.ok(fam !== undefined, "the registry declares a family with gate-visible lane files to probe");
    // the gate THROWS its CardArmError for a miss (the return shape
    // is the stand-down's)
    assert.throws(
      () => lanePresenceRefusal(fam!.id),
      (e: Error & { code?: string }) => {
        assert.equal(e.code, "lane_input_missing", "the law's own code");
        assert.match(e.message, /folders checked:/, "the refusal names the folders it checked");
        assert.match(e.message, new RegExp(fam!.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
          "and the family it judged");
        return true;
      },
      `the missing lane file refuses loud (${fam!.id})`,
    );
  });
});

describe("the lane-missing fold's structured artifact (the popup's payload, 2026-10-22)", () => {
  it("the envelope carries the structured fields beside the prose", () => {
    const err = new CardArmError(
      400,
      "lane presence: family 'qwen-img-edit-21' declares text_encoder 'qwen3vl_8b_int8_convrot.safetensors' but no store copy exists (folders checked: text_encoders, clip) — fetch it: https://example/tenc",
      "lane_input_missing",
      undefined,
      undefined,
      undefined,
      { family: "qwen-img-edit-21", slot: "text_encoder", missing: "qwen3vl_8b_int8_convrot.safetensors", folders: ["text_encoders", "clip"], fetchUrl: "https://example/tenc", kind: "model" },
    );
    const payload = cardRefusal(err).payload;
    assert.equal(payload["family"], "qwen-img-edit-21");
    assert.equal(payload["slot"], "text_encoder");
    assert.equal(payload["missing"], "qwen3vl_8b_int8_convrot.safetensors");
    assert.deepEqual(payload["folders"], ["text_encoders", "clip"]);
    assert.equal(payload["fetch_url"], "https://example/tenc");
    assert.equal(payload["kind"], "model");
  });

  it("the fold answers the typed details row the client's popup keys on", () => {
    const err = new CardArmError(
      400,
      "lane presence: family 'f1' declares vae 'v.safetensors' but no store copy exists",
      "lane_input_missing",
      undefined,
      undefined,
      undefined,
      { family: "f1", slot: "vae", missing: "v.safetensors", folders: ["vae"], kind: "model" },
    );
    const details = (toRemoteError(cardRefusal(err)).details ?? {}) as Record<string, unknown>;
    assert.equal(details["family"], "f1");
    assert.equal(details["slot"], "vae");
    assert.equal(details["missing"], "v.safetensors");
    assert.deepEqual(details["folders"], ["vae"]);
    assert.equal("fetch_url" in details, false, "no provision — no fetch_url key, not an empty one");
    assert.equal(details["kind"], "model");
  });

  it("a lane refusal without its structured artifact refuses LOUD at the fold", () => {
    const err = new CardArmError(
      400,
      "lane presence: family 'f1' declares vae 'v.safetensors' but no store copy exists",
      "lane_input_missing",
    );
    assert.throws(
      () => toRemoteError(cardRefusal(err)),
      /lacks its structured artifact/,
      "a popup keyed on prose is exactly the shape this rejects",
    );
  });
});

describe("the loras lane slot (the default bag's file rides the gate, 2026-10-11)", () => {
  const DMAD = "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors";
  const DMAD_URL =
    "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors";
  const UNET = "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors";
  const place = (relpath: string): void => {
    const d = join(MODELS, relpath, "..");
    mkdirSync(d, { recursive: true });
    writeFileSync(join(MODELS, relpath), "x");
  };

  it("the ByteDance default lora under the provision folder passes — no refusal, no popup", () => {
    arm(null);
    // the family's OTHER lane file rides too: the gate judges every
    // lane_input row, so the pass case must satisfy them all
    place(join("diffusion_models", UNET));
    place(join("loras", "h3", DMAD));
    assert.equal(lanePresenceRefusal("h3"), null, "the provision row's folder (loras/h3) is the checked store truth");
  });

  it("the default lora missing refuses naming the loras slot, the provision folder, and the fetch hint", () => {
    arm(null);
    rmSync(MODELS, { recursive: true, force: true });
    mkdirSync(MODELS, { recursive: true });
    place(join("diffusion_models", UNET)); // unet present: the FIRST miss is the loras row
    const miss = lanePresenceMiss("h3");
    assert.ok(miss !== null, "the missing default bag file refuses");
    assert.match(miss.message, /declares loras '/, "the refusal names the loras slot");
    assert.match(miss.message, /loras\/h3/, "and the provision folder it probed last");
    assert.match(miss.message, /fetch it: https:\/\/huggingface\.co\/ZhengmingYu\/DMAD\//, "and the fetch hint");
    const details = (toRemoteError(cardRefusal(miss)).details ?? {}) as Record<string, unknown>;
    assert.equal(details["slot"], "loras");
    assert.equal(details["missing"], DMAD);
    assert.equal(details["fetch_url"], DMAD_URL, "the popup's install button keys on this");
    const folders = details["folders"] as string[];
    assert.ok(folders.includes("loras"), "the stock loras root rides the checked set");
    assert.ok(folders.includes("loras/h3"), "and the provision folder is the last leg");
  });
});

describe("the declared-home loop (the lane_homes cure, 2026-10-23)", () => {
  // THE CENSUS: every FILE-valued lane slot carries a folder row the
  // gate can judge — a stock LANE_FOLDERS key or the family's own
  // lane_homes row. The exclusion list names the slots that are NOT
  // files, so the census cannot silently grow a blind spot: a new
  // file-naming EngineFacts member must join FILE_SLOTS (or its
  // family goes blind again, the ace-step disease).
  const FILE_SLOTS = [
    "unet", "text_encoder", "vae", "checkpoint", "loras",
    "clip_vision", "background_removal", "texture_vae", "model_path",
  ];
  const NON_FILE_SLOTS = [
    "clip_type", "family", "latent_node", "sampling_shift",
    "max_images", "text_encode_node",
  ];

  it("every FILE-valued lane slot carries a stock folder row or a declared home", () => {
    const offenders: string[] = [];
    for (const fam of registryIds()) {
      const decl = getModel(fam) as {
        lane_inputs?: Record<string, unknown>;
        lane_homes?: Record<string, string>;
        variants?: Array<{ lane_inputs?: Record<string, unknown> }>;
      };
      const li = decl.lane_inputs ?? {};
      const rows: Array<[string, unknown]> = [
        ...Object.entries(li),
        ...(decl.variants ?? []).flatMap((v) => Object.entries(v.lane_inputs ?? {})),
      ];
      for (const [slot, value] of rows) {
        if (typeof value !== "string" || value.trim() === "") continue;
        if (NON_FILE_SLOTS.includes(slot)) continue;
        if (!(slot in LANE_FOLDERS) && !(slot in (decl.lane_homes ?? {}))) {
          offenders.push(`${fam}: lane slot '${slot}' ('${value.trim()}') — no LANE_FOLDERS row, no lane_homes row (the gate cannot judge this file)`);
        }
      }
    }
    assert.deepEqual(offenders, [], `blind lane slots:\n${offenders.join("\n")}`);
  });

  it("the census stays honest: FILE_SLOTS names every file-naming EngineFacts member", () => {
    // a drift guard on the census itself: the EngineFacts schema's
    // string-valued members are the census's universe — a new file
    // member arriving without a FILE_SLOTS row re-blinds the gate
    const members = (EngineFacts.dict ?? {}) as Record<string, { type?: string } | undefined>;
    const stringMembers = Object.entries(members)
      .filter(([, v]) => (v?.type ?? "") === "string")
      .map(([k]) => k);
    const unjudged = stringMembers.filter((k) => !FILE_SLOTS.includes(k) && !NON_FILE_SLOTS.includes(k));
    assert.deepEqual(unjudged, [], `EngineFacts grew file-naming members the census does not judge: ${unjudged.join(", ")}`);
  });

  it("a declared home probes the exact value spelling and the basename spelling", () => {
    const decl = {
      lane_inputs: { model_path: "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base" },
      lane_homes: { model_path: "qwen3_tts" },
    };
    const probed: string[] = [];
    const hit = laneFilesStatus(decl as never, (folder, name) => {
      probed.push(folder + " × " + name);
      return name === "Qwen3-TTS-12Hz-0.6B-Base" ? "/store/hit" : null;
    });
    assert.equal(hit, true, "the basename spelling under the declared home hits");
    assert.ok(probed.includes("qwen3_tts × qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base"), "the exact value spelling rides");
    assert.ok(probed.includes("qwen3_tts/qwen3-tts/hf × Qwen3-TTS-12Hz-0.6B-Base"), "the basename spelling rides");
    const miss = laneFilesStatus(decl as never, () => null);
    assert.equal(miss, false, "no store copy under either spelling refuses");
  });

  it("the packs union does NOT ride a home slot (the DECL replaces the guess)", () => {
    const decl = {
      lane_inputs: { model_path: "tree.bin" },
      lane_homes: { model_path: "sams" },
    };
    const probed: string[] = [];
    arm({ SEEDVR2: "SEEDVR2", sams: "sams" });
    laneFilesStatus(decl as never, (folder) => {
      probed.push(folder);
      return null;
    });
    assert.deepEqual(probed, ["sams"], "only the declared home is probed: " + probed.join(", "));
  });

  it("the end-to-end voice: anny's sam rides its declared sams home — present passes, missing refuses naming the home", () => {
    arm(null);
    rmSync(MODELS, { recursive: true, force: true });
    mkdirSync(MODELS, { recursive: true });
    const miss = lanePresenceMiss("anny");
    assert.ok(miss !== null, "the missing sam refuses");
    assert.match(miss.message, /declares model_path 'sam_vit_b_01ec64\.pth'/);
    assert.match(miss.message, /sams × sam_vit_b_01ec64\.pth/, "the refusal names the declared home and the value");
    const details = (toRemoteError(cardRefusal(miss)).details ?? {}) as Record<string, unknown>;
    assert.equal(details["slot"], "model_path");
    assert.equal(details["missing"], "sam_vit_b_01ec64.pth");
    mkdirSync(join(MODELS, "sams"), { recursive: true });
    writeFileSync(join(MODELS, "sams", "sam_vit_b_01ec64.pth"), "x");
    assert.equal(lanePresenceRefusal("anny"), null, "the file under its declared home passes");
  });
});

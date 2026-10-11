// THE DECLARED-RESOURCES WALL (2026-10-13, operator order: "WE WANT
// TO CATCH ERRORS BEFORE THE APP SHIPS, BEFORE WE OPEN AND USE THE
// APP"). Every resource the assets tab can offer — family models,
// card provisions, extensions — resolves HERE, through the ONE
// contract door the seat itself consumes (declarationPort; zero
// drift: the wall never re-derives a plan). A ref that cannot
// produce a plan is a download dialog waiting to fail mid-session:
// it reds in CI, named, with its register row's cure.
//
// Three laws, the face-lane-unity precedent:
//   1. every observed debt — a download-intent refusal, or a cell
//      naming a source with no artifact — carries a REGISTER row (a
//      NEW violation reds loud; the set never grows silently);
//   2. every register row must still be violated (a stale row reds —
//      the cure landed, the row is deleted debt);
//   3. every plan that DOES resolve is structurally load-bearing:
//      non-empty, absolute https urls, one-segment names, folders.
import "../../../../tests/helpers/boot-models.ts";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, test } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { loadCardDefs, modelsService } from "@melite/comfyui-cordis";
import { declarationPort } from "../src/provisioning.ts";
import type { ResourceRef } from "@melite/estate-provisioning";

// The wall runs against the REAL checkout's declarations (the
// extensions manifest and model facts ride the repo root) — never
// the rig's fixture root a sibling spec may have left in the env.
process.env["MELITE_REPO_ROOT"] = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..", "..",
);

/** The refs whose declaration debt is REGISTERED: the key is the
 *  family id (model families), `card/<id>`, or `extension/<id>`;
 *  the value names the verified upstream truth and the owed cure.
 *  Both arms consume it — the resolve arm (a download-intent family
 *  whose plan refuses) and the half-shape arm (cells naming sources
 *  with no artifact) — and the stale check deletes a row the day
 *  its cure lands. */
const REGISTERED_PROVISION_REPAIRS: Record<string, string> = {
  "ace-step":
    "cells name the ACE-Step1.5-GGUF directory with no artifact rows. " +
    "Verified upstream (audio-cpp/audio.cpp-gguf): ACE-Step1.5-GGUF/" +
    "{base,turbo}/ace-step-1.5-{base,turbo}-{bf16,q8_0}.gguf exist. " +
    "Cure: per-cell artifact rows into those files (variant base -> " +
    "base/, standard -> turbo/). The sft and xl variants name " +
    "ACE-Step1.5-SFT-GGUF / ACE-Step1.5-XL-GGUF — directories that " +
    "exist NOWHERE upstream (verified 2026-10-13): repoint them at " +
    "real files or delete the variants, then add their artifact rows. " +
    "The recipe-weights law (lane_inputs) fires once artifacts exist.",
  moss:
    "cells name real directories in audio-cpp/audio.cpp-gguf with no " +
    "artifact rows. Verified files: MOSS-TTS-Nano-100M-GGUF/" +
    "{moss-tts-nano-100m-bf16,q8_0}.gguf; MOSS-VoiceGenerator-GGUF/" +
    "moss_voicegen_bf16_codec_f16_decode.gguf; MOSS-TTS-Local-v1.5-GGUF/" +
    "{moss-tts-local-v1.5-bf16,q8_0}.gguf. Cure: per-cell artifact rows " +
    "with those basenames + the lane_inputs weights truth.",
  music3:
    "the standard/int8 cell names the MiniMax-Music3-GGUF directory " +
    "with no artifact row — the provisions rows mask it (the plan " +
    "resolves; the weights cell delivers nothing). The repo is REAL: " +
    "audio-cpp/MiniMax-Music3-GGUF carries transformer_{bf16,q4_0," +
    "q4_k,q8_0}.gguf + language_model_* + rvq_depth_decoder_* + " +
    "vocoder.gguf + condition_encoder.gguf. Cure: per-file artifact " +
    "rows naming exactly the files the audio.cpp lane loads (the " +
    "on-disk int8 convrot safetensors is the local conversion, not " +
    "the normal user's path).",
  yue2:
    "the standard/int8 cell names the Yue2-3B-GGUF directory with no " +
    "artifact row — same masked class. The repo is REAL: audio-cpp/" +
    "Yue2-3B-GGUF carries yue2-3b-{bf16,q4_0,q8_0}.gguf + " +
    "yue2-vae-{f16,f32}.gguf + sidecars/. Cure: per-file artifact rows " +
    "naming exactly the files the audio.cpp lane loads, sidecars " +
    "included.",
};

/** The register key a ref's debt lives under. */
const registerKey = (ref: ResourceRef): string =>
  ref.kind === "model"
    ? (ref.owner === "family" ? ref.id : `card/${ref.id}`)
    : `extension/${ref.id}`;

/** Does the family DECLARE download intent? A tool family (tagger,
 *  upscale-tools, input-prep…) declares no weights and downloads
 *  nothing — a plan-less resolve is its honest answer, never a
 *  defect. The defect class is download intent that produces no
 *  plan: a cell naming a source (the declaration SAYS this family
 *  has weights) with no artifact row to fetch it with. */
const declaresDownloadIntent = (id: string): boolean => {
  const decl = modelsService().getModel(id) as {
    provisions?: readonly unknown[];
    variants?: readonly {
      cells?: readonly { source?: unknown }[];
    }[];
  };
  if ((decl.provisions ?? []).length > 0) return true;
  return (decl.variants ?? []).some((v) =>
    (v.cells ?? []).some((c) => c.source !== null && c.source !== undefined),
  );
};

const freshPort = async (): Promise<{
  refs: readonly ResourceRef[];
  resolve: (ref: ResourceRef) => Promise<unknown>;
}> => {
  const ctx = new Context();
  const defs = await loadCardDefs();
  const original = ctx.get.bind(ctx);
  ctx.get = ((name: string, optional?: boolean) => {
    if (name === "cardRegistry") return { defsSync: () => defs };
    return original(name, optional);
  }) as typeof ctx.get;
  const port = declarationPort(ctx);
  return { refs: await port.list(), resolve: port.resolve.bind(port) };
};

describe("the declared resources resolve before the app ships", () => {
  test("every plan resolves sound and every source names its artifact", async () => {
    const { refs, resolve: resolveRef } = await freshPort();
    assert.ok(
      refs.length >= 40,
      `the declaration port enumerated ${refs.length} refs — the ` +
        `registry boot failed silently (families+cards+extensions ` +
        `expect dozens)`,
    );

    const refused: string[] = [];
    const structural: string[] = [];
    // The register keys with observed debt this pass — the stale
    // check needs BOTH arms' signals, so one pass collects them.
    const violated = new Set<string>();

    for (const ref of refs) {
      const key = registerKey(ref);
      let plan: { items: { kind: string; name?: string; url?: string; folder?: string }[] };
      try {
        plan = (await resolveRef(ref)) as typeof plan;
      } catch (error: unknown) {
        const cure = REGISTERED_PROVISION_REPAIRS[key];
        const intent =
          ref.kind !== "model" ||
          ref.owner !== "family" ||
          declaresDownloadIntent(ref.id);
        violated.add(key);
        if (cure === undefined && intent) {
          refused.push(
            `${key}: ${(error as Error).message} — a NEW provision ` +
              `refusal on a family that DECLARES download intent; ` +
              `the assets tab would offer a download that fails ` +
              `mid-session. Register it with its verified upstream ` +
              `cure, or fix the declaration.`,
          );
        }
        continue;
      }
      if (plan.items.length === 0) {
        structural.push(`${key}: resolved an EMPTY plan`);
      }
      for (const item of plan.items) {
        if (item.kind === "model") {
          if (!/^https:\/\/.+/.test(item.url ?? "")) {
            structural.push(`${key}: item '${item.name}' url is not ` +
              `absolute https: '${String(item.url)}'`);
          }
          const name = item.name ?? "";
          if (name === "" || name.includes("/") || name.includes("\\")) {
            structural.push(`${key}: item name '${name}' is not one ` +
              `path segment (the landed file's name must be a ` +
              `basename)`);
          }
          if ((item.folder ?? "") === "") {
            structural.push(`${key}: item '${name}' names no folder`);
          }
        }
      }
    }

    // The half-shape arm (the ModelDecl contract — the same schema
    // registerFamily validates): source = the landed file's name,
    // artifact = the download. A cell with one and not the other is
    // the half-shape — downloadable-looking in the face,
    // undeliverable at the seat. The resolve arm alone cannot see a
    // family whose provisions rows mask a dead cell (music3, yue2:
    // the plan succeeds on the provisions items while the weights
    // cell delivers nothing) — this arm cannot be fooled.
    for (const id of modelsService().registryIds()) {
      const decl = modelsService().getModel(id) as {
        variants?: readonly {
          id?: string;
          cells?: readonly {
            quant?: string;
            source?: unknown;
            artifact?: unknown;
          }[];
        }[];
      };
      for (const v of decl.variants ?? []) {
        for (const c of v.cells ?? []) {
          if (
            c.source !== null &&
            c.source !== undefined &&
            (c.artifact === null || c.artifact === undefined)
          ) {
            violated.add(id);
            if (REGISTERED_PROVISION_REPAIRS[id] === undefined) {
              refused.push(
                `${id}/${v.id ?? "?"}/${c.quant ?? "?"}: source ` +
                  `${JSON.stringify(c.source)} with no artifact row — ` +
                  `the declaration names weights it cannot fetch. ` +
                  `Register the family with its verified upstream ` +
                  `cure, or add the artifact row.`,
              );
            }
          }
        }
      }
    }

    const staleRows = Object.keys(REGISTERED_PROVISION_REPAIRS)
      .filter((key) => !violated.has(key))
      .map((key) =>
        `${key} is registered as broken but shows no debt this pass — ` +
          `the cure landed; delete the register row (dead debt is ` +
          `deleted, never parked).`,
      );
    assert.deepEqual(refused, [], "NEW declaration debt");
    assert.deepEqual(staleRows, [], "stale register rows");
    assert.deepEqual(structural, [], "structurally unsound plans");
  });

  test("the register holds only refs that exist", async () => {
    const { refs } = await freshPort();
    const declared = new Set(refs.map(registerKey));
    const ghosts = Object.keys(REGISTERED_PROVISION_REPAIRS).filter(
      (key) => !declared.has(key),
    );
    assert.deepEqual(
      ghosts,
      [],
      "register rows naming no declared ref (renamed or deleted " +
        "families leave their debt row behind)",
    );
  });
});

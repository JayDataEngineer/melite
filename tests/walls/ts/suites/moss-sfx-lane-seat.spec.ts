// moss-sfx-lane-seat.spec.ts — THE SFX SEAT WALL (qa8 F4/GAPS-14 estate half).
//
// THE LESION (operator ruling 2026-11-01: the §4 "deployment env" classification
// is REJECTED — F4/F5/F6 are estate work, 100%): the sfx card's model_path seat
// refused as `lane_inputs.model_path = undefined`, the cards exposed no cure, and
// the old mapping report called it a deployment-env fix (MOSS_SFX_DIR). The
// companion ruling (COMFYUI EXTENSIONS NEVER USE ENV VARIABLES) forbids the env
// door outright: the seat must resolve via the folder_paths category mapped in
// extra_model_paths.yaml through the DECL/provisioner path — never an env var.
//
// THE LAW (estate half; the vendor audio pack's own folder_paths-first resolve is
// the vendor half, owned separately — this wall judges the ESTATE side only):
//   ARM 1  the DECL seats the lane — lane_inputs.model_path is a non-empty seat
//          name and lane_homes.model_path names the folder_paths category.
//   ARM 2  the category is WIRED — the DECL's lane home is a declared
//          extra_model_folders key in the endpoint config AND a mapped entry in
//          the generated extra_model_paths.yaml (the DECL/provisioner path).
//   ARM 3  the estate carries NO env seat — models/moss-sfx + audio/sfx sources
//          contain no process.env / MOSS_SFX_DIR / AUDIOCPP seat.
//   ARM 4  the refusal NAMES the seat — a missing model_path refuses field-named
//          with the lane home in the message (never a bare `undefined`).
//   ARM 5  the sfx pattern MATCHES kimodo's (F5 is the vendor agent's — this arm
//          verifies parity, never duplicates): both DECLs seat model_path via
//          lane_homes, both facts doors refuse field-named naming the home.
//
// DEPTH: real DECLs (live imports), real endpoint config, real generated yaml,
// real estate sources, real facts doors — never frozen literals. A moved home,
// a renamed seat, an unwired category, or a new env seat reds.
//
// Run: npx vitest run tests/walls/ts/suites/moss-sfx-lane-seat.spec.ts
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DECL as mossDecl } from "@melite/models-moss-sfx";
import { parseSfxFacts } from "@melite/models-moss-sfx";
import { DECL as kimodoDecl } from "@melite/models-kimodo";
import { parseKimodoFacts } from "../../../../packages/models/kimodo/src/actions.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const ENDPOINT_PATH = join(ROOT, "data", "comfyui_endpoint.json");
const YAML_PATH = join(ROOT, "data", "runtime", "comfyui", "extra_model_paths.yaml");
const MOSS_SRC = join(ROOT, "packages", "models", "moss-sfx", "src");
const SFX_SRC = join(ROOT, "packages", "audio", "sfx", "src");

function readTsSources(dir: string): Array<{ file: string; src: string }> {
  const out: Array<{ file: string; src: string }> = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".ts")) continue;
    out.push({ file: f, src: readFileSync(join(dir, f), "utf8") });
  }
  return out;
}

describe("qa8 F4 — the moss-sfx lane seat resolves via folder_paths, never env", () => {
  it("ARM 1 — the DECL seats the lane: model_path non-empty, lane home names the category", () => {
    const laneInputs = (mossDecl as unknown as { lane_inputs: Record<string, unknown> }).lane_inputs;
    const homes = (mossDecl as unknown as { lane_homes: Record<string, string> }).lane_homes;
    const seat = laneInputs["model_path"];
    assert.equal(typeof seat, "string", "DECL lane_inputs.model_path is a string seat");
    assert.ok((seat as string).length > 0, "the seat is non-empty (never undefined)");
    assert.equal(homes["model_path"], "audiocpp", "the lane home names the folder_paths category");
  });

  // THE SEATED STATEMENT (the 2026-11-16 CI cure): the endpoint
  // statement and the rendered wiring yaml are machine state the
  // provisioner writes on the box that runs the engine — both
  // untracked, absent on a fresh clone and on CI. Nothing was ever
  // seated there, so there is no wiring fact to judge. Skip LOUD
  // naming the seat; ARM 1's DECL law and ARM 3-5 still judge
  // everywhere.
  const STATEMENT_SEATED = existsSync(ENDPOINT_PATH) && existsSync(YAML_PATH);
  it.skipIf(!STATEMENT_SEATED)("ARM 2 — the category is WIRED: endpoint declares it, the generated yaml maps it (skipped when the provisioner has not seated this machine — fresh clone/CI: `pnpm provision` writes both)", () => {
    const endpoint = JSON.parse(readFileSync(ENDPOINT_PATH, "utf8")) as {
      extra_model_folders?: Record<string, string>;
    };
    const folders = endpoint.extra_model_folders ?? {};
    const home = ((mossDecl as unknown as { lane_homes: Record<string, string> }).lane_homes)["model_path"];
    assert.ok(
      Object.prototype.hasOwnProperty.call(folders, home),
      `endpoint extra_model_folders declares "${home}" (the DECL/provisioner path)`,
    );
    const yaml = readFileSync(YAML_PATH, "utf8");
    assert.match(
      yaml,
      new RegExp(`^  ${home}: .+`, "m"),
      `the generated extra_model_paths.yaml maps "${home}"`,
    );
  });

  it("ARM 3 — the estate carries NO env seat for the sfx lane", () => {
    const hits: string[] = [];
    for (const { file, src } of [...readTsSources(MOSS_SRC), ...readTsSources(SFX_SRC)]) {
      if (/process\.env/.test(src)) hits.push(`${file}: process.env`);
      if (/MOSS_SFX_DIR/.test(src)) hits.push(`${file}: MOSS_SFX_DIR`);
      if (/AUDIOCPP_MODELS_DIR/.test(src)) hits.push(`${file}: AUDIOCPP_MODELS_DIR`);
    }
    assert.deepEqual(hits, [], "no env seat in estate moss-sfx/sfx sources (folder_paths only)");
  });

  it("ARM 4 — the refusal NAMES the seat: missing model_path refuses with the lane home", () => {
    const home = ((mossDecl as unknown as { lane_homes: Record<string, string> }).lane_homes)["model_path"];
    assert.throws(
      () => parseSfxFacts({ model_path: "" }),
      new RegExp(`lane home "${home.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`),
      "the empty-seat refusal names the lane home",
    );
    assert.throws(
      () => parseSfxFacts({ family: "moss_sfx_v2" }),
      /lane_inputs\.model_path = undefined/,
      "the absent-seat refusal is field-named (never a bare undefined)",
    );
    const facts = parseSfxFacts(
      (mossDecl as unknown as { lane_inputs: Record<string, unknown> }).lane_inputs as Parameters<typeof parseSfxFacts>[0],
    );
    assert.ok(facts.model_path.length > 0, "the DECL's own seat parses clean");
  });

  it("ARM 5 — the sfx pattern MATCHES kimodo's (F5 parity, never a duplicate)", () => {
    // Both DECLs seat model_path via lane_homes; both facts doors refuse
    // field-named naming the home. F5's CHECKPOINT_DIR strip is the vendor
    // agent's — this arm only verifies the estate pattern matches.
    for (const [label, decl, parse] of [
      ["moss-sfx", mossDecl, parseSfxFacts],
      ["kimodo", kimodoDecl, parseKimodoFacts],
    ] as const) {
      const d = decl as unknown as { lane_inputs: Record<string, unknown>; lane_homes: Record<string, string> };
      assert.equal(typeof d.lane_inputs["model_path"], "string", `${label}: lane_inputs.model_path is a string seat`);
      assert.ok((d.lane_inputs["model_path"] as string).length > 0, `${label}: the seat is non-empty`);
      assert.ok(d.lane_homes["model_path"].length > 0, `${label}: lane_homes.model_path names the category`);
      assert.throws(
        () => (parse as (r: Record<string, unknown>) => unknown)({}),
        /lane_inputs\.model_path = undefined/,
        `${label}: the absent seat refuses field-named`,
      );
    }
  });
});

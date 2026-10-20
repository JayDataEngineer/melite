// cardsLanes.ts — THE LANE PRESENCE GATE (the one-pattern law).
// Extracted from cardsRegistry: which families have a live lane on
// disk (the packs the compose arm refuses without).
import { checkModelPresent, getModel, loadEndpointConfig } from "@melite/comfyui-cordis";
import { LIVE_ACQUIRE_STATES, provisioningSeat } from "@melite/estate-provisioning";
import type { WeightAcquireProgress } from "@melite/estate-provisioning";
import type { DeclaredRuntime, ModelDecl } from "@melite/comfyui-card-kit/model-contract";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { CardArmError } from "./cardsArmError.ts";

// ── THE LANE PRESENCE GATE (2026-09-13, the one-pattern law) ───────
// The operator's alarm: "If Img Gen works and Img Edit doesn't,
// that's really bad — that means we are handrolling and not
// enforcing one pattern." It was true. Every family DECLARES its
// lane files (lane_inputs) and the store check existed
// (checkModelPresent) but nothing in the run path consulted it —
// Img Gen worked because its weights happened to be on disk, Img
// Edit died at ComfyUI validation with the reason swallowed by the
// UI. Presence is now ENFORCED at phase-1 for every FAMILY-BACKED
// card run (familyless units and declaration-only lane keys —
// keys outside the map below — are excluded on purpose, see the
// LANE_FOLDERS note), one gate, one voice — the refusal names the
// family, the lane key, the missing file, the folders checked, and
// the provision URL when the family declares one (the fetch hint).

/** lane_inputs keys that name FILES the stock loaders read, mapped
 * to their ComfyUI folder sets (text_encoders folds legacy clip;
 * unet folds diffusion_models; loras is the LoraLoaderModelOnly
 * root — a family's default-bag distill rides it). Keys absent here
 * are declaration-only — model_path/texture_vae ride pack-specific
 * loaders whose folders the estate cannot name without inventing a
 * mapping; those slots are judged through the DECL's own
 * `lane_homes` row (the declared-home loop below), which replaces
 * this map and the pack union for its slot. */
export const LANE_FOLDERS: Readonly<Record<string, readonly string[]>> = {
  text_encoder: ["text_encoders", "clip"],
  vae: ["vae"],
  unet: ["unet", "diffusion_models"],
  checkpoint: ["checkpoints"],
  clip_vision: ["clip_vision"],
  background_removal: ["background_removal"],
  loras: ["loras"],
};

/** The endpoint's pack categories (extra_model_folders keys) — the
 * custom-node weight homes (SEEDVR2, anny, …). A lane file may
 * legally live in a pack the stock map doesn't name (seedvr2's
 * unet/vae ride the SEEDVR2 pack), so every key's folder set unions
 * these. Same config findModelPresent's mount leg reads — one
 * truth, no second mapping. Unparseable/absent config = no packs
 * (the stock sets stand alone; the gate errs loud, never blocks on
 * a config read). */
export function lanePackFolders(): readonly string[] {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return [];
  }
  const extras: unknown = cfg["extra_model_folders"];
  if (typeof extras !== "object" || extras === null || Array.isArray(extras)) {
    return [];
  }
  return Object.keys(extras as Record<string, unknown>);
}

/** THE GATE (pure over the registry + the store probes): null when
 * every declared lane file stands on disk; else the CardArmError a
 * card start refuses with.getModel's own unknown-family throw is
 * NOT swallowed here — phase-1's resolution gates own that voice
 * (this runs after prepareCardParams resolved the family).
 *
 * HERMETIC DEFERRAL (the same rule loadEndpointConfig serves, one
 * seam two consumers): a sandboxed test world with no explicit
 * endpoint fixture has no store to enforce against — the gate
 * stands down and ComfyUI's own validation (UI-surfaced since
 * 2026-09-13) remains the backstop. A fixture endpoint env always
 * re-arms the gate (the gate specs drive it that way). */
export function lanePresenceRefusal(fam: string, body?: Record<string, unknown>, mid?: string): CardArmError | null {
  const sandbox: string = process.env["INFERENCE_TEST_SANDBOX"] ?? "";
  const envPath: string = process.env["COMFYUI_ENDPOINT_CONFIG"] ?? "";
  if (sandbox !== "" && envPath === "") return null;
  // the refusal is a THROW, never a value (phase1Card's pinned
  // contract — no return-value arm there)
  const miss: CardArmError | null = lanePresenceMiss(fam, body, mid);
  if (miss !== null) throw miss;
  return null;
}

/** THE WEIGHTS PROBE (roadmap §10's e2e gate, 2026-09-21): the same
 *  walk lanePresenceRefusal gates with, env-deferral stripped — the
 *  caller (the GPU receipt rows) decides what a miss means (a skip,
 *  never a cost signal). One loop, two seats, no divergence. */
type LaneCheck = (folder: string, name: string) => string | null;

type LaneMiss = {
  readonly key: string;
  readonly name: string;
  readonly folders: readonly string[];
};

/** The store spellings one declared home probes for one lane
 *  value. The value may carry a loader-side subpath
 *  ("qwen3-tts/hf/Qwen3-TTS-…-Base" under the qwen3_tts key) or be
 *  a bare name ("sam_vit_b_01ec64.pth" under sams) — both spellings
 *  ride findModelPresent's exact join, so both are probed. */
function homeProbes(home: string, name: string): Array<[string, string]> {
  const probes: Array<[string, string]> = [[home, name]];
  const cut: number = name.lastIndexOf("/");
  if (cut > 0) probes.push([home + "/" + name.slice(0, cut), name.slice(cut + 1)]);
  return probes;
}

function firstLaneMiss(
  decl: Pick<ModelDecl, "lane_inputs" | "provisions" | "lane_homes">,
  check: LaneCheck,
  variantRow?: { lane_inputs?: Record<string, unknown> },
): LaneMiss | null {
  // THE VARIANT-LANE PRESENCE LAW (h¹ remainder — the one-parameter
  // switch): the probe judges the RESOLVED lane inputs — the family's
  // rows under the STATED variant's per-key override (the same merge
  // the compose stamps; a variant that does not override a key leaves
  // the family's row gating). A family-only probe green-lit a variant
  // whose own file never existed (the Singularity burn: the family's
  // timeline unet present, the override's 20 GB never fetched).
  const li = { ...(decl.lane_inputs ?? {}), ...(variantRow?.lane_inputs ?? {}) } as Record<string, unknown>;
  const homes = (decl.lane_homes ?? {}) as Record<string, string>;
  const packs = lanePackFolders();
  for (const [key, stock] of Object.entries(LANE_FOLDERS)) {
    const raw: unknown = li[key];
    const name: string = typeof raw === "string" ? raw.trim() : "";
    if (name === "") continue;
    const folders: string[] = [
      ...stock,
      ...packs.filter((p) => !stock.includes(p)),
    ];
    // THE PROVISION-FOLDER LEG (2026-10-11): a provisioned lane file
    // lands where its own row says — loras land in loras/h3, not the
    // stock root — so the row's folder is the last folder probed and
    // the refusal names it. One truth: the provision row owns the
    // file's home; no second subfolder mapping lives here.
    const prov = (decl.provisions ?? []).find((p) => p.name === name);
    if (prov !== undefined && !folders.includes(prov.folder)) folders.push(prov.folder);
    if (folders.some((folder) => check(folder, name) !== null)) continue;
    return { key, name, folders };
  }
  // THE DECLARED-HOME LOOP (the declaration-only cure, 2026-10-23):
  // model_path/texture_vae name files whose loader is pack-specific
  // — the estate cannot name their folders without inventing a map,
  // so the DECL does (lane_homes). The declared home replaces the
  // stock map AND the pack union (the pack keys are a guess for a
  // pack-specific loader; the DECL is the family's own statement);
  // the provision-folder leg still rides when the family fetches
  // the file itself.
  for (const [key, home] of Object.entries(homes)) {
    const raw: unknown = li[key];
    const name: string = typeof raw === "string" ? raw.trim() : "";
    if (name === "") continue;
    const probes = homeProbes(home, name);
    const prov = (decl.provisions ?? []).find((p) => p.name === name.split("/").pop());
    if (prov !== undefined && !probes.some(([f, n]) => f === prov.folder && n === name)) {
      probes.push([prov.folder, name]);
    }
    if (probes.some(([folder, probeName]) => check(folder, probeName) !== null)) continue;
    return { key, name, folders: probes.map(([f, n]) => f + " × " + n) };
  }
  return null;
}

export function laneFilesStatus(
  decl: Pick<ModelDecl, "lane_inputs" | "provisions" | "lane_homes">,
  check: LaneCheck = (folder, name) => checkModelPresent("models/" + folder, name),
): boolean | null {
  const li = (decl.lane_inputs ?? {}) as Record<string, unknown>;
  const homes = (decl.lane_homes ?? {}) as Record<string, string>;
  const hasRows =
    [...Object.keys(LANE_FOLDERS), ...Object.keys(homes)].some((key) => {
      const raw: unknown = li[key];
      return typeof raw === "string" && raw.trim() !== "";
    });
  if (!hasRows) return null;
  return firstLaneMiss(decl, check) === null;
}

/** THE DECLARED ENGINE ROOT (E2-2 Piece A): where the live engine
 *  lives on this box, stated in the endpoint machine statement
 *  (`engine_root`). The runtime walk-up must start from the
 *  ENGINE's own output dir — probing the estate's repo tree would
 *  green-light runs the BYO engine then burns (the repo copy the
 *  engine never reads). No declared root = the estate cannot see
 *  that tree, so the leg stands down (today's behavior: the
 *  post-hoc banner stays the only face). Additive key, unknown to
 *  every existing reader. */
function engineRootOf(): string | null {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return null;
  }
  const raw: unknown = cfg["engine_root"];
  if (typeof raw !== "string" || raw.trim() === "") return null;
  return raw.trim();
}

/** The engine's output dir: the endpoint's output_dir when stated
 *  (absolute as-is, relative resolved under the declared engine
 *  root — the managed "data/temp" spelling), else the ComfyUI
 *  default (<root>/output). The walk-up only moves UP, so
 *  starting deep is safe; starting shallow would skip the true
 *  ancestor — this never starts shallower than the engine's own
 *  output. */
function engineOutputDir(root: string): string {
  let cfg: Record<string, unknown>;
  try {
    cfg = loadEndpointConfig() as unknown as Record<string, unknown>;
  } catch {
    return join(root, "output");
  }
  const raw: unknown = cfg["output_dir"];
  if (typeof raw !== "string" || raw.trim() === "") return join(root, "output");
  const v: string = raw.trim();
  return v.startsWith("/") ? v : join(root, v);
}

/** One sentinel's safe join: a sentinel escaping its home (.. or
 *  empty) is a declaration bug — false, never a filesystem escape. */
function sentinelHit(home: string, sentinel: string): boolean {
  const clean: string = sentinel.trim().replace(/^\/+|\/+$/gu, "");
  if (clean === "" || clean.split("/").some((part) => part === "..")) return false;
  return existsSync(join(home, clean));
}

/** The engine's own resolution, mirrored (nodes_anny.py:885-935):
 *  the env override wins (a set override names the home outright —
 *  the managed-boot truth, where the estate launches the engine
 *  with this same env; a deliberately stated path with valid
 *  sentinels is trusted over a blind walk-up, and a stated path
 *  that fails its sentinels is the engine's own failure, not a
 *  cue to keep searching), else the first ancestor of the output
 *  dir holding the rel dir decides — a chipped first hit is the
 *  miss, never a cue to walk on. */
function resolveRuntimeHome(
  outputDir: string,
  rt: Pick<DeclaredRuntime, "rel" | "sentinel" | "env">,
): string | null {
  const override: string = (process.env[rt.env] ?? "").trim();
  if (override !== "") {
    return rt.sentinel.every((s) => sentinelHit(override, s)) ? override : null;
  }
  let dir: string = resolve(outputDir);
  for (;;) {
    const home: string = join(dir, ...rt.rel);
    if (existsSync(home)) {
      return rt.sentinel.every((s) => sentinelHit(home, s)) ? home : null;
    }
    const parent: string = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** THE RUNTIME LEG (E2-2 Piece A, 2026-10-20 — the press-time
 *  half): the DECL's runtime row, judged only when the consuming
 *  param is stated (a GLB-only anny run never touches the
 *  estimator — the leg sleeps) and only when the endpoint
 *  declares its engine root. The refusal voices the ENGINE's own
 *  sentence (name + path + Provision it + env override) so the
 *  existing runtime banner fires on it with no new wire; the
 *  structured artifact rides beside the prose (the fold's law).
 *  The lanes.env hatch rides every refusal: an override the
 *  engine sees but the lane cannot is a one-line export away,
 *  and the refusal says so. */
function runtimeLegMiss(
  decl: Pick<ModelDecl, "runtime">,
  fam: string,
  body?: Record<string, unknown>,
): CardArmError | null {
  const rt = decl.runtime;
  if (rt === undefined) return null;
  const stated: unknown = body?.[rt.consuming_param];
  if (typeof stated !== "string" || stated.trim() === "") return null;
  const root: string | null = engineRootOf();
  if (root === null) return null;
  const override: string = (process.env[rt.env] ?? "").trim();
  if (override !== "") {
    if (rt.sentinel.every((s) => sentinelHit(override, s))) return null;
    return runtimeRefusal(fam, rt, [override]);
  }
  const start: string = engineOutputDir(root);
  const home: string | null = resolveRuntimeHome(start, rt);
  if (home !== null) return null;
  return runtimeRefusal(fam, rt, [start]);
}

/** The press-time runtime refusal: the engine-voiced sentence the
 *  E2 parser anchors on (run-rescue-core.ts THE RUNTIME-MISS
 *  VOICE) — `<name> runtime not found at <path>. Provision it:
 *  <cmd>. Or point <ENV> at an existing runtime.` — plus the
 *  lanes.env hatch. Deliberately NOT the "lane presence:" prefix:
 *  that voice is the model leg's anchor (weight extensions), and
 *  this sentence must fall through to the runtime arm, never be
 *  claimed by it. */
function runtimeRefusal(
  fam: string,
  rt: Pick<DeclaredRuntime, "name" | "env" | "command" | "consuming_param" | "rel" | "sentinel">,
  checked: readonly string[],
): CardArmError {
  return new CardArmError(
    400,
    "family '" + fam + "' declares runtime '" + rt.name + "' (" + rt.consuming_param + " stated) but no " +
      "provisioned copy exists — " + rt.name + " runtime not found at " + checked[0] + ". Provision it: " +
      rt.command + ". Or point " + rt.env + " at an existing runtime. If " + rt.env + " is set for the " +
      "engine but the lane cannot see it, export it in lanes.env and restart the lane. (walk-up from " +
      checked[0] + " for " + rt.rel.join("/") + " found no copy holding " + rt.sentinel.join(", ") + ")",
    "lane_input_missing",
    undefined,
    undefined,
    undefined,
    {
      family: fam,
      slot: rt.consuming_param,
      missing: rt.name,
      folders: [...checked],
      kind: "runtime",
    },
  );
}

/** THE IN-FLIGHT READ (the run gate's seat query — the provisioning
 *  service's operation read, wired through the process seat the way
 *  the models seat's namespace arms the models table): the LIVE
 *  acquire row for one family, null when no seat is mounted in this
 *  process, no acquisition runs for the family, or the row already
 *  settled (a settled row is the rescue verbs' story — the idle miss's
 *  own voice stands for it, and its fresh-fetch hint is then true).
 *  The read keys the family ref the acquire door itself starts
 *  (owner family, no variant/quant), so the gate sees exactly the
 *  operation the manage seat's Download press minted. */
function acquireInFlight(fam: string): WeightAcquireProgress | null {
  const progress = provisioningSeat()?.progressOfRef({ kind: "model", owner: "family", id: fam }) ?? null;
  if (progress === null) return null;
  return LIVE_ACQUIRE_STATES.has(progress.state) ? progress : null;
}

/** The live fraction's one voice: a percent of the DECL's own total,
 *  or the undeclared-total word when no row declared a size (a
 *  fraction of nothing is a lie). */
function inFlightFraction(progress: WeightAcquireProgress): string {
  if (progress.total <= 0) return "total undeclared";
  return String(Math.floor((progress.bytes * 100) / progress.total)) + "%";
}

/** THE STATED VARIANT'S ROW (the same derivation the compose
 *  stamps, over the DECL's own rows — the facts fold drops
 *  lane_inputs): a stated body.variant wins (id match), else the
 *  ADDRESS's own row (route/id/cell-route/resolver model — a bare
 *  route pick composes that route's defaults), else undefined (the
 *  family default: no override, the family rows gate alone). */
function statedVariantRow(
  decl: Pick<ModelDecl, "variants">,
  body: Record<string, unknown> | undefined,
  mid: string | undefined,
): ModelDecl["variants"][number] | undefined {
  const variants = decl.variants ?? [];
  const stated = typeof body?.["variant"] === "string" && (body["variant"] as string).trim() !== ""
    ? (body["variant"] as string).trim()
    : "";
  if (stated !== "") {
    const row = variants.find((v) => v.id === stated || v.route === stated);
    if (row !== undefined) return row;
  }
  if (mid === undefined || mid === "") return undefined;
  return variants.find((v) =>
    v.route === mid || v.id === mid
    || (v.cells ?? []).some((c) => c.route === mid)
    || v.resolver_defaults?.["model"] === mid);
}

export function lanePresenceMiss(fam: string, body?: Record<string, unknown>, mid?: string): CardArmError | null {
  const decl = getModel(fam);
  const miss = firstLaneMiss(decl, (folder, name) => checkModelPresent("models/" + folder, name), statedVariantRow(decl, body, mid));
  if (miss === null) return runtimeLegMiss(decl, fam, body);
  const prov = (decl.provisions ?? []).find((p) => p.name === miss.name);
  // THE IN-FLIGHT LEG (ERRORS.md k2 — NEVER-RUN-ON-INCOMPLETE): a
  // miss whose file is landing RIGHT NOW is not the idle story. The
  // refusal voices the acquisition (the operation and its live
  // fraction, real landed bytes over the DECL total), carries the
  // structured row beside the lane miss, and DROPS the fresh-fetch
  // hint — "fetch it: <url>" while a fetch runs is what re-pops the
  // download loop the burn names.
  const inFlight = acquireInFlight(fam);
  if (inFlight !== null) {
    return new CardArmError(
      400,
      "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
        "' — acquisition in flight (" + inFlightFraction(inFlight) + "): operation " +
        inFlight.operationId + ", " + String(inFlight.bytes) + "/" + String(inFlight.total) +
        " bytes landed — the run refuses until the weight is on the store",
      "lane_input_missing",
      undefined,
      undefined,
      undefined,
      // the lane miss stands WITHOUT its fetchUrl (no fresh-fetch
      // hint): the popup keys its face on fields and finds no
      // download offer to double-press
      {
        family: fam,
        slot: miss.key,
        missing: miss.name,
        folders: miss.folders,
        kind: "model",
      },
      {
        acquire_in_flight: true,
        operation_id: inFlight.operationId,
        bytes: inFlight.bytes,
        total: inFlight.total,
      },
    );
  }
  return new CardArmError(
    400,
    "lane presence: family '" + fam + "' declares " + miss.key + " '" + miss.name +
      "' but no store copy exists (folders checked: " + miss.folders.join(", ") + ")" +
      (prov !== undefined ? " — fetch it: " + prov.url : ""),
    "lane_input_missing",
    undefined,
    undefined,
    undefined,
    // THE STRUCTURED ARTIFACT (operator 2026-10-22): the wire
    // details carry the same facts the prose carries, so the
    // client's missing-model popup keys its download action on
    // fields, never on parsing this message.
    {
      family: fam,
      slot: miss.key,
      missing: miss.name,
      folders: miss.folders,
      ...(prov !== undefined ? { fetchUrl: prov.url } : {}),
      kind: "model",
    },
  );
}

// schema/verbs.ts — the P6 TS decl-data twin of the anny SubAction verbs
// + the card_outputs settle gate.
//
// LADDER P6 (docs/design/ts-migration-ladder-2026-09-07.md drift item 5:
// "anny verbs have zero TS presence — 5–7 SubActionMod verbs, no decl
// twin yet"): this module is the twin. DECL DATA, not code — the verb
// rows carry what a dispatching door needs (verb → card + engines +
// knob params), never the compose logic behind the flows; the outputs
// rows carry what the settle gate needs (card → promised suffixes).
// The door dispatches table-driven (dispatchVerb / outputViolation /
// applyRunContract below — lookups over these tables, no per-verb or
// per-card code paths).
//
// PY SOURCES (authoritative; this file transcribes, never invents):
//   - the 7 verb classes: packages/engines/comfyui/models/3d/anny/mods/
//     verbs.py (EstimateBodyVerb 21-33, DressVerb 36-80, PropVerb
//     83-123, RigSomaxVerb 126-143, ApplySkinVerb 145-179,
//     SavePresetVerb 181-200, LoadPresetVerb 203-221).
//   - the mount set: models/3d/anny/model.py:110 (EstimateBody,
//     SavePreset, LoadPreset, Dress, Prop — RigSomax + ApplySkin are
//     DECLARED but unmounted; both still dispatch — see below).
//   - the contract: infra/python/melite_cards/dsl.py SubActionMod 857-869 +
//     VerbEngine 822-854 (exactly one of flow | local | refusal per
//     engine; queue + local engines never mix in one verb).
//   - the interim renderer copies (proof the verbs are wired as code
//     paths today): action_cards/3d/anny/ui/studio/component.tsx
//     ANNY_VERBS 97-134 (hmr-estimate, dress, prop, rig-somax,
//     apply-skin) + ANNY_PRESET_VERBS 447-448 (preset-save,
//     preset-load). The union with the mounted set is exactly these 7.
//   - the outputs gate: python/gateway.py _output_violation 473-489 (the
//     TEXT), the run-level arm 1374-1396 ({model} runs flip to failed),
//     the per-stage arm 1821-1832 (card= stages raise ValidationError).
//   - the outputs rows: hand-owned (transcribed once from the
//     retired card-decls.json outputs[] at purge S-decls 2026-09-08;
//     every row's content pins behaviorally in the verbs wall O02–O05,
//     row shape in O01).
//
// THE 7-VERB CENSUS (closed — the wall asserts no 8th on either side):
//   hmr-estimate  queue   commercial  → anny-hmr-commercial  (mounted)
//   dress         queue   seat        → fit-seat             (mounted)
//   prop          queue   seat        → fit-seat             (mounted)
//   rig-somax     queue   convert     → body-to-somax        (declared, unmounted)
//   apply-skin    queue   coat        → skin-apply           (declared, unmounted)
//   preset-save   LOCAL   save        → save-preset          (mounted)
//   preset-load   queue   instantiate → anny-params          (mounted)
// Every verb has exactly ONE engine today (single-pick dispatch —
// engineId is optional); the engines[] shape already carries the
// multi-engine future (the old regress|commercial|refine trio shape).
//
// KNOB PROJECTION (deliberate, wall-pinned): each knob rides as
// {name, kind, required, default?, options?} — the dispatch surface
// (handshake names, required-ness, ride-the-model defaults, Select
// vocabularies). Labels, tooltips, min/max/step, groups, zones are
// renderer/card prose owned by py + the TSX, never read by dispatch —
// carrying them would be a second truth to drift. The wall asserts
// EVERY py knob is present (no dropped knobs), pinning the projection
// field-for-field. `default` is present iff py's field_meta emits it
// (default not None and not "" — tools/export_card_decls.py:45-46).
//
// OUTPUTS PROJECTION: {patterns, label} per row. `many` is surface
// count-intent, never gate input (OutputRow docstring, dsl.py 633-637:
// "the gate is >=1 either way") — excluded with this receipt.
//
// NEW-DOOR CONTRACT (texts born here, wall-pinned byte-exact — py has
// no verb door, so there is no py text to mirror; the CODE rides the
// R4.2 default invalid_request, the same default py's ValidationError
// refusals carry):
//   unknown verb:   "unknown verb 'X' (known: 'a', 'b', ...)"
//   unknown engine: "unknown engine 'E' for verb 'V' (known: 's')"
// Quoting is pyReprStr (shared with engine/comfyui.ts — one repr).
//
// SETTLE MAPPING (mirrors py, cited per arm):
//   - run-level (gateway.py 1380-1391): completed + violation →
//     failed + the exact text (sidecar rewrite is py-owned; the TEXT
//     is the contract). Non-completed runs are untouched; unknown
//     cards pass (mirrors the None-class skip — _load_card_class may
//     return None and the caller skips the gate).
//   - per-stage (gateway.py 1826-1832): the TEXT is outputViolation's;
//     py raises ValidationError(text) so the stage error reads
//     "ValidationError: <text>". The TS merged worker (doors/
//     flowsRun.ts runOne) has NO per-stage arm — py's merged path
//     (_try_merged 1431-1611) has none either; the per-stage gate
//     lives in the per-stage loop this worker does not run. The
//     host error-type prefix differs by language by construction
//     ("ValidationError: " vs "Error: ") — the wall pins the refusal
//     TEXT, never the host prefix.
//   - the gate is TOTAL (no IO, no JSON, no throw paths — unknown
//     card → null): it cannot sink the queue, which is the whole of
//     py's try/except around the arm (1392-1396).
//
// KNOWN DIVERGENCE (documented, unpinned): str(a).lower() vs
// String(a).toLowerCase() differ on some non-ASCII case pairs
// (e.g. Turkish İ). Artifact paths are ASCII estate-wide; the wall
// pins ASCII byte-equal.
//
// Erasable-syntax TS only (node --experimental-strip-types, like the
// rest of the gateway packages): no enums, `import type` for types,
// .ts specifiers on relative imports.

import { pyReprStr, pyReprStrList } from "@melite/engine-comfyui";

/** One verb knob — the dispatch surface of a py Field declaration. */
export interface VerbKnobDecl {
  readonly name: string;
  /** Py Field.type ("text" | "number" | "select" — verb knobs use these three). */
  readonly kind: string;
  readonly required: boolean;
  /** Present iff py's field_meta emits it (not None and not ""). */
  readonly default?: unknown;
  /** Select vocabulary, declaration order (absent for non-Select). */
  readonly options?: readonly string[];
}

/** One engine choice — py VerbEngine (flow | local | refusal, exactly one). */
export interface VerbEngineDecl {
  readonly id: string;
  /** Queue flow template (null when the engine is local-only). */
  readonly flow: string | null;
  /** Tenant-local action id ("" when the engine is a queue flow). */
  readonly local: string;
  /** Remediation text for an unavailable engine ("" when runnable). */
  readonly refusal: string;
}

/** One SubAction verb row — verb → card + engines + knob params. */
export interface VerbDecl {
  readonly id: string;
  readonly label: string;
  /** The owning card (all seven ride 'anny' — the families field says so too). */
  readonly card: string;
  readonly families: readonly string[];
  readonly engines: readonly VerbEngineDecl[];
  readonly writes: readonly string[];
  readonly requires: readonly string[];
  readonly knobs: readonly VerbKnobDecl[];
}

/**
 * The 7-verb table (id-sorted — the unknown-verb refusal embeds this
 * order; py cites per row in the module header).
 */
export const VERB_DECLS: readonly VerbDecl[] = [
  {
    id: "apply-skin",
    label: "Apply skin detail",
    card: "anny",
    families: ["anny"],
    engines: [{ id: "coat", flow: "skin-apply", local: "", refusal: "" }],
    writes: ["body_glb"],
    requires: ["melite-poser-nodes"],
    knobs: [
      {
        name: "kind",
        kind: "select",
        required: false,
        default: "keeper",
        options: [
          "keeper",
          "ash_nomad",
          "villager_elder",
          "villager",
          "caravan_trader",
          "amf_warden",
          "cherusci_scrivener",
          "marrow_raider",
          "amalgam_horror",
          "arena_factor",
          "bone_crane",
          "dune_hound",
          "emberwing",
          "gloom_tortoise",
          "husk_stalker",
          "ironvein_construct",
          "meld_creature",
          "moss_elk",
          "ridge_lizard",
          "sand_skimmer",
        ],
      },
      {
        name: "map_size",
        kind: "select",
        required: false,
        // 512, not "512": py's field_meta numericizes the default
        // (_num_or_str — tools/export_card_decls.py:45-46), so the
        // declaration oracle carries the int. The wall pins this.
        default: 512,
        options: ["256", "512", "1024", "2048"],
      },
      { name: "seed", kind: "number", required: false, default: 20260906 },
    ],
  },
  {
    id: "dress",
    label: "Dress with outfit",
    card: "anny",
    families: ["anny"],
    engines: [{ id: "seat", flow: "fit-seat", local: "", refusal: "" }],
    writes: ["body_glb"],
    requires: ["melite-poser-nodes"],
    knobs: [
      { name: "prop", kind: "text", required: true },
      { name: "model_name", kind: "text", required: false },
      {
        name: "bone",
        kind: "text",
        required: false,
        default: "mixamorig:Spine",
      },
      {
        name: "align",
        kind: "select",
        required: false,
        default: "socket",
        options: ["socket", "fit", "grip"],
      },
      { name: "position", kind: "text", required: false, default: "0,0,0" },
      { name: "rotation", kind: "text", required: false, default: "0,0,0" },
      { name: "fit_ratio", kind: "number", required: false, default: 0 },
      { name: "fit_ref_bone", kind: "text", required: false },
      { name: "fit_ref_bone2", kind: "text", required: false },
      { name: "seat_ratio", kind: "number", required: false, default: 0.22 },
      { name: "finger_bone", kind: "text", required: false },
      { name: "thumb_bone", kind: "text", required: false },
      { name: "target_width", kind: "number", required: false, default: 0 },
    ],
  },
  {
    id: "hmr-estimate",
    label: "Estimate body from photo",
    card: "anny",
    families: ["anny"],
    engines: [
      { id: "commercial", flow: "anny-hmr-commercial", local: "", refusal: "" },
    ],
    writes: ["body_glb"],
    requires: ["melite-kimodo-nodes"],
    knobs: [
      { name: "person_index", kind: "number", required: false, default: 0 },
    ],
  },
  {
    id: "preset-load",
    label: "Load character preset",
    card: "anny",
    families: ["anny"],
    engines: [
      { id: "instantiate", flow: "anny-params", local: "", refusal: "" },
    ],
    writes: ["body_glb"],
    requires: ["melite-kimodo-nodes"],
    knobs: [{ name: "preset_id", kind: "text", required: true }],
  },
  {
    id: "preset-save",
    label: "Save character as preset",
    card: "anny",
    families: ["anny"],
    engines: [{ id: "save", flow: null, local: "save-preset", refusal: "" }],
    writes: [],
    requires: [],
    knobs: [{ name: "name", kind: "text", required: true }],
  },
  {
    id: "prop",
    label: "Seat prop in hand",
    card: "anny",
    families: ["anny"],
    engines: [{ id: "seat", flow: "fit-seat", local: "", refusal: "" }],
    writes: ["body_glb"],
    requires: ["melite-poser-nodes"],
    knobs: [
      { name: "prop", kind: "text", required: true },
      { name: "model_name", kind: "text", required: false },
      {
        name: "bone",
        kind: "text",
        required: false,
        default: "mixamorig:RightHand",
      },
      {
        name: "align",
        kind: "select",
        required: false,
        default: "grip",
        options: ["socket", "fit", "grip"],
      },
      { name: "position", kind: "text", required: false, default: "0,0,0" },
      { name: "rotation", kind: "text", required: false, default: "0,0,0" },
      { name: "fit_ratio", kind: "number", required: false, default: 0 },
      { name: "fit_ref_bone", kind: "text", required: false },
      { name: "fit_ref_bone2", kind: "text", required: false },
      { name: "seat_ratio", kind: "number", required: false, default: 0.22 },
      {
        name: "finger_bone",
        kind: "text",
        required: false,
        default: "mixamorig:RightHandMiddle1",
      },
      {
        name: "thumb_bone",
        kind: "text",
        required: false,
        default: "mixamorig:RightHandThumb1",
      },
      {
        name: "target_width",
        kind: "number",
        required: false,
        default: 0.25,
      },
    ],
  },
  {
    id: "rig-somax",
    label: "Convert to SOMAX rig",
    card: "anny",
    families: ["anny"],
    engines: [
      { id: "convert", flow: "body-to-somax", local: "", refusal: "" },
    ],
    writes: ["body_glb"],
    requires: ["melite-autorig-nodes"],
    knobs: [],
  },
];

/** The closed verb vocabulary (table order — the refusal embeds it). */
export const KNOWN_VERB_IDS: readonly string[] = VERB_DECLS.map(
  (v: VerbDecl): string => v.id,
);

/** Table lookup — null when the verb is unknown (never throws). */
export function findVerb(verbId: string): VerbDecl | null {
  for (const v of VERB_DECLS) {
    if (v.id === verbId) return v;
  }
  return null;
}

/** A dispatched verb: a queue flow, a tenant-local action, or a refusal. */
export type VerbTarget =
  | {
      readonly kind: "flow";
      readonly verb: string;
      readonly engine: string;
      readonly flow: string;
      readonly card: string;
      readonly writes: readonly string[];
    }
  | {
      readonly kind: "local";
      readonly verb: string;
      readonly engine: string;
      readonly action: string;
      readonly card: string;
      readonly writes: readonly string[];
    }
  | {
      readonly kind: "refusal";
      readonly code: "invalid_request";
      readonly error: string;
    };

/** Unknown-verb refusal (new-door contract — py has no verb door). */
export function unknownVerbRefusal(verbId: string): string {
  return (
    "unknown verb " + pyReprStr(verbId) +
    " (known: " + pyReprStrList([...KNOWN_VERB_IDS]) + ")"
  );
}

/** Unknown-engine refusal (new-door contract). */
export function unknownVerbEngineRefusal(
  verbId: string,
  engineId: string,
  known: readonly string[],
): string {
  return (
    "unknown engine " + pyReprStr(engineId) + " for verb " +
    pyReprStr(verbId) + " (known: " + pyReprStrList([...known]) + ")"
  );
}

/**
 * Table-driven verb dispatch (the door's dispatch core — no per-verb
 * code paths): verb → its engines → the picked engine's flow (queue
 * work through the queue door) or local action (synchronous gateway
 * work that must never burn a serial-GPU slot) or refusal (an
 * unavailable engine's remediation, never a silent downgrade).
 * engineId omitted picks engines[0] — every verb carries exactly
 * one engine today. Total: unknown ids refuse, never throw.
 */
export function dispatchVerb(
  verbId: string,
  engineId?: string,
): VerbTarget {
  const verb: VerbDecl | null = findVerb(verbId);
  if (verb === null) {
    return {
      kind: "refusal",
      code: "invalid_request",
      error: unknownVerbRefusal(verbId),
    };
  }
  let engine: VerbEngineDecl | null = null;
  if (engineId === undefined) {
    engine = verb.engines[0] ?? null;
  } else {
    for (const e of verb.engines) {
      if (e.id === engineId) {
        engine = e;
        break;
      }
    }
  }
  if (engine === null) {
    return {
      kind: "refusal",
      code: "invalid_request",
      error: unknownVerbEngineRefusal(
        verbId,
        engineId ?? "",
        verb.engines.map((e: VerbEngineDecl): string => e.id),
      ),
    };
  }
  if (engine.flow !== null) {
    return {
      kind: "flow",
      verb: verb.id,
      engine: engine.id,
      flow: engine.flow,
      card: verb.card,
      writes: [...verb.writes],
    };
  }
  if (engine.local !== "") {
    return {
      kind: "local",
      verb: verb.id,
      engine: engine.id,
      action: engine.local,
      card: verb.card,
      writes: [...verb.writes],
    };
  }
  return { kind: "refusal", code: "invalid_request", error: engine.refusal };
}

// ── the card_outputs settle gate ───────────────────────────────────

/** One promised output artifact kind (py OutputRow, patterns + label). */
export interface OutputDecl {
  readonly patterns: readonly string[];
  readonly label: string;
}

/**
 * Every card's promised outputs (id-sorted; hand-owned — transcribed
 * from the retired card-decls.json outputs[] at purge S-decls
 * 2026-09-08. MONO-ENGINE 2026-09-08: auto-rig / forge / music-native
 * rows retired with their engines (quarantine 47e1c583);
 * unknown/rowless cards pass the settle gate (the None-class skip).
 */
export const CARD_OUTPUTS: Readonly<Record<string, readonly OutputDecl[]>> = {
  anny: [{ patterns: [".glb"], label: "Rigged body mesh" }],
  fit: [
    { patterns: [".glb"], label: "Fitted prop-in-hand mesh" },
    { patterns: [".json"], label: "Fit record" },
  ],
  "h3-timeline": [{ patterns: [".png"], label: "Timeline frames" }],
  ideogram4: [{ patterns: [".png"], label: "Generated image" }],
  "image-edit": [{ patterns: [".png"], label: "Edited image" }],
  "image-gen": [{ patterns: [".png"], label: "Generated image" }],
  "img-to-mesh": [{ patterns: [".glb"], label: "Generated mesh" }],
  "input-prep": [
    {
      patterns: [
        ".png",
        ".jpg",
        ".jpeg",
        ".webp",
        ".gif",
        ".wav",
        ".mp3",
        ".flac",
      ],
      label: "Staged media artifact",
    },
  ],
  "mask-studio": [{ patterns: [".png"], label: "Mask PNG" }],
  motion: [{ patterns: [".npz"], label: "Motion clip" }],
  music: [
    { patterns: [".mp3", ".flac", ".wav"], label: "Generated audio" },
  ],
  "quad-remesh": [{ patterns: [".glb"], label: "Remeshed mesh" }],
  sfx: [{ patterns: [".flac", ".wav"], label: "Generated sound effect" }],
  skin: [
    { patterns: [".png"], label: "Skin textures (albedo + normal)" },
    { patterns: [".json"], label: "Skin-kind sidecar" },
  ],
  tagger: [{ patterns: [".txt"], label: "Tags/caption text" }],
  tts: [{ patterns: [".flac", ".mp3", ".wav"], label: "Spoken audio" }],
  "upscale-tools": [{ patterns: [".png"], label: "Upscaled image" }],
  "video-gen": [{ patterns: [".mp4", ".webm"], label: "Generated video" }],
  "voice-lock": [
    { patterns: [".flac", ".mp3", ".wav"], label: "Voice-locked audio" },
  ],
};

/**
 * The OUTPUT CONTRACT check (python/gateway.py _output_violation 473-489,
 * transcribed 1:1): null = honored; string = the exact refusal.
 * Suffix match, case-insensitive, any-of per row; the FIRST violating
 * row in declaration order wins; unknown/rowless cards pass (the
 * None-class skip). Total — unknown inputs yield null, never throw.
 */
export function outputViolation(
  cardId: string,
  artifacts: readonly unknown[] | null | undefined,
): string | null {
  const rows: readonly OutputDecl[] | undefined = CARD_OUTPUTS[cardId];
  if (rows === undefined || rows.length === 0) return null;
  const arts: string[] = [];
  if (artifacts !== null && artifacts !== undefined) {
    for (const a of artifacts) {
      if (!a) continue;
      arts.push(String(a).toLowerCase());
    }
  }
  for (const row of rows) {
    let honored: boolean = false;
    for (const a of arts) {
      for (const p of row.patterns) {
        if (a.endsWith(p)) {
          honored = true;
          break;
        }
      }
      if (honored) break;
    }
    if (!honored) {
      const seen: string = [...new Set(arts)].sort().slice(0, 8).join(", ") ||
        "(none)";
      return (
        "output contract violation: card " + pyReprStr(cardId) +
        " promises " + row.label + " (" + [...row.patterns].join(", ") +
        ") but the run delivered none of them; artifacts: " + seen
      );
    }
  }
  return null;
}

/**
 * The run-level settle arm (py worker 1380-1391, pure): a completed
 * run carrying card context that violated its promise flips to
 * failed with the exact refusal; everything else passes through
 * untouched (non-completed statuses, unknown cards, cardless runs).
 */
export function applyRunContract(
  state: { readonly status: string; readonly error: string },
  artifacts: readonly unknown[] | null | undefined,
  cardId: string | undefined,
): { readonly status: string; readonly error: string } {
  if (state.status !== "completed") return state;
  if (cardId === undefined || cardId === "") return state;
  const violation: string | null = outputViolation(cardId, artifacts);
  if (violation === null) return state;
  return { status: "failed", error: violation };
}

// actions.ts — the family's offered actions (the atom vocabulary,
// stroke 3): the speak + export actions the tts card binds. The
// DECL's lane_inputs are the ONE facts door (model_path — the
// audiocore load key); the lane branch (synth_lane) rides the
// LANE_TOPOLOGY below, keyed on the resolved variant — data, never
// a family-id switch; the segment factories are the legacy ttsT1 /
// ttsDesignT1 tree verbatim on the kit's OWN calibrated pins,
// loaders, and guards (one owner; the lanes stay as the
// byte-oracles, proven in tests/action.spec.ts). Creation order IS
// node-id order (the recipe law). Keys the segment never reads
// (instruction_control, checkpoint, … the strip shape) ride
// unvalidated.
//
// NO seed-sentinel rule is declared on `speak` — DELIBERATELY. The
// qvoice use-branch locks the studio seed to the artifact path when
// the doc seed is -1/unstated (the voice-lock law); a sentinel
// pre-mint would stamp a random concrete seed before the lock reads
// it, drifting timbre on every reuse. The branch-local mints below
// ride the ONE card-kit helper. `export` declares the rule: its
// single mint has no lock to preserve, so the ported mint is a
// pass-through.
import type { ComfyActionSpec } from "@melite/comfyui-card-kit";
import type { LaneInputsFacts, ModelFacts } from "@melite/comfyui-card-kit/facts";

/**
 * THE PRESET SPEAKER SET (2026-10-10, the card audit's M2).
 *
 * The nine CustomVoice personas are a CURATED product surface: the
 * vendored node takes a free `speaker_name` string and no local
 * declaration owned the list, so the card retyped it and a person
 * renaming a preset would find the form offering a name the card
 * refuses. It is declared on the action plane — the speak action's
 * `voice` param options — and both the card (tts/card.ts) and the
 * family index re-export read this one owner.
 */
export const PRESET_SPEAKERS: readonly string[] = [
  // "none" is GONE (operator 2026-11-12, told ten times: "Custom
  // Voice has no non-speaker"): it fired nothing on any path — a
  // bare run refused at the engine ("needs a stated speaker preset
  // or a .qvoice"), and a loaded .qvoice takes the qvoice branch
  // before this row is ever read (speakSegment: qvoiceUse first).
  // The picker rests on a real speaker (the 11-12 ruling supersedes
  // the picker half of 2026-11-10's no-seed law; the family DECL
  // defaults still carry no voice — that wall holds its own row).
  "ryan", "serena", "vivian", "aiden", "eric",
  "dylan", "sohee", "ono_anna", "uncle_fu",
];

// The TTS mechanics (types, facts door, topology reader, segments,
// param rows) ride the kit's ONE home (tts-segments.ts, the J1
// consolidation 2026-10-18); this family keeps its DATA — the
// LANE_TOPOLOGY rows, PRESET_SPEAKERS, and the action branch
// structure — and re-serves the types under its own surface names.
export type { TtsFacts, TtsParams, TtsLaneTopology } from "@melite/comfyui-card-kit/tts-segments";
import type { TtsFacts, TtsLaneTopology, TtsParams } from "@melite/comfyui-card-kit/tts-segments";
import {
  laneTopologyOf as kitLaneTopologyOf,
  parseTtsFacts as kitParseTtsFacts,
  ttsParamRows as kitTtsParamRows,
  speakSegment,
  useSegment,
  cloneSegment,
  exportSegment,
  designPreviewSegment,
} from "@melite/comfyui-card-kit/tts-segments";

/** The lane topology per variant id — the FAMILY-OWNED data rows
 *  (the branch key is the variant pick, never a family-id switch;
 *  a variant id outside the map is a broken DECL and refuses loud). */


export const LANE_TOPOLOGY: Readonly<Record<string, TtsLaneTopology>> = {
  base: { synth_lane: "clone", instruction_control: false },
  // instruction_control is the GRAPH capability (the 1.7B CustomVoice
  // checkpoint wires the instruct input — the size-at-quant reshape
  // keeps it TRUE here because the variant's LARGE cell owns it; the
  // 0.6B cell's SURFACE excludes style_instruction, so the write
  // never carries it onto the small lane — surface laws the write,
  // topology wires the graph, two judges one truth).
  customvoice: { synth_lane: "speak", instruction_control: true },
  voicedesign: { synth_lane: "design", instruction_control: true },
};

/** @param model the resolved row (family ⊕ variant)
 *  @returns the lane topology the dispatch and the card's admission
 *  read */
export function laneTopologyOf(model: ModelFacts): TtsLaneTopology {
  return kitLaneTopologyOf(model, LANE_TOPOLOGY, "qwen3-tts");
}

/** The tts facts door: the resolved lane_inputs parsed into the
 * closed shape — a missing model_path refuses field-named here, at
 * registration and at compose.
 *  @param raw the resolved lane_inputs (family ⊕ variant)
 *  @returns the typed facts the segment factories read */
export function parseTtsFacts(raw: LaneInputsFacts): TtsFacts {
  return kitParseTtsFacts(raw, "qwen3-tts speak");
}

/** The speak action: the tts lane — three honest branches keyed on
 * the resolved variant topology (persona synthesis, Base clone,
 * VoiceDesign export), never a family-id switch; all three lanes
 * live under this ONE family (the size-at-quant fold). */
export const speak: ComfyActionSpec<TtsParams, TtsFacts> = {
  id: "speak",
  inputs: [],
  outputs: [{ name: "audio", kind: "AUDIO" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the tts card
  // schema's own types and bounds — the family door judges defaults
  // and variant presets against this row. The voice enum is the
  // family's own preset set (PRESET_SPEAKERS above); the seed mints
  // INSIDE build (the voice-lock law — one mint seat, the build's),
  // so it declares plain, not sentinel-ruled.
  params: kitTtsParamRows(false, PRESET_SPEAKERS),
  facts: parseTtsFacts,
  build({ p, model, g, runId }) {
    const lane = laneTopologyOf(model).synth_lane;
    // three lanes under ONE family (the size-at-quant fold): the
    // design lane composes the studio in PREVIEW (the persona is
    // born and speaks the text — flac out, no persist), the clone
    // lane composes the reference, everything else is persona
    // synthesis. THE BOOLEAN (the qvoice law, operator 2026-10-22):
    // the .qvoice persist rides save_qvoice — the card's save
    // intent fires the export segment (the mint names itself);
    // a plain design run previews and demands nothing.
    if (lane === "design") {
      return p.save_qvoice === true
        ? exportSegment(p, model, g, runId).out()
        : designPreviewSegment(p, model, g, runId).out();
    }
    if (lane === "clone") return cloneSegment(p, model, g, runId).out();
    return speakSegment(p, model, g, runId).out();
  },
};

/** The export action: the persona SAVE half — fires from any lane
 * when the SAVE QVOICE boolean + the persona description both ride
 * (admission stays on the card). */
export const exportAction: ComfyActionSpec<TtsParams, TtsFacts> = {
  id: "export",
  inputs: [],
  outputs: [{ name: "qvoice", kind: "AUDIO" }],
  // THE DECLARED SURFACE (the write plane, phase 2): the tts card
  // schema's own types and bounds — the family door judges defaults
  // and variant presets against this row. The voice enum is the
  // family's own preset set (PRESET_SPEAKERS above); the seed mints
  // INSIDE build (the voice-lock law — one mint seat, the build's),
  // so it declares plain, not sentinel-ruled.
  params: kitTtsParamRows(true, PRESET_SPEAKERS),
  facts: parseTtsFacts,
  build({ p, model, g, runId }) {
    return exportSegment(p, model, g, runId).out();
  },
};

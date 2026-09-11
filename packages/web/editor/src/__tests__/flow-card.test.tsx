/**
 * THE ONE card kit tests (2026-08-07).
 *
 * "THERE IS ONLY ONE DESIGN. NEVER EVER TWO. THERE IS ONE WAY TO SEE THE
 * CARD. THE LIBRARY WAY… IT IS 1:1 TO WHAT WE SEE IN AGENT VIEW." The kit's
 * card IS CardTile — the dense Library rectangle — plus the shared
 * FlowTileGrid, StatusChip, and the inline detail body
 * (CardDetailInline). The full-width FlowCard (the second design) was
 * deleted (rule 4); these tests pin the kit's behaviors: the one status
 * vocabulary, the dense tile, the wiring chip, the motion-preview picker
 * in the inline expand, and the read-only preview kind.
 *
 * The kit is store-free by design — no store mocks, no apiFetch mocks.
 */
import { describe, it, expect, vi, beforeAll, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor, within } from "@testing-library/react"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import type { ReactElement } from "react"
import * as specContractStoreMock from "../surfaces/shared/specContractStore"
const { useSpecContractStore } = specContractStoreMock
// The store is vi.mock'd above; the factory returns test escape hatches the
// real module doesn't export (TS sees the real shape) — cast through any.
const __simulateSpecRecord = (specContractStoreMock as any).__simulateSpecRecord as (
  model: string,
  rec: import("../surfaces/shared/specContractStore").SpecContractRecord,
) => void
const __clearSpecLoadCalls = (specContractStoreMock as any).__clearSpecLoadCalls as () => void
const __resetSpecSimulations = (specContractStoreMock as any).__resetSpecSimulations as () => void
// The mock's loadFormSpec is a vi.fn; TS sees the real store signature
// (no .mock) — the cast is the escape, typed so callbacks stay typed.
const specLoadCalls = (): Array<[string, { fresh?: boolean } | undefined]> =>
  (useSpecContractStore.getState().loadFormSpec as unknown as {
    mock: { calls: Array<[string, { fresh?: boolean } | undefined]> }
  }).mock.calls
import {
  CardTile,
  StatusChip,
  FlowTileGrid,
  ParamEditor,
  tilePlayAffordance,
} from "../surfaces/flow/FlowCard"
import { CardDetailInline } from "../surfaces/flow/CardDetailModal"
// The tile's preview cell + run affordance ride the ui-claim WIRE now
// (cardElements lane parity, 2026-08-21) — seed the lane exactly as the
// app's boot does, or the cells render null.
import "@/shell/pluginUi"
import { formSpecStub, type FormSpecSeed } from "../../tests/fixtures/formSpecStub"
beforeAll(async () => { /* chrome static via pluginUi import */ })
import type { CardStage, CardStatus } from "@melite/contracts"
import { useMotionThumbStore } from "@melite/ui"
import { familyCardSummary, familyLabel, variantLabel, routeCoordinates } from "@melite/catalog"

// ParamEditor pulls the model-swap recipe from the catalog + form-spec —
// mocked here so the swap test pins the re-seed contract, not the network.
vi.mock("@melite/catalog/modelCatalog", () => ({
  studioOf: vi.fn(() => undefined),
  loadCatalog: vi.fn().mockResolvedValue({
    models: {
      "krea2": { form: "form_generate", label: "Krea 2" },
      "flux": { form: "form_generate", label: "Flux" },
          },
      }),
  // 2026-08-10: the Workflow Preset select populates the draft from the
  // catalog's families.<fam>.presets (the ONE data source — the recipe
  // params). Default fixture carries the blue_mesh recipe for the edit
  // family; the preset describe pins the populate contract.
  getCachedCatalog: vi.fn().mockReturnValue({
    models: {
      "qwen-edit-base": { family: "qwen-img-edit-2511", form: "form_edit", label: "Qwen Edit" },
          },
    families: {
      "qwen-img-edit-2511": {
        presets: {
          blue_mesh: {
            label: "Blue Mesh SOTA",
          params: {
              prompt: "Turn this person into a solid BLUE store mannequin.",
              negative_prompt: "clothing, hair",
          },
          },
          },
          },
          },
      }),
  // 2026-08-18: the fill handler's data source — the LOAD-TIME per-route
  // merge (compose model): the backend attached the merged dict to THIS
  // route, so the mock IS the wire. The fill reads
  // presetsForRoute(route)?.[value]?.params — nothing else to derive.
  presetsForRoute: vi.fn().mockReturnValue({
    blue_mesh: {
      label: "Blue Mesh SOTA",
      params: {
        prompt: "Turn this person into a solid BLUE store mannequin.",
        negative_prompt: "clothing, hair",
      },
    },
  }),
  familiesForForm: vi.fn().mockReturnValue([
    { primaryRoute: "krea2", label: "Krea 2" },
    { primaryRoute: "flux", label: "Flux" },
  ]),
  familyGenre: vi.fn().mockReturnValue("image"),
  // familyOf — the studio registry's tenant #4 match (cardStudios.ts:
  // the video-timeline FAMILY decides the timeline studio; genre `video`
  // alone must NOT). Faithful floor for this fixture: none of the stages
  // here are timeline cards → undefined → no studio affordance (the same
  // "missing export crashes every render" class the 2026-08-11 note below
  // documents — the mock must mirror the module's surface).
  familyOf: vi.fn().mockReturnValue(undefined),
  // narrowGenre — the closed-vocabulary narrowing CardDetailBody calls for
  // the motion branch (CardDetailModal.tsx). Faithful mirror of the real
  // module: in-vocabulary strings pass through, everything else →
  // undefined. A missing export here crashes EVERY body render (the mock
  // lied — 2026-08-11).
  narrowGenre: vi.fn((g: unknown) =>
    typeof g === "string" && ["image", "video", "audio", "3d", "motion", "ai_generated", "text"].includes(g)
      ? g
      : undefined,
  ),
  // CardTile line 2 ("Model, Variant") + line 3 ("WIDTH x HEIGHT") — the
  // 2026-08-09 declarative card-summary contract. familyLabel floors at the
  // routeKey in the real module (see familyOf → return routeKey); the
  // identity mock mirrors that so the "renders service + title" test still
  // finds the identifier text. familyCardSummary defaults to null (no
  // dimension line) — the per-test overrides below pin the declared path.
  familyLabel: vi.fn().mockImplementation((k: string) => k),
  familyCardSummary: vi.fn().mockReturnValue(null),
  // Variant helpers used by the card's submodel badge + toggle rows
  // (FlowCard imports these from modelCatalog). routeCoordinates feeds
  // the badge's per-axis labels (variant + quant); defaulting to
  // {undefined, undefined} renders the badge null — matching the
  // pre-fix no-op behavior. Individual tests override variantLabel /
  // routeCoordinates via vi.mocked() to pin the badge contract
  // (the 2026-08-09 "Turbo · Turbo" duplicate regression).
  variantLabel: vi.fn().mockReturnValue(""),
  routeCoordinates: vi.fn().mockReturnValue({ variant: undefined, quant: undefined }),
  composeVariantRoute: vi.fn().mockReturnValue(""),
  axisCellExists: vi.fn().mockReturnValue(true), // filter pinned in model-catalog.test.ts
  // 2026-08-16: the Model picker builds its options from dropdownModels
  // (the model FOLDER names) — the old family-label path used
  // familiesForForm. form_generate has the fixture's two routes.
  dropdownModels: vi.fn().mockImplementation((formTag?: string) =>
    formTag === "form_generate" ? ["flux", "krea2"] : [],
  ),
  variantSiblings: vi.fn().mockReturnValue([]),
}))
// Door B (2026-08-11): loadFormSpec/useFormSpec were DELETED from
// lib/formSpec — a form-spec only enters the app through the
// specContractStore (the verdict IS state; validateSpecContract gates
// every spec). The card's per-model spec factory now lives in the store
// mock; the pure helpers (optionValue/optionLabel/evalVisibleWhen) stay
// mocked from formSpec for FlowCard's runtime imports.
vi.mock("../surfaces/shared/specContractStore", () => {
  const records: Record<string, any> = {}
  const stateRef = { records }
  // The per-model spec factory — returns the spec dict for the model.
  // Declared FormSpecSeed so the literal returns narrow (type: "select"
  // etc. instead of widening to string) and schema field entries need
  // only `name` — formSpecStub completes the wire shape.
  async function specFor(model: string): Promise<FormSpecSeed> {
    // The upscale family (seedvr2) — the two-tier detailer card
    // (2026-08-08): STATIC mode select (upscale | inpaint) + the
    // inpaint_region SUB-select + schema_groups visible_when (the flat
    // fields list carries NO visible_when — only schema_groups does).
    // The detail knobs are NOT in catalog defaults — the schema field
    // defaults carry them (the real spec emits per-field defaults; the
    // card merges schema defaults under catalog defaults).
    if (model === "seedvr2_ema") {
  return {
        defaults: {
          mode: "upscale", batch_size: 5, resolution: 2048,
          },
      fields: [
          { name: "mode", type: "select", options: ["upscale", "inpaint"] },
          { name: "inpaint_region", type: "select", options: [{ value: "free", label: "Free Mask" }, { value: "body", label: "Body" }, { value: "face", label: "Face" }, { value: "hands", label: "Hands" }] },
          { name: "resolution", type: "number" },
          { name: "batch_size", type: "number" },
          { name: "detection_threshold", type: "number" },
          { name: "denoise", type: "number" },
          { name: "guide_size", type: "number" },
          { name: "max_size", type: "number" },
      ],
        schema_groups: [
          { fields: [
            { name: "mode", default: "upscale" },
            { name: "inpaint_region", default: "free", visible_when: "mode == 'inpaint'" },
            { name: "prompt", default: "", visible_when: "mode == 'inpaint' && inpaint_region == 'free'" },
            { name: "input_mask", visible_when: "mode == 'inpaint' && inpaint_region == 'free'" },
            { name: "detection_threshold", default: 0.35, visible_when: "mode == 'inpaint' && inpaint_region != 'free'" },
            { name: "denoise", default: 0.4, visible_when: "mode == 'inpaint' && inpaint_region != 'free'" },
            { name: "guide_size", default: 512, visible_when: "mode == 'inpaint' && inpaint_region != 'free'" },
            { name: "max_size", default: 1024, visible_when: "mode == 'inpaint' && inpaint_region != 'free'" },
          ] },
      ],
      features: {},
    }
    }
    // ACE-Step (music) — mirrors the REAL builder SCHEMA
    // (build_music.SCHEMA): 12 fields across 5 groups, NONE gated by
    // visible_when. The catalog YAML seeds ONLY {seed, duration} → the
    // card lands with 3 params (seed, duration, prompt). The other 9
    // fields live only on the schema; without the mount-time seed merge
    // they never enter the draft and never render. This is the SSOT
    // regression guard for "missing many input parameters" on the
    // schema-defaults-only side of the catalog/schema split.
    if (model === "ace-step") {
  return {
        // Catalog-level defaults (audio.yaml): ONLY seed + duration.
        // Schema field defaults fill the rest at form-spec build time.
        defaults: {
          seed: -1,
          duration: 30.0,
          dit_variant: "turbo",
          lm_variant: "1.7B",
          vae_variant: "stock",
          guidance_scale: 1.0,
          n_diffusion_steps: 0,
          lm_cfg_scale: 2.0,
          temperature: 0.85,
          top_p: 0.9,
          },
      fields: [
          { name: "dit_variant", type: "select", options: ["turbo", "base", "sft", "xl-turbo", "xl-base", "xl-sft"] },
          { name: "lm_variant", type: "select", options: ["1.7B", "4B"] },
          { name: "vae_variant", type: "select", options: ["stock", "scragvae"] },
          { name: "prompt", type: "textarea" },
          { name: "lyrics", type: "textarea" },
          { name: "duration", type: "number" },
          { name: "guidance_scale", type: "number" },
          { name: "n_diffusion_steps", type: "number" },
          { name: "lm_cfg_scale", type: "number" },
          { name: "temperature", type: "number" },
          { name: "top_p", type: "number" },
          { name: "seed", type: "seed" },
      ],
        schema_groups: [
          { fields: [
            { name: "dit_variant", default: "turbo" },
            { name: "lm_variant", default: "1.7B" },
            { name: "vae_variant", default: "stock" },
            { name: "prompt", default: "" },
            { name: "lyrics", default: "" },
            { name: "duration", default: 30.0 },
            { name: "guidance_scale", default: 1.0 },
            { name: "n_diffusion_steps", default: 0 },
            { name: "lm_cfg_scale", default: 2.0 },
            { name: "temperature", default: 0.85 },
            { name: "top_p", default: 0.9 },
            { name: "seed", default: -1 },
          ] },
      ],
      features: {},
    }
    }
    // qwen3_tts_voicedesign — mirrors the REAL build_tts.SCHEMA widget
    // types (2026-08-09): sliders with min/max/step, textareas for
    // instruct / voice_pca_strengths. The regression asserts the card
    // renders range inputs + multi-line textboxes (NOT free-text inputs)
    // when schema_groups carries the typed declarations. The flat fields
    // list has type "number" for sliders (the FormField enum has no
    // "slider") — schema_groups is the source that flips the rendering.
  //
    // reference_audio is type "audio" → FEATURE_FIELD_TYPES excludes it
    // from the flat `fields` list (the real backend does this). It's ONLY
    // in schema_groups. voice_file is type "file" (NOT in
    // FEATURE_FIELD_TYPES) → it IS in the flat fields list. This mirrors
    // the real form_spec emission so the mount-seed test exercises both
    // paths (flat-fields for voice_file, schema_groups for reference_audio).
    if (model === "qwen3_tts_voicedesign") {
  return {
        defaults: {
          seed: -1,
          qwen3_variant: "VoiceDesign",
          temperature: 0.8,
          top_p: 0.9,
          speed: 1.0,
          repetition_penalty: 1.05,
          },
      fields: [
          // label: "Talker Mode" mirrors the REAL builder Field (audio.py
          // Field("qwen3_variant", "select", "Talker Mode", ...)) — the
          // grid select renders the schema label, never a key-derived one
          // (2026-08-14: the header special-case that rendered Talker Mode
          // a SECOND time is gone; the schema field is the one surface).
          { name: "qwen3_variant", type: "select", label: "Talker Mode", options: ["CustomVoice", "Base", "VoiceDesign"] },
          { name: "prompt", type: "textarea" },
          { name: "language", type: "select", options: ["", "English", "Chinese", "Japanese", "Korean"] },
          { name: "instruct", type: "text" },
          // reference_audio is NOT in flat fields — type "audio" triggers
          // FEATURE_FIELD_TYPES exclusion in the real backend. The card's
          // mount-seed catches it via the schema_groups pass.
          { name: "voice_file", type: "file" },
          { name: "voice_pca_strengths", type: "text" },
          { name: "temperature", type: "number" },
          { name: "top_p", type: "number" },
          { name: "speed", type: "number" },
          { name: "repetition_penalty", type: "number" },
          { name: "seed", type: "seed" },
      ],
        schema_groups: [
          { fields: [
            { name: "qwen3_variant", type: "select", default: "VoiceDesign", label: "Talker Mode", options: ["CustomVoice", "Base", "VoiceDesign"] },
            { name: "prompt", type: "textarea", default: "" },
            { name: "language", type: "select", default: "", options: ["", "English", "Chinese"] },
            { name: "instruct", type: "textarea", default: "" },
            { name: "reference_audio", type: "audio" },
            { name: "voice_file", type: "file", default: "" },
            { name: "voice_pca_strengths", type: "textarea", default: "" },
            { name: "temperature", type: "slider", default: 0.8, min: 0.0, max: 2.0, step: 0.05 },
            { name: "top_p", type: "slider", default: 0.9, min: 0.0, max: 1.0, step: 0.01 },
            { name: "speed", type: "slider", default: 1.0, min: 0.5, max: 2.0, step: 0.1 },
            { name: "repetition_penalty", type: "slider", default: 1.05, min: 0.8, max: 2.0, step: 0.01 },
            { name: "seed", type: "seed", default: -1 },
          ] },
      ],
      features: {},
    }
    }
    // qwen-edit-base — the Workflow Preset recipe select (2026-08-10),
    // mirroring the real builder schema (builders/image.py edit_tuning
    // group): ``preset`` is a select defaulting to vnccs_repose with the
    // two recipe ids; prompt is a plain textarea. Picking a preset must
    // POPULATE the draft's empty fields from families.<fam>.presets.
    // qwen3-tts-base — mirrors the REAL form-spec emitted by the backend
    // after the 2026-08-13 talker-mode-visible migration:
    // 1. qwen3_variant IS a form Field (type=select) rendered as a
    // prominent "Talker Mode" dropdown at the top of the card.
    // 2. Each variant drives a DIFFERENT field surface via visible_when:
    // CustomVoice → voice preset + speaker_name + instruct (EMOTION control)
    // Base → reference_audio (REQUIRED, clone-only) — instruct HIDDEN
    // VoiceDesign → instruct (voice description — primary input)
    // Moss-TTS doesn't carry qwen3_variant, so `!= 'X'` evaluates
    // true and keeps instruct visible (correct — moss_tts supports it).
    if (model === "qwen3-tts-base") {
  return {
        defaults: {
          prompt: "",
          voice: "serena",
          temperature: 0.8,
          top_p: 0.9,
          speed: 1.0,
          repetition_penalty: 1.05,
          seed: -1,
          qwen3_variant: "CustomVoice",
          mode: "tts",
          },
      fields: [
      { name: "qwen3_variant", type: "select", label: "Talker Mode", options: [
      { value: "CustomVoice", label: "CustomVoice (Named Speakers)" },
      { value: "Base", label: "Base (Clone from Audio)" },
      { value: "VoiceDesign", label: "VoiceDesign (Create from Text)" },
          ] },
      { name: "voice", type: "select", label: "Voice Preset", options: [
      { value: "vivian", label: "Vivian" },
      { value: "serena", label: "Serena" },
      { value: "aiden", label: "Aiden" },
          ] },
          { name: "speaker_name", type: "text", label: "Speaker Name" },
          { name: "instruct", type: "textarea", label: "Style Instruction" },
          { name: "reference_text", type: "text", label: "Reference Transcript" },
          { name: "voice_file", type: "file", label: "Voice Embedding (.voice)" },
          { name: "voice_pca_strengths", type: "textarea", label: "PCA Steering (JSON)" },
          { name: "prompt", type: "textarea" },
          { name: "temperature", type: "number" },
          { name: "top_p", type: "number" },
          { name: "speed", type: "number" },
          { name: "repetition_penalty", type: "number" },
          { name: "seed", type: "seed" },
      ],
        schema_groups: [
          { fields: [
          { name: "qwen3_variant", type: "select", label: "Talker Mode", default: "CustomVoice",
          options: [
          { value: "CustomVoice", label: "CustomVoice (Named Speakers)" },
          { value: "Base", label: "Base (Clone from Audio)" },
          { value: "VoiceDesign", label: "VoiceDesign (Create from Text)" },
          ] },
          { name: "voice", type: "select", label: "Voice Preset", default: "serena",
          visible_when: "qwen3_variant == 'CustomVoice'",
          options: [
          { value: "vivian", label: "Vivian" },
          { value: "serena", label: "Serena" },
          { value: "aiden", label: "Aiden" },
          ] },
          { name: "speaker_name", type: "text", label: "Speaker Name", default: "",
          visible_when: "qwen3_variant == 'CustomVoice'" },
          { name: "instruct", type: "textarea", label: "Style Instruction", default: "",
          visible_when: "qwen3_variant != 'Base'" },
          { name: "reference_audio", type: "audio", label: "Reference Audio",
          visible_when: "qwen3_variant != 'VoiceDesign'" },
          { name: "reference_text", type: "text", label: "Reference Transcript", default: "",
          visible_when: "qwen3_variant != 'VoiceDesign'" },
          { name: "prompt", type: "textarea", label: "Text", default: "" },
          { name: "temperature", type: "slider", label: "Temperature", default: 0.8, min: 0.0, max: 2.0, step: 0.05 },
          { name: "top_p", type: "slider", label: "Top-P", default: 0.9, min: 0.0, max: 1.0, step: 0.01 },
          { name: "speed", type: "slider", label: "Speed", default: 1.0, min: 0.5, max: 2.0, step: 0.1 },
          { name: "repetition_penalty", type: "slider", label: "Repetition Penalty", default: 1.05, min: 0.8, max: 2.0, step: 0.01 },
          { name: "seed", type: "seed", label: "Seed", default: -1 },
          ] },
      ],
      features: {
      // Faithful to the REAL backend emission (2026-08-14): qwen3-tts
      // variants are route-composed axes with EMPTY overrides — the talker
      // mode itself (qwen3_variant) is a schema Field (label "Talker Mode"),
      // NOT a variant override. A mock that put qwen3_variant into
      // ``overrides`` would feed the variantOverrideKeys filter and the
      // schema select would never render (the 2026-08-14 catch — the
      // selectKeys exclusion was removed, the grid is the one surface).
      variants: [
      { id: "0.6b", group: "Variant", label: "0.6B", hint: "Merged CustomVoice checkpoint (DEFAULT)", overrides: {}, route: "qwen3-tts-base", engine: "comfyui" },
      { id: "1.7b", group: "Variant", label: "1.7B", hint: "Three 1.7B talker GGUFs (Q8_0)", overrides: {}, route: "qwen3-tts-1-7b", engine: "comfyui" },
      { id: "q8", group: "Quant", label: "Q8", hint: "Q8_0 GGUF — the only quant tier", overrides: {}, route: "qwen3-tts-base", engine: "comfyui", quant: "q8" },
      ],
      variant_groups: {
      Variant: { label: "Variant", tooltip: "Talker mode" },
      Quant: { label: "Quant", tooltip: "Quantization tier" },
          },
          },
    }
    }
    if (model === "qwen-edit-base") {
  return {
        defaults: { preset: "vnccs_repose" },
      fields: [
          { name: "preset", type: "select", label: "Workflow Preset", options: ["vnccs_repose", "blue_mesh"] },
          { name: "prompt", type: "textarea", label: "Prompt" },
          { name: "seed", type: "seed" },
      ],
        schema_groups: [
          { fields: [
            { name: "preset", type: "select", label: "Workflow Preset", default: "vnccs_repose", options: ["vnccs_repose", "blue_mesh"] },
            { name: "prompt", type: "textarea", label: "Prompt", default: "" },
            { name: "seed", type: "seed", default: 1 },
          ] },
      ],
      features: {},
    }
    }
  return {
      defaults:
        model === "flux"
          ? { prompt: "", steps: 30, cfg: 7.5 }
          : { prompt: "", steps: 28, cfg: 4.5 },
      // THE FORM IS THE CARD (2026-08-18): the fixture declares EVERY
      // field the draft carries (prompt, cfg) — real form specs do, and
      // undeclared draft keys no longer render (they ride as transport).
      // sampler is a finite-option field — the spec declares the
      // dropdown's options; 7 options = production scale, so this
      // fixture pins the DROPDOWN branch (small sets render as chip
      // rows now).
      fields: [
        { name: "prompt", type: "textarea" },
        { name: "sampler", type: "select", options: ["euler", "lcm", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_sde", "er_sde", "heun"] },
        { name: "steps", type: "number" },
        { name: "cfg", type: "number" },
      ],
      features: {},
    }
  }
  // Test escape hatch (2026-08-12): force a record for a service
  // (error / violation verdicts). The real store has no direct write —
  // this simulates what loadFormSpec would have recorded.
  const simulated: Record<string, import("../surfaces/shared/specContractStore").SpecContractRecord> = {}
  const loadFormSpec = vi.fn(async (model: string, _opts?: { fresh?: boolean }) => {
    const sim = simulated[model]
    if (sim) {
      records[model] = sim
      return sim
    }
    const spec = await specFor(model)
    const record: import("../surfaces/shared/specContractStore").SpecContractRecord = {
      spec: formSpecStub(spec), state: "loaded", violations: [], error: null,
    }
    records[model] = record
    return record
  })
  // zustand-shaped stub: callable hook + getState. The hook returns the
  // selected slice of the store state; components re-render when the
  // getState().loadFormSpec(...).then handlers set local state (the real
  // store's subscription machinery isn't needed for that path).
  const useSpecContractStore = Object.assign(
    (selector: (s: { records: Record<string, any> }) => any) => selector(stateRef),
    { getState: () => ({ loadFormSpec, records, retryFormSpec: () => {} }) },
  )
  return {
    useSpecContractStore,
    __simulateSpecRecord: (model: string, rec: import("../surfaces/shared/specContractStore").SpecContractRecord) => {
      simulated[model] = rec
      records[model] = rec
    },
    __clearSpecLoadCalls: () => loadFormSpec.mockClear(),
    __resetSpecSimulations: () => {
      for (const k of Object.keys(simulated)) delete simulated[k]
    },
  }
})
// Faithful copies of the real helpers (lib/formSpec.ts) so the card's
// select rendering — which splits value/label via these — works under the
// mock. Plain-string options (value == label) round-trip unchanged.
vi.mock("../lib/formSpec", () => ({
  optionValue: (opt: unknown) => (typeof opt === "string" ? opt : (opt as { value: string }).value),
  optionLabel: (opt: unknown) => (typeof opt === "string" ? opt : (opt as { label: string }).label),
  // Faithful subset of the real evaluator (lib/formSpec.ts) covering the
  // expressions the upscale spec uses: `field == 'value'`, `field != 'value'`,
  // `||` and `&&` composition. Unknown atoms default to visible (true).
  evalVisibleWhen: (expr: string | null | undefined, values: Record<string, unknown>) => {
    if (!expr) return true
    return expr.split("||").map((s) => s.trim()).some((part) =>
      part.split("&&").map((s) => s.trim()).every((atom) => {
        const eq = atom.match(/^(\w+)\s*==\s*'([^']+)'$/)
        if (eq) return values[eq[1]] === eq[2]
        const neq = atom.match(/^(\w+)\s*!=\s*'([^']+)'$/)
        if (neq) return values[neq[1]] !== neq[2]
        return true
      }),
    )
  },
}))

afterEach(() => cleanup())

// Tip-bearing components (CardTile/StatusChip) require the global
// TooltipProvider.
const renderWithTooltip = (el: ReactElement) =>
  render(<TooltipProvider>{el}</TooltipProvider>)

function makeStage(over: Partial<CardStage> = {}): CardStage {
  return {
    id: "s0",
    title: "Generate image",
    subtitle: "krea2",
    kind: "generation",
          service: "krea2",
    params: { prompt: "a waifu" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
    meta: {},
    ...over,
    }
    }
    
// The ONE status vocabulary, pinned at the type level — every member the
// estate renders must stay a CardStatus (adapters map into this, never around it).
const STATUSES: CardStatus[] = ["pending", "running", "done", "error", "stale", "cached", "skipped", "reused"]
describe("StatusChip — the ONE status vocabulary", () => {
  it("covers every card status — NO text for any of them (2026-08-09)", () => {
    expect(STATUSES).toHaveLength(8)
    for (const running of [false, true]) {
      const { container } = renderWithTooltip(<StatusChip running={running} />)
      if (running) {
        // Running = the EXISTING header icon, just spinning — no text, no
        // pill (2026-08-08: "we already have an icon in the top right
        // that can just spin" — that icon IS the signal).
        expect(container.querySelector(".animate-spin")).toBeTruthy()
        expect(container.textContent?.trim()).toBe("")
      } else {
      // NO status text, period ("I DON'T NEED THIS stuff ") — the output
        // image IS done, the error banner IS failed, the re-run label
        // carries stale, a card with no output is pending. The tile's
        // color-coded dot is the quiet signal; text pills are gone.
        expect(container.firstChild).toBeNull()
    }
    cleanup()
    }
})
})

describe("CardTile — THE card (the dense Library rectangle, 1:1 everywhere)", () => {
  it("renders service + title on the dense tile with the order badge", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ title: "Generate image", service: "krea2" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-tile]")).toBeTruthy()
    expect(screen.getByText("krea2")).toBeTruthy()
    expect(screen.getByText("Generate image")).toBeTruthy()
    // Order badge — dense, explicit.
    expect(screen.getByText("01")).toBeTruthy()
})

  it("skipped stages stay visible as tiles (folded bricks aren't hidden)", () => {
    renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "skipped", title: "bake_motion" })}
        running={false}
        index={2}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByText("bake_motion")).toBeTruthy()
})

  it("reused stages with a result render the thumbnail as the tile hero", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "reused",
          result: { assetUrls: ["/reused.png"], artifacts: {}, metadata: { type: "image" } },
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector('img[src="/reused.png"]')).toBeTruthy()
})

  // ── Motion card tile preview (2026-08-10) ──────────────────────────────
  // Motion outputs are NPZ files — not viewable as <img>. The tile must show
  // the captured mesh screenshot (stashed by MotionCardEditor) or a dark
  // motion-genre placeholder — NEVER a broken-image icon from pointing <img>
  // at the .npz URL.
  it("motion card with a captured thumbnail shows it on the tile (not a broken npz img)", () => {
    useMotionThumbStore.getState().setThumbnail("s0", "data:image/png;base64,THUMB123")
    try {
      const { container } = renderWithTooltip(
        <CardTile
          stage={makeStage({
            status: "done",
            genre: "motion",
            service: "kimodo",
            result: {
              assetUrls: ["/motion.npz"],
              artifacts: { motion_npz: "/motion.npz" },
              metadata: {},
            },
          })}
          running={false}
          index={0}
          onOpen={() => {}}
          onRemove={() => {}}
        />,
      )
      // The captured thumbnail IS shown.
      const img = container.querySelector('img[src="data:image/png;base64,THUMB123"]')
      expect(img).toBeTruthy()
      // The NPZ URL is NOT used as an <img> src (would be a broken image).
      expect(container.querySelector('img[src="/motion.npz"]')).toBeFalsy()
    } finally {
      useMotionThumbStore.getState().clearThumbnail("s0")
    }
  })

  it("motion card without a thumbnail shows the placeholder, not a broken npz img", () => {
    useMotionThumbStore.getState().clearThumbnail("s0")
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "done",
          genre: "motion",
          service: "kimodo",
          result: {
            assetUrls: ["/motion.npz"],
            artifacts: { motion_npz: "/motion.npz" },
            metadata: {},
          },
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // No <img> at all — the NPZ URL would be a broken image icon.
    expect(container.querySelector("img")).toBeFalsy()
    // The motion-genre placeholder (Activity icon) IS rendered.
    expect(container.querySelector(".lucide-activity")).toBeTruthy()
  })
})

describe("CardTile submodel badge — variant × quant axes, NEVER duplicated (2026-08-09)", () => {
  afterEach(() => {
    // Restore the benign no-op defaults so the override does not leak into
    // the other CardTile tests in this file.
    vi.mocked(variantLabel).mockReturnValue("")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: undefined, quant: undefined })
    cleanup()
})

  it("shows variant + quant as TWO DIFFERENT axes (Turbo · INT8), not the same axis twice", () => {
    // THE REGRESSION (2026-08-09): the badge read variantLabel ("Turbo")
    // AND activeVariantForRoute().label — which ALSO resolved to the
    // Variant-group entry whose route matches (label "Turbo") — printing
    // "Turbo · Turbo". The fix reads the quant axis from routeCoordinates,
    // so the two parts are always DIFFERENT axes (variant + quant).
    vi.mocked(variantLabel).mockReturnValue("Turbo")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: "turbo", quant: "int8" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const tile = container.querySelector("[data-card-tile]")
    // The badge shows "Turbo · INT8" — variant axis + quant axis.
    expect(tile?.textContent ?? "").toContain("Turbo · INT8")
    // NEVER the same axis twice — the duplicate is structurally impossible
    // now that quant comes from routeCoordinates, not activeVariantForRoute.
    expect(tile?.textContent ?? "").not.toContain("Turbo · Turbo")
})

  it("shows ONLY the variant when no explicit quant coordinate is set (the default tier)", () => {
    // The default krea-2 route (Turbo, implicit INT8) carries no `quant:`
    // field — routeCoordinates returns quant: undefined. The badge must NOT
    // invent a quant label and must NOT duplicate the variant label.
    vi.mocked(variantLabel).mockReturnValue("Turbo")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: "turbo", quant: undefined })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const tile = container.querySelector("[data-card-tile]")
    expect(tile?.textContent ?? "").toContain("Turbo")
    expect(tile?.textContent ?? "").not.toContain("Turbo ·")
})
})

describe("CardTile compact card — the 3 declarative lines (2026-08-09)", () => {
  // The non-zoomed card shows three lines: Card Name (title) / Model, Variant
  // / WIDTH x HEIGHT. Line 3 is DECLARED (familyCardSummary — the same
  // card_summary block pydantic validates server-side); the view never
  // free-codes "if family === 'krea-2' read params.width". These pin the
  // contract end-to-end (the accessor + the CardTile wiring).
  afterEach(() => {
    vi.mocked(familyLabel).mockImplementation((k: string) => k)
    vi.mocked(familyCardSummary).mockReturnValue(null)
    vi.mocked(variantLabel).mockReturnValue("")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: undefined, quant: undefined })
    cleanup()
})

  it("line 2 composes 'Model, Variant' from familyLabel + the variant descriptor", () => {
    vi.mocked(familyLabel).mockReturnValue("Krea 2")
    vi.mocked(variantLabel).mockReturnValue("Turbo")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: "turbo", quant: "q8" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2-turbo-q8" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const tile = container.querySelector("[data-card-tile]")
    // "Model, Variant · QUANT" — the family label, then the two axes.
    expect(tile?.textContent ?? "").toContain("Krea 2, Turbo · Q8")
})

  it("line 2 shows the model ALONE when no variant is set (no trailing comma)", () => {
    vi.mocked(familyLabel).mockReturnValue("Image Edit")
    vi.mocked(variantLabel).mockReturnValue("")
    vi.mocked(routeCoordinates).mockReturnValue({ variant: undefined, quant: undefined })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "qwen-img-edit-2511" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const tile = container.querySelector("[data-card-tile]")
    expect(tile?.textContent ?? "").toContain("Image Edit")
    // No trailing comma / empty variant.
    expect(tile?.textContent ?? "").not.toContain("Image Edit,")
})

  it("line 3 renders 'WIDTH×HEIGHT' from the DECLARED card_summary params", () => {
    vi.mocked(familyCardSummary).mockReturnValue({ width_param: "width", height_param: "height" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2", params: { width: 1024, height: 768 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // The dimension line is driven ENTIRELY by the declaration — which param
    // keys to read. 1024×768 (× is the mult sign, not a lowercase x).
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").toContain("1024×768")
})

  it("line 3 reads WHATEVER params the declaration names (not hardcoded width/height)", () => {
    // A family that declares NON-standard param keys — the view reads them
    // verbatim. Proves the contract is declarative, not free-coded.
    vi.mocked(familyCardSummary).mockReturnValue({ width_param: "target_w", height_param: "target_h" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "novel-fam", params: { target_w: 1536, target_h: 640 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").toContain("1536×640")
})

it("line 3 renders a SINGLE-VALUE size (size_param) for the Enhance / upscale card — SeedVR2 target resolution", () => {
// The Enhance (upscale) families have no W×H pair — SeedVR2 carries a
// target long-edge (resolution). card_summary declares size_param +
// size_suffix; the tile renders "2048px" on the SAME line every other
// generation card carries its dimensions. (2026-08-10.)
vi.mocked(familyCardSummary).mockReturnValue({ size_param: "resolution", size_suffix: "px", width_param: null, height_param: null })
    const { container } = renderWithTooltip(
      <CardTile
      stage={makeStage({ service: "seedvr2_upscale", params: { resolution: 2048 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").toContain("2048px")
})

it("line 3 renders the pixel-SR scale (size_param + '×' suffix) for the Enhance card", () => {
// Pixel-SR's output size is the model's inherent multiplier
// (nominal_scale 4.0) — rendered "4×" with the declared suffix.
vi.mocked(familyCardSummary).mockReturnValue({ size_param: "nominal_scale", size_suffix: "×", width_param: null, height_param: null })
    const { container } = renderWithTooltip(
      <CardTile
      stage={makeStage({ service: "pixel_upscale", params: { nominal_scale: 4.0 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").toContain("4×")
})

  it("NO dimension line when the family declares none (card_summary is null)", () => {
    vi.mocked(familyCardSummary).mockReturnValue(null)
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "detect", params: { width: 512, height: 512 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // params HAS width/height, but the family declares no card_summary → the
    // view must NOT show a dimension line (no free-coded read of width/height).
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").not.toContain("512×512")
})

  it("NO dimension line when a declared param is missing from the stage", () => {
    vi.mocked(familyCardSummary).mockReturnValue({ width_param: "width", height_param: "height" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2", params: { width: 1024 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // height is absent → no partial "1024×" line.
    expect(container.querySelector("[data-card-tile]")?.textContent ?? "").not.toMatch(/1024×/)
})

  it("the run duration sits IN LINE with the dimension line — bottom-right, NOT its own row", () => {
    vi.mocked(familyCardSummary).mockReturnValue({ width_param: "width", height_param: "height" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          service: "krea-2",
          params: { width: 1024, height: 1024 },
          result: { assetUrls: [], artifacts: {}, metadata: { type: "image" }, durationSec: 1.2 } as any,
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const tile = container.querySelector("[data-card-tile]")
    // Both the dimension line + the seconds render.
    expect(tile?.textContent ?? "").toContain("1024×1024")
    expect(tile?.textContent ?? "").toContain("1.2s")
    // AND they share the SAME parent row (the line-3 flex div) — the seconds
    // are bottom-right IN LINE with the last line, not a separate meta row.
    const spans = Array.from(tile?.querySelectorAll("span") ?? [])
    const dimsEl = spans.find(s => s.textContent === "1024×1024")
    const durEl = spans.find(s => s.textContent === "1.2s")
    expect(dimsEl).toBeTruthy()
    expect(durEl).toBeTruthy()
    expect(dimsEl?.parentElement).toBe(durEl?.parentElement)
})

  it("the WIDTH×HEIGHT line is the ONLY param surface — no chips, no duplication", () => {
    // THE BUG (2026-08-09): the user saw BOTH the "1024×1024" line AND
    // "width=1024" / "height=1024" chips, then "seed=42"/"sampler=euler"
    // chips in debug format. The compact card now renders ONLY the declared
    // summary — the dimension line is the sole param surface.
    vi.mocked(familyCardSummary).mockReturnValue({ width_param: "width", height_param: "height" })
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ service: "krea-2", params: { width: 1024, height: 1024, seed: 42, sampler: "euler", steps: 20 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // The dimension line carries the dims — and NOTHING else.
    expect(screen.getByText("1024×1024")).toBeTruthy()
    const text = container.textContent ?? ""
    expect(text).not.toContain("width=1024")
    expect(text).not.toContain("height=1024")
    expect(text).not.toContain("seed=42")
    expect(text).not.toContain("sampler=euler")
    expect(text).not.toContain("steps=20")
})
})

describe("CardTile per-card loading bar — KSampler step progress (2026-08-08)", () => {
  it("renders the step bar + readout while running with progress", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          progress: { value: 5, max: 20, node: "3" },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // The bar's root carries the card id for DOM-contract tests.
    expect(container.querySelector("[data-card-progress='s0']")).toBeTruthy()
    // Step readout + percentage, derived from value/max.
    expect(screen.getByText("step 5/20")).toBeTruthy()
    // 5/20 = 25%.
    expect(screen.getByText("25%")).toBeTruthy()
    // The fill width is driven by the percentage.
    const fill = container.querySelector("[data-card-progress] .h-full") as HTMLElement
    expect(fill.style.width).toBe("25%")
})

  it("clamps a malformed frame to the 0–100% range", () => {
    renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          progress: { value: 99, max: 20 }, // value > max
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    // 99/20 clamps to 100%, never > 100.
    expect(screen.getByText("100%")).toBeTruthy()
})

  it("hides the bar when not running (the resting grid has no bar)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "done",
          // A stale progress frame must not render a bar on a done card.
          progress: { value: 5, max: 20 },
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-progress]")).toBeNull()
})

  it("renders NO bar while running but before the first step frame (no fake animation)", () => {
    // EVER USE THE LOADING BAR TO DO A STATIC ANIMATION. THE BAR ONLY EXISTS
    // TO SHOW PROGRESS." So while running but before ComfyUI's first
    // KSampler step frame lands, there is NO bar — not a shimmer, not a
    // spinner, nothing. A fake indeterminate animation would lie about what
    // is happening. The bar appears the moment a real {value, max} frame
    // arrives from the /ws listener.
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running", progress: null })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-progress]")).toBeNull()
})
})

describe("CardTile activity line — live WS frames on the card (2026-08-10)", () => {
  // The line renders the backend's protocol-sink envelope mapped to the
  // card: the exact user complaint ("model loading shows nothing / steps
  // don't stream") made visible. Every label variant below is the
  // renderer's matrix — error → message only, sampling → value/max,
  // node_class → "phase class", else "phase: message", else bare phase.
  
  it("renders the model-load window: 'loading CheckpointLoaderSimple'", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          activity: { phase: "loading", node: "1", node_class: "CheckpointLoaderSimple" },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("loading CheckpointLoaderSimple")
})

  it("renders live sampling steps: 'sampling 5/20' (value/max, NOT node_class)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          activity: { phase: "sampling", node: "7", node_class: "KSampler", value: 5, max: 20 },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("sampling 5/20")
})

  it("renders 'executing KSampler' for per-node executing frames", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          activity: { phase: "executing", node: "5", node_class: "KSampler" },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("executing KSampler")
})

  it("renders the error MESSAGE for error-phase activity (no phase prefix, destructive)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          activity: { phase: "error", message: "exception_message from ComfyUI" },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("exception_message from ComfyUI")
    // The error is NEVER styled as progress — destructive red.
    expect(line.className).toContain("text-destructive")
})

  it("renders 'waiting: <message>' for a stalled socket (no node_class)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "running",
          activity: { phase: "waiting", message: "waiting for ComfyUI frames" },
        })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("waiting: waiting for ComfyUI frames")
})

  it("renders the bare phase when nothing else is present", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running", activity: { phase: "output" } })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("output")
})

  it("hides the line when not running (the resting grid shows no activity)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "done",
          // A stale activity frame must not render on a done card.
          activity: { phase: "loading", node_class: "CheckpointLoaderSimple" },
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-activity]")).toBeNull()
})

  it("renders NO line while running but before the first WS frame (no fake text)", () => {
    // Same no-lie contract as the progress bar: no frame → no line. A
    // static "loading…" placeholder would pretend to know what the model
    // is doing; the line appears the moment a real frame lands.
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running", activity: null })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-card-activity]")).toBeNull()
})

  it("surfaces the run error text on a failed card (data-card-error)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          status: "error",
          error: "KSampler failed: exception_message from ComfyUI",
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const err = container.querySelector("[data-card-error='s0']")!
    expect(err.textContent).toBe("KSampler failed: exception_message from ComfyUI")
})
})

describe("CardDetailInline — live ComfyUI activity + loading bar in the zoom (2026-08-14)", () => {
  // The per-card loading bar + activity line are NOT a tile-only feature:
  // the zoomed drilldown renders the SAME shared pieces (the user's exact
  // report — "when the action cards are zoomed in, I thought there was a
  // comfyui connection with the loading bar in place. But I don't see it
  // at all"). These pin the drilldown to the identical no-lie contract.

  it("renders the activity line + step progress bar in the detail while running", () => {
    const { container } = renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          status: "running",
          progress: { value: 5, max: 20, node: "3" },
          activity: { phase: "sampling", node: "3", node_class: "KSampler", value: 5, max: 20 },
        })}
        upstreams={[]}
        running
        actions={{}}
      />,
    )
    // The live-run strip + the SAME data-card-progress / data-card-activity
    // DOM anchors the tile carries — one card kit, one vocabulary.
    expect(container.querySelector("[data-card-live-strip]")).toBeTruthy()
    expect(container.querySelector("[data-card-progress='s0']")).toBeTruthy()
    expect(screen.getByText("step 5/20")).toBeTruthy()
    expect(screen.getByText("25%")).toBeTruthy()
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("sampling 5/20")
  })

  it("shows the model-load window in the zoom: 'loading CheckpointLoaderSimple'", () => {
    const { container } = renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          status: "running",
          activity: { phase: "loading", node: "1", node_class: "CheckpointLoaderSimple" },
        })}
        upstreams={[]}
        running
        actions={{}}
      />,
    )
    const line = container.querySelector("[data-card-activity='s0']")!
    expect(line.textContent).toBe("loading CheckpointLoaderSimple")
    // Model loading has no step frame yet — NO bar (no fake progress).
    expect(container.querySelector("[data-card-progress]")).toBeNull()
  })

  it("renders NO strip in the detail when not running (same no-lie contract)", () => {
    const { container } = renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          status: "done",
          progress: { value: 5, max: 20 },
          activity: { phase: "loading", node_class: "CheckpointLoaderSimple" },
        })}
        upstreams={[]}
        running={false}
        actions={{}}
      />,
    )
    expect(container.querySelector("[data-card-live-strip]")).toBeNull()
    expect(container.querySelector("[data-card-progress]")).toBeNull()
    expect(container.querySelector("[data-card-activity]")).toBeNull()
  })

  it("renders NO strip while running but before the first WS frame (no fake text)", () => {
    const { container } = renderWithTooltip(
      <CardDetailInline
        stage={makeStage({ status: "running", progress: null, activity: null })}
        upstreams={[]}
        running
        actions={{}}
      />,
    )
    expect(container.querySelector("[data-card-live-strip]")).toBeNull()
    expect(container.querySelector("[data-card-progress]")).toBeNull()
    expect(container.querySelector("[data-card-activity]")).toBeNull()
  })
})

describe("CardTile wiring chip — store-free upstream title", () => {
  it("shows the upstream stage's title on the tile", () => {
    renderWithTooltip(
      <CardTile
        stage={makeStage({ inputs: ["s1"] })}
        running={false}
        index={1}
        upstreamTitle="First"
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.getByText("First")).toBeTruthy()
})

  it("hides the chip when the stage has no upstream", () => {
    renderWithTooltip(
      <CardTile
        stage={makeStage({})}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(screen.queryByText("First")).toBeNull()
})
})

describe("CardDetailInline motion picker — the inline expand (no modal)", () => {
  it("switches the hero to the selected motion preview", () => {
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          status: "done",
          result: {
            assetUrls: ["/main.png"],
            artifacts: {},
            metadata: { type: "image" },
            motionPreviews: [{ label: "M1 walk", url: "/m1.glb", artifact: "m1" }],
          },
        })}
        upstreams={[]}
        running={false}
        actions={{}}
      />,
    )
    // The picker offers the main output + each baked motion.
    expect(screen.getByText("Main output")).toBeTruthy()
    fireEvent.click(screen.getByText("M1 walk"))
    // The hero now renders the motion preview — a GLB URL renders the 3D
    // placeholder whose caption is the GLB's filename.
    expect(screen.getByText("m1.glb")).toBeTruthy()
})

  it("switching back to Main output restores the primary asset", () => {
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          status: "done",
          result: {
            assetUrls: ["/main.png"],
            artifacts: {},
            metadata: { type: "image" },
            motionPreviews: [{ label: "M2", url: "/m2.glb", artifact: "m2" }],
          },
        })}
        upstreams={[]}
        running={false}
        actions={{}}
      />,
    )
    fireEvent.click(screen.getByText("M2"))
    expect(screen.getByText("m2.glb")).toBeTruthy()
    
    fireEvent.click(screen.getByText("Main output"))
    expect(screen.queryByText("m2.glb")).toBeNull()
    expect(document.querySelector('img[src="/main.png"]')).toBeTruthy()
})
})

describe("studio-link double-click — the open-in-studio path", () => {
  it("double-clicking the detail body fires onOpenInStudio with the stage id", () => {
    const onOpenInStudio = vi.fn()
    const { container } = renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          id: "kim0",
          kind: "studio-link",
          title: "Open Kimodo studio",
    status: "pending",
        })}
        upstreams={[]}
        running={false}
        actions={{ onOpenInStudio }}
      />,
    )
    // The hint is visible when there's no result to preview.
    expect(screen.getByText("Double-click to open in studio")).toBeTruthy()
    fireEvent.doubleClick(container.querySelector("[data-card-detail]")!)
    expect(onOpenInStudio).toHaveBeenCalledWith("kim0")
})
})

describe("kind='preview' — the read-only card detail", () => {
  it("never renders Run or Edit buttons, even with actions wired", () => {
    renderWithTooltip(
      <CardDetailInline
        stage={makeStage({
          kind: "preview",
          status: "done",
          result: { assetUrls: ["data:image/png;base64,AAAA"], artifacts: {}, metadata: { type: "image" } },
        })}
        upstreams={[]}
        running={false}
        actions={{ onRun: vi.fn(), onEdit: vi.fn() }}
      />,
    )
    expect(screen.queryByText("Run")).toBeNull()
    expect(screen.queryByText("Edit")).toBeNull()
    // But the result IS the detail's hero (media-forward).
    expect(document.querySelector('img[src="data:image/png;base64,AAAA"]')).toBeTruthy()
})
})

describe("CardTile — NO param chips on the compact card (2026-08-09)", () => {
  // THE BUG: the tile rendered the first 2 non-skipped params as
  // "key=value" chips (Object.entries order → "randomly" seed & sampler,
  // in debug-print format — not the card's declared line format). The card
  // contract is EXACTLY the declared summary: Card Name / Model, Variant /
  // W×H (+ duration inline). No param knobs — ever. (prompt/seed/sampler/
  // steps/cfg/… all live in the expand; nothing free-coded.)
  it("renders NO param chips — seed/sampler/steps/cfg never leak as key=value", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({
          params: {
            model: "qwen-image-edit-int8",
            negative_prompt: "deformed",
            input_image: "https://long-url/input.png",
            end_image: "https://long-url/end.png",
            prompt: "a waifu",
            seed: 42,
            sampler: "euler",
            steps: 28,
            cfg: 4.5,
          },
        })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    const text = container.textContent ?? ""
    // The user-facing lines still render (title + model/variant).
    expect(text).toContain("Generate image")
    // No param knob appears as a chip — in ANY format.
    expect(text).not.toContain("seed=42")
    expect(text).not.toContain("sampler=euler")
    expect(text).not.toContain("steps=28")
    expect(text).not.toContain("cfg=4.5")
    // And the skipped internals stay hidden as before.
    expect(text).not.toContain("qwen-image-edit-int8")
    expect(text).not.toContain("deformed")
    expect(text).not.toContain("long-url")
    expect(text).not.toContain("a waifu")
})
})

describe("CardTile play button — run / reroll from the collapsed tile (2026-08-07)", () => {
  // The policy: "cards need to have a small play button on them, even
  // when they are collapsed". The affordance runs/re-runs the stage WITHOUT
  // expanding the card; click-to-expand stays for preview/zoom. Visibility
  // is exact: pending/error always (start/retry), done-family ONLY with
  // seed=-1 (random mode — a fixed seed is a deceptive no-op), never while
  // running, never on skipped.
  
  it("tilePlayAffordance: covers every status with the exact visibility rule", () => {
    // pending/error: always afford (start / retry)
    expect(tilePlayAffordance(makeStage({ status: "pending" }), false)).toEqual({
      verb: "Start", icon: "play",
})
    expect(tilePlayAffordance(makeStage({ status: "error" }), false)).toEqual({
      verb: "Retry", icon: "reroll",
})
    // done-family: random-seed only. seed=-1 → reroll; any other value or
    // absent → null (a fixed seed reproduces identical bytes — no-op).
    expect(tilePlayAffordance(makeStage({ status: "done", params: { seed: -1 } }), false)).toEqual({
      verb: "Reroll", icon: "reroll",
})
    expect(tilePlayAffordance(makeStage({ status: "done", params: { seed: 42 } }), false)).toBeNull()
    expect(tilePlayAffordance(makeStage({ status: "done", params: {} }), false)).toBeNull()
    // stale / cached / reused follow the same seed rule as done.
    expect(tilePlayAffordance(makeStage({ status: "stale", params: { seed: -1 } }), false)).toBeTruthy()
    expect(tilePlayAffordance(makeStage({ status: "cached", params: { seed: 1 } }), false)).toBeNull()
    // running: never (already going). skipped: never (no work).
    expect(tilePlayAffordance(makeStage({ status: "done", params: { seed: -1 } }), true)).toBeNull()
    expect(tilePlayAffordance(makeStage({ status: "skipped" }), false)).toBeNull()
})

  it("renders a Start affordance on a pending card and fires onRun without expanding", () => {
    const onRun = vi.fn()
    const onOpen = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "pending" })}
        running={false}
        index={0}
        onOpen={onOpen}
        onRemove={() => {}}
        onRun={onRun}
      />,
    )
    const play = container.querySelector('[data-tile-play="start"]') as HTMLButtonElement
    expect(play, "pending card must show a Start affordance").toBeTruthy()
    fireEvent.click(play)
    expect(onRun).toHaveBeenCalledTimes(1)
    // stopPropagation: clicking play does NOT open the inline detail.
    expect(onOpen).not.toHaveBeenCalled()
})

  // ── Tile-level STOP (2026-08-13): play becomes stop while running ──────
  it("renders a Stop affordance on a running card and fires onCancel without expanding", () => {
    const onCancel = vi.fn()
    const onRun = vi.fn()
    const onOpen = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running" })}
        running={true}
        index={0}
        onOpen={onOpen}
        onRemove={() => {}}
        onRun={onRun}
        onCancel={onCancel}
      />,
    )
    // The play affordance is null while running (tilePlayAffordance) —
    // no start/retry/reroll button. The STOP button takes its corner.
    expect(container.querySelector("[data-tile-play]")).toBeNull()
    const stop = container.querySelector('[data-tile-stop="cancel"]') as HTMLButtonElement
    expect(stop, "running card must show a Stop affordance").toBeTruthy()
    fireEvent.click(stop)
    expect(onCancel).toHaveBeenCalledTimes(1)
    // stopPropagation: clicking stop does NOT open the inline detail.
    expect(onOpen).not.toHaveBeenCalled()
    // And it does NOT fire onRun (a cancel is not a run).
    expect(onRun).not.toHaveBeenCalled()
  })

  it("does not render a Stop affordance when onCancel is not wired (store-less surfaces)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running" })}
        running={true}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onRun={() => {}}
      // onCancel intentionally omitted — surfaces that don't wire cancel
      // (e.g. a read-only preview) never show the stop button.
      />,
    )
    expect(container.querySelector("[data-tile-stop]")).toBeNull()
  })

  it("renders a Retry affordance on an error card", () => {
    const onRun = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "error" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onRun={onRun}
      />,
    )
    const play = container.querySelector('[data-tile-play="retry"]') as HTMLButtonElement
    expect(play, "error card must show a Retry affordance").toBeTruthy()
    fireEvent.click(play)
    expect(onRun).toHaveBeenCalledTimes(1)
})

  it("renders a Reroll affordance on a done card with seed=-1 (random mode)", () => {
    const onRun = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "done", params: { seed: -1 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onRun={onRun}
      />,
    )
    const play = container.querySelector('[data-tile-play="reroll"]') as HTMLButtonElement
    expect(play, "done + seed=-1 must show a Reroll affordance").toBeTruthy()
    fireEvent.click(play)
    expect(onRun).toHaveBeenCalledTimes(1)
})

  it("hides the affordance on a done card with a FIXED seed (no deceptive no-op)", () => {
    const onRun = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "done", params: { seed: 42 } })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onRun={onRun}
      />,
    )
    expect(container.querySelector("[data-tile-play]")).toBeNull()
})

  it("hides the affordance while the stage is running", () => {
    const onRun = vi.fn()
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "running", params: { seed: -1 } })}
        running
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
        onRun={onRun}
      />,
    )
    expect(container.querySelector("[data-tile-play]")).toBeNull()
})

  it("hides the affordance when onRun is not wired (no action = no button)", () => {
    const { container } = renderWithTooltip(
      <CardTile
        stage={makeStage({ status: "pending" })}
        running={false}
        index={0}
        onOpen={() => {}}
        onRemove={() => {}}
      />,
    )
    expect(container.querySelector("[data-tile-play]")).toBeNull()
})

  it("FlowTileGrid threads actions.onRun to each compact tile", () => {
    const onRun = vi.fn()
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "p", status: "pending", title: "Pending" }),
          makeStage({ id: "f", status: "done", params: { seed: 42 }, title: "Fixed" }),
          makeStage({ id: "r", status: "done", params: { seed: -1 }, title: "Random" }),
        ]}
        runningStageId={null}
        actions={{ onRun }}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId={null}
        onFocusStageId={() => {}}
      />,
    )
    // Pending shows Start, Fixed-seed done hides, Random-seed done shows Reroll.
    expect(container.querySelector('[data-card-wrap="p"] [data-tile-play="start"]')).toBeTruthy()
    expect(container.querySelector('[data-card-wrap="f"] [data-tile-play]')).toBeNull()
    expect(container.querySelector('[data-card-wrap="r"] [data-tile-play="reroll"]')).toBeTruthy()
    // Clicking the random-seed tile's button calls onRun with THAT stage id
    // (not the focused card's, not the first one).
    fireEvent.click(container.querySelector('[data-card-wrap="r"] [data-tile-play="reroll"]')!)
    expect(onRun).toHaveBeenCalledWith("r")
})
})

describe("FlowTileGrid — the ONE card surface (Library + Agent, 1:1)", () => {
  it("renders every stage as a compact tile", () => {
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "a", title: "Gen A" }),
          makeStage({ id: "b", title: "Gen B" }),
        ]}
        runningStageId={null}
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId={null}
        onFocusStageId={() => {}}
      />,
    )
    expect(container.querySelectorAll("[data-card-tile]").length).toBe(2)
    expect(container.querySelector("[data-card-detail]")).toBeNull()
})

  it("ZOOM OVERLAY: focusing a card opens a sole-focus overlay — the resting grid stays uniform behind it", async () => {
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "a", title: "Gen A", params: { prompt: "x", seed: 1 } }),
          makeStage({ id: "b", title: "Gen B", params: { prompt: "y", seed: 2 } }),
        ]}
        runningStageId={null}
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId="a"
        onFocusStageId={() => {}}
      />,
    )
    // OTHER CARDS SHOULD GO AWAY. CHAT INPUT SHOULD GO AWAY. THE ONLY THING
    // SHOULD BE THE ONE DRILLDOWN CARD." The focused card opens as a portaled
    // absolute inset-0 overlay whose solid backdrop covers the grid + chat +
    // input; the single detail card is centered on top.
    const overlay = document.body.querySelector("[data-card-zoom-overlay]")
    expect(overlay, "the zoom overlay mounts in the document body").toBeTruthy()
    const expanded = overlay!.querySelector("[data-card-expanded]")
    expect(expanded).toBeTruthy()
    // The box holds the SKELETON during the shared-element morph; the real
    // detail (title + fiddle params) swaps in when the morph settles
    // (data-card-ready) — the skeleton phase is part of the contract.
    expect(expanded!.querySelector("[data-card-skeleton]"), "the skeleton holds the box during the grow").toBeTruthy()
    await waitFor(() => {
      expect(overlay!.querySelector("[data-card-detail] h3")?.textContent).toBe("Gen A")
    }, { timeout: 3000 })
    // The detail body carries the focused card's params (the fiddle surface).
    expect(overlay!.querySelector("[data-card-detail]")?.textContent).toContain("seed")
    // The resting grid never re-flows: every wrapper stays at its 200px
    // resting basis (no in-place growth, no sibling shrink — the old
    // flex-basis expansion that janked is dead).
    const a = container.querySelector('[data-card-wrap="a"]') as HTMLElement
    const b = container.querySelector('[data-card-wrap="b"]') as HTMLElement
    expect(a.style.flexBasis).toBe("200px")
    expect(b.style.flexBasis).toBe("200px")
    // Both tiles stay mounted behind the solid backdrop (the grid is not
    // unmounted or hidden — it's covered). opacity 1, not aria-hidden.
    expect(container.querySelectorAll("[data-card-tile]").length).toBe(2)
    expect(b.style.opacity).not.toBe("0")
    expect(b.getAttribute("aria-hidden")).toBeNull()
})

it("Escape collapses back to all-compact tiles", async () => {
    const onFocus = vi.fn()
    renderWithTooltip(
      <FlowTileGrid
        stages={[makeStage({ id: "a", title: "Gen A" })]}
        runningStageId={null}
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId="a"
        onFocusStageId={onFocus}
      />,
    )
    fireEvent.keyDown(window, { key: "Escape" })
    // Close is rAF-deferred (armClose: the join frame must project the card
    // back into its tile before the exit morph) — wait for the collapse.
    await waitFor(() => expect(onFocus).toHaveBeenCalledWith(null))
})

  it("sorts: every compact tile is a dnd-kit sortable handle (drag order = flow order)", () => {
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "a", title: "Gen A" }),
          makeStage({ id: "b", title: "Gen B" }),
        ]}
        runningStageId={null}
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId={null}
        onFocusStageId={() => {}}
      />,
    )
    // The whole compact tile carries the sortable wiring + the affordance.
    // (jsdom cannot simulate pointer drags — the drop contract is proven at
    // the store level + the physical drag in the e2e spec.)
    expect(container.querySelectorAll('[aria-roledescription="sortable"]').length).toBe(2)
    expect(container.querySelector('[data-card-wrap="a"] [aria-label="Drag to reorder · click to expand"]')).toBeTruthy()
    expect(container.querySelector('[data-card-wrap="a"] [aria-roledescription="sortable"]')?.className).toContain("cursor-grab")
})

  it("locks reordering while a stage is executing — no sortable semantics, no grab", () => {
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "a", title: "Gen A", status: "running" }),
          makeStage({ id: "b", title: "Gen B" }),
        ]}
        runningStageId="a"
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId={null}
        onFocusStageId={() => {}}
      />,
    )
    // A mid-run drag would desync the in-flight execution — the handle is
    // stripped entirely (both the "running" stage and its siblings).
    expect(container.querySelectorAll('[aria-roledescription="sortable"]').length).toBe(0)
    expect(container.querySelector('[data-card-wrap="b"] [aria-label="Flow is running — reorder locked"]')).toBeTruthy()
    expect(container.querySelector('[data-card-wrap="b"] [aria-roledescription="sortable"]')).toBeNull()
})

  it("the zoom overlay detail is never a drag handle — the resting grid stays sortable behind it", () => {
    const { container } = renderWithTooltip(
      <FlowTileGrid
        stages={[
          makeStage({ id: "a", title: "Gen A", params: { prompt: "x", seed: 1 } }),
          makeStage({ id: "b", title: "Gen B", params: { prompt: "y", seed: 2 } }),
        ]}
        runningStageId={null}
        actions={{}}
        onRemove={() => {}}
        onReorderRange={() => {}}
        focusStageId="a"
        onFocusStageId={() => {}}
      />,
    )
    // The resting grid stays fully sortable behind the overlay — every tile
    // keeps its drag handle (the zoom is a separate portaled layer; it does
    // not touch the grid's dnd-kit wiring). Both wrappers carry the handle.
    expect(container.querySelectorAll('[aria-roledescription="sortable"]').length).toBe(2)
    // The overlay's detail card is never a drag handle (drags would fight
    // its controls); it lives in a portal OUTSIDE the SortableContext.
    expect(document.body.querySelector('[data-card-expanded] [aria-roledescription="sortable"]')).toBeNull()
    expect(container.querySelector('[data-card-wrap="b"] [aria-roledescription="sortable"]')).toBeTruthy()
})
})

describe("ParamEditor model swap — the new model's defaults load (2026-08-07)", () => {
  it("switching the model re-seeds numeric fields from the new form-spec defaults", async () => {
    const { container } = renderWithTooltip(
      <ParamEditor
        stage={makeStage({
          service: "krea2",
          params: { prompt: "a waifu", steps: 28, cfg: 4.5 },
        })}
        onSave={() => {}}
      />,
    )
    // Wait for the model list (loadCatalog promise). Scoped by name: a
    // spec-driven sampler combobox (finite-option field) can render in the
    // same commit once the form-spec resolves — "combobox" alone is no
    // longer unique on a loaded card.
    const modelBox = (await screen.findByRole("combobox", { name: "Model" })) as HTMLElement
    // Krea 2's defaults are on screen.
    expect((screen.getByLabelText("steps") as HTMLInputElement).value).toBe("28")

    // Switch to Flux → its defaults (30 / 7.5) replace Krea 2's (28 / 4.5).
    fireEvent.click(modelBox)
    const modelList = await screen.findByRole("listbox")
    const fluxOpt = within(modelList).getByRole("option", { name: "flux" })
    fireEvent.pointerDown(fluxOpt)
    fireEvent.click(fluxOpt)
    await waitFor(() => {
      expect((screen.getByLabelText("steps") as HTMLInputElement).value).toBe("30")
})
    expect((screen.getByLabelText("cfg") as HTMLInputElement).value).toBe("7.5")
    // The user's prompt survives the swap (user-authored text is preserved).
    expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe("a waifu")
    expect(container.querySelector("[data-card-tile]")).toBeNull()
})
})

describe("ParamEditor finite-option fields — dropdowns from the spec, never free text (2026-08-07)", () => {
  it("sampler renders as a <select> carrying the spec's options, not a text input", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({
          params: { prompt: "a waifu", sampler: "euler", steps: 28 },
        })}
        onSave={() => {}}
      />,
    )
    // The spec resolves after mount — wait for the combobox itself (the
    // pre-spec fallback renders a text input with the same label).
    const samplerBox = (await screen.findByRole("combobox", { name: "sampler" })) as HTMLElement
    expect(samplerBox.getAttribute("role")).toBe("combobox")
    fireEvent.click(samplerBox)
    const samplerList = await screen.findByRole("listbox")
    const samplerOpts = within(samplerList).getAllByRole("option").map((o) => o.textContent ?? "")
    expect(samplerOpts).toEqual(["euler", "lcm", "dpmpp_2m", "dpmpp_2m_sde", "dpmpp_sde", "er_sde", "heun"])
    expect(samplerBox.textContent ?? "").toContain("euler")
    // No free-text input for a finite-option field.
    expect(screen.queryByLabelText("sampler", { selector: "input[type=text]" })).toBeNull()

    // Choosing another finite option updates the draft.
    const lcmOpt = within(samplerList).getByRole("option", { name: "lcm" })
    fireEvent.pointerDown(lcmOpt)
    fireEvent.click(lcmOpt)
    await waitFor(async () => {
      const box = await screen.findByRole("combobox", { name: "sampler" })
      expect(box.textContent ?? "").toContain("lcm")
    })
})
})

// ── Small option sets — CHIP ROWS (2026-08-18) ─────────────────────────────
// "I don't SEE presets ANYWHERE": a finite choice set small enough to take
// in at a glance renders as chips ON the card — int8's lone "Blue Mesh
// SOTA" was a CLOSED one-option dropdown that read as a hardcoded label.
// The rule is generic and count-driven (≤5 options); the options are the
// route's YAML presets (the filesystem IS the option list).
describe("ParamEditor small option sets — chip rows, choices visible on the card (2026-08-18)", () => {
  it("a ≤5-option select renders as aria-pressed chips — every choice visible, no closed dropdown", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({
          service: "qwen-edit-base",
          params: { prompt: "", seed: 1, preset: "blue_mesh" },
        })}
        onSave={() => {}}
      />,
    )
    // Both recipe chips render as buttons; the active one is pressed.
    const blueChip = await screen.findByRole("button", { name: "blue_mesh" })
    const vnccsChip = screen.getByRole("button", { name: "vnccs_repose" })
    expect(blueChip.getAttribute("aria-pressed")).toBe("true")
    expect(vnccsChip.getAttribute("aria-pressed")).toBe("false")
    // No closed dropdown for a 2-option field.
    expect(screen.queryByLabelText("Workflow Preset", { selector: "select" })).toBeNull()
    // No free-text input either.
    expect(screen.queryByRole("textbox", { name: /workflow.?preset/i })).toBeNull()
    // Clicking the other chip routes through the same select-change
    // contract (handleSelectChange → recipe fill).
    fireEvent.click(vnccsChip)
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "vnccs_repose" }).getAttribute("aria-pressed")).toBe("true")
    })
  })
})

// ── The Enhance-card detailer (2026-08-08) ─────────────────────────────────
// The upscale card's TWO-TIER matrix (2026-08-08): mode (upscale |
// inpaint, STATIC options) + inpaint_region sub-select (free | body |
// face | hands) — "Body, hands, face are SUB MODES of the inpaint mode".
// schema_groups visible_when gates the region select on mode=inpaint,
// the mask+prompt on region=free, and the YOLO detail knobs on
// region != free. These tests pin the contract that was missing: mode
// seeded in the bag → the selects render; picking inpaint seeds
// region=free + the input_mask slot; picking an auto-detected region
// seeds its knobs from the SCHEMA field defaults (the catalog defaults
// no longer carry them).
describe("ParamEditor — the upscale two-tier matrix: mode + inpaint_region (2026-08-08)", () => {
  const upscaleStage = (params: Record<string, unknown>): CardStage => ({
    id: "s1",
    title: "Upscale Image",
    kind: "generation",
          service: "seedvr2_ema",
    params,
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
})

  it("renders the static mode select when mode is in the bag; region gated off in upscale", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={() => {}}
      />,
    )
    // Small option sets render as a CHIP ROW (2026-08-18) — the choices
    // are visible ON the card, no closed dropdown.
    const upChip = await screen.findByRole("button", { name: "upscale" })
    const inpaintChip = screen.getByRole("button", { name: "inpaint" })
    // STATIC two-tier options — the dynamic resolver is gone.
    expect(upChip.getAttribute("aria-pressed")).toBe("true")
    expect(inpaintChip.getAttribute("aria-pressed")).toBe("false")
    // The region SUB-select row is gated off by visible_when (mode=upscale)
    // — not rendered at all (its "free" chip is absent).
    expect(screen.queryByRole("button", { name: "Free Mask" })).toBeNull()
})

  it("hides the prompt + detail knobs in upscale mode (two-tier visible_when)", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={() => {}}
      />,
    )
    // Spec loaded (the mode chips prove it) → the gated fields are hidden.
    await screen.findByRole("button", { name: "upscale" })
    expect(screen.queryByLabelText("Prompt")).toBeNull()
    expect(screen.queryByLabelText("detection threshold")).toBeNull()
    expect(screen.queryByLabelText("input mask")).toBeNull()
})

  it("selecting Inpaint seeds region=free + the input_mask slot; prompt visible under free", async () => {
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={(p) => { saved = p }}
      />,
    )
    fireEvent.click(await screen.findByRole("button", { name: "inpaint" }))
    // Region chips become visible, defaulted to free.
    const freeChip = await screen.findByRole("button", { name: "Free Mask" })
    expect(freeChip).toBeTruthy()
    expect(freeChip.getAttribute("aria-pressed")).toBe("true")
    // Free-mask inpaint: the prompt is visible (region=free) and the mask
    // slot is seeded into the draft.
    expect((await screen.findByLabelText("Prompt")) as HTMLTextAreaElement).toBeTruthy()
    // Auto-save fires on a 300ms debounce — waitFor catches it.
    await waitFor(() => expect(saved?.mode).toBe("inpaint"))
    expect(saved?.inpaint_region).toBe("free")
    expect(saved?.input_mask).toBeNull()
})

  it("selecting an auto-detected region seeds the detail knobs from the SCHEMA defaults", async () => {
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={(p) => { saved = p }}
      />,
    )
    fireEvent.click(await screen.findByRole("button", { name: "inpaint" }))
    fireEvent.click(await screen.findByRole("button", { name: "Face" }))
    // The knob appears (schema default seeded) and the prompt stays hidden.
    expect((await screen.findByLabelText("detection threshold")) as HTMLInputElement).toBeTruthy()
    expect(screen.queryByLabelText("Prompt")).toBeNull()
    await waitFor(() => expect(saved?.mode).toBe("inpaint"))
    expect(saved?.inpaint_region).toBe("face")
    expect(saved?.detection_threshold).toBe(0.35)
    expect(saved?.denoise).toBe(0.4)
    expect(saved?.input_mask).toBeUndefined()
})

  it("switching back to Free Mask drops the detail knobs and keeps the mask", async () => {
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={(p) => { saved = p }}
      />,
    )
    fireEvent.click(await screen.findByRole("button", { name: "inpaint" }))
    fireEvent.click(await screen.findByRole("button", { name: "Body" }))
    await screen.findByLabelText("detection threshold")
    // Back to free: the YOLO knobs are dropped (CONTRACT forbids them
    // under region=free), the mask slot is seeded again.
    fireEvent.click(screen.getByRole("button", { name: "Free Mask" }))
    expect(screen.queryByLabelText("detection threshold")).toBeNull()
    expect((await screen.findByLabelText("Prompt")) as HTMLTextAreaElement).toBeTruthy()
    await waitFor(() => expect(saved?.inpaint_region).toBe("free"))
    expect(saved?.input_mask).toBeNull()
    expect(saved?.detection_threshold).toBeUndefined()
    expect(saved?.denoise).toBeUndefined()
})

  it("switching mode back to Upscale drops the whole inpaint vocabulary", async () => {
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        stage={upscaleStage({
          mode: "upscale", batch_size: 5, resolution: 2048, input_image: null,
        })}
        onSave={(p) => { saved = p }}
      />,
    )
    fireEvent.click(await screen.findByRole("button", { name: "inpaint" }))
    fireEvent.click(await screen.findByRole("button", { name: "Body" }))
    await screen.findByLabelText("detection threshold")
    fireEvent.click(screen.getByRole("button", { name: "upscale" }))
    expect(screen.queryByRole("button", { name: "Free Mask" })).toBeNull()
    expect(screen.queryByLabelText("Prompt")).toBeNull()
    await waitFor(() => expect(saved?.mode).toBe("upscale"))
    expect(saved?.inpaint_region).toBeUndefined()
    expect(saved?.input_mask).toBeUndefined()
})
})

// ── Declared field order (2026-08-15) ──────────────────────────────────────
//
// Regression guard for the inpaint card's mode discriminator rendering at
// the BOTTOM of the form. The editor's render buckets (numbers → selects)
// used to follow the DRAFT's key-insertion order — catalog `defaults:` YAML
// order, then schema-fill appends — so a discriminator that entered the bag
// late (or only via the schema-fill append) rendered BELOW the sampler knobs
// it gates. The fix: the body is ONE sequential flow in DECLARED order
// (Object.keys(specFields) — the form-spec's flat fields list, which the
// backend emits groups-sorted-by-order / fields-sorted-by-order), with
// undeclared draft keys trailing. The mock below mirrors the real inpaint
// shape: `mode` declared FIRST, the generation knobs after — while the bag
// deliberately carries mode LAST (the worst-case insertion accident). The
// discriminator must still render FIRST among the selects.
describe("ParamEditor field order — declared schema order, not draft-insertion accident (2026-08-15)", () => {
  it("renders the mode discriminator before the sampler selects even when the bag carries it last", async () => {
    // The spec mirrors builders/inpaint.py's generation group + the mode
    // field the family declares first: mode (select, 4 modes) → the
    // knobs → refine_denoise (gated on refine) → sampler/scheduler.
    __simulateSpecRecord("flux-inpaint", {
      state: "loaded",
      violations: [],
      error: null,
      spec: {
        defaults: { steps: 28, cfg: 4.5, guidance: 3.5, seed: -1, sampler_name: "dpmpp_2m", scheduler: "karras", mode: "replace" },
        fields: [
          { name: "mode", type: "select", label: "What do you want to do?", options: [
            { value: "refine", label: "Refine what's there" },
            { value: "replace", label: "Replace the masked area" },
            { value: "extend", label: "Extend the canvas" },
            { value: "remove", label: "Remove an object" },
          ] },
          { name: "prompt", type: "textarea" },
          { name: "steps", type: "number", label: "Steps" },
          { name: "cfg", type: "number", label: "Cfg" },
          { name: "guidance", type: "number", label: "Guidance" },
          { name: "seed", type: "seed", label: "Seed" },
          { name: "refine_denoise", type: "number", label: "Refine Denoise" },
          { name: "sampler_name", type: "select", label: "Sampler", options: ["dpmpp_2m", "euler"] },
          { name: "scheduler", type: "select", label: "Scheduler", options: ["karras", "normal"] },
        ],
        schema_groups: [
          { fields: [
            { name: "mode", type: "select", label: "What do you want to do?", default: "replace" },
            { name: "prompt", type: "textarea", default: "" },
            { name: "steps", default: 28 },
            { name: "cfg", default: 4.5 },
            { name: "guidance", default: 3.5 },
            { name: "seed", default: -1 },
            { name: "refine_denoise", default: 0.4, visible_when: "mode == 'refine'" },
            { name: "sampler_name", type: "select", label: "Sampler", default: "dpmpp_2m" },
            { name: "scheduler", type: "select", label: "Scheduler", default: "karras" },
          ] },
        ],
        features: {},
      } as never,
    })
    // The bag carries mode LAST — the exact accident the fix targets (the
    // discriminator appended after every catalog default / schema fill).
    const stage: CardStage = {
      id: "s1",
      title: "Inpaint",
      kind: "generation",
      service: "flux-inpaint",
      params: { steps: 28, cfg: 4.5, guidance: 3.5, seed: -1, sampler_name: "dpmpp_2m", scheduler: "karras", mode: "replace" },
      inputs: [],
      inputIndices: [],
      result: null,
      status: "pending",
    }
    renderWithTooltip(<ParamEditor stage={stage} onSave={() => {}} />)
    // Small option sets render as CHIP rows (2026-08-18) — the mode
    // discriminator's chips carry the option LABELS; sampler/scheduler
    // chips carry their option values. Order assertions run on the
    // chips exactly as they did on the <select>s.
    const modeSel = await screen.findByRole("button", { name: "Replace the masked area" })
    const samplerSel = screen.getByRole("button", { name: "dpmpp_2m" })
    const schedSel = screen.getByRole("button", { name: "karras" })
    const steps = screen.getByLabelText("Steps")
    const seed = screen.getByLabelText("Seed")
    // THE assertion — the discriminator precedes EVERYTHING it gates: the
    // numeric knobs (Steps/Seed NumberFields) AND the selects. The bucket
    // layout (numbers grid → selects) rendered mode after 15 knobs even
    // with within-bucket declared order; only a single declared-order flow
    // puts it first (2026-08-15).
    expect(modeSel.compareDocumentPosition(steps) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(modeSel.compareDocumentPosition(seed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(modeSel.compareDocumentPosition(samplerSel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(modeSel.compareDocumentPosition(schedSel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // The options are the four modes, the bag's value selected.
    const modeLabels = ["Refine what's there", "Replace the masked area", "Extend the canvas", "Remove an object"]
    for (const label of modeLabels) expect(screen.getByRole("button", { name: label })).toBeTruthy()
    expect(modeSel.getAttribute("aria-pressed")).toBe("true")
    // Declared order holds across the WHOLE flow too: steps precedes
    // seed even though the bag listed them the same way only by luck —
    // the numbers-bucket test below flips the bag's order to prove it.
    expect(steps.compareDocumentPosition(seed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // refine_denoise is gated OFF under mode=replace — not rendered.
    expect(screen.queryByLabelText(/refine.?denoise/i)).toBeNull()
    // Switching to refine reveals the dial — the gating half of the same
    // discriminator contract.
    fireEvent.click(screen.getByRole("button", { name: "Refine what's there" }))
    await screen.findByLabelText(/refine.?denoise/i)
    expect(screen.getByRole("button", { name: "Refine what's there" }).getAttribute("aria-pressed")).toBe("true")
  })

  it("numbers bucket follows DECLARED order when the bag's number order disagrees", async () => {
    // Same spec, bag reorders the numbers (seed before steps) — the render
    // must follow the declaration, not the dict-insertion accident.
    __simulateSpecRecord("flux-inpaint-2", {
      state: "loaded",
      violations: [],
      error: null,
      spec: {
        defaults: { seed: -1, steps: 20 },
        fields: [
          { name: "steps", type: "number", label: "Steps" },
          { name: "seed", type: "seed", label: "Seed" },
        ],
        schema_groups: [
          { fields: [
            { name: "steps", default: 20 },
            { name: "seed", default: -1 },
          ] },
        ],
        features: {},
      } as never,
    })
    const stage: CardStage = {
      id: "s2",
      title: "Gen",
      kind: "generation",
      service: "flux-inpaint-2",
      params: { seed: -1, steps: 20 },
      inputs: [],
      inputIndices: [],
      result: null,
      status: "pending",
    }
    renderWithTooltip(<ParamEditor stage={stage} onSave={() => {}} />)
    const steps = await screen.findByLabelText("Steps")
    const seed = screen.getByLabelText("Seed")
    expect(steps.compareDocumentPosition(seed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

// ── The mount-time schema-defaults seed (2026-08-09) ───────────────────────
  //
// Regression guard for the ACE-Step "missing many input parameters" bug.
// The catalog YAML for several audio families declares a minimal
// `defaults:` (just seed + one or two knobs); the OTHER schema fields live
// only on the builder SCHEMA. Before this fix, the card editor's mount
// effect loaded the form-spec for select-options / visible_when but never
// merged the schema field defaults into the draft. Since the editor
// renders by iterating `Object.keys(draft)`, those schema-only fields
// stayed invisible — ACE-Step showed 3 of its 12 fields.
  //
// handleModelChange already merged spec.defaults on swap — the bug was
// purely in the mount path. These tests pin both halves: an ACE-Step card
// (no visible_when) seeds every schema field; the visible_when-respecting
// merge still leaves the upscale mode-gated fields alone (so handleSelectChange
// owns them).
describe("ParamEditor mount seed — schema-only fields surface on first render (2026-08-09)", () => {
  it("ACE-Step: a card seeded with only {seed, duration, prompt} surfaces all 12 fields", async () => {
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        // The catalog's `defaults:` seeds only these three. Without the
        // mount-time merge, the editor renders just these three forever.
        stage={{
    id: "s1",
          title: "ACE-Step",
    kind: "generation",
          service: "ace-step",
          params: { seed: -1, duration: 30.0, prompt: "" },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
        }}
        onSave={(p) => { saved = p }}
      />,
    )
    // The three model axes render with their schema defaults. dit_variant
    // (6 options) keeps the dropdown; the 2-option axes render as CHIP
    // rows (2026-08-18) — pressed chip = the seeded default.
    const dit = (await screen.findByRole("combobox", { name: /dit.?variant/i })) as HTMLElement
    expect(dit.textContent ?? "").toContain("turbo")
    expect((await screen.findByRole("button", { name: "1.7B" })).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "stock" }).getAttribute("aria-pressed")).toBe("true")
    // The prompt textarea seeded by the catalog renders.
    expect((await screen.findByLabelText("Prompt")) as HTMLTextAreaElement).toBeTruthy()
    // The lyrics textarea — empty-string schema default — surfaces too.
    // Before the fix it never entered the draft.
    expect(screen.queryByLabelText("lyrics")).toBeTruthy()
    // The 4 generation knobs + 2 sampling sliders — all surfaced.
    for (const k of ["duration", "guidance_scale", "n_diffusion_steps", "lm_cfg_scale", "temperature", "top_p"]) {
      // The card renders the nice label (underscore → space); match both
      // forms so the test survives label-formatting tweaks.
      expect(screen.queryByLabelText(new RegExp(k.replace(/_/g, "[ _]?"), "i"))).toBeTruthy()
    }
    // Auto-save fires on a 300ms debounce. After it: every schema field
    // is persisted to the store, so a Run carries them verbatim.
    await waitFor(() => expect(Object.keys(saved ?? {}).sort()).toEqual([
      "dit_variant", "duration", "guidance_scale", "lm_cfg_scale",
      "lm_variant", "lyrics", "n_diffusion_steps", "prompt",
      "seed", "temperature", "top_p", "vae_variant",
    ]))
    // The seeded VALUES are the schema defaults (not empty strings).
    expect(saved?.dit_variant).toBe("turbo")
    expect(saved?.lm_variant).toBe("1.7B")
    expect(saved?.vae_variant).toBe("stock")
    expect(saved?.guidance_scale).toBe(1.0)
    expect(saved?.n_diffusion_steps).toBe(0)
    expect(saved?.lm_cfg_scale).toBe(2.0)
    expect(saved?.temperature).toBe(0.85)
    expect(saved?.top_p).toBe(0.9)
})

  it("visible_when-gated fields are NOT seeded on mount — handleSelectChange still owns them", async () => {
    // The upscale matrix: inpaint_region + detection_threshold + denoise +
    // prompt + input_mask are all gated by `mode == 'inpaint'`. Seeding
    // them on mount (even with empty strings) would clobber the
    // `if (next.X === undefined)` guards in handleSelectChange — the
    // first cut of the mount-seed fix broke exactly this. The merge must
    // respect visible_when so mode-gated fields stay undefined until the
    // user picks the mode.
    let saved: Record<string, unknown> | null = null
    renderWithTooltip(
      <ParamEditor
        stage={{
    id: "s1",
    title: "Upscale",
    kind: "generation",
          service: "seedvr2_ema",
          // mode=upscale → none of the gated fields should seed.
          params: { mode: "upscale", batch_size: 5, resolution: 2048 },
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
        }}
        onSave={(p) => { saved = p }}
      />,
    )
    await screen.findByRole("button", { name: "upscale" })
    // THE MOUNT SEED RESPECTS visible_when: none of the gated fields may
    // surface — not in the rendered grid. (Since 2026-08-22 a spec-seed
    // that changes nothing also never persists, so the payload probe below
    // runs after provoking a REAL user pick.)
    expect(screen.queryByLabelText(/inpaint[ _]?region/i)).toBeNull()
    expect(screen.queryByLabelText(/detection[ _]?threshold/i)).toBeNull()
    expect(screen.queryByLabelText(/denoise/i)).toBeNull()
    expect(screen.queryByLabelText(/input[ _]?mask/i)).toBeNull()
    // The user picks inpaint — handleSelectChange OWNS the gated fields:
    // they seed with real defaults through the handler, never the mount
    // seed (the first cut of the mount-seed fix clobbered the
    // `if (next.X === undefined)` guards here).
    fireEvent.click(screen.getByRole("button", { name: "inpaint" }))
    await waitFor(() => expect(saved?.mode).toBe("inpaint"))
    // The handler seeded the region (free) with its real default...
    expect(saved?.inpaint_region).toBeDefined()
    // ...while detection_threshold + denoise stay OUT of the payload —
    // they are visible_only when the region is NOT free. The mount seed
    // never pre-seeded them (that clobber was the original bug), and the
    // handler owns their appearance too.
    expect(saved?.detection_threshold).toBeUndefined()
    expect(saved?.denoise).toBeUndefined()
})
})

describe("ParamEditor schema-typed widgets — sliders + textareas from schema_groups (2026-08-09)", () => {
  // The build_tts SCHEMA declares widget types the flat fields enum can't
  // carry: sliders (temperature/top_p/speed/repetition_penalty with
  // min/max/step) + textareas (instruct, voice_pca_strengths). The card
  // reads schema_groups (the rich-typed source) and renders the right
  // widget — historically these landed as free-text inputs because the
  // flat fields list typed them "number"/"text" and the categorization
  // only knew TEXT_KEYS / NUMERIC_KEYS / select.
  const voiceStage = (params: Record<string, unknown>): CardStage => ({
    id: "s1",
    title: "Qwen3-TTS Design",
    kind: "generation",
    service: "qwen3_tts_voicedesign",
    params,
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
})

  it("renders sampling sliders as unified NumberFields with min/max/step from schema_groups", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({
          prompt: "",
          qwen3_variant: "VoiceDesign",
          temperature: 0.8,
          top_p: 0.9,
          speed: 1.0,
          repetition_penalty: 1.05,
        })}
        onSave={() => {}}
      />,
    )
    // Wait for the form-spec to load (the Talker Mode chips appear once
    // the schema_groups merge populates specFields). Before load, the
    // Parameters zone renders nothing — the assertions below would fail
    // against that pre-load shape.
    await screen.findByRole("button", { name: "VoiceDesign" })

    // 2026-08-10: sliders + number boxes are UNIFIED into one NumberField
    // (drag-to-scrub + click-to-type + range-fill bar). The former
    // full-width <input type="range"> rows are gone — these fields now
    // render as compact grid cells, same widget as every other numeric
    // param. The min/max/step from schema_groups drive the drag
    // sensitivity + the fill bar (visible when min/max are declared).
    const temp = screen.getByLabelText(/temperature/i) as HTMLInputElement
    const tempField = temp.closest("[data-numberfield]")!
    expect(tempField).toBeTruthy()
    // Range-fill bar proves min/max are wired (fill only renders when
    // the field carries a bounded range).
    expect(tempField.querySelector("[data-numberfield-fill]")).toBeTruthy()
    expect(temp.value).toBe("0.8")
    
    const topP = screen.getByLabelText(/top.?p/i) as HTMLInputElement
    expect(topP.closest("[data-numberfield]")?.querySelector("[data-numberfield-fill]")).toBeTruthy()
    
    const speed = screen.getByLabelText(/^speed/i) as HTMLInputElement
    expect(speed.closest("[data-numberfield]")?.querySelector("[data-numberfield-fill]")).toBeTruthy()
    
    const repPenalty = screen.getByLabelText(/repetition.?penalty/i) as HTMLInputElement
    expect(repPenalty.closest("[data-numberfield]")?.querySelector("[data-numberfield-fill]")).toBeTruthy()
})

  it("renders instruct + voice_pca_strengths as textareas (multi-line), NOT one-line inputs", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({
          prompt: "",
          qwen3_variant: "VoiceDesign",
          // Both are textarea-typed in schema_groups. The mount-seed
          // surfaces them when the catalog defaults leave them absent.
        })}
        onSave={() => {}}
      />,
    )
    // Wait for the form-spec to load.
    await screen.findByRole("button", { name: "VoiceDesign" })
    
    // instruct surfaces via the schema_groups type="textarea" — a
    // multi-line <textarea>, not a single-line <input>. The label text
    // is the key name (underscores → spaces); the Field's "Style
    // Instruction" label is unused by the card (the catalog view's
    // flat-fields emitter doesn't currently thread label through).
    const instruct = screen.getByLabelText(/^instruct/i, { selector: "textarea" })
    expect(instruct.tagName).toBe("TEXTAREA")
    // voice_pca_strengths: same — JSON PCA steering wants a textarea.
    const pca = screen.getByLabelText(/voice pca strengths/i, { selector: "textarea" })
    expect(pca.tagName).toBe("TEXTAREA")
})

  it("renders qwen3_variant as a dropdown (select options preserved across the merge)", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({
          prompt: "",
          qwen3_variant: "VoiceDesign",
        })}
        onSave={() => {}}
      />,
    )
    // The Talker Mode chips' options come from the schema_groups entry
    // (CustomVoice / Base / VoiceDesign — the REAL audio.py SelectOption
    // order). The merge must preserve them — a schema_groups-first
    // overwrite would lose the options array. Three options → a CHIP
    // row (2026-08-18), pressed = the draft's value.
    expect((await screen.findByRole("button", { name: "VoiceDesign" })).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: "CustomVoice" }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: "Base" }).getAttribute("aria-pressed")).toBe("false")
})
})

// ── Qwen3-TTS Variant axis: dropdown-driven, never free-text (2026-08-10) ──
// The real qwen3-tts-base form-spec (mirrored by the mock above) drives
// the SIZE axes (0.6B/1.7B) via features.variants (route-composed, empty
// overrides) — but the TALKER MODE itself (qwen3_variant) is a schema
// Field (audio.py Field("qwen3_variant", "select", "Talker Mode")).
// 2026-08-14: the header special-case that rendered Talker Mode a SECOND
// time — and showed "Talker Mode: CustomVoice" on the VoiceID card as a
// phantom voice default — is DELETED. The schema field in the selectKeys
// grid is the ONE surface: a Talker Mode <select>, never free-text.
describe("Qwen3-TTS Variant axis — dropdown-driven, never free-text (2026-08-10)", () => {
const ttsStage = (params: Record<string, unknown>): CardStage => ({
    id: "s1",
    title: "Qwen3-TTS",
    kind: "generation",
    service: "qwen3-tts-base",
    params,
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
})

it("does NOT render qwen3_variant as a free-text input (variant dropdown owns it)", async () => {
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", qwen3_variant: "CustomVoice" })}
        onSave={(p) => { saved = p }}
      />,
    )
    // Wait for the form-spec to load — the Variant dropdown appears
    // once features.variants is populated.
    await waitFor(() => {
    expect(saved?.qwen3_variant).toBe("CustomVoice")
})
// qwen3_variant renders as a Talker Mode CHIP row in the params flow —
// NOT as a free-text input (and exactly ONCE — the header special-case
// is deleted, 2026-08-14).
const talkerChip = await screen.findByRole("button", { name: /CustomVoice/i })
expect(talkerChip.getAttribute("aria-pressed")).toBe("true")
// Exactly one Talker Mode surface: the schema field. A second render
// (the old header special-case) would double this count.
expect(screen.getAllByRole("button", { name: /CustomVoice/i })).toHaveLength(1)
// Must NOT appear as a free-text input:
expect(screen.queryByRole("textbox", { name: /talker.?mode/i })).toBeNull()
})

it("preserves qwen3_variant through the mount-seed purge (variant override key is exempt)", async () => {
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", qwen3_variant: "Base" })}
        onSave={(p) => { saved = p }}
      />,
    )
    // The purge would normally delete qwen3_variant (not in spec.fields
    // / schema_groups). The variant-override exemption keeps it so the
    // engine receives the correct talker mode.
    await waitFor(() => {
    expect(saved?.qwen3_variant).toBe("Base")
})
})

it("renders the Voice Preset as a chip row (not free-text)", async () => {
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", voice: "serena", qwen3_variant: "CustomVoice" })}
        onSave={() => {}}
      />,
    )
    // 3 options → chips (2026-08-18); serena (the draft value) pressed.
    const serena = await screen.findByRole("button", { name: /serena/i })
    expect(serena.getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /vivian/i }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.getByRole("button", { name: /aiden/i }).getAttribute("aria-pressed")).toBe("false")
    expect(screen.queryByRole("textbox", { name: /voice.?preset/i })).toBeNull()
})

it("LOAD-TIME SANITIZE: restored Base residue (voice) is purged — switching to CustomVoice seeds the schema default, never the stale pick (pc81a817a)", async () => {
    // pc81a817a (2026-08-14): a RESTORED draft carried qwen3_variant
    // "Base" + voice "serena" (a catalog default the bag kept). The
    // mode-change handler only clears hidden fields when the controller
    // CHANGES — a restored draft never fires it, so the stale combo
    // sailed through to the engine and the backend fail-loud validator
    // killed the run ("Talker mode 'Base' silently ignores: voice").
    // The load-time sanitize (one-shot per service, when the vocabulary
    // lands) deletes hidden residue from the draft. Discriminator:
    // switch Base → CustomVoice — the now-visible Voice Preset must seed
    // the schema DEFAULT (serena), not the restored stale pick (vivian).
    renderWithTooltip(
      <ParamEditor
        stage={ttsStage({ prompt: "", voice: "vivian", qwen3_variant: "Base" })}
        onSave={() => {}}
      />,
    )
    fireEvent.click(await screen.findByRole("button", { name: /CustomVoice/i }))
    // The now-visible Voice Preset seeds the schema DEFAULT (serena),
    // not the restored stale pick (vivian) — pressed chip proves it.
    expect((await screen.findByRole("button", { name: /serena/i })).getAttribute("aria-pressed")).toBe("true")
    expect(screen.getByRole("button", { name: /vivian/i }).getAttribute("aria-pressed")).toBe("false")
})

// ── Variant-conditional capabilities (2026-08-10) ───────────────────
// FOR QWEN3-TTS. IT NEVER EXPOSES. THE DIFFERENT VARIANTS HAVE
// DIFFERENT CAPABILITIES." Verified against the C++ talker source
// (src/models/qwen3_tts/talker.cpp): each variant dispatches a
// different code path with different params. The card MUST show/hide
// fields based on the active variant so the user sees the actual
// capabilities of the selected mode — not a wall of irrelevant knobs.

it("CustomVoice variant shows Voice Preset + Speaker Name + Style Instruction (emotion direction)", async () => {
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", voice: "serena", qwen3_variant: "CustomVoice", instruct: "cheerful" })}
        onSave={() => {}}
      />,
    )
    // Voice Preset + Speaker Name visible — CustomVoice identity knobs
    await screen.findByRole("button", { name: /serena/i })
    expect(screen.queryByLabelText(/speaker.?name/i)).not.toBeNull()
    // Style Instruction VISIBLE — CustomVoice is the ONE variant that
    // supports emotion/style direction on the preset speaker. Verified
    // against the official Qwen3-TTS model matrix (0.6B and 1.7B both
    // support instruction control on CustomVoice).
    const instr = await screen.findByLabelText(/style.?instruction/i)
    expect((instr as HTMLTextAreaElement).value).toBe("cheerful")
    // Reference Audio HIDDEN — CV doesn't need it (preset speaker)
    expect(screen.queryByLabelText(/reference.?audio/i)).toBeNull()
})

it("Base variant hides Style Instruction (engine ignores it) + Voice Preset; surfaces Reference Audio (clone-only)", async () => {
// CORRECTED 2026-08-13 — Base does NOT support instruct/emotion control.
// The official Qwen3-TTS model matrix confirms: Base (both 0.6B and 1.7B)
// lacks instruction/emotion control entirely. The engine silently drops
// the instruct field. Showing it would mislead the user into writing
// dead text — the exact "silently dropped [REDACTED 2026-11-05] is horrible" scenario.
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", qwen3_variant: "Base", instruct: "whisper", reference_audio: null })}
        onSave={(p) => { saved = p }}
      />,
    )
    // Style Instruction HIDDEN — Base ignores instruct entirely
    expect(screen.queryByLabelText(/style.?instruction/i)).toBeNull()
    // Reference Audio VISIBLE — Base is clone-only, requires voice_ref.
    // Verified via the SAVED draft (reference_audio is a slot that
    // renders in SlotGrid inside CardDetailModal, not a labeled input
    // inside ParamEditor — but the visible_when gate controls whether
    // the mount-seed null-seeds it).
    await waitFor(() => {
    expect("reference_audio" in (saved ?? {})).toBe(true)
})
      expect(saved?.reference_audio).toBeNull()
      // Voice Preset HIDDEN — Base doesn't use named speakers
      expect(screen.queryByLabelText(/voice.?preset/i)).toBeNull()
      // Speaker Name HIDDEN — same reason
      expect(screen.queryByLabelText(/speaker.?name/i)).toBeNull()
})

it("VoiceDesign variant exposes ONLY Style Instruction (the design prompt); hides Voice Preset AND Reference Audio", async () => {
// VoiceDesign creates a voice FROM the instruction text — no preset,
// no reference clip. The card must reflect that the ONLY input is
// the design description, not offer clone knobs that do nothing.
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
      stage={ttsStage({ prompt: "", qwen3_variant: "VoiceDesign", instruct: "warm female, British accent" })}
        onSave={(p) => { saved = p }}
      />,
    )
    // Style Instruction VISIBLE — the primary design input
    const instr = await screen.findByLabelText(/style.?instruction/i)
    expect((instr as HTMLTextAreaElement).value).toBe("warm female, British accent")
    // Voice Preset HIDDEN — no preset speakers in design mode
    expect(screen.queryByLabelText(/voice.?preset/i)).toBeNull()
    // Speaker Name HIDDEN — same
    expect(screen.queryByLabelText(/speaker.?name/i)).toBeNull()
    // Reference Audio HIDDEN — VoiceDesign doesn't clone, so the ref
    // clip is dead weight. The visible_when gate
    // (`qwen3_variant != 'VoiceDesign'`) FAILS → mount-seed SKIPS it →
    // the key never enters the draft. This is the field that most
    // clearly signals "different variants have different capabilities."
    await waitFor(() => {
    expect("reference_audio" in (saved ?? {})).toBe(false)
})
})
})

describe("Voice slot attach squares — reference_audio + voice_file null-seeded (2026-08-09)", () => {
  // The voice clone reference (reference_audio) and voice embedding
  // (voice_file) must surface as SlotGrid attach squares, NOT free-text
  // inputs. Both are in the slot vocabulary (_CARD_SLOTS + FALLBACK_SLOTS)
  // so ParamEditor's otherKeys filter excludes them.
  //
  // The TWO different mount-seed paths:
  // - voice_file: type "file" → NOT in FEATURE_FIELD_TYPES → present in
  // spec.flat_fields → the standard flat-fields loop null-seeds it.
  // - reference_audio: type "audio" → IS in FEATURE_FIELD_TYPES →
  // EXCLUDED from spec.flat_fields → the schema_groups pass
  // (FlowCard mount-seed) null-seeds it. Without that pass,
  // reference_audio never enters the draft and SlotGrid never draws
  // the square (the bug: "voice clone reference invisible").
  const voiceStage = (params: Record<string, unknown>): CardStage => ({
    id: "s1",
    title: "Qwen3-TTS Design",
    kind: "generation",
    service: "qwen3_tts_voicedesign",
    params,
    inputs: [],
    inputIndices: [],
    result: null,
    status: "pending",
})

  it("null-seeds voice_file via the flat-fields path", async () => {
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({ prompt: "", qwen3_variant: "VoiceDesign" })}
        onSave={(p) => { saved = p }}
      />,
    )
    await screen.findByRole("button", { name: "VoiceDesign" })
    await waitFor(() => {
      expect(saved?.voice_file).toBeNull()
})
})

  it("null-seeds reference_audio via the schema_groups pass (not in flat fields)", async () => {
    let saved: Record<string, unknown> | undefined
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({ prompt: "", qwen3_variant: "VoiceDesign" })}
        onSave={(p) => { saved = p }}
      />,
    )
    await screen.findByRole("button", { name: "VoiceDesign" })
    // reference_audio is type "audio" → excluded from spec.fields by
    // FEATURE_FIELD_TYPES. The mount-seed's schema_groups pass catches it.
    await waitFor(() => {
      expect(saved?.reference_audio).toBeNull()
})
})

  it("does NOT render voice_file or reference_audio as free-text ParamEditor inputs", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={voiceStage({ prompt: "", qwen3_variant: "VoiceDesign" })}
        onSave={() => {}}
      />,
    )
    await screen.findByRole("button", { name: "VoiceDesign" })
    // Both keys are in inputSlots() → excluded from otherKeys → ParamEditor
    // never renders a textbox/input for them. They render as attach squares
    // in SlotGrid (owned by CardDetailModal, not ParamEditor).
    expect(screen.queryByLabelText(/voice.?file/i)).toBeNull()
    expect(screen.queryByLabelText(/reference.?audio/i)).toBeNull()
})
})

// ── Workflow Preset → recipe params (2026-08-10) ────────────────────────────
// The user's bug: picking a preset "doesn't even populate the prompt" — the
// select was a server-side-only knob that applied invisibly (and, before the
// falsy-gate fix, literally never: the brick's sentinel-None gates never
// fired against the card's prompt:""). The catalog's families.<fam>.presets
// IS the data: selecting a preset fills the draft's EMPTY fields so the user
// SEES what will run. Explicit draft values win — mirrors the brick's preset
// layer (edit_image.py: explicit args win, preset fills the falsy).
describe("ParamEditor Workflow Preset — selecting populates the recipe params (2026-08-10)", () => {
  it("picking blue_mesh fills the EMPTY prompt with the recipe's prompt", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({
          service: "qwen-edit-base",
          params: { prompt: "", seed: 1, preset: "vnccs_repose" },
        })}
        onSave={() => {}}
      />,
    )
    // 2 options → a chip row (2026-08-18); the draft's vnccs_repose is
    // pressed before the pick.
    expect((await screen.findByRole("button", { name: "vnccs_repose" })).getAttribute("aria-pressed")).toBe("true")
    // Prompt is empty before the pick.
    expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe("")
    fireEvent.click(screen.getByRole("button", { name: "blue_mesh" }))
    // The recipe's prompt fills the textarea — the user's demand, visible.
    await waitFor(() => {
      expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toMatch(/BLUE store mannequin/)
})
})

  it("explicit draft values WIN over the preset's params (mirrors the brick)", async () => {
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({
          service: "qwen-edit-base",
          params: { prompt: "make it blue", seed: 1, preset: "vnccs_repose" },
        })}
        onSave={() => {}}
      />,
    )
    expect((await screen.findByRole("button", { name: "vnccs_repose" })).getAttribute("aria-pressed")).toBe("true")
    fireEvent.click(screen.getByRole("button", { name: "blue_mesh" }))
    // The user's typed prompt survives — the preset only fills the empty.
    await waitFor(() => {
      expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe("make it blue")
})
})
})

// ── Card-open revalidation — fail loud, NEVER a stale/raw draft ──────────
// (2026-08-12 operator directive: "WHEN I OPEN A CARD, IT IS SOMETIMES NOT
// ACCURATE. IT'S OLD OR CRUFT OR MISSING MODS. FIX THIS FOREVER.") The
// form-spec is the CLOSED vocabulary for what a card may render: old fields,
// phantom cruft rows and missing mods were all symptoms of a session-stale
// spec served from the cache or a silently-swallowed fetch failure that
// degraded to the raw draft. These tests pin the contract: every open
// revalidates (fresh: true) and an error/violation verdict REPLACES the form
// with a visible face + Retry.
describe("ParamEditor card-open revalidation — fail loud, never a degraded raw draft (2026-08-12)", () => {
  it("an error record hides the form — red verdict face + Retry, never the raw draft", async () => {
    __simulateSpecRecord("krea2", {
      spec: null, state: "error", violations: [], error: "form-spec krea2 failed (502)",
    })
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({ service: "krea2", params: { prompt: "a waifu", steps: 28, cfg: 4.5 } })}
        onSave={() => {}}
      />,
    )
    // The face REPLACES the form — no raw draft with old fields, no model row.
    const face = await screen.findByTestId("card-spec-verdict")
    expect(face.textContent).toContain("Card form unavailable")
    expect(screen.queryByRole("combobox", { name: "Model" })).toBeNull()
    expect(screen.queryByLabelText("Prompt")).toBeNull()

    // Retry revalidates FRESH — never re-serves the failed record.
    const callsBefore = specLoadCalls().length
    fireEvent.click(within(face).getByRole("button", { name: "Retry" }))
    await waitFor(() => {
      const calls = specLoadCalls()
      expect(calls.length).toBeGreaterThan(callsBefore)
      expect(calls[calls.length - 1][1]).toEqual({ fresh: true })
    })
  })

  it("a violation record shows the contract-violation face, not an empty form", async () => {
    __simulateSpecRecord("krea2", {
      spec: null,
      state: "violation",
      violations: [{ kind: "spec", message: "Form-spec has no `features` object — declared capabilities cannot be located." }],
      error: null,
    })
    renderWithTooltip(
      <ParamEditor
        stage={makeStage({ service: "krea2", params: { prompt: "a waifu" } })}
        onSave={() => {}}
      />,
    )
    const face = await screen.findByTestId("card-spec-verdict")
    expect(face.textContent).toContain("Card form contract violation")
    // Never a silently-empty form: the model row + prompt are hidden with it.
    expect(screen.queryByRole("combobox", { name: "Model" })).toBeNull()
    expect(screen.queryByLabelText("Prompt")).toBeNull()
  })

  it("opening a card revalidates even a cached loaded spec — fresh: true on every open", async () => {
    // No simulation for this test — the mock's real loaded path must run.
    __resetSpecSimulations()
    __clearSpecLoadCalls()
    // An earlier open this session cached krea2 as loaded. The pre-fix
    // dedup would have served THIS record forever — new catalog fields/
    // mods added since (backend re-imports YAML on restart) never reached
    // the card. Card open MUST revalidate against the backend.
    await useSpecContractStore.getState().loadFormSpec("krea2")
    expect(useSpecContractStore.getState().records["krea2"].state).toBe("loaded")
    __clearSpecLoadCalls()

    renderWithTooltip(
      <ParamEditor
        stage={makeStage({ service: "krea2", params: { prompt: "a waifu", steps: 28, cfg: 4.5 } })}
        onSave={() => {}}
      />,
    )
    // Mount fires ONE fresh revalidation despite the cached loaded record…
    await waitFor(() => {
      const kreaCalls = specLoadCalls().filter((c) => c[0] === "krea2")
      expect(kreaCalls.length).toBe(1)
      expect(kreaCalls[0][1]).toEqual({ fresh: true })
    })
    // …and the fresh record reaches the form (the card renders, not a face).
    expect(await screen.findByRole("combobox", { name: "Model" })).toBeTruthy()
    expect((screen.getByLabelText("Prompt") as HTMLTextAreaElement).value).toBe("a waifu")
  })
})

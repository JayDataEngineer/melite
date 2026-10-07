import type { ModifierField, ModifierOption } from "@melite/contracts/wire-types";
export type CapabilityEntryWire = {
    /** Label */
    label: string;
    /** Description */
    description?: string | null;
    /** Default Family — OPTIONAL per §11: the plugin tile derives
     *  its default from the first member family; core config names
     *  no plugin ids. The gateway always attaches "resolved". */
    default_family?: string;
    /** Families */
    families: string[];
    /** Default Params */
    default_params?: {
        [key: string]: unknown;
    } | null;
    /** Icon */
    icon?: string | null;
    /**
     * Kind
     * @default generation
     * @enum {string}
     */
    kind: "generation" | "input";
    /** Subcategories */
    subcategories?: {
        [key: string]: CapabilitySubcategory;
    } | null;
    resolved?: CapabilityRouteWire | null;
    /** Routes */
    routes?: CapabilityRouteWire[] | null;
} & {
    [key: string]: unknown;
};
/**
 * FamilyEntryWire
 * @description Wire == declared catalog shape; extra keys tolerated (the catalog
 *     can grow without breaking the generated types).
 *
 *     ``studio`` is NOT declared in the catalog YAML — it flows from the
 *     action-cards studios/ declarations (form_declarations) at serve
 *     time, so the studio's folder stays its one definition site.
 */
export type CapabilityRoute = {
    /** Family */
    family: string;
    /** Model */
    model: string;
    /** Params */
    params: {
        [key: string]: unknown;
    };
} & {
    [key: string]: unknown;
};
/** CapabilityRouteWire */
export type CapabilityRouteWire = {
    /** Family */
    family: string;
    /** Model */
    model: string;
    /** Params */
    params: {
        [key: string]: unknown;
    };
} & {
    [key: string]: unknown;
};
/**
 * CapabilitySubcategory
 * @description A labeled subgroup of families within a capability.
 *
 *     The Enhance Image capability, for example, groups its families into
 *     ``Upscaling`` and ``Detailing`` so the model switcher (and the AI) present
 *     them as distinct intents under one capability. Pure presentation — the
 *     families are already part of the capability's flat ``families`` list and
 *     their routes are backend-precomputed; the subcategory only says "show
 *     these under this label." Cross-field rules (each family must be a member
 *     of the capability's own ``families``) are checked in the semantic pass.
 */
export type CapabilitySubcategory = {
    /** Label */
    label: string;
    /** Families */
    families: string[];
};
/**
 * CapabilityEntryWire
 * @description CapabilityEntry + the precomputed ``resolved`` / ``routes`` (see
 *     editor_catalog._resolve_capability).
 */
export type CardSummary = {
    /** Width Param */
    width_param?: string | null;
    /** Height Param */
    height_param?: string | null;
    /** Size Param */
    size_param?: string | null;
    /** Size Suffix */
    size_suffix?: string | null;
};
/**
 * DetectorEntry
 * @description One detection mode in a family's ``detectors:`` dict (mode → entry).
 *
 *     The bbox-detector SSOT for the three detail/detect modes (face, hands,
 *     body — the user's 2026-08-08 presentation contract: "Face, Hands, Body
 *     (body gets everything)"). ``model`` is the UltralyticsDetectorProvider
 *     model_name (``bbox/<file>`` under ultralytics/bbox/); ``label`` is the
 *     user-facing select option label. Declared identically on every family
 *     that consumes the detectors (pixel_upscale, seedvr2_upscale, detect) —
 *     the honesty gate asserts the declared sets match across those families.
 */
export type CatalogResponse = {
    /** Families */
    families: {
        [key: string]: FamilyEntryWire;
    };
    /** Models */
    models: {
        [key: string]: ModelEntryWire;
    };
    /** Capabilities */
    capabilities?: {
        [key: string]: CapabilityEntryWire;
    } | null;
    /** Engine Order */
    engine_order?: {
        [key: string]: number;
    } | null;
    /** Quant Order */
    quant_order?: {
        [key: string]: number;
    } | null;
} & {
    [key: string]: unknown;
};
/**
 * LoraListOut
 * @description GET /v1/loras — per-model LoRA file list (always per-model; paths
 *     relative to ComfyUI's loras/ root, the exact format LoraLoader expects).
 *
 *     The declared ``loras`` list is the contract — the LoraPicker's dropdown
 *     renders EXCLUSIVELY from it, so the response model IS the no-silent-drop
 *     gate: a drifted shape fails here with a pydantic path, never an empty
 *     picker. ``note`` / ``meta`` are optional long-tail extras.
 */
export type DetectorEntry = {
    /** Label */
    label: string;
    /** Model */
    model: string;
};
/**
 * LanpaintModelEntry
 * @description One synthesized LanPaint route declaration (2026-08-16/17).
 *
 *     Lives in a family's ``lanpaint_models:`` block. The entry declares
 *     NO weights — the loader SYNTHESIZES the route at load, copying
 *     size/sha256 from the ``carrier``'s resolved cell (one weights file,
 *     one pin record — the flat-file pattern that pinned z-image's cells
 *     twice is retired). THE LINK IS DECLARED HERE (2026-08-17 directive:
 *     "MODEL DOWNLOAD LINKS ARE IN YAML, NOT PYTHON"): every carrier
 *     declares its OWN ``source:`` + ``provision:`` in this YAML node —
 *     the loader never fabricates a link, and a divergent link (a URL or
 *     dest that differs from the carrier cell's) fails the load. The
 *     carrier MUST carry the declaration-only ``inpaint`` mod bag — the
 *     mod IS the capability gate, and a carrier without it fails the load.
 *     ``defaults`` are the route's recipe (verbatim from the retired flat
 *     entries; the LanPaint knobs themselves live on the mod bag's
 *     ``fields:`` and merge under the recipe).
 */
export type FamilyEntryWire = {
    /** Label */
    label: string;
    /** Id */
    id?: string | null;
    /** Description */
    description?: string | null;
    /** Text Encoder */
    text_encoder?: string | null;
    /** Vae */
    vae?: string | null;
    /** Clip Type */
    clip_type?: string | null;
    prompt_guide?: PromptGuide | null;
    /** Variant Groups */
    variant_groups?: {
        [key: string]: VariantGroup;
    } | null;
    /** Default Model */
    default_model?: string | null;
    /** Text Projection */
    text_projection?: string | null;
    /** File Sizes Gb */
    file_sizes_gb?: {
        [key: string]: number;
    } | null;
    /** Download Note */
    download_note?: string | null;
    /** Loader */
    loader?: string | null;
    /** Engine */
    engine?: string | null;
    /** Genre */
    genre?: string | null;
    /** Tile */
    tile?: string | null;
    /** Tile Order */
    tile_order?: number | null;
    /** Accepts */
    accepts?: ("image" | "video" | "audio")[] | null;
    provisioning?: ProvisioningSpec | null;
    /** Transforms */
    transforms?: TransformApplicability[] | null;
    card_summary?: CardSummary | null;
    video?: VideoManifest | null;
    /** Audio Vae */
    audio_vae?: string | null;
    /** Defaults */
    defaults?: {
        [key: string]: unknown;
    } | null;
    /** Lora Dir */
    lora_dir?: string | null;
    /** Modifiers */
    modifiers?: ModifierKind[] | null;
    /** Detectors */
    detectors?: {
        [key: string]: DetectorEntry;
    } | null;
    /** Detail Checkpoint */
    detail_checkpoint?: string | null;
    /** Sam Model */
    sam_model?: string | null;
    /** Model File Params */
    model_file_params?: {
        [key: string]: ModelFileParam;
    } | null;
    /** Primary Output */
    primary_output?: string | null;
    /** Optional Outputs */
    optional_outputs?: OptionalOutput[] | null;
    /** Outputs */
    outputs?: OutputEntry[] | null;
    /** Presets */
    presets?: {
        [key: string]: PresetEntry;
    } | null;
    /** Lanpaint Models */
    lanpaint_models?: LanpaintModelEntry[] | null;
    studio?: StudioBindingWire | null;
} & {
    [key: string]: unknown;
};
/**
 * ModelEntryWire
 * @description The catalog's ModelEntry + the three backend-computed wire keys
 *     (input slot / full slot list / prompt-in-form) + typed variants.
 */
export type LanpaintModelEntry = {
    /** Carrier */
    carrier: string;
    /** Route */
    route: string;
    /** Label */
    label?: string | null;
    /** Source */
    source?: string | null;
    provision?: ProvisionArtifact | null;
    /** Defaults */
    defaults?: {
        [key: string]: unknown;
    } | null;
};
/**
 * MaskLayerKind
 * @description Provenance of a mask-studio output — which producer derived it.
 *
 *     The ONE pydantic validation surface for both mask producers: a
 *     per-class detector filter (impact-pack SEGS) vs a derived selection
 *     (subject / background / cutout) vs an externally-authored paint layer
 *     (photoshop-hybrid — authoring lives OUTSIDE the card by design). A
 *     typo'd kind fails the parse at catalog load — the same honesty gate
 *     as ``DetectorEntry`` / ``TransformApplicability``. Carried optionally
 *     on ``OptionalOutput.mask_layer`` so every non-mask family leaves it
 *     None and pays no cost.
 */
export type MaskLayerKind = {
    /**
     * Kind
     * @enum {string}
     */
    kind: "detector" | "derived" | "paint";
    /** Source */
    source: string;
};
/**
 * ModelFileParam
 * @description One param whose VALUE is a model file the builder loads.
 *
 *     The builder form-field contract (2026-08-14): fields like ``vfi_model``
 *     ("rife47.pth"…) or ``upscale_model`` feed a loader node with a filename
 *     picked from a vocabulary. Before this, that vocabulary lived ONLY in
 *     builder code — the door gate couldn't see it, so a missing RIFE
 *     checkpoint died as an opaque mid-run ComfyUI error. Declaring the param
 *     HERE puts it under the SAME contract as every other model file:
 *     catalog-declared → presence-checked at the door → auto-downloadable.
 *
 *     Fields:
 *       folder        — LOGICAL ComfyUI model dir ("frame_interpolation",
 *                       "latent_upscale_models", …) — the folder the builder's
 *                       loader node reads.
 *       default       — filename used when the param is absent/empty (must
 *                       match the builder's own fallback).
 *       required_when — tiny comparison ("vfi_multiplier > 1"); the file is
 *                       only gate-checked when it holds. None = always.
 *       source        — download URL for the single-file case (auto-download
 *                       via the standard files:// dialog).
 *       sources       — value→URL map for vocabularies (each option file can
 *                       come from a different release/repo).
 */
export type ModeClause = {
    /** Require */
    require?: string[] | null;
    /** Require One Of */
    require_one_of?: string[] | null;
    /** Ignore */
    ignore?: string[] | null;
};
/**
 * ModelValidation
 * @description A model's OWN talker-mode validation block (catalog ``validation:``).
 *
 *     ``talker_modes`` = the modes this model can actually run (its own
 *     weights decide — e.g. the 0.6B merged checkpoint has no VoiceDesign
 *     weights). ``modes`` = the per-mode clauses; EVERY declared mode MUST
 *     have a clause (structural rule, enforced at catalog load) and a mode
 *     NOT listed is rejected per-model at build/parse time.
 */
export type ModelEntryWire = {
    /** Family */
    family: string;
    /** Form */
    form: string;
    /** Label */
    label: string;
    /** Variant Label */
    variant_label?: string | null;
    /** Variant */
    variant?: string | null;
    /** Quant */
    quant?: string | null;
    /** Source */
    source?: string | null;
    /** Text Encoder */
    text_encoder?: string | null;
    /** Vae */
    vae?: string | null;
    /** Clip Type */
    clip_type?: string | null;
    /** Loader */
    loader?: string | null;
    /** Variants */
    variants?: VariantEntryWire[] | null;
    /** Defaults */
    defaults?: {
        [key: string]: unknown;
    } | null;
    /** Presets */
    presets?: {
        [key: string]: PresetEntry;
    } | null;
    /** Routing */
    routing?: {
        [key: string]: unknown;
    } | null;
    /** Artifact Families */
    artifact_families?: string[] | null;
    /** Lora Catalog */
    lora_catalog?: {
        [key: string]: unknown;
    } | null;
    provision?: ProvisionArtifact | null;
    /** Controlnet Only */
    controlnet_only?: boolean | null;
    /** Hide From Dropdown */
    hide_from_dropdown?: boolean | null;
    /** Edit Only */
    edit_only?: boolean | null;
    /** Modifiers */
    modifiers?: ModifierKind[] | null;
    /** Canvas Editor */
    canvas_editor?: boolean | null;
    /** Canvas Default */
    canvas_default?: boolean | null;
    /** Template */
    template?: string | null;
    /** Engine */
    engine?: string | null;
    /** Checkpoint */
    checkpoint?: string | null;
    /** Shape */
    shape?: string | null;
    /** Required Files */
    required_files?: string[] | null;
    validation?: ModelValidation | null;
    /** Timeout Floor */
    timeout_floor?: number | null;
    /** Aura Shift */
    aura_shift?: number | null;
    /** Dit Model */
    dit_model?: string | null;
    /** Vae Model */
    vae_model?: string | null;
    /** Download Note */
    download_note?: string | null;
    /** Sha256 */
    sha256?: string | null;
    /** Size */
    size?: number | null;
    /** Upscale Model */
    upscale_model?: string | null;
    /** Provisioned */
    provisioned?: boolean | null;
    /** Input */
    input?: string | null;
    /** Input Slots */
    input_slots?: string[] | null;
    /** Prompt In Form */
    prompt_in_form?: boolean | null;
} & {
    [key: string]: unknown;
};
/**
 * CatalogResponse
 * @description The ONE catalog assembly — GET /v1/model-catalog's 200 body.
 */
export type ModelFileParam = {
    /** Folder */
    folder: string;
    /** Default */
    default?: string | null;
    /** Required When */
    required_when?: string | null;
    /** Source */
    source?: string | null;
    /** Sources */
    sources?: {
        [key: string]: string;
    } | null;
    /** Sha256 */
    sha256?: string | null;
    /** Size */
    size?: number | null;
};
/**
 * ModifierEntry
 * @description One modifier declaration in a video manifest's ``modifiers`` dict.
 *     Only ``pathway`` is a known field — extra keys are rejected by
 *     ``extra="forbid"`` so the operator gets a precise path + typo suggestion
 *     (e.g. ``families.ltx.video.modifiers.beat: unknown field "mode"``).
 */
export type ModelValidation = {
    /** Talker Modes */
    talker_modes: string[];
    /** Modes */
    modes: {
        [key: string]: ModeClause;
    };
};
/**
 * VariantEntryWire
 * @description The catalog's VariantEntry + the wire-computed keys (computed
 *     server-side at serve time, not YAML declarations):
 *
 *     * ``live`` — the pool's live-routes flag (request-time);
 *     * ``owner`` — for a QUANT entry, the variant FOLDER that declared the
 *       cell (2026-08-17): the frontend's Quant row renders the ACTIVE
 *       variant's cells ("VARIANTS FILTER AVAILABLE QUANTS. NOT THE OTHER
 *       WAY AROUND") — the owner stamp makes the hierarchy declarative
 *       instead of frontend-guessed.
 */
export type ModifierEntry = {
    /** Pathway */
    pathway: string;
};
/**
 * OptionalOutput
 * @description One optional named output a family may emit (the optional-outputs vocabulary).
 *
 *     The SSOT for "a card can produce extra named artifacts alongside its
 *     primary output." ``mask`` / ``detection`` / ``depth`` / … are INSTANCES
 *     of this model, not special cases — mirroring how ``ModifierKind`` makes
 *     ``lora`` / ``controlnet`` instances of an open kind vocabulary (rule 4:
 *     declarative + pydantic-validated, never a hardcoded ``if mask``).
 *
 *     Declaration lives on the family's catalog block (``primary_output`` +
 *     ``optional_outputs:``); ``emit_when`` is the param key whose truthy
 *     presence in a step's params ACTIVATES the output for that step. The
 *     resolver (core.flows.outputs.resolve_step_outputs) derives the
 *     per-step ``outputs`` list from this declaration + the step's params —
 *     one generic code path for every family. Adding an optional output to a
 *     family is a YAML line here, ZERO schema/compile/frontend edits.
 *
 *     ``name`` is the artifact key the family writes into BrickResult.artifacts
 *     AND the name a downstream slot wires by (Option A — named outputs). It
 *     MUST match the key the family actually produces, or the orchestrator's
 *     _check_outputs hard-errors (declared = enforced).
 */
export type ModifierKind = {
    /** Kind */
    kind: string;
    /** Label */
    label: string;
    /**
     * Cardinality
     * @default list
     * @enum {string}
     */
    cardinality: "list" | "scalar";
    /** Max Stack */
    max_stack?: number | null;
    /** Param Key */
    param_key: string;
    /** Fields */
    fields: ModifierField[];
    /** Options */
    options?: ModifierOption[] | null;
    /** Upload Dir */
    upload_dir?: string | null;
    /** Options Scanned */
    options_scanned?: boolean | null;
    /** Tooltip */
    tooltip?: string | null;
    /** Declaration Only */
    declaration_only?: boolean | null;
    /** Order */
    order?: number | null;
};
/**
 * OutputEntry
 * @description One declared output FORMAT a family can produce (the outputs vocabulary).
 *
 *     The SSOT for "a card allows selecting the type of output" — the
 *     user-directed contract extension (2026-08-14): mp4|webm video, flac|mp3
 *     audio, png-only image. ``id`` is the wire value of the family's
 *     ``output_format`` param (a family-signature Literal — the compile-layer
 *     vocabulary gate) AND the SAVE_MAP key the builder's save node reads.
 *     Zero drift is pinned by test_outputs_contract.py: declared ids ==
 *     Literal values == SAVE_MAP keys == served schema Field options.
 *
 *     ``params`` declares per-format gated params (e.g. mp3_quality only for
 *     ``mp3``) — informational for the frontend; the schema Field's
 *     ``visible_when`` is the actual form gate, the family signature the
 *     enforcement (extra="forbid" param_model).
 *
 *     Declaration lives on the family's catalog block (``outputs:``); the
 *     form-spec emitter serves it as ``features["outputs"]``. A family that
 *     declares nothing behaves exactly as before (no output-type surface) —
 *     zero behavior change unless declared.
 */
export type OptionalOutput = {
    /** Name */
    name: string;
    /** Label */
    label: string;
    /** Emit When */
    emit_when: string;
    /** Genre */
    genre?: string | null;
    /** Tooltip */
    tooltip?: string | null;
    /** Icon */
    icon?: string | null;
    mask_layer?: MaskLayerKind | null;
};
/**
 * PresetEntry
 * @description One named recipe preset on a family card.
 *
 *     A preset is a SHORTCUT over recipe params — sampling steps/guidance/
 *     sampler, prompt templates, multi_image flags. It NEVER switches the
 *     checkpoint. That is the load-bearing invariant: **variants change the
 *     checkpoint (and share the family's modifier catalog); presets change
 *     the recipe and structurally cannot escape LoRA/ControlNet
 *     compatibility.** This is why LoRAs that apply to base also apply to
 *     lightning/turbo — presets can't break it because they have no way to
 *     reach a different checkpoint.
 *
 *     Enforced structurally: there is deliberately NO ``model`` / ``source``
 *     field here. A "preset" that needs a different checkpoint is a variant,
 *     not a preset, and belongs in the variant system. ``params`` is the
 *     only lever a preset has, and its keys are family-specific (trellis:
 *     ss_sampling_steps/ss_guidance_*; edit: prompt/negative_prompt).
 *
 *     The catalog is the single source of truth — the old Python
 *     ``<NAME>_PRESETS`` dicts (TRELLIS_PRESETS, EDIT_PRESETS) and the
 *     module-scan auto-discovery are gone. A preset is a YAML line here.
 */
export type OutputEntry = {
    /** Id */
    id: string;
    /** Label */
    label: string;
    /**
     * Default
     * @default false
     */
    default: boolean;
    /** Params */
    params?: {
        [key: string]: unknown;
    } | null;
};
/** VariantGroup */
export type PresetEntry = {
    /** Label */
    label: string;
    /** Description */
    description?: string | null;
    /** Params */
    params: {
        [key: string]: unknown;
    };
    /** Mods */
    mods?: PresetModRef[] | null;
    /** Only Routes */
    only_routes?: string[] | null;
};
/**
 * PresetModRef
 * @description One ``mods:`` ref inside a preset (2026-08-16).
 *
 *     ``kind`` names the modifier bag by its param_key (== the mods/
 *     folder name); ``option`` must be DECLARED on that bag (its options,
 *     the model's lora_catalog, or variant-owned system LoRAs) — resolved
 *     AT LOAD against declared content, never a disk scan (CI-safe).
 *     ``strength`` rides along verbatim into the resolved wire params.
 *
 *     The resolution emits NO params for declaration_only bags (load-time
 *     effect only — the lanpaint synthesis) and ``{first_field_name:
 *     option, **extras}`` for grid bags.
 */
export type PresetModRef = {
    /** Kind */
    kind: string;
    /** Option */
    option: string;
    /** Strength */
    strength?: number | null;
};
/**
 * ProvisionArtifact
 * @description One downloadable artifact. The LINK is ``source:`` (model-level) or
 *     the aux artifact's own ``url:`` — declared exactly once.
 */
export type PromptGuide = {
    /** Title */
    title?: string | null;
    /** Sections */
    sections?: PromptGuideSection[] | null;
};
/**
 * FormSpec
 * @description The complete form descriptor for a model — /v1/form-spec's 200 body.
 */
export type PromptGuideSection = {
    /** Label */
    label: string;
    /** Body */
    body?: string | null;
    /** Code */
    code?: string | null;
    /** List */
    list?: unknown[] | null;
};
/** PromptGuide */
export type ProvisionArtifact = {
    /** Url */
    url?: string | null;
    dest: ProvisionDest;
    /** Local Filename */
    local_filename?: string | null;
    /** Marker */
    marker?: string | null;
    /** Size Hint Gb */
    size_hint_gb?: number | null;
    /** Layout */
    layout?: string | null;
    /** Gated */
    gated?: boolean | null;
    /** Staged Symlinks */
    staged_symlinks?: string[] | null;
    /** Converter */
    converter?: string | null;
    /** Optional */
    optional?: boolean | null;
};
/**
 * ProvisionDest
 * @description Root-token + optional subpath — the YAML spelling of a dest dir.
 */
export type ProvisionDest = {
    /** Root */
    root: string;
    /** Sub */
    sub?: string | null;
};
/**
 * ProvisioningSpec
 * @description Family-level provisioning: aux artifacts + converter + serving.
 */
export type ProvisioningSpec = {
    /** Artifacts */
    artifacts?: ProvisionArtifact[] | null;
    /** Serves */
    serves?: string[] | null;
    converter_out_dir?: ProvisionDest | null;
    /** Converter Outputs */
    converter_outputs?: string[] | null;
    /** Optional */
    optional?: boolean | null;
    /** Notes */
    notes?: string | null;
};
/**
 * StudioBindingWire
 * @description A custom studio view's frontend contract — declared in the
 *     studio.yaml (ONE definition site), merged onto the family entry at
 *     serve. The frontend's card registry resolves tenant → component and
 *     reads owns_params + the E4 writes allowlist from THIS wire shape.
 *
 *     Field-for-field the serve-time ``model_dump()`` of the declaration
 *     (all three keys ALWAYS present when ``studio`` rides a family) —
 *     ``FamilyEntryWire.studio`` itself stays optional because plain form
 *     families carry no binding at all.
 */
export type RunStageWire = {
    /** Id */
    id: string;
    /** Name */
    name: string;
    /** Index */
    index: number;
    /** Status */
    status: string;
} & {
    [key: string]: unknown;
};
/**
 * RunStatusWire
 * @description The wire status — the contract core + every runner extra (log_tail,
 *     params, flow_doc, ...). The emission serializes through THIS (the
 *     doc derives from it); contracts.RunStatus stays the strict core.
 */
export type RunStatusWire = {
    /** Run Id */
    run_id: string;
    /**
     * Status
     * @enum {string}
     */
    status: "pending" | "running" | "completed" | "failed" | "stopped" | "interrupted" | "unknown" | "queued";
    /** Stages */
    stages: RunStageWire[];
} & {
    [key: string]: unknown;
};
/**
 * CardSummary
 * @description The compact (non-zoomed) card's DECLARED summary lines.
 *
 *     The card tile shows three lines:
 *       1. Card Name  — the stage title (user data, not declared).
 *       2. Model, Variant — the family label + variant label (catalog-derived,
 *          identical derivation for every family, not declared per-family).
 *       3. WIDTH x HEIGHT — the output dimensions, read from the two params
 *          named here. ``width_param`` / ``height_param`` are param keys in the
 *          stage's ``params`` (e.g. ``width`` / ``height`` for the image
 *          families). A family that omits ``card_summary`` (or either field)
 *          renders no dimension line — the view never free-codes
 *          "if family == 'krea-2' read params.width". One declaration, one
 *          consumer (the frontend CardTile). (2026-08-09 — the "brush up the
 *          card view, make it declarative" policy.)
 *
 *     Upscale families express their size as a SINGLE value (not a WxH pair):
 *     SeedVR2 carries a target long-edge ``resolution``; pixel-SR carries the
 *     model's inherent ``nominal_scale`` multiplier. Their card_summary declares
 *     ``size_param`` + ``size_suffix`` (e.g. "2048px" / "4x") so the compact
 *     card renders the same dimension line every other generation card carries.
 *     A family uses EITHER the width/height pair OR the size_param single value
 *     -- never both.
 */
export type StudioBindingWire = {
    /** Tenant */
    tenant: string;
    /**
     * Owns Params
     * @default false
     */
    owns_params: boolean;
    /** Writes */
    writes: string[];
    /**
     * Size
     * @description Presentation notch (web-registry §7): the body frame's
     *     size class — normal | wide | huge. Rides the claim; the shell
     *     reads it instead of hardcoding.
     * @default normal
     */
    size?: string;
    /**
     * Layout
     * @description Presentation notch (web-registry §7): studio = the
     *     full-bleed authoring surface; panel = embedded beside the rail.
     * @default studio
     */
    layout?: string;
} & {
    [key: string]: unknown;
};
/**
 * TransformApplicability
 * @description One media-type-gated source param: WHICH media types it applies to.
 *
 *     The closed ``name`` Literal is the platform's vocabulary of media-type-
 *     gated source params — it mirrors the gated kwargs of the input_prep
 *     builder (crop / scale / trim / volume). A typo in the YAML
 *     hard-fails the Pydantic parse at catalog load, the same honesty gate as
 *     ``ModifierField.type`` and ``FamilyEntry.accepts``. ``applies_to`` reuses
 *     the same closed media-type Literal, so a bad type is caught here too.
 *
 *     ``mask`` is NOT in the vocabulary (removed 2026-08-14 with the input
 *     card's mask feature) — masked editing lives with the dedicated
 *     mask_studio family, whose inpaint slots consume
 *     ``input_mask``/``lanpaint_mask`` (a different, upload-key vocabulary in
 *     never a gated source param here.
 *
 *     ONE declaration (the family's ``transforms:`` block) feeds TWO consumers:
 *     the backend builder's ``_validate_params_for_media`` RAISES on a stale
 *     transform (e.g. crop on a video — refuses to silently drop), and the
 *     frontend ``InputCardEditor`` GATES which fields render (e.g. no trim
 *     control for an image — there is no time axis to crop). This is the
 *     declarative replacement for the hardcoded if/raise that lived in BOTH
 *     layers; the matrix is declared once, validated here, read by both sides.
 *     (2026-08-09 — the "make it declarative where we can" policy.)
 */
export type TransformApplicability = {
    /**
     * Name
     * @enum {string}
     */
    name: "crop" | "scale" | "trim" | "volume";
    /** Applies To */
    applies_to: ("image" | "video" | "audio")[];
};
/**
 * VideoAudio
 * @description Audio capability flags for a video family. Uses ``StrictBool`` so YAML
 *     strings like ``"yes"`` are rejected (legacy ``_is_bool`` behavior).
 */
export type VariantEntryWire = {
    /** Id */
    id: string;
    /** Label */
    label: string;
    /** Defaults */
    defaults: {
        [key: string]: unknown;
    };
    /** Group */
    group?: string | null;
    /** Hint */
    hint?: string | null;
    /** Route */
    route?: string | null;
    /** Engine */
    engine?: string | null;
    /** Quant */
    quant?: string | null;
    /** Vram Peak Gb */
    vram_peak_gb?: number | null;
    /** Note */
    note?: string | null;
    /** Hides Groups */
    hides_groups?: string[] | null;
    /** Only Routes */
    only_routes?: string[] | null;
    /** Strip */
    strip?: string[] | null;
    /** Owner */
    owner?: string | null;
    /** Live */
    live?: boolean | null;
} & {
    [key: string]: unknown;
};
/**
 * ModelEntryWire
 * @description The catalog's ModelEntry + the three backend-computed wire keys
 *     (input slot / full slot list / prompt-in-form) + typed variants.
 */
export type VariantGroup = {
    /** Label */
    label: string;
    /** Tooltip */
    tooltip?: string | null;
    /** Filters On */
    filters_on?: string | null;
};
/**
 * VideoRetake
 * @description Retake capability for a video family. Pathway is an enum constrained
 *     to KNOWN_RETAKE_PATHWAYS; extra keys rejected by ``extra="forbid"``.
 */
export type VideoAudio = {
    /** Native Audio */
    native_audio?: boolean | null;
    /** Lipsync */
    lipsync?: boolean | null;
    /** Narrator */
    narrator?: boolean | null;
};
/**
 * VideoManifest
 * @description Family-level engine capability contract.
 */
export type VideoManifest = {
    /** Conditioning */
    conditioning?: string[] | null;
    /** Modifiers */
    modifiers?: {
        [key: string]: ModifierEntry;
    } | null;
    audio?: VideoAudio | null;
    retake?: VideoRetake | null;
    /** Latent Upscale */
    latent_upscale?: boolean | null;
    /** Extra Params */
    extra_params?: string[] | null;
};
/**
 * FamilyEntryWire
 * @description Wire == declared catalog shape; extra keys tolerated (the catalog
 *     can grow without breaking the generated types).
 *
 *     ``studio`` is NOT declared in the catalog YAML — it flows from the
 *     action-cards studios/ declarations (form_declarations) at serve
 *     time, so the studio's folder stays its one definition site.
 */
export type VideoRetake = {
    /** Pathway */
    pathway: string;
    /** Supports Global Apply */
    supports_global_apply?: boolean | null;
};
/**
 * FormFeatures
 * @description Optional features declared per-model. ``modifiers`` is the ONE
 *     modifier shape; ``variants`` the ONE toggle-row shape; ``outputs`` the
 *     ONE declared output-format vocabulary (id == wire value of the
 *     output_format param == builder SAVE_MAP key).
 */
export type Violation = {
    /** Field */
    field: string;
    /** Kind */
    kind: string;
    /** Message */
    message: string;
} & {
    [key: string]: unknown;
};
/**
 * ErrorEnvelope
 * @description The ONE error envelope — every /v1/* error response carries this.
 */
//# sourceMappingURL=wireTypes.d.ts.map

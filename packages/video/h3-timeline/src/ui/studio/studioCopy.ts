/**
 * studioCopy.ts — THE STUDIO COPY DICTIONARY (the rail-law audit's
 * H8, 2026-10-31). Client UI copy is locale-owned (the estate's
 * decision, mirrored from card-base's square.ts): presentation code
 * owns no copy literals; it consumes them here through the typed
 * seat. A second locale plugs into this dictionary without touching
 * a single studio component.
 *
 * THE BOUND: static user-visible FACES live here (labels, titles,
 * placeholders, aria names). Computed LAW WORDINGS — a hover title
 * that narrates its lane's own rule with live numbers ("3 claimed —
 * the loader holds 8 slots…") — are one-of-a-kind per seat and ride
 * the seat; the dictionary would only rename them, not own them.
 * The refusal/error literals that EVERY seat shares live in
 * refUtils (FOREIGN_URL_REFUSAL, REF_READ_ERROR) — one law, one
 * home, not two.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const studioCopy = {
  /** Image-bus label (terse face law, 2026-11-05: the anchor-slot
   *  prose died with the anchor face — the cap tail carries the
   *  count; labels are faces, prose lives in hint seats). */
  imagesBusLabel: "Images",
  /** Ref-videos lane label (terse, symmetric with the sister lanes). */
  refVideos: "Videos",
  /** Ref-audios lane label (terse, symmetric with the sister lanes). */
  refAudios: "Audios",
  /** Ref-mods lane label (engine-side packs). */
  refMods: "Ref mods (packs)",
  /** The mods chip strip's hover action. */
  removePack: "remove this pack",
  /** The mods path door's placeholder (the wire's example path). */
  /** The mods path door's accessible name. */
  /** The anchor slot's square caption (the bus's slot 1). */
  anchorSlot: "anchor ref · slot 1",
  /** The seam picker's carried option. */
  seamCarried: "carried — drift-control chain",
  /** The seam picker's cut option. */
  seamCut: "cut — independent window",
  /** The strip pane's head. */
  timelineTitle: "Timeline",
  /** The preview pane's head. */
  previewTitle: "Preview",
  /** The preview's empty state (the run order, in one line). */
  previewEmpty: "No render yet — author the calls below, then Run.",
  /** Focused mode's back door. */
  backToGlobal: "Back to global parameters",
  /** The seam picker's hover law (how carried vs cut join). */
  seamHelp: "How this call joins the previous one: carried continues the previous window's latent through drift control (schedule-matched carry, soft audio release — seamless across the seam); cut is an independent window, a true butt",
  /** The prompt lane's enhance action. */
  enhanceAction: "Rewrite this call's prompt in H3 cinematic style",
  /** The prompt lane's empty-state placeholder (and its refusal hint). */
  promptPlaceholder: "describe the action, camera, and mood for this call — empty calls refuse the plan",
  /** The recipe engine's frame-rate seat. */
  fps: "FPS",
  /** (operator 2026-11-05) the GENERAL head — the studio-owned
   *  clock rides here above the generic knobs (fps is a doc
   *  control, not a card param; CardForm cannot seat it). */
  generalTitle: "General",
  /** (operator 2026-11-05: "THE FPS DIDN'T GET MOVED TO THE GENERAL
   *  knobs below it. */
  /** The refs-clips lane's per-clip removal. */
  removeClip: "remove the clip",
  /** The declared chip's card tag (the inherit arm's marker). */
  declaredCardTag: "card",
  /** The bucket door-guard's stand-down default (a pinned window owns its audio). */
  pinnedStanddown: "pinned window — this input stands down",
  /** The bus-count tail's pinned dot. */
  countPinnedTail: " · pinned",
  /** The bus-count tail's override dot. */
  countOverridesTail: " · overrides",
  /** The declared chip's hover law (card-level defaults ride until a stated lane replaces them). */
  declaredChipTitle: (url: string): string =>
    `card-level default — rides this window while the call states no chips of its own (a stated lane replaces it; edit via the card params)\n${url}`,
  /** The mod chip's hover law (engine-side packs stem into the loader). */
  modChipTitle: (chip: string): string =>
    `engine-side pack — the compose stems it into the loader (must be .safetensors under models/refmods/)\n${chip}`,
    /** The call head shared by the focused card and the compact row (one face, two seats). */
  modelCallHead: (index: number): string => `#${index} · Model call ${index + 1}`,
  /** The card header's span readout (frames, span seconds, seam-carried delivery). */
  spanReadout: (start: number, end: number, spanSec: string, deliveredSec: string): string =>
    `frames ${start}–${end} · span ${spanSec}s → delivered ${deliveredSec}s`,
  /** The knob badge (per-call override count). */
  knobTag: (count: number): string => `${count} knob${count === 1 ? "" : "s"}`,
  /** The call Delete button's accessible name. */
  deleteCallAria: (index: number): string => `Delete call ${index}`,
  /** The call Delete button's visible verb. */
  deleteAction: "Delete",
  /** The span row's head. */
  spanWord: "Span",
  /** The span start field's label. */
  callStartLabel: (index: number): string => `Call ${index} start frame`,
  /** The span end field's label. */
  callEndLabel: (index: number): string => `Call ${index} end frame`,
  /** The span row's ripple note. */
  spanNote: "the frame where this call ends — the next call starts there",
  /** The reference bundle's head. */
  refsHead: "Reference bundle (this call)",
  /** The image lane's add-row verb. */
  addRefImage: "+ image",
  /** The add-row faces, one per lane (symmetric law, 2026-11-05). */
  addRefVideo: "+ video",
  addRefAudio: "+ audio",
    /** The knob fold's head. */
  knobsHead: "Call knobs",
  /** A knob row's accessible name. */
  callKnobAria: (index: number, knob: string): string => `Call ${index} knob: ${knob}`,
  /** The data-URL chip's slot label. */
  uploadChipLabel: (slot: number): string => `upload ${slot}`,
  /** The prompt lane's head. */
  promptHead: "the prompt this call sends to H3",
  /** The enhance button's accessible name. */
  enhanceCallPromptLabel: (index: number): string => `Enhance call ${index} prompt`,
  /** The enhance button's in-flight face. */
  enhancingNow: "enhancing…",
  /** The enhance button's rest face. */
  enhanceStyleAction: "✨ H3 style",
  /** The undo-enhance button's accessible name. */
  undoEnhanceCallPromptLabel: (index: number): string => `Undo enhance call ${index} prompt`,
  /** The undo-enhance button's visible verb. */
  undoAction: "↩ undo",
  /** The prompt textarea's accessible name. */
  callPromptAria: (index: number): string => `Call ${index} prompt`,
  /** The rail's head in global mode. */
  /** The rail's hint (rows, prompts, guides, the compiler's cut law). */
  /** The focused mode's back action. */
  globalAction: "Global",
  /** The compact row's empty-prompt face. */
  /** A duration in whole seconds with its unit (call rows, keyframe times). */
  secondsLabel: (value: string): string => `${value}s`,
  /** The keyframes panel's head (operator 2026-11-05: keyframes ARE
   *  the surface — never "legacy", never an escape hatch). */
  keyframesTitle: "Keyframes",
  /** The keyframes panel's hint: the pin contract, terse. */
  keyframesHint: "image pins — endpoint pins anchor the window's first/last frame",
  /** A keyframe row's frame field label. */
  keyframeFrameLabel: (index: number): string => `Keyframe ${index} frame`,
  /** A keyframe row's source square label. */
  kfSourceLabel: (index: number): string => `kf ${index}`,
  /** A keyframe row's source square accessible name. */
  keyframeAria: (index: number): string => `Keyframe ${index}`,
  /** A keyframe row's Delete button accessible name. */
  deleteKeyframeAria: (index: number): string => `Delete keyframe ${index}`,
  /** A keyframe row's Delete tooltip (the pin channel has one kind). */
  deleteKeyframeTip: "Delete this keyframe",
  /** A guide square's label. */
  guideSlotLabel: (kind: "clip" | "audio"): string => `${kind} guide`,
  // ── Phase-0 nativity cures + slice-3 keys (2026-11-05, the dict-first
  // law: every new literal below is planted BEFORE its consumers land —
  // audit rows F-B1/F-B2/F-B3/F-B6/F11 in
  // dev_docs/audits/contracts/nativity-2026-11-05-timeline-card-a.md) ──
  /** The strip clip's chrome head: index · seconds — prompt text (F-B1;
   *  consumed at docCalls.ts clip-header; the spanReadout class). */
  clipHeader: (index: number, seconds: string, text: string): string => `C${index + 1} · ${seconds}s — ${text}`,
  /** The bus-count tail's over-cap arm (F-B2; consumed CallCard ×2). */
  overCapTail: "over cap",
  /** The bus-count tail's over-bus arm (F-B2; consumed CallCard). */
  overBusTail: "over bus",
  /** The image guide lane's gutter name (F-B3; VIDEO_TIMELINE_TRACKS). */
  imageGuideLane: "Keyframes",
      /** A keyframe-lane chip's accessible name (F-B6; slice 3's lane UI). */
  keyframeLaneChipAria: (frame: number): string => `Image pin at frame ${frame}`,
  /** A keyframe-lane chip's visible frame readout (F-B6; slice 3). */
  keyframeFrameReadout: (frame: number): string => `${String(frame)}`,
  /** The drop hint when a pin will snap to a window boundary (F-B6). */
  dropSnapHint: "snap to window edge",
  /** The drop hint when a pin stays interior to its window (F-B6). */
  dropInteriorHint: "interior guide",
  /** The strip refusal when a pin lands outside every window (F-B6;
   *  the plan door's own refusal, surfaced). */
  gapRefusal: "that frame is outside every call window — pins ride inside a window",
  /** The keyframe lanes' hint when no pins exist (F11; strip prop). */
  keyframeLaneHint: "double-click a lane to pin an image at that frame",
  /** The strip's empty-calls hint (F11; strip prop, was a raw literal). */
  stripEmptyPromptsHint: "No calls — double-click the timeline to add one",
  /** The preview pane's empty face hint (F11; StudioPreview). */
  previewEmptyHint: "render a run to see the film",
  /** The preview pane's frames meta (F11; StudioPreview). */
  previewFramesMeta: (frames: number, fps: number): string => `${String(frames)} frames · ${String(fps)} fps`,
  /** The preview pane's cut meta (F11; StudioPreview). */
  previewCutMeta: (index: number, count: number): string => `cut ${String(index + 1)} / ${String(count)}`,
  /** A guide square's accessible name. */
  callGuideSlotLabel: (callIndex: number, kind: "clip" | "audio"): string => `Call ${callIndex} ${kind} guide`,
  /** The seam row's head. */
  seamWord: "seam",
  /** The seam picker's field label. */
  seamModeLabel: (callIndex: number): string => `Call ${callIndex} seam mode`,
  /** The recipe group's head. */
  /** The clips row's head. */
  clipsTitle: "Clips",
  /** The clips count face (clips present). */
  clipsCountNote: (count: number): string =>
    `${count} clip${count === 1 ? "" : "s"} on the audio lanes — drag to move, × to remove`,
  /** The clips count face (no clips yet). */
  clipsEmptyHint: "none — add from a lane's ⤴ in the timeline, or drop a file on any lane",
  /** The door-guard hint (clips pin their windows). */
  clipsGuardHint: "pinned windows own their audio: music clip ⇒ no bed there · dialogue/sfx clip ⇒ ref audios mute there — no accidental overlap",
  /** The lane inspector's head. */
  lanesInspectorTitle: "Lanes — words & events",
  /** The dialogue lane's option face. */
  laneDialogue: "Dialogue",
  /** The music lane's option face. */
  laneMusic: "Music",
  /** The sfx lane's option face. */
  laneSfx: "SFX",
  /** The lane picker's accessible name: the clip's own name leads. */
  laneSelectLabel: (name: string): string => `${name} lane`,
  /** The dialogue lane's text placeholder. */
  dialoguePlaceholder: "the exact spoken words (verbatim, unabridged — they move the mouth)",
  /** The sfx lane's text placeholder. */
  sfxPlaceholder: "the event the soundscape times (e.g. a sudden explosion rocks the room)",
  /** The music lane's text placeholder. */
  musicPlaceholder: "music description (rides non_diegetic_music)",
  /** The run-history row's head. */
  runsTitle: (count: number): string => `Runs (${count})`,
  /** A run-history chip's visible face (short id + duration). */
  historyChipLabel: (shortId: string, duration: string | number): string => `${shortId} · ${duration}s`,
  /** The final-cut bar's head. */
  finalCutTitle: "Final cut",
  /** The final-cut bar's time readout. */
  cutTimeLabel: (sec: string, frame: number, total: number): string => `${sec}s · frame ${frame}/${total}`,
  /** The final-cut bar's open action. */
  openAction: "open",
  /** A window tile's fallback name word. */
  windowTileWord: "window",
  /** The strip's meta line (calls, frames, clock, seconds). */
  stripMeta: (args: { calls: number; frames: number; fps: number; seconds: string }): string =>
    `${args.calls} call${args.calls === 1 ? "" : "s"} · ${args.frames} fr · ${args.fps} fps · ${args.seconds}s`,
  /** The strip's hint (one card = one call, edges, extend, knobs dot). */
  stripHint: "one card = one model call · drag an edge = move the cut · double-click = edit · pull the tail = extend · cyan dot = knobs override · click a call = edit it in the left panel",
  /** The lane blocker (reference audio locks the D-M-E lanes). */
  laneBlockedMessage: "reference audio is wired on a call — the dialogue / music / SFX lanes are LOCKED (the clips and the audio inputs are mutually exclusive; clear the call's Ref audios to place clips)",
  /** The bar's calls lane label. */
  callsLabel: "Calls",
  /** The document readout (calls, seconds, guides, knobbed calls). */
  docReadout: (args: { calls: number; seconds: string; guides: number; knobs: number }): string =>
    `${args.calls} call${args.calls === 1 ? "" : "s"} · ${args.seconds}s · ${args.guides} guide${args.guides === 1 ? "" : "s"}${args.knobs > 0 ? ` · ${args.knobs} call${args.knobs === 1 ? "" : "s"} with knobs` : ""}`,
  /** The unwired-keyframes warning. */
  unwiredWarning: (count: number): string =>
    `${count} keyframe source${count === 1 ? "" : "s"} unwired — wire them below or the run door names them as TODOs.`,
  /** The run fold's head. */
  runParametersTitle: "Run parameters",
  /** The run fold's layer note. */
  runLayerNote: "Layer A — global · calls inherit",
  /** The Steps knob's face. */
  knobSteps: "Steps",
  /** The Denoise knob's face. */
  knobDenoise: "Denoise",
  /** The Sampler knob's face. */
  knobSampler: "Sampler",
  /** The Scheduler knob's face. */
  knobScheduler: "Scheduler",
  /** The Video shift knob's face. */
  knobShiftVideo: "Video shift",
  /** The Audio shift knob's face. */
  knobShiftAudio: "Audio shift",
  /** The SLA sparsity knob's face. */
  knobSlaSparsity: "SLA sparsity",
  /** The SLA block size knob's face. */
  knobSlaBlockSize: "SLA block size",
  /** The SLA min seq len knob's face. */
  knobSlaMinSeqLen: "SLA min seq len",
  /** The SLA dense last steps knob's face. */
  knobSlaDenseLastSteps: "SLA dense last steps",
  /** The SLA protect audio knob's face. */
  knobSlaProtectAudio: "SLA protect audio",
  /** The SLA stabilize motion knob's face. */
  knobSlaStabilizeMotion: "SLA stabilize motion",
  /** The SLA ref protection knob's face. */
  knobSlaRefProtection: "SLA ref protection",
  /** The SLA dense backend knob's face. */
  knobSlaDenseBackend: "SLA dense backend",
  /** The SLA dense steps knob's face. */
  knobSlaDenseSteps: "SLA dense steps",
  /** The SLA full-prec accum knob's face. */
  knobSlaFullPrecAccum: "SLA full-prec accum",
  /** The Sharpen knob's face. */
  knobSharpen: "Sharpen",
  /** The Sharpen method knob's face. */
  knobSharpenMethod: "Sharpen method",
  /** The Sharpen strength knob's face. */
  knobSharpenStrength: "Sharpen strength",
  /** The Sharpen radius knob's face. */
  knobSharpenRadius: "Sharpen radius",
  /** The Sharpen noise gate knob's face. */
  knobSharpenNoiseGate: "Sharpen noise gate",
  /** The Sharpen iterations knob's face. */
  knobSharpenIterations: "Sharpen iterations",
  /** The Interpolate knob's face. */
  knobInterpolate: "Interpolate",
  /** The Interp model knob's face. */
  knobInterpModel: "Interp model",
  /** The Interp multiplier knob's face. */
  knobInterpMultiplier: "Interp multiplier",
  /** The Window length knob's face. */
  knobWindowLength: "Window length (frames)",
} as const

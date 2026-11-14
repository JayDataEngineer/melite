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
export declare const studioCopy: {
    /** Image-bus label (terse face law, 2026-11-05: the anchor-slot
     *  prose died with the anchor face — the cap tail carries the
     *  count; labels are faces, prose lives in hint seats). */
    readonly imagesBusLabel: "Images";
    /** THE SETTLEMENT VOICE (h¹, the flip-settlement law): the pick
     *  gate reseated the family-dead strand to land the pick — it
     *  names the cleared keys and the lane that refuses them. A
     *  settlement is VOICED, never silent and never a bare refusal:
     *  the silent strand was the bricked-doc burn (the four keys
     *  stranded under a hidden tab until the pick gate gang-refused). */
    readonly gateSettled: (dropped: readonly string[]) => string;
    /** Ref-videos lane label (terse, symmetric with the sister lanes). */
    readonly refVideos: "Videos";
    /** Ref-audios lane label (terse, symmetric with the sister lanes). */
    readonly refAudios: "Audios";
    /** Ref-mods lane label (engine-side packs). */
    readonly refMods: "Ref mods";
    /** The mods path door's placeholder (the wire's example path). */
    /** The mods path door's accessible name. */
    /** The anchor slot's square caption (the bus's slot 1). */
    /** The strip pane's head. */
    readonly timelineTitle: "Timeline";
    /** The preview pane's head. */
    readonly previewTitle: "Preview";
    /** The preview's empty state (the run order, in one line). */
    readonly previewEmpty: "No render yet — author the calls below, then Run.";
    /** Focused mode's back door. */
    readonly backToGlobal: "Back to global parameters";
    readonly backToGlobalTip: "Back to the run's global parameters — or click any empty spot in the timeline";
    readonly audioSubTitle: "Audio";
    readonly audioSubHint: "positioned clips · per-lane wiring";
    /** The prompt lane's enhance action. */
    readonly enhanceAction: "Rewrite this call's prompt in H3 cinematic style";
    /** The prompt lane's empty-state placeholder (and its refusal hint). */
    readonly promptPlaceholder: "describe the action, camera, and mood for this call — empty calls refuse the plan";
    /** The recipe engine's frame-rate seat. */
    readonly fps: "FPS";
    /** (operator 2026-11-05) the GENERAL head — the studio-owned
     *  clock rides here above the generic knobs (fps is a doc
     *  control, not a card param; CardForm cannot seat it). */
    readonly generalTitle: "General";
    /** (operator 2026-11-05: "THE FPS DIDN'T GET MOVED TO THE GENERAL
     *  knobs below it. */
    /** The refs-clips lane's per-clip removal. */
    readonly removeClip: "remove the clip";
    /** The declared chip's card tag (the inherit arm's marker). */
    readonly declaredCardTag: "card";
    /** The bucket door-guard's stand-down default (a pinned window owns its audio). */
    readonly pinnedStanddown: "pinned window — this input stands down";
    /** The bus-count tail's pinned dot. */
    readonly countPinnedTail: " · pinned";
    /** The bus-count tail's override dot (the refs bus lanes' replace law). */
    readonly countOverridesTail: " · overrides";
    /** The bus-count tail's merge dot (the mods seat's merge law, G7 2026-11-08: the call's chips ride WITH the card mods). */
    readonly countMergedTail: " · merged";
    /** The declared chip's hover law (card-level defaults ride until a stated lane replaces them). */
    readonly declaredChipTitle: (url: string) => string;
    /** The mods bucket's declared chip hover (the merge law: the card mods ride every window; a call's chips merge with them). */
    readonly modDeclaredChipTitle: (url: string) => string;
    /** The declared mod chip's detach verb (G7's writer seat, 2026-11-09: the run-level lane is authored by the studio — the press writes the DOC verb). The detach button's accessible name. */
    readonly modDeclaredRemoveTitle: (url: string) => string;
    /** The mod chip's hover law (the any-media seat: media bakes, stems reuse). */
    readonly modChipTitle: (chip: string) => string;
    /** The call head shared by the focused card and the compact row (one face, two seats). */
    readonly modelCallHead: (index: number) => string;
    /** The card header's span readout (frames, span seconds, seam-carried delivery). */
    readonly spanReadout: (start: number, end: number, spanSec: string, deliveredSec: string) => string;
    /** The knob badge (per-call override count). */
    readonly knobTag: (count: number) => string;
    /** The call Delete button's accessible name. */
    readonly deleteCallAria: (index: number) => string;
    /** The call Delete button's visible verb. */
    readonly deleteAction: "Delete";
    /** The span row's head. */
    readonly spanWord: "Span";
    /** The span start field's label. */
    readonly callStartLabel: (index: number) => string;
    /** The span end field's label. */
    readonly callEndLabel: (index: number) => string;
    /** The span row's ripple note. */
    readonly spanNote: "the frame where this call ends — the next call starts there";
    /** The reference bundle's head. */
    readonly refsHead: "Reference bundle (this call)";
    /** THE CONTEXT-CARRY MODES (the window editor's seam seat, spelled
     *  whole — three states, one seat; the strip's chip stays the
     *  quick cut toggle, this modal owns the full vocabulary). */
    readonly seamModeHead: "Context carry (the seam into this call)";
    readonly seamModeStock: "Stock";
    readonly seamModeCarry: "Carry";
    readonly seamModeCarryKeyframe: "Carry + keyframe";
    readonly seamModeStockTip: "stock — no context carry: this window renders independent, a true butt against the last (the operator's manual escape hatch — NEVER the default, never agent-authored; H3 hard-cuts on its own when a shot must start fresh)";
    readonly seamModeCarryTip: "carry — the latent tail continues across the seam at the proven 22-frame overlap (the default)";
    readonly seamModeCarryKeyframeTip: "carry + keyframe — the latent tail carries AND the previous window's final frame is pinned as this window's first frame (more consistent shots)";
    readonly seamModeAria: "Context carry mode";
    /** The image lane's add-row verb. */
    readonly addRefImage: "+ image";
    /** The add-row faces, one per lane (symmetric law, 2026-11-05). */
    readonly addRefVideo: "+ video";
    readonly addRefAudio: "+ audio";
    /** The knob fold's head. */
    readonly knobsHead: "Call knobs";
    /** A knob row's accessible name. */
    readonly callKnobAria: (index: number, knob: string) => string;
    /** The data-URL chip's slot label. */
    readonly uploadChipLabel: (slot: number) => string;
    /** (D2) The thumb's accessible name — opens the DSH lightbox. */
    readonly imagePreviewAria: (name: string) => string;
    /** (D2) ImageLightbox's dialog name — locale-owned copy for the
     *  DSH primitive's own labels, never hardcoded at the seat. */
    readonly imagePreviewDialog: "image preview";
    /** (D2) ImageLightbox's close-control label. */
    readonly imagePreviewClose: "close preview";
    /** The prompt lane's head. */
    readonly promptHead: "the prompt this call sends to H3";
    /** The enhance button's accessible name. */
    readonly enhanceCallPromptLabel: (index: number) => string;
    /** The enhance button's in-flight face. */
    readonly enhancingNow: "enhancing…";
    /** The enhance button's rest face. */
    readonly enhanceStyleAction: "✨ H3 style";
    /** The undo-enhance button's accessible name. */
    readonly undoEnhanceCallPromptLabel: (index: number) => string;
    /** The undo-enhance button's visible verb. */
    readonly undoAction: "↩ undo";
    /** The prompt textarea's accessible name. */
    readonly callPromptAria: (index: number) => string;
    /** The rail's head in global mode. */
    /** The rail's hint (rows, prompts, guides, the compiler's cut law). */
    /** The focused mode's back action. */
    readonly globalAction: "Global";
    /** The compact row's empty-prompt face. */
    /** A duration in whole seconds with its unit (call rows, keyframe times). */
    readonly secondsLabel: (value: string) => string;
    /** The keyframes panel's head (operator 2026-11-05: keyframes ARE
     *  the surface — never "legacy", never an escape hatch). */
    readonly keyframesTitle: "Keyframes";
    /** The keyframes panel's hint: the pin contract, terse. */
    readonly keyframesHint: "image pins — endpoint pins anchor the window's first/last frame";
    /** A keyframe row's frame field label. */
    readonly keyframeFrameLabel: (index: number) => string;
    /** A keyframe row's pick icon accessible name (defect B, operator
     *  2026-11-06: the rows work like the audio upload inputs — an icon
     *  that opens the source picker, never an image square). */
    readonly kfRowPickAria: (index: number) => string;
    /** A keyframe row's Delete button accessible name. */
    readonly deleteKeyframeAria: (index: number) => string;
    /** A keyframe row's Delete tooltip (the pin channel has one kind). */
    readonly deleteKeyframeTip: "Delete this keyframe";
    /** The strip head's door into the keyframes subview (defect B,
     *  operator 2026-11-06: the keyframe editor is its OWN standalone
     *  submenu — the door rides the strip head, named for the subview). */
    readonly keyframesDoor: "Keyframes";
    /** The strip head door's tooltip. */
    readonly keyframesDoorTip: "Open the keyframes editor";
    /** The subview's add-door aria — the pin lands at the playhead. */
    readonly kfAddAria: "Add keyframe at playhead";
    /** The subview's add-door tooltip: the three doors, named. */
    readonly kfAddTip: "Pick the pin's image — from flow, from media, or from file; the pin lands at the playhead";
    /** The subview's empty face — the pin doors, named. */
    readonly kfEmptyNote: "No pins yet — double-click the keyframes lane, or use the add door beside the title";
    /** A guide square's label. */
    readonly guideSlotLabel: (kind: "clip" | "audio") => string;
    /** The strip clip's chrome head: index · seconds — prompt text (F-B1;
     *  consumed at docCalls.ts clip-header; the spanReadout class). */
    readonly clipHeader: (index: number, seconds: string, text: string) => string;
    /** The bus-count tail's over-cap arm (F-B2; consumed CallCard ×2). */
    readonly overCapTail: "over cap";
    /** The bus-count tail's over-bus arm (F-B2; consumed CallCard). */
    readonly overBusTail: "over bus";
    /** The image guide lane's gutter name (F-B3; VIDEO_TIMELINE_TRACKS). */
    readonly imageGuideLane: "Keyframes";
    /** A keyframe-lane chip's accessible name (F-B6; slice 3's lane UI). */
    readonly keyframeLaneChipAria: (frame: number) => string;
    /** A keyframe-lane chip's visible frame readout (F-B6; slice 3). */
    readonly keyframeFrameReadout: (frame: number) => string;
    /** The drop hint when a pin will snap to a window boundary (F-B6). */
    readonly dropSnapHint: "snap to window edge";
    /** The drop hint when a pin stays interior to its window (F-B6). */
    readonly dropInteriorHint: "interior guide";
    /** The strip refusal when a pin lands outside every window (F-B6;
     *  the plan door's own refusal, surfaced). */
    readonly gapRefusal: "that frame is outside every call window — pins ride inside a window";
    /** (§0.5, the window split) the strip refusal when the split finds
     *  no legal frame (the 22f base / 17f step windows): the grid's
     *  shortest halves don't fit — the shared laneErr slot's voice. */
    readonly splitRefusal: "this window is too short to split — its shortest legal halves don't fit; lengthen it first";
    /** (D-19, the v2v lane-mirror cure 2026-11-18) the derived
     * whole-film window's OWN readout — the one span the armed edit
     * composes when no windows are authored, painted in the authoring
     * lane so the cut doors have their object. The words mirror the
     * commission row's carry seat (the same truth, the lane's voice). */
    readonly v2vDerivedWindowText: "whole film — derived join (Add cut authors the first spans)";
    /** (D-19) the derived window is READ-ONLY: a geometry gesture on it
     *  (drag body / drag edge / delete) answers LOUD in the shared
     *  laneErr slot — never a silent snap-back. The cut doors (Add cut,
     *  the divide seat) are the verbs that author real spans. */
    readonly v2vDerivedReadonly: "the whole-film window is derived — it mirrors the run; Add cut (or the divide seat) authors the first real spans";
    /** (queue 11 reopened, the FORM seat) the video2video leaf face's
     *  own words — the windows list + the split-by-timestamp seat the
     *  operator named ("NO WINDOWS IN THE FORM!"): the same copy law
     *  as the strip head's atoms, this dictionary's own census. */
    /** (queue 11 reopened) the windows list's row label — a
     *  parameterized face (W-index + the span's seconds + the seam +
     *  the text), riding OUTSIDE the flat single-line census by
     *  construction. */
    readonly v2vWindowRow: (index: number, startSec: string, endSec: string, seam: string, text: string) => string;
    readonly v2vFormHead: "Windows — the video-to-video spans this edit composes";
    readonly v2vFormHint: "each window is one span of the run; the split seat below cuts one in two";
    readonly v2vFormSplitLabel: "Split at (seconds)";
    readonly v2vFormSplitTip: "the timestamp to split at — 2 splits the containing window at 2s (snapped to the authoring lattice)";
    readonly v2vFormSplitPlaceholder: "at sec";
    readonly v2vFormCutAria: "Split the window";
    readonly v2vFormRefusal: "state a timestamp first — the form splits at the seconds you name, or the window is too short to halve";
    readonly v2vFormEmptyNote: "no windows yet — the timeline strip's calls section owns the spans; this list reads them";
    /** (C6, the imageless pin) a PENDING pin's chip faces — the
     *  double-click authors the frame first; the image rides only
     *  through the picker doors. Until it does, the chip NAMES its
     *  state on every face: the row the card cannot compose never
     *  looks settled (the run door's "image is required" refusal is
     *  the loud backstop). */
    readonly keyframePendingAria: (frame: number) => string;
    /** A pending pin's visible readout — the frame plus the state word. */
    readonly keyframePendingReadout: (frame: number) => string;
    /** The pending chip's drop hint / tooltip law — the repair and the backstop. */
    readonly keyframePendingHint: "no image yet — pick one in the keyframes editor; the run door refuses an imageless pin";
    /** The keyframe lanes' hint when no pins exist (F11; strip prop). */
    readonly keyframeLaneHint: "double-click a lane to pin an image at that frame";
    /** The strip's empty-calls hint (F11; strip prop, was a raw literal). */
    readonly stripEmptyPromptsHint: "No calls — double-click the timeline to add one";
    /** The preview pane's empty face hint (F11; StudioPreview). */
    readonly previewEmptyHint: "render a run to see the film";
    /** The preview pane's frames meta (F11; StudioPreview). */
    readonly previewFramesMeta: (frames: number, fps: number) => string;
    /** The preview pane's cut meta (F11; StudioPreview). */
    readonly previewCutMeta: (index: number, count: number) => string;
    /** A guide square's accessible name. */
    readonly callGuideSlotLabel: (callIndex: number, kind: "clip" | "audio") => string;
    /** The recipe group's head. */
    /** The clips row's head. */
    readonly clipsTitle: "Clips";
    /** The clips count face (clips present). */
    readonly clipsCountNote: (count: number) => string;
    /** The clips count face (no clips yet). */
    readonly clipsEmptyHint: "none — add from a lane's ⤴ in the timeline, or drop a file on any lane";
    /** The door-guard hint (clips pin their windows). */
    readonly clipsGuardHint: "pinned windows own their audio: music clip ⇒ no bed there · dialogue/sfx clip ⇒ ref audios mute there — no accidental overlap";
    /** The lane inspector's head. */
    readonly lanesInspectorTitle: "Lanes — words & events";
    /** The dialogue lane's option face. */
    readonly laneDialogue: "Dialogue";
    /** The music lane's option face. */
    readonly laneMusic: "Music";
    /** The sfx lane's option face. */
    readonly laneSfx: "SFX";
    /** The lane picker's accessible name: the clip's own name leads. */
    readonly laneSelectLabel: (name: string) => string;
    /** The dialogue lane's text placeholder. */
    readonly dialoguePlaceholder: "the exact spoken words (verbatim, unabridged — they move the mouth)";
    /** The sfx lane's text placeholder. */
    readonly sfxPlaceholder: "the event the soundscape times (e.g. a sudden explosion rocks the room)";
    /** The music lane's text placeholder. */
    readonly musicPlaceholder: "music description (rides non_diegetic_music)";
    /** The run-history row's head. */
    readonly runsTitle: (count: number) => string;
    /** A run-history chip's visible face (short id + duration). */
    readonly historyChipLabel: (shortId: string, duration: string | number) => string;
    /** The final-cut bar's head. */
    readonly finalCutTitle: "Final cut";
    /** The final-cut bar's time readout. */
    readonly cutTimeLabel: (sec: string, frame: number, total: number) => string;
    /** The final-cut bar's open action. */
    readonly openAction: "open";
    /** A window tile's fallback name word. */
    readonly windowTileWord: "window";
    /** The strip's meta line (calls, frames, clock, seconds). */
    readonly stripMeta: (args: {
        calls: number;
        frames: number;
        fps: number;
        seconds: string;
    }) => string;
    /** The strip's hint (one card = one call, edges, extend, knobs dot). */
    readonly stripHint: "one card = one model call · drag an edge = move the cut · double-click a card = edit it · double-click the ruler or empty lane = add a window · pull the tail = extend · cyan dot = knobs override · click a call = open it in the left panel";
    /** The lane blocker (reference audio locks the D-M-E lanes). */
    readonly laneBlockedMessage: "reference audio is wired on a call — the dialogue / music / SFX lanes are LOCKED (the clips and the audio inputs are mutually exclusive; clear the call's Ref audios to place clips)";
    /** The bar's calls lane label. */
    readonly callsLabel: "Calls";
    /** ── THE MOD-MODE CALLS FACES (operator 2026-11-14: "there is
     *  still the default call in the timeline bar that tells them to
     *  describe their video there, when that isn't used at all") — the
     *  lane names its calls-readership under an armed commission, so
     *  the default invitation never lies about the armed run. */
    /** The calls lane head under a NON-reading armed commission (the
     *  run composes from the bag alone — the lane is not read). */
    readonly callsDormantLabel: (kind: string) => string;
    /** The calls lane's empty hint under a NON-reading armed
     *  commission: why the starter stood down (the armed commission
     *  owns this run's inputs). */
    readonly callsDormantHint: (kind: string) => string;
    /** The calls lane head under a READING armed commission (reshoot,
     *  loras): the lane's text rides the run. */
    readonly callsPromptSeatLabel: (kind: string) => string;
    /** The calls lane's empty hint under a READING armed commission:
     *  describe the shot here — this text IS the run's prompt. */
    readonly callsPromptSeatHint: (kind: string) => string;
    /** ── THE VIDEO-TO-VIDEO AND CUTS FACE (queue 11, operator
     *  2026-11-08, verbatim: "WHEN YOU ADD THE MOD FOR VIDEO TO
     *  VIDEO, IT CHANGES THE TIMELINE BAR UNDER THE 'CALLS' SECTION
     *  FOR THE VIDEO TO VIDEO AND CUTS.") — the edit mod's presence
     *  swaps the calls lane into the cut-authoring face: the windows
     *  are the video-to-video spans, the ADD CUT door is visible on
     *  the strip's own head. */
    /** The calls lane head under the armed edit bag (the windows are
     *  the run's own video-to-video spans). */
    readonly callsV2vLabel: "Video-to-video — windows & cuts";
    /** THE V2V PROMPT SEAT (the no-UI burn, operator 2026-11-10:
     * "THERE IS NO USER INTERFACE FOR THE ACTUAL PROMPT THAT GOES —
     * THE AGENT MAKES ONE, THEN I GET NO UI FOR IT"): the edit's
     * prompt — the ONE text the run carries — renders on the strip
     * itself, first row under the header, the agent's authored text
     * visible and editable. Under v2v the calls' prose stands down;
     * THIS seat is the prose's lawful home on the user's surface. */
    readonly v2vPromptLabel: "Edit prompt — the text this run carries";
    readonly v2vPromptPlaceholder: "what happens in the edit (the agent's text lands here — edit it freely)";
    readonly v2vPromptTip: "The edit's own prompt seat — the one text the video-to-video run carries (the lane's windows and cuts read; each call's prose does not). What the agent composed shows here verbatim; typing edits the same seat.";
    /** The calls lane's empty hint under the armed edit bag. (D-19
     *  re-word 2026-11-18: the pre-cure sentence promised "Add cut
     *  divides the window" while the empty doc held no window — a verb
     *  with no object. The hint now states the whole-film truth; with
     *  the derived window painting, the lane is empty only when the
     *  axis itself has no extent — the belt, never the working state.) */
    readonly callsV2vHint: "Video edit is armed — the run edits the whole film as one window; author spans with Add cut (each window is one video-to-video span, cut seams only — never a chain)";
    /** The strip head's visible cut door (the queue-11 law: the
     *  ability to add cuts is a CONTROL on the face, never a hidden
     *  gesture). */
    readonly addCutDoor: "Add cut";
    /** The cut door's tip. */
    readonly addCutDoorTip: "Cut the window at the playhead into two (cut seam)";
    /** ── THE TIMESTAMP SPLIT SEAT (queue 11's second block, operator
     *  2026-11-08: "the video2video form that would allow clips to
     *  split by timestamp. I.e. split at 2 seconds, with the option
     *  to select how context is carried.") — the seconds input + the
     *  carry-mode menu beside the Add cut door. */
    /** The timestamp input's label. */
    readonly splitAtLabel: "Split at (seconds)";
    /** The timestamp input's tip. */
    readonly splitAtTip: "State a timestamp — the cut lands at that second instead of the playhead";
    /** The timestamp input's placeholder. */
    readonly splitAtPlaceholder: "at sec";
    /** The carry-mode menu's label. */
    readonly splitCarryLabel: "Context carry across the split";
    /** The carry-mode menu's tip. */
    readonly splitCarryTip: "How context carries across the new seam";
    /** The carry menu's stock row (no carry — the split's default). */
    readonly splitCarryStock: "Stock — no carry";
    /** The carry menu's carry row. */
    readonly splitCarryCarry: "Carry — 22-frame overlap";
    /** The carry menu's carry+keyframe row. */
    readonly splitCarryKeyframe: "Carry + keyframe";
    /** The prose doors' refusal under the v2v face: the edit composes
     *  from the mod's own prompt seat — the lane's TEXT is not read
     *  (its windows and cuts are). */
    readonly callsV2vProseHint: "Video edit composes from the mod's own prompt seat — this lane's windows and cuts are read, its prose is not";
    /** ── THE COMMISSION RAIL (§9's mod projection) ────────────────────
     *  One row per ARMED mod bag. The kind's face is the operator's own
     *  word for the door; the seats line names what the entry states;
     *  the geometry line names the windows the extend will build. */
    readonly commissionKindLabel: (kind: string) => string;
    /** A commission's armed row voice (what the row means). */
    readonly commissionRowTitle: (kind: string) => string;
    /** A present bag that is not an entry list: the run door refuses it
     *  (a bag is an array of exactly one entry), so the row says so. */
    readonly commissionMalformed: (kind: string) => string;
    /** A bag whose entry is not an object: armed, and the door refuses
     *  its missing seats — the row says so instead of hiding the arm. */
    readonly commissionBadEntry: (kind: string) => string;
    /** The seats↔geometry join on a commission row (punctuation owned
     *  by the dictionary, like the seats' own middle dot). */
    readonly commissionDetailJoin: " — ";
    /** The seats line: "source_clip clips/a.mp4 · strength 2". */
    readonly commissionSeats: (seats: ReadonlyArray<{
        key: string;
        value: string;
    }>) => string;
    /** The composition line: "4 × 243f · 12.730s". */
    readonly commissionGeometry: (args: {
        windows: number;
        windowFrames: number;
        deliveredFrames: number;
    }) => string;
    /** One window segment's face on the drawn window strip. */
    readonly commissionWindowSegment: (index: number, windowFrames: number) => string;
    /** The document readout (calls, seconds, guides, knobbed calls). */
    readonly docReadout: (args: {
        calls: number;
        seconds: string;
        guides: number;
        knobs: number;
    }) => string;
    /** The unwired-keyframes warning (C6: the studio's gate face names
     *  the PENDING state before the run — the door's refusal is the
     *  backstop, named here). */
    readonly unwiredWarning: (count: number) => string;
    /** The run fold's head. */
    readonly runParametersTitle: "Run parameters";
    /** The run fold's layer note. */
    readonly runLayerNote: "Layer A — global · calls inherit";
    /** The Steps knob's face. */
    readonly knobSteps: "Steps";
    /** The Denoise knob's face. */
    readonly knobDenoise: "Denoise";
    /** The Sampler knob's face. */
    readonly knobSampler: "Sampler";
    /** The Scheduler knob's face. */
    readonly knobScheduler: "Scheduler";
    /** The Video shift knob's face. */
    readonly knobShiftVideo: "Video shift";
    /** The Audio shift knob's face. */
    readonly knobShiftAudio: "Audio shift";
    /** The SLA sparsity knob's face. */
    readonly knobSlaSparsity: "SLA sparsity";
    /** The SLA block size knob's face. */
    readonly knobSlaBlockSize: "SLA block size";
    /** The SLA min seq len knob's face. */
    readonly knobSlaMinSeqLen: "SLA min seq len";
    /** The SLA dense last steps knob's face. */
    readonly knobSlaDenseLastSteps: "SLA dense last steps";
    /** The SLA protect audio knob's face. */
    readonly knobSlaProtectAudio: "SLA protect audio";
    /** The SLA stabilize motion knob's face. */
    readonly knobSlaStabilizeMotion: "SLA stabilize motion";
    /** The SLA ref protection knob's face. */
    readonly knobSlaRefProtection: "SLA ref protection";
    /** The SLA dense backend knob's face. */
    readonly knobSlaDenseBackend: "SLA dense backend";
    /** The SLA dense steps knob's face. */
    readonly knobSlaDenseSteps: "SLA dense steps";
    /** The SLA full-prec accum knob's face. */
    readonly knobSlaFullPrecAccum: "SLA full-prec accum";
    /** The Sharpen knob's face. */
    readonly knobSharpen: "Sharpen";
    /** The Sharpen method knob's face. */
    readonly knobSharpenMethod: "Sharpen method";
    /** The Sharpen strength knob's face. */
    readonly knobSharpenStrength: "Sharpen strength";
    /** The Sharpen radius knob's face. */
    readonly knobSharpenRadius: "Sharpen radius";
    /** The Sharpen noise gate knob's face. */
    readonly knobSharpenNoiseGate: "Sharpen noise gate";
    /** The Sharpen iterations knob's face. */
    readonly knobSharpenIterations: "Sharpen iterations";
    /** The Interpolate knob's face. */
    readonly knobInterpolate: "Interpolate";
    /** The Interp model knob's face. */
    readonly knobInterpModel: "Interp model";
    /** The Interp multiplier knob's face. */
    readonly knobInterpMultiplier: "Interp multiplier";
    /** The Window length knob's face. */
    readonly knobWindowLength: "Window length (frames)";
};
//# sourceMappingURL=studioCopy.d.ts.map
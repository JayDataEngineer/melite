/** stagePreview.ts — the keyed `cards.stage.preview` slot's OWNER
 *  currency (the preview seam, 2026-09-13 hour-9 — the operator's
 *  law: "there should be a PREVIEW seem. Where the VIDEO PREVIEW and
 *  the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"). One seam, keyed by MEDIA KIND: every card's
 *  rendered output previews through the same shared components —
 *  video and image today — built on DSH primitives, never bespoke
 *  per-card preview islands. */
/** One rendered output: its name (the artifact key) and its url. */
export interface PreviewArtifact {
    name: string;
    url: string;
}
/** The preview seam's owner currency: what a stage produced, plus
 *  the live-run flag for honest progress states. Keyed by `kind`
 *  ('video' | 'image' | 'audio' | 'mesh' | 'text'); an unclaimed key falls
 *  back to the host's own presentation.
 *
 * THE PRIMARY-OUTPUT LAW (2026-09-13): the kind is the CARD'S
 * DECLARED primary output — form-spec `outputs.default` — never a
 * url sniff. The url shapes stay only as the fallback when no
 * declaration is in hand (spec absent or a non-previewable declared
 * kind like seg whose artifacts may still carry a renderable
 * url). */
export interface PreviewOwnerProps {
    /** Media kind — the keyed dispatch value (the card's declared
     *  primary output; url-sniffed only as the fallback). Text is a
     *  first-class kind (the tagger stroke, 2026-10-24): a declared
     *  `default: 'text'` previews through TextStagePreview — the
     *  card's words land visible + copyable, never a dead tile. */
    kind: 'video' | 'image' | 'audio' | 'mesh' | 'text';
    /** The stage's rendered outputs (empty while none have landed). */
    artifacts: PreviewArtifact[];
    /** The estate's runStatus word ('' when never run). */
    runStatus: string;
    /** Bench stage identity (for keyed React identity downstream). */
    stageId: string;
    /** THE RUN IDENTITY (2026-09-20, the operator's catch: "random
     *  when I click"): the CURRENT result's run_id — STABLE across the
     *  whole run cycle (the start patch's {run_id}-only result and the
     *  terminal result carry the SAME id). The history pick cell keys
     *  on stageId + runId, so a pick survives the result row's
     *  url-flip churn; a NEW run is a fresh cell (the intended reset).
     * Absent '' = pre-run (the artifacts-urls fallback keys the cell,
     *  the legacy behavior). */
    runId?: string;
    /** THE OUTPUT HISTORY (stroke 40 — the operator's QOL law: the
     *  mini row under the main preview is a CARD OUTPUT HISTORY):
     *  the stage's PREVIOUS unique outputs, newest first, capped at
     *  12 by the estate (derived server-side at every result
     *  overwrite — the live poll's progress faces never destroy a
     *  run's outputs; a re-run landing the same urls never
     *  double-lists). Each entry is one past run's artifact set —
     *  the hero's own run is NOT in it. Absent on lanes/rows without
     *  history. */
    history?: PreviewArtifact[][];
    /** THE STRIP OPT-OUT (output-component gap 4, stroke 67 — the
     *  operator's sketch: "advanced cards can flip the bottom bar
     *  off"): SERVED by the card's declaration (CardDefinition.preview
     *  → the form-spec doc's `preview.historyStrip`), read here by the
     *  owner build. Absent/true = ON (the default — the strip is the
     *  QOL law); false = the card claims its own bottom bar (the
     *  h3-timeline law: an advanced card's timeline IS the history). */
    historyStrip?: boolean;
    /** THE PARAMS CHIP (the output-component stroke — "old
     *  generations that had different parameters"): index-aligned
     *  with `history`; entry i carries the comma-joined KEYS whose
     *  values differ between history[i]'s params snapshot and the
     *  live params (the estate snapshots at result landing —
     *  remote.ts; undefined when the entry predates snapshots or
     *  nothing differs). Rendered beside the not-current badge. */
    historyNotes?: string[];
    /** THE LIVE FIGURE (stroke 90 + the live follow-up — the
     *  keep-all-features order): the native shaped mesh the stage
     *  renders BEFORE any run output exists (anny's /poser bind
     *  mesh). The CLAIM (`identityModel`) is served by the card's
     *  declaration (CardDefinition.preview.figure → the form-spec
     *  doc's `preview.figure`); the LIVE arms (`identityCoeffs`,
     *  `localChanges`) are derived CLIENT-SIDE from the card's
     *  resolved params at the owner build — the figure REShapes as
     *  the user drags (the studio's live-sculpt capability, on the
     *  shared fetchBindMesh surface). Run artifacts take the stage
     *  once they land — the figure never competes with a real
     *  output. */
    figure?: {
        identityModel: string;
        identityCoeffs?: number[] | null;
        localChanges?: Record<string, number> | null;
        /** the LIVE camera arms (the turnaround rail): framing = the
         *  distance factor, focalLength = the lens mm — camera facts
         *  move the VIEWPORT camera, never the mesh. */
        framing?: number | null;
        focalLength?: number | null;
    };
    /** THE ATTACHED MESH (the (j) law, 2026-11-08): the held
     *  mesh-kind inputs the run would compose (anny's body_glb) —
     *  the preview shows the body THE RUN WOULD BAKE, so an attached
     *  GLB renders as-is through the input asset door and the
     *  parametric figure retires (a native figure under an attached
     *  GLB would preview a body the run never bakes). Derived
     *  CLIENT-SIDE from the served schema's mesh-kind fields × the
     *  resolved values (whitespace IS emptiness — anny's own compose
     *  law); one asset per non-empty mesh field, declaration order.
     *  Run artifacts still take the stage the moment they land. */
    attachedMesh?: Array<{
        id: string;
        url: string;
        name: string;
    }>;
    /** THE ATTACHED IMAGE (the (l) law, 2026-11-08): the held
     *  image-kind input the run would compose (anny's body_image) —
     *  compose's ONE stated precedence is image > glb > parametric,
     *  so a stated photo IS the pre-run face (the estimate the run
     *  will bake, shown in the preview), and both the attached GLB
     *  and the parametric figure retire under it (showing either
     *  would preview a body the run will not bake). Derived
     *  CLIENT-SIDE from the served schema's image-kind fields × the
     *  resolved values, FIRST non-empty field wins (whitespace IS
     *  emptiness — anny's own compose law); the url rides the same
     *  input asset door (the door's grammar is name-based, never
     *  kind-based). Run artifacts still take the stage the moment
     *  they land. */
    attachedImage?: {
        id: string;
        url: string;
    };
}
//# sourceMappingURL=stagePreview.d.ts.map

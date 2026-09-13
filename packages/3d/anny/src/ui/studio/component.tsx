/**
 * AnnyStudio — tenant 3d/anny, the character-body authoring surface.
 *
 * A SLOT-TABLE DECLARATION, not an implementation (the generic
 * abstraction: every assembly body runs the shared AssemblyStudio —
 * part-slot rail + Stage viewport + loud errors). The studio-slots
 * wall parses ANNY_SLOTS (keys ⊆ the card's File fields ∩ the
 * family's studio.writes) and the kind⟺body parity (kind=assembly
 * ⟺ the generic is imported) — declaration drift refuses.
 *
 * E1: onSave (the part keys, per studio.writes) is the ONLY
 * param write channel. Turnaround knobs ride the shell's Node inputs
 * fold + the standard detail form (owns_params=False).
 *
 * DESCOPE 2026-09-05 (operator order): hair/outfit inputs LEFT the
 * anny card — clothing composite returns later as its own
 * trellis-clothing card. Body (+ the HMR source photo, pilot arc)
 * is the card.
 */
import { useEffect, useState } from "react"
import { collectStageUrls, ensureDraftId, estateInputUrl, pollFlowRun } from "@melite/catalog"
import { Button, Input } from "@deepseek-ai/dsh-client-ui-primitives"
import { Checkbox, NumberField, SelectMenu, VerbChip } from "./controls"
import { SlotSquare } from "./slot"
import { readAsDataURL } from "@melite/card-base/chrome"
import { ReferenceImageBadge, ViewportAnchor, ViewportFrame } from "./viewport"
import { RailSection, StudioShell, defineShellDeclaration } from "@melite/card-base/shell"
import styles from "./component.module.css"
import { AssemblyStudio, type AssemblySlot, type AssemblyStudioProps } from "./assembly"
import { RailTabs, type RailTabItem } from "./railTabs"
import { AnnyShapeBand, AnnyShapeDrawer, AnnyCharacterViewport, useAnnyShapeBridge, seedFromEstimate, type SculptDraftDoc } from "./shape"
import { fetchIdentitySpace } from "@melite/formats/poserSkin"
import { useBodyStudio } from "@melite/cards/3d/body/ui/studio/bodyStudio"

export const ANNY_SLOTS: AssemblySlot[] = [
  // Body is REQUIRED=false: empty autoloads the Model-declared
  // neutral base body (anny-base-body.glb — pilot stroke 2,
  // docs/design/anny-base-body.md); the phase-1 door resolves and
  // names it, and refuses loudly when it is not provisioned.
  { key: "body_glb", label: "Body", required: false, accept: "glb", glyph: "body" },
  { key: "source_image", label: "Source photo", required: false, accept: "image", glyph: "photo" },
]

/** THE SHELL RIDE, as data (row 5 stroke 4): the ONE-MESH order —
 *  the tenant's OWN figure viewport is the mesh (kind "native", no
 *  second Stage scene), the two part slots in the rail, no bottom
 *  bar. The describeShellTenant harness + the shell wall pin this
 *  table against what renders — drift refuses. */
export const shellDeclaration = defineShellDeclaration({
  preview: { kind: "native" },
  params: { slots: ANNY_SLOTS.map((s) => s.key) },
})

// ── ACTIONS band: SubAction verbs (pilot stroke 1, 2026-09-05;
// ── dsl contract landed 2026-09-06: SubActionMod in python/melite_cards
// ── + EstimateBodyVerb in models/3d/anny/mods/verbs.py, wall-pinned
// ── by tests/walls/suites/test_subaction_verbs.py) ─────────────────
// THE FIRST VERB-CHIP PATTERN (no card had one — this is the minimal
// honest shape per docs/design/studio-shell.md §4 + parameter-surface
// ACTIONS band + anny-evolution §3, declared as DATA rows like slots):
//
//   declaration  ANNY_VERBS rows (id/label/engines/writes) — the
//                INTERIM renderer copy of the PY SubActionMod
//                declaration (id + engine flows wall-pinned to it);
//                writes ⊆ card fields (here: body_glb, a
//                studio.write like every slot).
//   chip         ONE button: COMPILE first (POST the named flow to
//                /v1/flows/validate — a ghost photo 400s with the
//                door's verbatim text, no run registers), then the
//                QUEUE door (raw fetch POST /v1/flows/start — the
//                editorClient.startChain shape, raw fetch, no retry:
//                a retry would start a SECOND GPU run), NEVER directly
//                to ComfyUI (INFERENCE LAW). No picker, no dead
//                buttons (operator order 2026-09-06).
//   feedback     pollFlowRun (the shared @melite/catalog door — no
//                hand-rolled poll loop) → collectStageUrls → first .glb
//                hydrates the Body slot via onSave (the E1 write
//                channel; result into the slot it hydrates, §5 rule 4).
//   honesty      composable-ref gate BEFORE posting (photos that are
//                not estate paths burn a serial-GPU queue slot on a
//                doomed run — the Source photo well above is how a
//                browser photo becomes one); failures surface VERBATIM
//                (RESILIENCE LAW mirror).
export interface AnnyVerbEngine {
  /** Engine id (the PY VerbEngine id). */
  id: string
  /** flows/<name>/flow.py template posted through the queue door. */
  flow: string
}

export interface AnnyVerb {
  /** Verb id (the SubActionMod id — wall-pinned to the PY side). */
  id: string
  /** Chip label. */
  label: string
  /** Runnable engines (SubActionMod engines with a flow — the wall
      pins every one named here AND every one declared there). */
  engines: AnnyVerbEngine[]
  /** Card fields the run may hydrate (⊆ studio.writes). */
  writes: string[]
}

export const ANNY_VERBS: AnnyVerb[] = [
  { id: "hmr-estimate", label: "Estimate body from photo",
    // THE commercial flow and nothing else (operator order
    // 2026-09-06: "I ONLY WANT HTE COMMERICAL FLOW. I DON't WANT
    // A DROPDOWN DUDE") — one engine, no picker.
    engines: [
      { id: "commercial", flow: "anny-hmr-commercial" },
    ],
    writes: ["body_glb"] },
  // fit-card stroke 3: dress + prop share ONE engine (the fit-seat
  // flow) with different knob blocks — two chips, no picker.
  { id: "dress", label: "Dress with outfit",
    engines: [
      { id: "seat", flow: "fit-seat" },
    ],
    writes: ["body_glb"] },
  { id: "prop", label: "Seat prop in hand",
    engines: [
      { id: "seat", flow: "fit-seat" },
    ],
    writes: ["body_glb"] },
  // pipeline step c: the stage Body goes SOMAX behind the scenes
  // (body-to-somax flow — the autorig pack baked transfer). Knobless:
  // the conversion takes no parameters.
  { id: "rig-somax", label: "Convert to SOMAX rig",
    engines: [
      { id: "convert", flow: "body-to-somax" },
    ],
    writes: ["body_glb"] },
  // skin-card stroke 3: coat the stage Body with seeded detail via
  // the skin-apply flow — same one-engine shape, three knobs.
  { id: "apply-skin", label: "Apply skin detail",
    engines: [
      { id: "coat", flow: "skin-apply" },
    ],
    writes: ["body_glb"] },
]

/** Source photo well — the STANDARD image input (local SlotSquare:
 *  file picker + OS drop + thumbnail + detach), backed by the
 *  uploads door (operator order, 2026-09-06: "THERE IS NO WAY FOR
 *  ME TO PUT AN IMAGE IN" + "NOT USING OUR STANDARD IMAGE INPUT").
 *  Pick/drop a file → FileReader data: URL → POST /v1/uploads →
 *  the returned data/input/<file> writes the Source photo slot via
 *  the E1 channel (composable on the next estimate). The thumbnail
 *  previews the uploaded bytes (browser-local data: URL); the SLOT
 *  holds the estate path — preview and compose never share a
 *  value. Client-side type/size gates refuse before any POST. */
export function AnnyPhotoUpload({ photo, onSave }: {
  /** stage.params.source_image — the photo slot value, if any. */
  photo: string | null
  /** E1 write channel — writes source_image with the uploaded path. */
  onSave: (params: Record<string, unknown>) => void
}) {
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const pick = async (f: File) => {
    if (!f.type.startsWith("image/")) {
      setNote(`That is not an image (got ${f.type || "unknown"}) — pick a png, jpeg, or webp photo.`)
      return
    }
    if (f.size > 20 * 1024 * 1024) {
      setNote("That photo is over 20 MB — shrink it and try again.")
      return
    }
    setBusy(true)
    setNote(null)
    try {
      const dataUrl = await readAsDataURL(f)
      const res = await fetch("/v1/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: f.name, data: dataUrl }),
      })
      const text = await res.text()
      let doc: Record<string, unknown> = {}
      try {
        doc = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("uploads door returned a non-JSON body")
      }
      if (!res.ok) {
        throw new Error(typeof doc.error === "string" ? doc.error : `upload refused (${res.status})`)
      }
      const path = doc.path
      if (typeof path !== "string" || !path) {
        throw new Error("uploads door returned no path")
      }
      onSave({ source_image: path })
      setPreview(dataUrl)
      setNote(`Uploaded — the Source photo slot now points at ${path}.`)
    } catch (e) {
      setNote(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.stackSm}>
      <SlotSquare
        label="Source photo"
        value={preview ?? (/^(data:|blob:|https?:)/i.test(photo ?? "") ? photo : null)}
        metric={busy ? "Uploading…" : (note ?? undefined)}
        onPickFile={(f) => void pick(f)}
        onDropFile={(f) => void pick(f)}
        onClear={photo || preview ? () => {
          onSave({ source_image: "" })
          setPreview(null)
          setNote(null)
        } : undefined}
        disabled={busy}
      />
      <p className={styles.hint}>
        Drop a photo onto the square, or the small upload icon picks a file — it uploads first, then Estimate.
      </p>
      {note && (
        <p
          role="status"
          title={note ?? undefined}
          className={styles.noteLine}
        >
          {note}
        </p>
      )}
    </div>
  )
}

type HmrPhase = "idle" | "starting" | "queued" | "running" | "done" | "error"

/** Seed the sculpt scratchpad from the run's recipe artifact
 *  (2026-09-06, the recipe bridge): the estimate gallery carries
 *  anny_preset.json (phenotype[6] + scale[139]) beside the GLB.
 *  Returns the authored draft for the caller to persist (the seed
 *  writes params, not just the store — a seeded stage reopens
 *  mid-sculpt). Throws on any drift — the caller reports it in
 *  the note and the estimate still stands (the GLB is already
 *  home). */
async function seedLeversFromRun(runId: string, stages: unknown): Promise<SculptDraftDoc> {
  const urls = collectStageUrls(stages as never) as string[]
  const recipeUrl = urls.find((u) => u.toLowerCase().split("?")[0].endsWith(".json")) ?? null
  if (!recipeUrl) throw new Error(`run ${runId} exposed no recipe artifact (older engine node — restart ComfyUI?)`)
  const [recipeRes, space] = await Promise.all([
    fetch(recipeUrl),
    fetchIdentitySpace("anny"),
  ])
  if (!recipeRes.ok) throw new Error(`recipe artifact HTTP ${recipeRes.status}`)
  const doc = (await recipeRes.json()) as { dialect?: unknown; phenotype?: unknown; scale?: unknown }
  if (doc.dialect !== "estimated") {
    throw new Error(`recipe dialect ${JSON.stringify(doc.dialect)} — want "estimated"`)
  }
  const seed = seedFromEstimate(
    { phenotype: doc.phenotype, scale: doc.scale },
    {
      defaults: space.defaults,
      localChangesLabels: space.local_changes?.labels ?? [],
    },
  )
  const store = useBodyStudio.getState()
  store.setEditing({ ...store.editing, coeffs: seed.coeffs, localChanges: seed.localChanges })
  return {
    dialect: "authored",
    phenotype: seed.coeffs,
    local_changes: seed.localChanges,
  }
}

export function AnnyHmrVerb({ photo, onSave }: {
  /** stage.params.source_image — the photo slot value, if any. */
  photo: string | null
  /** E1 write channel — hydrates body_glb with the run's GLB. */
  onSave: (params: Record<string, unknown>) => void
}) {
  const [phase, setPhase] = useState<HmrPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  // THE engine — one verb, one flow (operator order 2026-09-06:
  // no dropdown). The declaration row, never retyped beside it.
  const engine = ANNY_VERBS[0].engines[0]
  const busy = phase === "starting" || phase === "queued" || phase === "running"

  const estimate = async () => {
    if (!photo) {
      setPhase("error")
      setNote("Pick a source photo in the well above first — the estimator reads the Source photo slot.")
      return
    }
    // Composable-ref gate: the lane composes estate files — a photo
    // that is not one refuses BEFORE burning a serial-GPU queue slot
    // on a doomed run (the Source photo well above is the way in).
    if (/^(data:|blob:)/i.test(photo)) {
      setPhase("error")
      setNote(
        "That photo is browser-local (data:/blob:) — the lane composes estate files. " +
        "Pick a photo in the Source photo well above and the slot will point at the uploaded file.",
      )
      return
    }
    setPhase("starting")
    setNote(null)
    // COMPILE FIRST (operator order 2026-09-06: "WHERE THE [REDACTED 2026-11-05] IS
    // COMPILE TIME ERRORS"): POST the named flow to the validate
    // door — a ghost photo 400s HERE with the door's verbatim text
    // and NO run registers. Only a 200 proceeds to the queue door
    // (INFERENCE LAW: the commercial flow — never ComfyUI directly.
    // Raw fetch, no retry: a retry would start a SECOND run).
    try {
      const pre = await fetch("/v1/flows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: engine.flow, photo }),
      })
      if (!pre.ok) {
        const text = await pre.text()
        let detail = text.slice(0, 400)
        try {
          const doc = JSON.parse(text) as Record<string, unknown>
          if (typeof doc.error === "string" && doc.error) detail = doc.error.slice(0, 400)
        } catch {
          /* raw text stands */
        }
        throw new Error(`Photo refused before the queue: ${detail}`)
      }
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — compose the
      // card first, ride the minted id on the envelope.
      const startBody: Record<string, unknown> = { flow: engine.flow, photo }
      startBody.draft_id = await ensureDraftId(startBody)
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startBody),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`HMR queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`)
      }
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("HMR queue returned a non-JSON body")
      }
      const runId = data.run_id
      if (typeof runId !== "string" || !runId) {
        throw new Error("HMR queue returned no run_id")
      }
      setPhase(data.status === "queued" ? "queued" : "running")
      const status = await pollFlowRun(runId, undefined, { onTick: () => setPhase("running") })
      const glb =
        collectStageUrls(status.stages).find((u) => /\.(glb|gltf)(\?|#|$)/i.test(u)) ?? null
      if (!glb) {
        throw new Error(
          `HMR run completed with no body GLB artifact — the estimator detected nobody or wrote no mesh. Run: ${runId}`,
        )
      }
      // RECIPE BRIDGE (2026-09-06): the run's gallery carries the
      // estimator's recipe (anny_preset.json — phenotype[6] +
      // scale[139]) beside the GLB. Seed the levers AND persist the
      // draft in the same save (a seeded stage reopens mid-sculpt —
      // the ephemeral-draft era ended with the finished design).
      // A seed failure NEVER fails the estimate (the GLB is already
      // home) — it says so.
      try {
        const draft = await seedLeversFromRun(runId, status.stages as never)
        onSave({ body_glb: glb, sculpt: draft })
        setPhase("done")
        setNote("Body estimated — the blue figure is your body now; the levers tweak from here, Apply keeps it.")
      } catch (e) {
        onSave({ body_glb: glb })
        setPhase("done")
        setNote(
          `Body estimated — the run's GLB now fills the Body slot. (Lever seed skipped: ${e instanceof Error ? e.message : String(e)})`)
      }
      // The body renders in the always-open assembly section below
      // the figure. Bring it into view: a result the eye never lands
      // on is the "mesh never changed" incident again.
      document.getElementById("anny-assembly-truth")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className={styles.rowWrap}>
      <p className={styles.hintFull}>
        SAM 3D Body → MHR → SOMA → Anny — the licensed commercial chain.
      </p>
      {/* ONE VERB UX (stroke 5): the chip + its note line are the
       * shared VerbChip — this tenant maps its HMR phases to the
       * label and keeps the note (feedback at the chip, §5.4). */}
      <VerbChip
        onClick={() => void estimate()}
        disabled={busy}
        aria-label="Estimate body from photo (queue run)"
        label={phase === "queued" ? "Queued…" : phase === "running" || phase === "starting" ? "Estimating…" : "Estimate body from photo"}
        busy={busy}
        note={note}
        noteIsError={phase === "error"}
      />
    </div>
  )
}

export type AnnyStudioProps = Omit<AssemblyStudioProps, "slots" | "headline" | "hint">

// ── PRESETS band: save/load characters (stroke 3, 2026-09-06;
// ── verbs preset-save (tenant-local) + preset-load (anny-params
// ── flow) declared in models/3d/anny/mods/verbs.py, wall-pinned
// ── by tests/walls/suites/test_character_presets.py) ────────────────
// THE SECOND VERB-CHIP PATTERN (the first verb pattern's sibling):
//
//   declaration  ANNY_PRESET_VERBS rows — the INTERIM renderer copy
//                of the PY verbs (ids + load flow + save local action
//                wall-pinned to the declaration).
//   list         GET /v1/studios/3d/anny/presets (estate archetypes +
//                user rows); a failed fetch is SILENT-empty (never an
//                alert — the picker just offers nothing).
//   save         POSTs {label, origin:"file", body_ref, knobs} — the
//                GATEWAY promotes to estimated when the body_ref's run
//                delivered anny_preset.json (server-verified, never
//                studio-guessed); data:/blob: bodies refuse BEFORE
//                posting (browser-local, like the photo gate).
//   load         params rows → the anny-params flow through the QUEUE
//                door ({flow, preset_id, params_json} — params_json
//                rebuilt VERBATIM from the fetched row's params, never
//                edited) → first .glb hydrates Body via onSave; file
//                rows Apply their mesh via the attach door (no queue
//                slot for a file copy).

export interface AnnyPresetVerb {
  /** Verb id (the SubActionMod id — wall-pinned to the PY side). */
  id: string
  /** Chip label. */
  label: string
  /** Queue flow (load) or tenant-local action (save) — exactly one. */
  flow?: string
  local?: string
  /** Card fields the run may hydrate (⊆ studio.writes; empty = none). */
  writes: string[]
}

export const ANNY_PRESET_VERBS: AnnyPresetVerb[] = [
  { id: "preset-save", label: "Save character as preset", local: "save-preset", writes: [] },
  { id: "preset-load", label: "Load character preset", flow: "anny-params", writes: ["body_glb"] },
]

interface PresetRow {
  id: string
  label: string
  origin: "base_params" | "estimated" | "file"
  params: { phenotype: number[], local_changes?: Record<string, number>, scale?: number[] } | null
  body_ref: string | null
  /** The door-served CANONICAL bake dialect (validated server-side
   *  through AnnyBakeParams; file rows carry null). Posted VERBATIM. */
  params_json: string | null
}

type PresetPhase = "idle" | "loading" | "saving" | "queued" | "running" | "starting" | "done" | "error"

export function AnnyPresets({ body, knobs, onSave }: {
  /** stage.params.body_glb — the current Body slot value, if any. */
  body: string | null
  /** Turnaround knob snapshot (resolution/framing/focal_length/ samples/transparent) for the saved row. */
  knobs: Record<string, unknown>
  /** E1 write channel — hydrates body_glb with the run's GLB. */
  onSave: (params: Record<string, unknown>) => void
}) {
  const [presets, setPresets] = useState<PresetRow[] | null>(null)
  const [selectedId, setSelectedId] = useState<string>("")
  const [name, setName] = useState<string>("")
  const [phase, setPhase] = useState<PresetPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  const busy = phase === "loading" || phase === "saving" || phase === "starting" || phase === "queued" || phase === "running"

  const refresh = async () => {
    try {
      const res = await fetch("/v1/studios/3d/anny/presets")
      if (!res.ok) return
      const doc = await res.json() as { presets?: PresetRow[] }
      if (Array.isArray(doc.presets)) {
        setPresets(doc.presets)
        setSelectedId((prev) => prev || doc.presets![0]?.id || "")
      }
    } catch {
      // silent-empty (never an alert — the picker just offers nothing)
    }
  }

  useEffect(() => { void refresh() }, [])

  const selected = presets?.find((p) => p.id === selectedId) || null
  // The picker's option rows — the real presets, or the one honest
  // empty-state row (unavailable ≠ none: a failed fetch never lies).
  const placeholderOptions = presets?.length
    ? presets.map((p) => ({ value: p.id, label: `${p.label} · ${p.origin}` }))
    : [{ value: "", label: presets === null ? "Character presets unavailable" : "No presets yet" }]

  const save = async () => {
    const label = name.trim()
    if (!label) {
      setPhase("error")
      setNote("Name the preset first — the row needs a label.")
      return
    }
    if (!body) {
      setPhase("error")
      setNote("Nothing to save — the Body slot is empty (attach, estimate, or load a body first).")
      return
    }
    if (/^(data:|blob:)/i.test(body)) {
      setPhase("error")
      setNote("That body is browser-local (data:/blob:) — presets reference run artifacts or mount files, never browser bytes.")
      return
    }
    setPhase("saving")
    setNote(null)
    try {
      // FILE intent always — the gateway promotes to estimated when
      // the body_ref's run delivered anny_preset.json (server-side,
      // never studio-guessed). Raw fetch, no retry.
      const res = await fetch("/v1/studios/3d/anny/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, origin: "file", body_ref: body, knobs }),
      })
      const doc = await res.json().catch(() => ({})) as { preset?: PresetRow, error?: string }
      if (!res.ok || !doc.preset) throw new Error(doc.error || `save failed (HTTP ${res.status})`)
      setName("")
      setPhase("done")
      setNote(`Saved “${doc.preset.label}” as ${doc.preset.origin === "estimated" ? "estimated (params from its run)" : "file (mesh only)"}.`)
      await refresh()
      setSelectedId(doc.preset.id)
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  const load = async () => {
    if (!selected) return
    // File rows carry no params — their mesh applies via the attach
    // door (no queue slot for a file copy), verbatim and loud.
    if (selected.origin === "file" || !selected.params) {
      if (!selected.body_ref) {
        setPhase("error")
        setNote("That preset names no mesh — nothing to apply.")
        return
      }
      onSave({ body_glb: selected.body_ref })
      setPhase("done")
      setNote(`Applied “${selected.label}” — its mesh now fills the Body slot (file preset, no run).`)
      return
    }
    // Params rows instantiate through the QUEUE door (INFERENCE LAW).
    // params_json is the door-served CANONICAL STRING, posted
    // VERBATIM — the client rebuild is dead (2026-09-06: the
    // hand-rolled translation turned the child row's list-shaped
    // local_changes into a GPU traceback; the door now serves the
    // dialect and the flow start validates it BEFORE registration).
    // Raw fetch, no retry.
    if (!selected.params_json || typeof selected.params_json !== "string") {
      setPhase("error")
      setNote("That preset row carries no canonical params_json — the door served something unexpected. Refusing to invent one.")
      return
    }
    const paramsJson = selected.params_json
    setPhase("starting")
    setNote(null)
    try {
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: "anny-params", preset_id: selected.id, params_json: paramsJson }),
      })
      const doc = await res.json().catch(() => ({})) as { run_id?: string, error?: string }
      if (!res.ok || !doc.run_id) throw new Error(doc.error || `start failed (HTTP ${res.status})`)
      setPhase("queued")
      const run = await pollFlowRun(doc.run_id)
      setPhase("running")
      const urls = await collectStageUrls(run as never)
      const glb = (urls as string[]).find((u) => u.toLowerCase().endsWith(".glb"))
      if (!glb) throw new Error("run finished with no GLB artifact — refusing to touch the Body slot.")
      onSave({ body_glb: glb })
      setPhase("done")
      setNote(`Loaded “${selected.label}” — the run's GLB now fills the Body slot.`)
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  const remove = async () => {
    if (!selected || !selected.id.startsWith("user-")) return
    setPhase("loading")
    setNote(null)
    try {
      const res = await fetch(`/v1/studios/3d/anny/presets/${encodeURIComponent(selected.id)}`, { method: "DELETE" })
      const doc = await res.json().catch(() => ({})) as { error?: string }
      if (!res.ok) throw new Error(doc.error || `delete failed (HTTP ${res.status})`)
      setPhase("done")
      setNote(`Deleted “${selected.label}”.`)
      setSelectedId("")
      await refresh()
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className={styles.rowWrap}>
      <SelectMenu
        value={selectedId || placeholderOptions[0]?.value || ""}
        options={placeholderOptions}
        onChange={(v) => setSelectedId(v)}
        disabled={busy || !presets?.length}
        aria-label="Character preset"
        title={selected ? `${selected.label} (${selected.origin})` : "character preset"}
        className={styles.presetPick}
      />
      <VerbChip
        onClick={() => void load()}
        disabled={busy || !selected}
        aria-label={selected && (selected.origin === "file" || !selected.params) ? "Apply preset mesh to Body slot" : "Load preset (queue run)"}
        label={selected && (selected.origin === "file" || !selected.params) ? "Apply to Body" : phase === "queued" ? "Queued…" : phase === "running" || phase === "starting" ? "Instantiating…" : "Load preset"}
        busy={busy && (phase === "queued" || phase === "running" || phase === "starting")}
        note={note}
        noteIsError={phase === "error"}
      />
      {selected?.id.startsWith("user-") && (
        <Button
          type="button"
          variant="ghost"
          onClick={() => void remove()}
          disabled={busy}
          aria-label={`Delete preset ${selected.label}`}
          size="sm"
          className={styles.ghostBtn}
        >
          Delete
        </Button>
      )}
      <label className={styles.srOnly} htmlFor="anny-preset-name">New preset name</label>
      <Input
        id="anny-preset-name"
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        placeholder="Save current body as…"
        aria-label="New preset name"
        className={styles.nameInput}
      />
      <Button
        type="button"
        variant="ghost"
        onClick={() => void save()}
        disabled={busy}
        aria-label="Save current Body slot as a preset"
        size="sm"
          className={styles.ghostBtn}
      >
        {phase === "saving" ? "Saving…" : "Save"}
      </Button>
    </div>
  )
}

// ── TURNAROUND knobs: the card's render params, surfaced in the rail
// ── (operator order, 2026-09-06: "you didn't add the parameters").
// ── These are the RayRenderGLBViews inputs the turnaround lane splices
// ── at compose — model defaults (768/1.2/50/64/true) merge at compose,
// ── so the rail shows the param when the card carries one and the
// ── default when it does not; every change writes through onSave
// ── (E1) exactly like a slot. NumberField/local — the editor boundary
// ── wall bans raw form primitives in tenants.
// ── DRESS + PROP verbs (fit-card stroke 3, 2026-09-06): seat an
// ── outfit / hand-prop onto the stage body via the fit-seat flow.
// ── THE THIRD VERB-CHIP PATTERN (sibling of estimate + presets):
// ──
// ──   declaration  ANNY_VERBS dress/prop rows above (id + the one
// ──                seat engine — wall-pinned to models/3d/anny/
// ──                mods/verbs.py).
// ──   knobs        the verb's own block, wall-pinned to the PY knob
// ──                names (verb knobs == flow initials; body rides
// ──                the stage Body slot, never a knob).
// ──   chip         COMPILE first (validate door — a ghost prop 400s
// ──                with verbatim text, no run registers), then the
// ──                QUEUE door (raw fetch, no retry — a retry would
// ──                start a SECOND GPU run), NEVER ComfyUI directly.
// ──   feedback     pollFlowRun → first .glb hydrates Body via onSave;
// ──                failures surface VERBATIM.
// ──   honesty      composable-ref gates on body AND prop BEFORE
// ──                posting (browser-local refs burn a serial-GPU
// ──                slot on a doomed run).
interface FitKnobs {
  prop: string
  bone: string
  align: string
  position: string
  rotation: string
  fit_ratio: number
  fit_ref_bone: string
  fit_ref_bone2: string
  seat_ratio: number
  finger_bone: string
  thumb_bone: string
  target_width: number
}

const DRESS_DEFAULTS: FitKnobs = {
  prop: "", bone: "mixamorig:Spine", align: "socket",
  position: "0,0,0", rotation: "0,0,0", fit_ratio: 0,
  fit_ref_bone: "", fit_ref_bone2: "", seat_ratio: 0.22,
  finger_bone: "", thumb_bone: "", target_width: 0,
}

const PROP_DEFAULTS: FitKnobs = {
  prop: "", bone: "mixamorig:RightHand", align: "grip",
  position: "0,0,0", rotation: "0,0,0", fit_ratio: 0,
  fit_ref_bone: "", fit_ref_bone2: "", seat_ratio: 0.22,
  finger_bone: "mixamorig:RightHandMiddle1",
  thumb_bone: "mixamorig:RightHandThumb1", target_width: 0.25,
}

const LAW_OPTIONS = [
  { value: "socket", label: "socket — hang" },
  { value: "fit", label: "fit — measure + scale" },
  { value: "grip", label: "grip — hand-lock" },
]

/** Unity prop name: the ORIGINAL filename stem (the card compose door's _model_stem, restated as the POST-body derivation — the flow receives it as an independent initial). */
function propStem(ref: string): string {
  const base = ref.split("/").pop()?.split("\\\\").pop() ?? ""
  const stem = base.includes(".") ? base.slice(0, base.lastIndexOf(".")) : base
  return stem.trim() || "prop"
}

type FitPhase = "idle" | "starting" | "queued" | "running" | "done" | "error"

export function AnnyFitVerbs({ body, onSave }: {
  body: string | null
  onSave: (params: Record<string, unknown>) => void
}) {
  const [dress, setDress] = useState<FitKnobs>(DRESS_DEFAULTS)
  const [propK, setPropK] = useState<FitKnobs>(PROP_DEFAULTS)
  const [phase, setPhase] = useState<FitPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  const [active, setActive] = useState<"dress" | "prop" | null>(null)
  const busy = phase === "starting" || phase === "queued" || phase === "running"

  const seat = async (verbId: "dress" | "prop") => {
    const row = ANNY_VERBS.find((v) => v.id === verbId)
    const knobs = verbId === "dress" ? dress : propK
    if (!row || row.engines.length !== 1) {
      setPhase("error")
      setNote("The verb declaration drifted — refusing before the queue.")
      return
    }
    if (!body) {
      setPhase("error")
      setNote("Estimate, attach, or load a body first — the verbs seat onto the stage Body.")
      return
    }
    const propRef = knobs.prop.trim()
    if (!propRef) {
      setPhase("error")
      setNote(verbId === "dress" ? "Point at an outfit GLB first — the dress verb seats a mesh, never a mood." : "Point at a prop GLB first — the prop verb seats a mesh, never a mood.")
      return
    }
    if (/^(data:|blob:)/i.test(body) || /^(data:|blob:)/i.test(propRef)) {
      setPhase("error")
      setNote("Browser-local refs (data:/blob:) never reach the lane — the file belongs in the estate first, then its path goes here.")
      return
    }
    setActive(verbId)
    setPhase("starting")
    setNote(null)
    const initial = {
      body, prop: propRef, model_name: propStem(propRef),
      bone: knobs.bone, align: knobs.align,
      position: knobs.position, rotation: knobs.rotation,
      fit_ratio: knobs.fit_ratio, fit_ref_bone: knobs.fit_ref_bone,
      fit_ref_bone2: knobs.fit_ref_bone2, seat_ratio: knobs.seat_ratio,
      finger_bone: knobs.finger_bone, thumb_bone: knobs.thumb_bone,
      target_width: knobs.target_width,
    }
    try {
      const pre = await fetch("/v1/flows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: row.engines[0].flow, ...initial }),
      })
      if (!pre.ok) {
        const text = await pre.text()
        let detail = text.slice(0, 400)
        try {
          const doc = JSON.parse(text) as Record<string, unknown>
          if (typeof doc.error === "string" && doc.error) detail = doc.error.slice(0, 400)
        } catch {
          /* raw text stands */
        }
        throw new Error(`Seating refused before the queue: ${detail}`)
      }
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — compose the
      // card first, ride the minted id on the envelope.
      const startBody: Record<string, unknown> = { flow: row.engines[0].flow, ...initial }
      startBody.draft_id = await ensureDraftId(startBody)
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startBody),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`Seat queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`)
      }
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("Seat queue returned a non-JSON body")
      }
      const runId = data.run_id
      if (typeof runId !== "string" || !runId) {
        throw new Error("Seat queue returned no run_id")
      }
      setPhase(data.status === "queued" ? "queued" : "running")
      const status = await pollFlowRun(runId, undefined, { onTick: () => setPhase("running") })
      const glb =
        collectStageUrls(status.stages).find((u) => /\\.(glb|gltf)(\\?|#|$)/i.test(u)) ?? null
      if (!glb) {
        throw new Error(
          `Seat run completed with no fitted GLB artifact. Run: ${runId}`)
      }
      onSave({ body_glb: glb })
      setPhase("done")
      setNote(verbId === "dress"
        ? "Outfit seated — the dressed assembly now fills the Body slot."
        : "Prop seated — the armed assembly now fills the Body slot.")
      document.getElementById("anny-assembly-truth")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  const knobForm = (
    knobs: FitKnobs,
    patch: (p: Partial<FitKnobs>) => void,
    prefix: string,
  ) => (
    <div className={styles.grid2}>
      <label className={styles.knobWide}>
        Prop GLB (estate path or run artifact ref)
        <Input
          value={knobs.prop}
          disabled={busy}
          onChange={(e) => patch({ prop: e.target.value })}
          placeholder="data/input/keeper_trenchcoat.glb"
          aria-label={`${prefix} prop GLB ref`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Bone
        <Input
          value={knobs.bone}
          disabled={busy}
          onChange={(e) => patch({ bone: e.target.value })}
          aria-label={`${prefix} bone`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Law
        <SelectMenu
          value={knobs.align}
          options={LAW_OPTIONS}
          onChange={(v) => patch({ align: v })}
          disabled={busy}
          aria-label={`${prefix} fit law`}
          title="socket: hang · fit: measure + scale · grip: hand-lock"
          
        />
      </label>
      <label className={styles.knob}>
        Offset x,y,z
        <Input
          value={knobs.position}
          disabled={busy}
          onChange={(e) => patch({ position: e.target.value })}
          aria-label={`${prefix} offset`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Rotation x,y,z
        <Input
          value={knobs.rotation}
          disabled={busy}
          onChange={(e) => patch({ rotation: e.target.value })}
          aria-label={`${prefix} rotation`}
          className={styles.fieldInput}
        />
      </label>
      <NumberField
        label="Fit ratio"
        tooltip="fit law: prop width as a fraction of the bone span"
        value={knobs.fit_ratio}
        min={0} max={10} step={0.01}
        onChange={(v) => patch({ fit_ratio: v })}
      />
      <NumberField
        label="Seat ratio"
        tooltip="How far down the span the prop seats (grip ignores)"
        value={knobs.seat_ratio}
        min={0} max={1} step={0.01}
        onChange={(v) => patch({ seat_ratio: v })}
      />
      <label className={styles.knob}>
        Measure to
        <Input
          value={knobs.fit_ref_bone}
          disabled={busy}
          onChange={(e) => patch({ fit_ref_bone: e.target.value })}
          aria-label={`${prefix} measure-to bone`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Measure from
        <Input
          value={knobs.fit_ref_bone2}
          disabled={busy}
          onChange={(e) => patch({ fit_ref_bone2: e.target.value })}
          aria-label={`${prefix} measure-from bone`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Finger bone
        <Input
          value={knobs.finger_bone}
          disabled={busy}
          onChange={(e) => patch({ finger_bone: e.target.value })}
          aria-label={`${prefix} finger bone`}
          className={styles.fieldInput}
        />
      </label>
      <label className={styles.knob}>
        Thumb bone
        <Input
          value={knobs.thumb_bone}
          disabled={busy}
          onChange={(e) => patch({ thumb_bone: e.target.value })}
          aria-label={`${prefix} thumb bone`}
          className={styles.fieldInput}
        />
      </label>
      <NumberField
        label="Target width"
        tooltip="grip law: scale-then-grip width in meters (fit forbids non-zero)"
        value={knobs.target_width}
        min={0} max={10} step={0.01}
        onChange={(v) => patch({ target_width: v })}
      />
    </div>
  )

  const chip = (
    verbId: "dress" | "prop",
    knobs: FitKnobs,
    patch: (p: Partial<FitKnobs>) => void,
    title: string,
    button: string,
    running: string,
  ) => (
    <div className={styles.stackSm}>
      <p className={styles.hint}>{title}</p>
      {knobForm(knobs, patch, verbId)}
      <VerbChip
        onClick={() => void seat(verbId)}
        disabled={busy}
        aria-label={`${button} (queue run)`}
        busy={busy && active === verbId}
        label={busy && active === verbId
          ? (phase === "queued" ? "Queued…" : running)
          : button}
        note={note}
        noteIsError={phase === "error"}
      />
    </div>
  )

  return (
    <div className={styles.stackSm}>
      {chip("dress", dress, (p) => setDress((k) => ({ ...k, ...p })),
        "Socket/fit law — hang a coat, seat a hat. The dressed assembly hydrates Body.",
        "Dress with outfit", "Seating…")}
      <div className={styles.divider} />
      {chip("prop", propK, (p) => setPropK((k) => ({ ...k, ...p })),
        "Grip law — lock a weapon into the hand. The armed assembly hydrates Body.",
        "Seat prop in hand", "Seating…")}
    </div>
  )
}

// ── RIG-SOMAX verb (pipeline step c, 2026-09-06): the stage Body goes
// ── SOMAX behind the scenes via the body-to-somax flow. KNOBLESS —
// ── one button, no knob block (the conversion takes no parameters;
// ── the stage Body feeds the flow glb initial). Same validate-then-
// ── queue honesty as its siblings; the rigged .glb hydrates Body.
type SomaxPhase = "idle" | "starting" | "queued" | "running" | "done" | "error"

export function AnnySomaxVerb({ body, onSave }: {
  body: string | null
  onSave: (params: Record<string, unknown>) => void
}) {
  const [phase, setPhase] = useState<SomaxPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  const busy = phase === "starting" || phase === "queued" || phase === "running"

  const convert = async () => {
    const row = ANNY_VERBS.find((v) => v.id === "rig-somax")
    if (!row || row.engines.length !== 1) {
      setPhase("error")
      setNote("The verb declaration drifted — refusing before the queue.")
      return
    }
    if (!body) {
      setPhase("error")
      setNote("Estimate, attach, or load a body first — the conversion rigs the stage Body.")
      return
    }
    if (/^(data:|blob:)/i.test(body)) {
      setPhase("error")
      setNote("Browser-local refs (data:/blob:) never reach the lane — the file belongs in the estate first, then its path goes here.")
      return
    }
    setPhase("starting")
    setNote(null)
    const initial = { glb: body }
    try {
      const pre = await fetch("/v1/flows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: row.engines[0].flow, ...initial }),
      })
      if (!pre.ok) {
        const text = await pre.text()
        let detail = text.slice(0, 400)
        try {
          const doc = JSON.parse(text) as Record<string, unknown>
          if (typeof doc.error === "string" && doc.error) detail = doc.error.slice(0, 400)
        } catch {
          /* raw text stands */
        }
        throw new Error(`Conversion refused before the queue: ${detail}`)
      }
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — compose the
      // card first, ride the minted id on the envelope.
      const startBody: Record<string, unknown> = { flow: row.engines[0].flow, ...initial }
      startBody.draft_id = await ensureDraftId(startBody)
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startBody),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`Convert queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`)
      }
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("Convert queue returned a non-JSON body")
      }
      const runId = data.run_id
      if (typeof runId !== "string" || !runId) {
        throw new Error("Convert queue returned no run_id")
      }
      setPhase(data.status === "queued" ? "queued" : "running")
      const status = await pollFlowRun(runId, undefined, { onTick: () => setPhase("running") })
      const glb =
        collectStageUrls(status.stages).find((u) => /\.(glb|gltf)(\?|#|$)/i.test(u)) ?? null
      if (!glb) {
        throw new Error(
          `Convert run completed with no rigged GLB artifact. Run: ${runId}`)
      }
      onSave({ body_glb: glb })
      setPhase("done")
      setNote("SOMAX rigged — the rigged assembly now fills the Body slot.")
      document.getElementById("anny-assembly-truth")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className={styles.stackSm}>
      <p className={styles.hint}>Bare mesh in, SOMA-77 rig out — the baked template transfer, no knobs.</p>
      <VerbChip
        onClick={() => void convert()}
        disabled={busy}
        aria-label="Convert to SOMAX rig (queue run)"
        busy={busy}
        label={busy ? (phase === "queued" ? "Queued…" : "Converting…") : "Convert to SOMAX rig"}
        note={note}
        noteIsError={phase === "error"}
      />
    </div>
  )
}

// ── APPLY-SKIN verb (skin-card stroke 3, 2026-09-06): coat the stage
// ── Body with seeded skin detail via the skin-apply flow. THE FOURTH
// ── VERB-CHIP PATTERN (sibling of estimate + presets + fit):
// ──
// ──   declaration  ANNY_VERBS apply-skin row above (id + the one
// ──                coat engine — wall-pinned to models/3d/anny/
// ──                mods/verbs.py).
// ──   knobs        kind + map_size + seed, wall-pinned to the PY knob
// ──                names (verb knobs == flow initials; body rides
// ──                the stage Body slot, never a knob).
// ──   chip         COMPILE first (validate door — a ghost body 400s
// ──                with verbatim text, no run registers), then the
// ──                QUEUE door (raw fetch, no retry — a retry would
// ──                start a SECOND GPU run), NEVER ComfyUI directly.
// ──   feedback     pollFlowRun → the skinned .glb hydrates Body via
// ──                onSave; failures surface VERBATIM.
// ──   honesty      composable-ref gate on body BEFORE posting
// ──                (browser-local refs burn a serial-GPU slot on a
// ──                doomed run).
interface SkinKnobs {
  kind: string
  map_size: string
  seed: number
}

const SKIN_DEFAULTS: SkinKnobs = {
  kind: "keeper", map_size: "512", seed: 20260906,
}

// The 20 meld kinds (skin_spec KIND_TABLE — the verb options mirror
// the table ids; the wall pins the PY Select against the same table,
// the chip speaks the declaration row, never a second truth).
const SKIN_KIND_OPTIONS = [
  { value: "keeper", label: "keeper" },
  { value: "ash_nomad", label: "ash_nomad" },
  { value: "villager_elder", label: "villager_elder" },
  { value: "villager", label: "villager" },
  { value: "caravan_trader", label: "caravan_trader" },
  { value: "amf_warden", label: "amf_warden" },
  { value: "cherusci_scrivener", label: "cherusci_scrivener" },
  { value: "marrow_raider", label: "marrow_raider" },
  { value: "amalgam_horror", label: "amalgam_horror" },
  { value: "arena_factor", label: "arena_factor" },
  { value: "bone_crane", label: "bone_crane" },
  { value: "dune_hound", label: "dune_hound" },
  { value: "emberwing", label: "emberwing" },
  { value: "gloom_tortoise", label: "gloom_tortoise" },
  { value: "husk_stalker", label: "husk_stalker" },
  { value: "ironvein_construct", label: "ironvein_construct" },
  { value: "meld_creature", label: "meld_creature" },
  { value: "moss_elk", label: "moss_elk" },
  { value: "ridge_lizard", label: "ridge_lizard" },
  { value: "sand_skimmer", label: "sand_skimmer" },
]

const SKIN_SIZE_OPTIONS = [
  { value: "256", label: "256" },
  { value: "512", label: "512" },
  { value: "1024", label: "1024" },
  { value: "2048", label: "2048" },
]

type SkinPhase = "idle" | "starting" | "queued" | "running" | "done" | "error"

export function AnnySkinVerbs({ body, onSave }: {
  body: string | null
  onSave: (params: Record<string, unknown>) => void
}) {
  const [knobs, setKnobs] = useState<SkinKnobs>(SKIN_DEFAULTS)
  const [phase, setPhase] = useState<SkinPhase>("idle")
  const [note, setNote] = useState<string | null>(null)
  const busy = phase === "starting" || phase === "queued" || phase === "running"
  const patch = (p: Partial<SkinKnobs>) => setKnobs((k) => ({ ...k, ...p }))

  const coat = async () => {
    const row = ANNY_VERBS.find((v) => v.id === "apply-skin")
    if (!row || row.engines.length !== 1) {
      setPhase("error")
      setNote("The verb declaration drifted — refusing before the queue.")
      return
    }
    if (!body) {
      setPhase("error")
      setNote("Estimate, attach, or load a body first — the verbs coat the stage Body.")
      return
    }
    if (/^(data:|blob:)/i.test(body)) {
      setPhase("error")
      setNote("Browser-local refs (data:/blob:) never reach the lane — the file belongs in the estate first, then its path goes here.")
      return
    }
    setPhase("starting")
    setNote(null)
    const initial = {
      body, kind: knobs.kind,
      map_size: Number(knobs.map_size), seed: knobs.seed,
    }
    try {
      const pre = await fetch("/v1/flows/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow: row.engines[0].flow, ...initial }),
      })
      if (!pre.ok) {
        const text = await pre.text()
        let detail = text.slice(0, 400)
        try {
          const doc = JSON.parse(text) as Record<string, unknown>
          if (typeof doc.error === "string" && doc.error) detail = doc.error.slice(0, 400)
        } catch {
          /* raw text stands */
        }
        throw new Error(`Coating refused before the queue: ${detail}`)
      }
      // CARD BIRTH LAW (operator order 2026-09-06): the start door
      // 4xxes a start without a doc-backed draft_id — compose the
      // card first, ride the minted id on the envelope.
      const startBody: Record<string, unknown> = { flow: row.engines[0].flow, ...initial }
      startBody.draft_id = await ensureDraftId(startBody)
      const res = await fetch("/v1/flows/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(startBody),
      })
      const text = await res.text()
      if (!res.ok) {
        throw new Error(`Coat queue refused: HTTP ${res.status}${text ? `: ${text.slice(0, 400)}` : ""}`)
      }
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text) as Record<string, unknown>
      } catch {
        throw new Error("Coat queue returned a non-JSON body")
      }
      const runId = data.run_id
      if (typeof runId !== "string" || !runId) {
        throw new Error("Coat queue returned no run_id")
      }
      setPhase(data.status === "queued" ? "queued" : "running")
      const status = await pollFlowRun(runId, undefined, { onTick: () => setPhase("running") })
      const glb =
        collectStageUrls(status.stages).find((u) => /\.(glb|gltf)(\?|#|$)/i.test(u)) ?? null
      if (!glb) {
        throw new Error(
          `Coat run completed with no skinned GLB artifact. Run: ${runId}`)
      }
      onSave({ body_glb: glb })
      setPhase("done")
      setNote("Skin coated — the skinned assembly now fills the Body slot.")
      document.getElementById("anny-assembly-truth")?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      })
    } catch (e) {
      setPhase("error")
      setNote(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className={styles.stackSm}>
      <p className={styles.hint}>Seeded pores onto the stage Body — tint stays data in the kind sidecar.</p>
      <div className={styles.grid2}>
        <label className={styles.knob}>
          Kind
          <SelectMenu
            value={knobs.kind}
            options={SKIN_KIND_OPTIONS}
            onChange={(v) => patch({ kind: v })}
            disabled={busy}
            aria-label="skin kind"
            title="Which meld kind skins the body (tint stays data in the sidecar)"
            
          />
        </label>
        <label className={styles.knob}>
          Map size
          <SelectMenu
            value={knobs.map_size}
            options={SKIN_SIZE_OPTIONS}
            onChange={(v) => patch({ map_size: v })}
            disabled={busy}
            aria-label="skin map size"
            title="Detail-map resolution (pack + sidecar agree — one knob feeds both)"
            
          />
        </label>
        <NumberField
          label="Seed"
          tooltip="The deterministic detail seed (SKIN_SEED — same seed, same pores)"
          value={knobs.seed}
          min={0} step={1}
          onChange={(v) => patch({ seed: v })}
        />
      </div>
      <VerbChip
        onClick={() => void coat()}
        disabled={busy}
        aria-label="Apply skin detail (queue run)"
        busy={busy}
        label={busy ? (phase === "queued" ? "Queued…" : "Coating…") : "Apply skin detail"}
        note={note}
        noteIsError={phase === "error"}
      />
    </div>
  )
}

const TURNAROUND_DEFAULTS = { resolution: 768, framing: 1.2, focal_length: 50, samples: 64 } as const

function AnnyTurnaroundKnobs({ stage, onSave }: {
  stage: AssemblyStudioProps["stage"]
  onSave: (params: Record<string, unknown>) => void
}) {
  const num = (key: keyof typeof TURNAROUND_DEFAULTS): number => {
    const v = stage.params[key]
    return typeof v === "number" && Number.isFinite(v) ? v : TURNAROUND_DEFAULTS[key]
  }
  const transparentParam = stage.params["transparent"]
  const transparent = typeof transparentParam === "boolean" ? transparentParam : true
  return (
    <div className={styles.grid2}>
      <NumberField
        label="Resolution"
        tooltip="Turnaround render resolution (px, square)"
        value={num("resolution")}
        min={256} max={1536} step={64}
        onChange={(v) => onSave({ resolution: v })}
      />
      <NumberField
        label="Framing"
        tooltip="Camera distance multiplier — 1.2 frames the figure with headroom"
        value={num("framing")}
        min={0.5} max={3} step={0.1}
        onChange={(v) => onSave({ framing: v })}
      />
      <NumberField
        label="Focal (mm)"
        tooltip="Camera focal length"
        value={num("focal_length")}
        min={14} max={200} step={1}
        onChange={(v) => onSave({ focal_length: v })}
      />
      <NumberField
        label="Samples"
        tooltip="Ray samples per pixel — higher is cleaner, slower"
        value={num("samples")}
        min={1} max={512} step={1}
        onChange={(v) => onSave({ samples: v })}
      />
      <label
        htmlFor="anny-transparent"
        title="Render turnarounds on a transparent background"
        className={styles.checkRow}
      >
        <Checkbox
          id="anny-transparent"
          checked={transparent}
          onChange={(e) => onSave({ transparent: e.target.checked })}
        />
        Transparent background
      </label>
    </div>
  )
}

/** The rail's big sections — ONE concern visible at a time (operator
 *  order, 2026-09-06: "you have SHAPE and Turnaround AT THE SAME
 *  TIME! That is too many"). Import is the third (operator order,
 *  same day: "Load preset should be another option beside character
 *  and render. It can be 'Import', and can also include our button
 *  that will upload and use MHR to make an ANNY estimation") —
 *  presets + the estimate verb live THERE. */
type RailTabId = "character" | "render" | "import"
const RAIL_TABS: RailTabItem<RailTabId>[] = [
  { id: "character", label: "Character" },
  { id: "render", label: "Render" },
  { id: "import", label: "Import" },
]

export function AnnyStudio(props: AnnyStudioProps) {
  // The ONE bridge mount — survives every layout move (rail tab ↔
  // viewport drawer); panel + viewport read the shared scratchpad.
  useAnnyShapeBridge(props.stage, props.onSave)
  // The active rail section (Character / Render / Import).
  const [railTab, setRailTab] = useState<RailTabId>("character")
  // Shape expanded into the viewport drawer (the bigger slider
  // surface over the figure — the rail's 320px is tight for
  // serious sculpting).
  const [shapeExpanded, setShapeExpanded] = useState(false)
  const rawPhoto = props.stage.params["source_image"]
  const photo = typeof rawPhoto === "string" && rawPhoto ? rawPhoto : null
  const rawBody = props.stage.params["body_glb"]
  const body = typeof rawBody === "string" && rawBody ? rawBody : null
  // ONE MESH (operator order, 2026-09-06: "Can you tell of an app
  // that has two meshes like this?" — none does; MetaHuman/MakeHuman/
  // DAZ all render ONE live mesh from the params and treat the baked
  // result as an export): the native anny figure above IS the mesh —
  // it renders the neutral base when the slot is empty and the
  // estimated body once Estimate seeds it. The GLB is an ARTIFACT:
  // the Body slot chip + the turnaround render's input. The base-
  // body GLB placeholder fetch and the assembly Stage viewport died
  // with this order — no second scene to guess against. (The run
  // door still autoloads the declared base server-side; that is
  // compose truth, not preview.)
  const knobs: Record<string, unknown> = {}
  for (const k of ["resolution", "framing", "focal_length", "samples", "transparent"]) {
    const v = props.stage.params[k]
    if (v !== undefined && v !== null && v !== "") knobs[k] = v
  }
  return (
    <StudioShell
      className={styles.shellGap}
      /* MAIN — the NATIVE anny figure fills the panel (the side-menu
         order, 2026-09-06: "you never made the side menu you
         planned" + "you are rendering GLB and not native ANNY…
         that is why it is low quality"; one-mesh order same day:
         "I WANT A REAL APP"). The /poser shaped bind mesh — 18056
         verts, 77 joints, smooth normals — is THE mesh: neutral
         base on open, the estimated body once seeded, the lever
         draft while sculpting. There is no other scene. */
      preview={
      <ViewportFrame
        label="Character — native anny viewport"
        className={styles.frameTall}
      >
        <AnnyCharacterViewport
          stage={props.stage}
          onSave={props.onSave}
          replacesEstimate={
            (props.stage.params as Record<string, unknown> | undefined)
              ?.body_origin === "estimated"
          }
        />
        {/* THE SOURCE PIN (2026-09-06, operator order: "We need to
            have an image preview when the card is drilled out"): the
            photo this body came from, pinned top-right over the one
            mesh — the real-app reference pattern. estateInputUrl maps
            the data/input path through the preview door; no photo or
            a non-previewable mount path renders NO pin (honest or
            absent, never a broken frame). */}
        <ViewportAnchor dock="top-right" className={styles.pinRaise}>
          <ReferenceImageBadge
            url={photo ? estateInputUrl(photo) : null}
            label="Source photo"
          />
        </ViewportAnchor>
        {shapeExpanded && (
          <ViewportAnchor dock="edge-right" className={styles.pinRaise}>
            <AnnyShapeDrawer onCollapse={() => setShapeExpanded(false)} />
          </ViewportAnchor>
        )}
      </ViewportFrame>
      }
      /* THE SIDE RAIL — TABBED, one concern at a time (operator
         order, 2026-09-06: "you have SHAPE and Turnaround AT THE
         SAME TIME! That is too many"). THE PANE OWNS THE ONE SCROLL
         SURFACE — natural-height sections, never nested scroll
         boxes (the companion order: "NOT EVEN A SCROLL? ARE YOU
         CRAZY?"). */
      params={
        <div className={styles.railCol}>
          {/* THE SHARED STRIP (operator order: the Shape sub-menus
              reuse this too — "Reusing components") — Character /
              Render / Import, ONE concern at a time. */}
          <RailTabs<RailTabId>
            ariaLabel="Character studio sections"
            value={railTab}
            onChange={setRailTab}
            tabs={RAIL_TABS}
          />
          <div
            role="tabpanel"
            aria-label={`${railTab} tab`}
            data-rail-tab={railTab}
            className={styles.tabPane}
          >
            {railTab === "character" && (
              <div className={styles.stackMd}>
                {/* SHAPE — the Character Maker sliders (natural height;
                    the tab scrolls; Expand moves it over the figure).
                    Hidden while the drawer holds the panel — ONE
                    BodyShapePanel instance at a time. */}
                {!shapeExpanded && <AnnyShapeBand onExpand={() => setShapeExpanded(true)} />}
              </div>
            )}
            {railTab === "render" && (
              <div className={styles.stackMd}>
                <RailSection title="Turnaround — render params">
                  <AnnyTurnaroundKnobs stage={props.stage} onSave={props.onSave} />
                </RailSection>
                <p className={styles.hintPad}>
                  The body GLB and source photo ride Assembly below as
                  file artifacts — the figure is the one mesh.
                </p>
              </div>
            )}
            {railTab === "import" && (
              <div className={styles.stackMd}>
                {/* PRESETS — load/save characters (moved from Character
                    per the operator order: Import is where bodies COME
                    FROM — estate archetypes, saved rows, files). */}
                <RailSection title="Body type — presets">
                  <AnnyPresets body={body} knobs={knobs} onSave={props.onSave} />
                </RailSection>
                {/* ESTIMATE — the commercial chain, one button (no
                    picker, no dead buttons). The upload is the way in:
                    a browser photo becomes an estate path in the
                    Source photo slot, composable on the estimate. */}
                <RailSection title="Estimate from photo — SOMA-X commercial">
                  <div className={styles.stackMd}>
                    <AnnyPhotoUpload photo={photo} onSave={props.onSave} />
                    <AnnyHmrVerb photo={photo} onSave={props.onSave} />
                  </div>
                </RailSection>
                {/* DRESS + PROP — the fit-seat verbs (fit-card stroke 3):
                    seat an outfit / hand-prop onto the stage Body; the
                    fitted assembly hydrates Body via onSave. */}
                <RailSection title="Dress & prop — fit-seat verbs">
                  <AnnyFitVerbs body={body} onSave={props.onSave} />
                </RailSection>
                {/* SKIN — the skin-apply verb (skin-card stroke 3):
                    coat the stage Body with seeded detail; the skinned
                    assembly hydrates Body via onSave. */}
                <RailSection title="Skin detail — skin-apply verb">
                  <AnnySkinVerbs body={body} onSave={props.onSave} />
                </RailSection>
                {/* SOMAX — the body-to-somax verb (pipeline step c):
                    rig the stage Body behind the scenes; the rigged
                    assembly hydrates Body via onSave. */}
                <RailSection title="SOMAX rig — convert verb">
                  <AnnySomaxVerb body={body} onSave={props.onSave} />
                </RailSection>
              </div>
            )}
          </div>
        </div>
      }
      /* SECONDARY — the ARTIFACT surface (part slots only; the GLB
         Stage viewport died with the one-mesh order — the figure
         above is the one mesh). ALWAYS OPEN (2026-09-06): this used
         to sit behind a folded disclosure — the estimate result
         landed INVISIBLE, so a completed run read as "the mesh
         never changed" while the body sat one click away. A result
         the operator cannot see is a result that did not happen. */
      bottom={
        <RailSection
        id="anny-assembly-truth"
        title="Assembly — file artifacts (body, photo)"
        className={styles.assemblyPad}
      >
        <AssemblyStudio
          {...props}
          slots={ANNY_SLOTS}
          headline="Body — the character's files"
          hint="Empty Body autoloads the declared neutral base body at compose (provisioned anny-base-body.glb) — or attach a GLB, or estimate one from the source photo. The figure above is the one mesh; these chips are the files."
          viewport="none"
        />
      </RailSection>
      }
    />
  )
}

export default AnnyStudio

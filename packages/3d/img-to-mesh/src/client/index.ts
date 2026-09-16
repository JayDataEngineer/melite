/**
 * img-to-mesh-studio — the FIRST-PARTY cards.stage.view surface
 * (2026-09-12, the ui-tool built-in law: the host package ships the
 * shipped cards' views; third-party cards register additively).
 *
 * The door serves `layout: "studio"` for img-to-mesh — this view is
 * what that declaration MEANS on the client: the card's knob surface
 * composed in the card's own terms (the old LAW A), from the SAME
 * form-spec SSOT the generic card renders. Not a copy of the generic
 * form's layout: the everyday groups (input, generation) sit exposed;
 * the deep groups (stage, mesh, bake, lab) fold behind ui-primitives
 * DisclosureRow. Every ATOM is the generic card's own SpecForm render
 * — the studio owns ORGANIZATION, the SSOT owns the knobs.
 *
 * The currency is StageViewOwnerProps (pure function of the bench):
 * values seed from the frozen row + spec defaults; Run patches the
 * domain FIRST (drafts/patch via onPatch), then starts the run — the
 * generic drill's own law, kept verbatim.
 */
import { createElement as h, useEffect, useRef, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots. (The card-view client's own law, verbatim.)
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the 'cards.stage.view' seam declaration (card-base owns
// the card-UI seams). Erased — the bundle stays pure.
import type {} from '@melite/card-base/slots'
import { DisclosureRow, IconArchiveOutline20 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './client.module.css'
import type { StageViewOwnerProps } from '@melite/contracts'
import { SpecFieldRow, coerceFieldEdit, fieldsOf, resolveValue, useFormSpec, useSquareProvider, type FormSpecDoc, type SpecField, type SpecValues, type SquareHost } from '@melite/card-base'
import { pollRunStageUrl } from '@melite/card-base/runs-policy'
// THE MESH STAGE (hour 14): the shared raw-three preview from
// card-base — the SAME stage anny rides (one preview-port interaction
// law: selection + per-asset errors are the stage's own surface).
import { GlbStagePreview } from '@melite/card-base/preview'
// THE UNIFORM SHELL (hour 15, stroke B finish): trellis rode its own
// split (preview LEFT 7fr / rail RIGHT 5fr — inverted against the
// law). card-base's StudioShell now carries the shape: params LEFT,
// preview RIGHT — the same grain as anny/h3/motion/mask/ideo.
import { StudioShell } from '@melite/card-base/shell'

/** The door's group truth (schema_groups, 2026-09-12 lane read):
 *  input, generation — exposed; stage, mesh, bake, lab — folded. */
const STUDIO_EXPOSED = ['input', 'generation']
const STUDIO_FOLDS = ['stage', 'mesh', 'bake', 'lab']
const STUDIO_TITLE: Record<string, string> = {
  stage: 'Stage passes',
  mesh: 'Mesh',
  bake: 'Bake maps',
  lab: 'Lab (samplers & overrides)',
}

function rowsOfGroup(fields: SpecField[], group: string): SpecField[] {
  return fields.filter((f) => f.group === group)
}

/** The studio surface component — registered under key 'img-to-mesh'. */
export function ImgToMeshStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const { row, runStatus, onPatch, onRun, onStop } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] as SpecValues : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<SpecValues>(params)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // (THE LIVE GESTURE + TAP FOLD moved to the frame (hour-26): the
  //  top-bar Run pill and the webhook strip own them for every face.)
  // THE OUTPUT HALF — the ROW is the truth (runs are named by draft
  //  only, so a tab-wide run id binds WRONG studios to other cards'
  //  runs): this row's result carries its own run_id + artifact url
  //  (the outcome observer writes both); the poll runs only while
  //  this row's run is IN FLIGHT (runStatus 'running' with no url
  //  yet — the run-wire package's ONE poll loop; its single-stage
  //  fallback maps the card door's skeleton-named stage onto this
  //  bench row's id).
  const rowResult = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as { run_id?: unknown; url?: unknown } : null
  const ownRunId = typeof rowResult?.run_id === 'string' && rowResult.run_id !== ''
    ? rowResult.run_id as string : null
  const ownUrl = typeof rowResult?.url === 'string' && rowResult.url !== ''
    ? rowResult.url as string : null
  const [meshUrl, setMeshUrl] = useState<string | null>(ownUrl)
  useEffect(() => {
    setMeshUrl(ownUrl)
    if (ownUrl !== null || ownRunId === null) return
    const ctrl = new AbortController()
    void pollRunStageUrl(ownRunId, props.stageId, { onUrl: setMeshUrl }, ctrl.signal)
    return () => { ctrl.abort() }
  }, [ownRunId, ownUrl, props.stageId])
  // the served spec rides the shared hook (loud refusal — the client
  // renders the error surface); seeding + the envelope lift react to
  // the doc landing
  const { spec: liveSpec, error: specError } = useFormSpec('img-to-mesh')
  useEffect(() => {
    if (specError !== null) { setError(specError); return }
    if (liveSpec === null) return
    setSpec(liveSpec)
    // THE USER LAYER IS THE FROZEN BENCH ROW VERBATIM (the settings
    // law): presence IS the override mark; defaults derive per
    // render — never seeded into the explicit map.
    setUser({ ...params })
    // the envelope lift: report the estate's declared size class
    props.onSurface(liveSpec.size === 'huge' ? 'huge' : '')
  }, [liveSpec, specError])
  const fieldByName = new Map((spec !== null ? fieldsOf(spec) : []).map((f) => [f.name, f] as const))
  const onEdit = (name: string, v: unknown): void => {
    setUser((prev) => ({ ...prev, [name]: coerceFieldEdit(fieldByName.get(name), v) }))
  }
  // the resolved value — derived per render (what a run composes).
  // THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): the row's
  // `resolved` map layers under the user (same law as the generic
  // drill — one resolver, served to the visual).
  const servedBase: SpecValues | undefined =
    typeof row['resolved'] === 'object' && row['resolved'] !== null && !Array.isArray(row['resolved'])
      ? row['resolved'] as SpecValues : undefined
  const value: SpecValues = resolveValue(spec ?? { form: '' }, user, servedBase)
  const specRows: SpecField[] = spec !== null ? fieldsOf(spec) : []
  // the SAME shared square provider the generic drill rides — one
  // definition, every surface (the operator's DRY law)
  const { square: squareFor, wireMenu } = useSquareProvider(onEdit, {
    candidates: props.upstream.map((u) => ({ id: u.id, label: u.title, url: u.url })),
  })
  const run = (): void => {
    if (spec === null) return
    // PATCH FIRST (the generic drill's law, kept): the run reads what
    // the user SEES — the USER layer verbatim, plus nulls for keys
    // the frozen row held that left the map (JSON Merge Patch
    // deletes them; the unset path's domain half).
    const patch: SpecValues = {}
    const userKeys = new Set(Object.keys(user))
    for (const k of userKeys) patch[k] = user[k]
    for (const k of Object.keys(params)) if (!userKeys.has(k)) patch[k] = null
    onPatch(patch as Record<string, unknown>)
    onRun()
  }
  // THE GESTURE BINDING (hour-26): the frame's top-bar pill calls
  // THIS verb (patch-domain-first). A REF DISPATCHER: the bound fn
  // is stable (bound once), the ref re-points every render — the
  // call always sees the current user/params maps.
  const runRef = useRef(run)
  runRef.current = run
  useEffect(() => {
    props.bindRun?.(() => { runRef.current() })
  }, [props.bindRun])
  return h('div', { className: css.zoomDetail },
    wireMenu,
    // (THE BADGE ROW IS RETIRED — 2026-09-13, the operator's "there
    //  are rando badges that need to go": the 'studio' + runStatus
    //  Tags carried no currency the zoom bar doesn't already own
    //  ('Stage <title>' + the run's own faces); the head div goes
    //  with them.)
    error !== null ? h('p', { className: css.runError }, error) : null,
    spec === null
      ? h('p', { className: css.groupNote }, 'loading the declared knob surface…')
      : h(StudioShell, {
          // LEFT — the params rail (the declared knob surface)
          params: h('div', { className: css.studioRail },
        // SpecForm renders each group's title itself — no duplicate.
        STUDIO_EXPOSED.map((g) => h('section', { key: g, className: css.studioGroup },
          // the group title the old SpecForm delegation rendered — the
          // studio owns its partition now, so it owns the heading too
          h('h4', { className: css.studioGroupTitle }, g),
          h(StudioFields, { fields: rowsOfGroup(specRows, g), value, onEdit, square: squareFor }),
        )),
        STUDIO_FOLDS.map((g) => {
          const fs = rowsOfGroup(specRows, g)
          if (fs.length === 0) return null
          const isOpen = open[g] === true
          return h(DisclosureRow, {
            key: g,
            icon: h(IconArchiveOutline20),
            // UNREACHABLE-ARM (deleted the `?? g` fallback,
            // 2026-09-16): g ranges only over STUDIO_FOLDS (stage,
            // mesh, bake, lab — the map two lines up) and STUDIO_TITLE
            // carries an entry for every one of the four, so the
            // lookup is never undefined.
            title: STUDIO_TITLE[g],
            open: isOpen,
            expandable: true,
            // the reference law (ToolRow/ReasoningRow/GenericCommandCard
            // all pass it): the whole title row is the toggle target.
            expandOnRowClick: true,
            onToggle: () => { setOpen((prev) => ({ ...prev, [g]: !prev[g] })) },
          }, h(StudioFields, { fields: fs, value, onEdit, square: squareFor }))
        }),
          // (THE RUN SEAT RETIRED (hour-26): the frame's top-bar Run
          //  pill + the webhook strip under it own the gesture and
          //  the live fold for EVERY face — the studio rail keeps
          //  only its groups. The rail-bottom error arm died with it
          //  (deleted 2026-09-16): error seats only from specError
          //  while the shell renders only on liveSpec, and the hook
          //  produces them mutually exclusively (one fetch — success
          //  seats spec, refusal seats error; the id here is constant
          //  so no refetch can interleave them) — the head error face
          //  above owns the refusal.)
          ),
          // RIGHT — the mesh stage (the shared viewport, the old Stage law)
          preview: h(GlbStagePreview, {
            assets: meshUrl === null ? [] : [{ id: 'mesh', url: meshUrl, name: 'mesh' }],
            label: 'img-to-mesh',
            emptyHint: 'Run the card to see the mesh',
          }),
        })
  )
}

/** The generic card's OWN atoms (SpecFieldRow renders one group's
 *  rows — the studio owns its group partition; zero atom copies).
 *  `value` is the RESOLVED map (resolveValue at the caller) — the
 *  rows show exactly what a run composes. */
function StudioFields({ fields, value, onEdit, square }: {
  fields: SpecField[]
  value: SpecValues
  onEdit(name: string, v: unknown): void
  // UNREACHABLE-ARM (deleted the `square !== undefined` spread guard,
  // 2026-09-16): StudioFields is module-local with exactly two call
  // sites (the exposed + fold rails above), both passing the square
  // provider's `square` — useSquareProvider returns it
  // unconditionally, so the prop is never undefined here.
  square: (f: SpecField) => SquareHost | undefined
}): ReturnType<typeof h> {
  if (fields.length === 0) return h('p', { className: css.groupNote }, 'no declared fields')
  return h('div', null, fields.map((f) =>
    h(SpecFieldRow, {
      key: f.name, f, value: value[f.name], onEdit, square: square(f),
    })))
}

/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'imgToMeshStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
ctx.slots.inject('cards.stage.view', () =>
  ctx.slots.register({ name: 'cards.stage.view', key: 'img-to-mesh' }, ImgToMeshStudio))
}

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
import { createElement as h, useEffect, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots. (The card-view client's own law, verbatim.)
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the 'cards.stage.view' seam declaration (card-base owns
// the card-UI seams). Erased — the bundle stays pure.
import type {} from '@melite/card-base/slots'
import { DisclosureRow, IconArchiveOutline20, IconLoadingOutline16, IconPlayOutline16, IconStopFill16 } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './client.module.css'
import type { StageViewOwnerProps } from '@melite/contracts'
import { CardForm as SpecForm, specDefaults, useFormSpec, useSquareProvider, type FormSpecDoc, type SpecField, type SpecValues, type SquareHost } from '@melite/card-base'
import { pollRunStageUrl } from '@melite-plugin/melite-run-wire'
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

function fieldsOf(fields: SpecField[], group: string): SpecField[] {
  return fields.filter((f) => f.group === group)
}

/** The studio surface component — registered under key 'img-to-mesh'. */
export function ImgToMeshStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const { row, runStatus, onPatch, onRun, onStop } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] as SpecValues : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<SpecValues>(params)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  // THE LIVE GESTURE STATE + THE TAP FOLD (2026-09-13): the row's own
  // run state drives the gesture (play at rest, stop mid-run) and the
  // observer's progress carry renders beside it — the same faces the
  // generic drill rides, one gesture language.
  const live: boolean = runStatus === 'running' || runStatus === 'queued' || runStatus === 'pending'
  const foldRec = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as Record<string, unknown> : null
  const foldP = typeof foldRec?.['progress'] === 'object' && foldRec?.['progress'] !== null
    ? foldRec['progress'] as { value: number, max: number } : null
  const activity: string = typeof foldRec?.['activity'] === 'string'
    ? foldRec['activity'] as string : ''
  const pct: number | null = foldP !== null && foldP.max > 0
    ? Math.floor((100 * foldP.value) / foldP.max) : null
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
    // seed: the spec's defaults UNDER the frozen bench params
    setValues({ ...specDefaults(liveSpec.fields), ...params })
    // the envelope lift: report the estate's declared size class
    props.onSurface(liveSpec.size === 'huge' ? 'huge' : '')
  }, [liveSpec, specError])
  const onEdit = (name: string, v: unknown): void => {
    setValues((prev) => ({ ...prev, [name]: v }))
  }
  // the SAME shared square provider the generic drill rides — one
  // definition, every surface (the operator's DRY law)
  const { square: squareFor, wireMenu } = useSquareProvider(onEdit, {
    candidates: props.upstream.map((u) => ({ id: u.id, label: u.title, url: u.url })),
  })
  const run = (): void => {
    if (spec === null) return
    // PATCH FIRST (the generic drill's law, kept): the run reads what
    // the user SEES. (The live face keys on the ROW's run state — no
    // client-side running flag to forget to clear.)
    onPatch({ ...values } as Record<string, unknown>)
    onRun()
  }
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
          h(StudioFields, { fields: fieldsOf(spec.fields, g), values, onEdit, square: squareFor }),
        )),
        STUDIO_FOLDS.map((g) => {
          const fs = fieldsOf(spec.fields, g)
          if (fs.length === 0) return null
          const isOpen = open[g] === true
          return h(DisclosureRow, {
            key: g,
            icon: h(IconArchiveOutline20),
            title: STUDIO_TITLE[g] ?? g,
            open: isOpen,
            expandable: true,
            // the reference law (ToolRow/ReasoningRow/GenericCommandCard
            // all pass it): the whole title row is the toggle target.
            expandOnRowClick: true,
            onToggle: () => { setOpen((prev) => ({ ...prev, [g]: !prev[g] })) },
          }, h(StudioFields, { fields: fs, values, onEdit, square: squareFor }))
        }),
          // THE RUN SEAT (hour-25 follow-up, the operator: "the run
          // button should be at the bottom right of parameters"): the
          // gesture rides the rail's STICKY bottom-right — pinned
          // while the groups scroll above it, ghost-styled like the
          // tile (the first cut was a filled brand circle; wrong
          // face), and the Remove row stays retired.
          h('div', { className: css.drillRunRow },
            error !== null ? h('span', { className: css.runError }, error) : null,
            live
              ? h('span', { className: css.studioProgress, 'data-testid': 'studio-progress', role: 'status' },
                  h(IconLoadingOutline16, { size: 14 }),
                  h('span', null, [
                    activity !== '' ? activity : 'running',
                    pct !== null ? ' · ' + String(pct) + '%' : '',
                  ].join('')),
                )
              : null,
            live
              ? h('button', {
                  className: css.drillRunBtn, type: 'button',
                  'aria-label': 'Stop run', 'data-testid': 'studio-stop',
                  onClick: onStop,
                }, h(IconStopFill16, { size: 16 }), h('span', null, 'Stop'))
              : h('button', {
                  className: css.drillRunBtn, type: 'button',
                  'aria-label': 'Run stage', 'data-testid': 'studio-run',
                  onClick: run,
                }, h(IconPlayOutline16, { size: 16 }), h('span', null, 'Run')),
          ),
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

/** The generic card's OWN atoms (SpecForm renders one group's fields —
 *  the studio hands it the group's slice; zero atom copies). */
function StudioFields({ fields, values, onEdit, square }: {
  fields: SpecField[]
  values: SpecValues
  onEdit(name: string, v: unknown): void
  square?: (f: SpecField) => SquareHost | undefined
}): ReturnType<typeof h> {
  if (fields.length === 0) return h('p', { className: css.groupNote }, 'no declared fields')
  return h(SpecForm, { fields, values, onEdit, square })
}

/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'imgToMeshStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
ctx.slots.inject('cards.stage.view', () =>
  ctx.slots.register({ name: 'cards.stage.view', key: 'img-to-mesh' }, ImgToMeshStudio))
}

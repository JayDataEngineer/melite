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
import type { Context } from '@deepseek-ai/cordis'
import { Button, DisclosureRow, IconArchiveOutline20, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import type { StageViewOwnerProps } from './types.ts'
import { fetchFormSpec, SpecForm, specDefaults, useSquareProvider, type FormSpecDoc, type SpecField, type SpecValues } from './spec-form.tsx'
import { fetchRunStageUrl, fetchRunTerminal } from './cards-resource.ts'
import { GlbViewport } from './glb-viewport.tsx'

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
  const { row, runStatus, onPatch, onRun, onRemove } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] as SpecValues : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<SpecValues>(params)
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [running, setRunning] = useState(false)
  // THE OUTPUT HALF (the old pollFlowRun law): the run is the SSOT —
  //  poll runs/status until this stage's artifact URL lands.
  const [meshUrl, setMeshUrl] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setMeshUrl(null)
    if (props.runId === null) return
    const ctrl = new AbortController()
    const tick = async (): Promise<void> => {
      try {
        const url = await fetchRunStageUrl(props.runId as string, props.stageId, ctrl.signal)
        if (!alive) return
        if (url !== null) { setMeshUrl(url); return }
        const terminal = await fetchRunTerminal(props.runId as string, ctrl.signal)
        if (!alive || terminal) return
      } catch { /* the last ok value stays; the next poll may recover */ }
      if (!alive) return
      setTimeout(() => { if (alive) void tick() }, 1500)
    }
    void tick()
    return () => { alive = false; ctrl.abort() }
  }, [props.runId, props.stageId])
  useEffect(() => {
    let alive = true
    fetchFormSpec('img-to-mesh')
      .then((doc) => {
        if (!alive) return
        setSpec(doc)
        // seed: the spec's defaults UNDER the frozen bench params
        setValues({ ...specDefaults(doc.fields), ...params })
        // the envelope lift: report the estate's declared size class
        if (alive) props.onSurface(doc.size === 'huge' ? 'huge' : '')
      })
      .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'form-spec failed') })
    return () => { alive = false }
  }, [])
  const onEdit = (name: string, v: unknown): void => {
    setValues((prev) => ({ ...prev, [name]: v }))
  }
  // the SAME shared square provider the generic drill rides — one
  // definition, every surface (the operator's DRY law)
  const wired = props.upstream.find((u) => u.id === props.wiredFrom) ?? null
  const { square: squareFor, wireMenu } = useSquareProvider(onEdit, {
    upstreamTitle: wired !== null ? wired.title : null,
    candidates: props.upstream.map((u) => ({ id: u.id, label: u.title })),
    onWire: props.onWire,
  })
  const run = (): void => {
    if (spec === null) return
    setRunning(true)
    // PATCH FIRST (the generic drill's law, kept): the run reads what
    // the user SEES.
    onPatch({ ...values } as Record<string, unknown>)
    onRun()
    setRunning(false)
  }
  return h('div', { className: css.zoomDetail },
    wireMenu,
    h('div', { className: css.studioHead },
      h(Tag, { tone: 'info' }, 'studio'),
      runStatus !== '' ? h(Tag, { tone: runStatus === 'done' ? 'success' : runStatus === 'error' ? 'danger' : 'neutral' }, runStatus) : null,
    ),
    error !== null ? h('p', { className: css.runError }, error) : null,
    spec === null
      ? h('p', { className: css.groupNote }, 'loading the declared knob surface…')
      : h('div', { className: css.studioBody },
        h('div', { className: css.studioSplit },
          // THE 3D SPACE (the shared viewport — the old Stage law)
          h(GlbViewport, { url: meshUrl, label: 'img-to-mesh' }),
          h('div', { className: css.studioRail },
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
        h('div', { className: css.runRow },
          error !== null ? h('span', { className: css.runError }, error) : null,
          h(Button, { variant: 'primary', onClick: run }, running ? 'running…' : 'Run'),
          h(Button, { variant: 'ghost', onClick: onRemove }, 'Remove stage'),
        ),
        ),
        ),
      ),
  )
}

/** The generic card's OWN atoms (SpecForm renders one group's fields —
 *  the studio hands it the group's slice; zero atom copies). */
function StudioFields({ fields, values, onEdit, square }: {
  fields: SpecField[]
  values: SpecValues
  onEdit(name: string, v: unknown): void
  square?: (f: SpecField) => { verbs: import('./input-square.tsx').InputSquareVerbs; display?: string | null } | undefined
}): ReturnType<typeof h> {
  if (fields.length === 0) return h('p', { className: css.groupNote }, 'no declared fields')
  return h(SpecForm, { fields, values, onEdit, square })
}

/** The built-in registration (ui-tool's readToolview shape verbatim):
 *  the host package registers its own shipped card's view. */
export const imgToMeshStudio = {
  name: 'img-to-mesh-studio',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('cards.stage.view', () =>
      ctx.slots.register({ name: 'cards.stage.view', key: 'img-to-mesh' }, ImgToMeshStudio))
  },
}

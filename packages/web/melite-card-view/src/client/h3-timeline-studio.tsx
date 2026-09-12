/**
 * h3-timeline-studio — the timeline card's cards.stage.view surface
 * (2026-09-12, the advanced-views port, operator order: "port the more
 * advanced views, like the h3 timeline view, into the system").
 *
 * THE 1:1 SOURCE (packages/video/h3-timeline/src/ui/studio/, the old
 * editor's tenant #4): the three-layer NLE, translated onto the new
 * host's currency (StageViewOwnerProps — a pure function of the bench
 * row, edits LOCAL until Run, then patch-the-domain-first — the drill's
 * own law, kept verbatim from the img-to-mesh precedent):
 *
 *   LAYER A  the rail's global run panel — the recipe (fps/audio_mode/
 *            continuity) + the card's own form-spec fields (the SSOT
 *            owns the knobs; the studio owns ORGANIZATION).
 *   LAYER B  the call cards — ONE entity per model call; here the bar
 *            clips + the rail's call editor (prompt, span, guides).
 *   LAYER C  prompt beats — later strokes (this port renders the text
 *            prompt law: text XOR beats, and the beats row is not yet).
 *
 * THE BAR (the document IS the calls): spans proportional to frames,
 * `end_frame` EXCLUSIVE (docModel's law — calls tile 0..T exactly), a
 * seconds ruler, and the three guide lanes under the calls (image/
 * clip/audio keyframes — the planner's KEYFRAME_KINDS colors). Clicking
 * a clip SELECTS it — the mode-switching rail (2026-08-16 law): global
 * params ⇄ that call's editor; a click on the empty bar swaps back.
 *
 * Document shapes are the wire forms (docModel.ts) restated for this
 * host — a port, not an import: the old studio rides the retired
 * editor's shell; this one rides the bench.
 */
import { createElement as h, useEffect, useMemo, useState } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { Button, Tag } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import type { StageViewOwnerProps } from './types.ts'
import { fetchFormSpec, SpecForm, type FormSpecDoc, type SpecField, type SpecValues } from './spec-form.tsx'
import { pollRunStageUrl } from '@melite-plugin/melite-run-wire'

// ── The document (the wire forms; docModel.ts is the reference) ─────────────

/** One contiguous model call — ONE video generation invocation. Frames
 * absolute; `end_frame` EXCLUSIVE; the prompt is `text` (this port) or
 * `beats` (Layer C, later strokes). */
interface H3Call {
  text?: string
  beats?: unknown[]
  start_frame: number
  end_frame: number
  image?: string
  clip?: string
  audio?: string
  transition?: 'cut' | 'extend'
  knobs?: Record<string, unknown>
}

/** One guide anchor — image/clip/audio pinned at a frame. */
interface H3Keyframe {
  frame: number
  kind: 'image' | 'clip' | 'audio'
  source: string
}

/** The fresh-card document (the builder's _STARTER_CALLS: 168 frames
 * @ 24 fps = 7s, ONE window). Seeded only when params carry no valid
 * calls — never authored over an existing doc. */
const STARTER_CALLS: H3Call[] = [
  { text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 168 },
]

/** The guide lane colors (VIDEO_TIMELINE_TRACKS, apart from the prompt
 * cycle and from each other). */
const LANE_KINDS = ['image', 'clip', 'audio'] as const
const LANE_COLOR: Record<H3Keyframe['kind'], string> = {
  image: '#568cf5', clip: '#db9456', audio: '#9664c8',
}

/** The Layer A keys the timeline owns that the 12-key card schema does
 * not declare (the renderer vocabulary the compose door accepts — the
 * old rail's Recipe block, 1:1). */
const AUDIO_MODES = ['none', 'native', 'lipSync'] as const

function parseCalls(params: Record<string, unknown>): H3Call[] {
  const raw = params['calls']
  if (Array.isArray(raw)) {
    const calls = raw.filter((c): c is H3Call =>
      typeof c === 'object' && c !== null
      && typeof (c as H3Call)['start_frame'] === 'number'
      && typeof (c as H3Call)['end_frame'] === 'number')
    if (calls.length > 0) return calls
  }
  return STARTER_CALLS.map((c) => ({ ...c }))
}

function parseKeyframes(params: Record<string, unknown>): H3Keyframe[] {
  const raw = params['keyframes']
  if (!Array.isArray(raw)) return []
  return raw.filter((k): k is H3Keyframe =>
    typeof k === 'object' && k !== null
    && typeof (k as H3Keyframe)['frame'] === 'number'
    && typeof (k as H3Keyframe)['kind'] === 'string')
}

/** Spec fields the timeline subsumes (the python single-shot legacy —
 * the doc-level prompt/image/length are the calls' semantics now). */
const SPEC_EXCLUDED = new Set(['prompt', 'image', 'length', 'calls', 'keyframes', 'audio_clips'])

// ── The studio ──────────────────────────────────────────────────────────────

/** The timeline surface — registered under key 'h3-timeline'. */
export function H3TimelineStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  const { row, runStatus, onPatch, onRun, onStop, onRemove, onSurface } = props
  const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] as SpecValues : {}
  const [spec, setSpec] = useState<FormSpecDoc | null>(null)
  const [calls, setCalls] = useState<H3Call[]>(() => parseCalls(params))
  const [keyframes] = useState<H3Keyframe[]>(() => parseKeyframes(params))
  const [recipe, setRecipe] = useState<{ fps: number; audio_mode: string; continuity: boolean }>(() => ({
    fps: typeof params['fps'] === 'number' ? params['fps'] as number : 24,
    audio_mode: typeof params['audio_mode'] === 'string' ? params['audio_mode'] as string : 'native',
    continuity: params['continuity'] === true,
  }))
  const [values, setValues] = useState<SpecValues>(params)
  const [selected, setSelected] = useState<number | null>(null)
  const [running, setRunning] = useState(false)

  // the envelope lift: the timeline wants room (the old wide tenant)
  useEffect(() => { onSurface('huge') }, [onSurface])

  useEffect(() => {
    let alive = true
    fetchFormSpec('h3-timeline')
      .then((doc) => { if (alive) setSpec(doc) })
      .catch((e: unknown) => { if (alive) console.error('[h3-timeline-studio] form-spec fetch failed:', e) })
    return () => { alive = false }
  }, [])

  // ── the bar math ──
  const fps = recipe.fps > 0 ? recipe.fps : 24
  const totalFrames = useMemo(
    () => Math.max(1, ...calls.map((c) => Math.max(1, Math.round(c.end_frame)))),
    [calls],
  )
  const seconds = Math.round((totalFrames / fps) * 10) / 10
  const pct = (frame: number): string => `${(Math.max(0, Math.min(frame, totalFrames)) / totalFrames) * 100}%`
  const emptyText = calls.filter((c) => (c.text ?? '').trim() === '' && !Array.isArray(c.beats)).length
  const knobbed = calls.filter((c) => c.knobs !== undefined && Object.keys(c.knobs).length > 0).length

  // ── THE OUTPUT HALF (the row is the truth; the poll runs only while
  //    this row's run is IN FLIGHT without an artifact — the
  //    img-to-mesh law verbatim) ──
  const rowResult = typeof row['result'] === 'object' && row['result'] !== null
    ? row['result'] as { run_id?: unknown; url?: unknown } : null
  const ownRunId = typeof rowResult?.run_id === 'string' && rowResult.run_id !== '' ? rowResult.run_id : null
  const ownUrl = typeof rowResult?.url === 'string' && rowResult.url !== '' ? rowResult.url : null
  const [filmUrl, setFilmUrl] = useState<string | null>(ownUrl)
  useEffect(() => {
    setFilmUrl(ownUrl)
    if (ownUrl !== null || ownRunId === null) return
    const ctrl = new AbortController()
    void pollRunStageUrl(ownRunId, props.stageId, { onUrl: setFilmUrl }, ctrl.signal)
    return () => { ctrl.abort() }
  }, [ownRunId, ownUrl, props.stageId])

  // ── the verbs ──
  const patchCall = (i: number, patch: Partial<H3Call>): void => {
    setCalls((prev) => prev.map((c, j) => (j === i ? { ...c, ...patch } : c)))
  }
  const extendTail = (): void => {
    setCalls((prev) => {
      const tail = Math.max(0, ...prev.map((c) => Math.max(0, Math.round(c.end_frame))))
      return [...prev, { text: '', start_frame: tail, end_frame: tail + Math.round(7 * fps), transition: 'cut' }]
    })
  }
  const deleteCall = (i: number): void => {
    setCalls((prev) => (prev.length <= 1 ? prev : prev.filter((_, j) => j !== i)))
    setSelected(null)
  }
  const runFilm = (): void => {
    setRunning(true)
    onPatch({ ...values, calls, keyframes, fps: recipe.fps, audio_mode: recipe.audio_mode, continuity: recipe.continuity })
    onRun()
  }
  useEffect(() => { if (runStatus !== 'running') setRunning(false) }, [runStatus])

  const specFields = useMemo(() => {
    const fields: SpecField[] = spec?.fields ?? []
    return fields.filter((f) => !SPEC_EXCLUDED.has(f.name))
  }, [spec])

  const sel = selected !== null && selected < calls.length ? calls[selected] : null
  const selDur = sel !== null ? Math.round(((sel.end_frame - sel.start_frame) / fps) * 10) / 10 : 0

  return h('div', { className: css.h3Studio },
    // ── THE RAIL (Layer A global ⇄ the selected call's editor) ──
    h('div', { className: css.h3Rail },
      h('div', { className: css.h3Readout, 'data-testid': 'h3-doc-readout' },
        `${calls.length} call${calls.length === 1 ? '' : 's'} · ${seconds}s · ${keyframes.length} guide${keyframes.length === 1 ? '' : 's'}`,
        knobbed > 0 ? ` · ${knobbed} with knobs` : ''),
      emptyText > 0 ? h('div', { className: css.h3Warn },
        `${emptyText} call${emptyText === 1 ? ' needs' : 's need'} a prompt — the plan refuses empty prompts before any GPU work.`) : null,
      sel === null
        ? h('div', { className: css.h3RailBody },
            // Layer A — the recipe (the timeline-owned keys, 1:1 the old rail)
            h('div', { className: css.h3Recipe },
              h('label', { className: css.h3RecipeRow },
                h('span', null, 'fps'),
                h('input', {
                  type: 'number', min: 8, max: 60, value: recipe.fps,
                  onChange: (e: Event) => setRecipe((r) => ({ ...r, fps: Number((e.target as HTMLInputElement).value) || 24 })),
                })),
              h('label', { className: css.h3RecipeRow },
                h('span', null, 'audio'),
                h('select', {
                  value: recipe.audio_mode,
                  onChange: (e: Event) => setRecipe((r) => ({ ...r, audio_mode: (e.target as HTMLSelectElement).value })),
                }, AUDIO_MODES.map((m) => h('option', { key: m, value: m }, m)))),
              h('label', { className: css.h3RecipeRow },
                h('span', null, 'continuity'),
                h('input', {
                  type: 'checkbox', checked: recipe.continuity,
                  onChange: (e: Event) => setRecipe((r) => ({ ...r, continuity: (e.target as HTMLInputElement).checked })),
                }))),
            // Layer A — the card's own SSOT fields (the studio owns organization)
            specFields.length > 0
              ? h(SpecForm, { fields: specFields, values, onEdit: (name: string, v: unknown) => setValues((prev) => ({ ...prev, [name]: v })) })
              : null,
            // the call list (compact rows — click selects, the mode swaps)
            h('div', { className: css.h3CallList },
              calls.map((c, i) => h('button', {
                key: i, className: css.h3CallRow, onClick: () => { setSelected(i) },
              },
                h('span', { className: css.h3CallRowFrames }, `${c.start_frame}–${c.end_frame - 1}`),
                h('span', { className: css.h3CallRowText }, (c.text ?? '').trim() === '' ? '— empty prompt —' : (c.text ?? '').slice(0, 48)),
                c.knobs !== undefined && Object.keys(c.knobs).length > 0 ? h('span', { className: css.h3Dot }) : null)),
              h('div', { className: css.h3Extend },
                h(Button, { variant: 'outline', onClick: extendTail }, 'Extend +7s'))))
        : h('div', { className: css.h3RailBody },
            h('div', { className: css.h3Back },
              h(Button, { variant: 'ghost', onClick: () => { setSelected(null) } }, '← All calls'),
              h(Button, { variant: 'outline', onClick: () => { deleteCall(selected!) }, disabled: calls.length <= 1 }, 'Delete call')),
            h('div', { className: css.h3Field },
              h('span', { className: css.h3FieldKey }, `Prompt · ${selDur}s — one continuous shot, no cuts`),
              h('textarea', {
                rows: 5, value: sel.text ?? '',
                onChange: (e: Event) => { patchCall(selected!, { text: (e.target as HTMLTextAreaElement).value }) },
              })),
            h('div', { className: css.h3SpanRow },
              h('label', { className: css.h3Field },
                h('span', { className: css.h3FieldKey }, 'start'),
                h('input', {
                  type: 'number', value: sel.start_frame, min: 0,
                  onChange: (e: Event) => { patchCall(selected!, { start_frame: Number((e.target as HTMLInputElement).value) || 0 }) },
                })),
              h('label', { className: css.h3Field },
                h('span', { className: css.h3FieldKey }, 'end (exclusive)'),
                h('input', {
                  type: 'number', value: sel.end_frame, min: 1,
                  onChange: (e: Event) => { patchCall(selected!, { end_frame: Number((e.target as HTMLInputElement).value) || 1 }) },
                })),
              h('label', { className: css.h3Field },
                h('span', { className: css.h3FieldKey }, 'seam'),
                h('select', {
                  value: sel.transition ?? 'cut',
                  onChange: (e: Event) => { patchCall(selected!, { transition: (e.target as HTMLSelectElement).value as H3Call['transition'] }) },
                },
                  h('option', { value: 'cut' }, 'cut'),
                  h('option', { value: 'extend' }, 'extend (latent chain)')))),
            ...(['image', 'clip', 'audio'] as const).map((k) => h('label', { key: k, className: css.h3Field },
              h('span', { className: css.h3FieldKey }, `${k} guide source`),
              h('input', {
                value: (sel[k] as string | undefined) ?? '', placeholder: 'artifact name',
                onChange: (e: Event) => { patchCall(selected!, { [k]: (e.target as HTMLInputElement).value } as Partial<H3Call>) },
              }))))),
    // ── THE PREVIEW (the viewport belongs to the video) ──
    h('div', { className: css.h3Preview },
      filmUrl !== null
        ? h('video', { key: filmUrl, src: filmUrl, controls: true, className: css.h3Video })
        : running || runStatus === 'running'
          ? h(Tag, null, 'rendering…')
          : h('span', { className: css.h3PreviewEmpty }, 'No film yet')),
    // ── THE BAR (Layer B clips + the guide lanes) ──
    h('div', {
      className: css.h3Bar,
      onClick: (e: Event) => { if (e.target === e.currentTarget) setSelected(null) },
    },
      h('div', { className: css.h3Ruler },
        Array.from({ length: Math.floor(totalFrames / fps) + 1 }, (_, s) => s)
          .filter((s) => s === 0 || totalFrames / fps <= 30 || s % 5 === 0)
          .map((s) => h('span', { key: s, className: css.h3Tick, style: { left: pct(s * fps) } }, `${s}s`))),
      h('div', { className: css.h3Calls, 'data-testid': 'h3-calls-bar' },
        calls.map((c, i) => h('div', {
          key: i,
          className: selected === i ? `${css.h3Call} ${css.h3CallSel}` : css.h3Call,
          style: { left: pct(c.start_frame), width: `calc(${(Math.max(0, c.end_frame - c.start_frame) / totalFrames) * 100}% - 2px)` },
          onClick: (e: Event) => { e.stopPropagation(); setSelected(i) },
          title: `${c.start_frame}–${c.end_frame - 1} (${Math.round(((c.end_frame - c.start_frame) / fps) * 10) / 10}s)${c.transition === 'extend' ? ' · latent chain' : ''}`,
        },
          h('span', { className: css.h3CallText }, (c.text ?? '').trim() === '' ? '— empty —' : (c.text ?? '').slice(0, 40)),
          c.knobs !== undefined && Object.keys(c.knobs).length > 0 ? h('span', { className: css.h3Dot }) : null)),
        keyframes.length === 0 && calls.length === 0 ? h('span', { className: css.h3BarEmpty }, 'double-click to add — later stroke') : null),
      LANE_KINDS.map((kind) => h('div', { key: kind, className: css.h3Lane, 'data-testid': `h3-lane-${kind}` },
        h('span', { className: css.h3LaneName, style: { color: LANE_COLOR[kind] } }, kind),
        keyframes.filter((k) => k.kind === kind).map((k, j) => h('span', {
          key: j, className: css.h3Pin, style: { left: pct(k.frame), background: LANE_COLOR[kind] },
          title: `${kind} @ ${k.frame}: ${k.source}`,
        }))))),
    // ── the run row ──
    h('div', { className: css.h3RunRow },
      h(Button, { variant: 'primary', onClick: runFilm, disabled: running || runStatus === 'running' },
        running || runStatus === 'running' ? 'Rendering…' : 'Run film'),
      runStatus === 'running' ? h(Button, { variant: 'outline', onClick: onStop }, 'Stop') : null,
      h('span', { className: css.h3RunNote }, runStatus === 'failed' ? 'the run failed — see the log' : ''),
      h(Button, { variant: 'ghost', onClick: onRemove }, 'Remove stage')),
  )
}

/** The built-in registration (the ui-tool law, img-to-mesh verbatim):
 *  the host package registers its own shipped card's view. */
export const h3TimelineStudio = {
  name: 'h3-timeline-studio',
  inject: ['slots'],
  apply(ctx: Context): void {
    ctx.slots.inject('cards.stage.view', () =>
      ctx.slots.register({ name: 'cards.stage.view', key: 'h3-timeline' }, H3TimelineStudio))
  },
}

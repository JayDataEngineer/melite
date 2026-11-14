// verb-bar.tsx — THE VERB BAR (MHR slice 2, 2026-11-13): a
// registered verb a human cannot press is still a dead verb. The
// served verbs arm (slice 1, FormSpecDoc.verbs) renders one button
// per mounted verb; the button opens the verb's OWN invocation
// dialog (the SubActionMod law — the fields ride the verb, never
// the card surface), and the press routes through the {flow:}
// registry door with the verb's declared intake (initials mapped to
// the card's own params). When the run settles, the verb's `writes`
// hydrate the stage: the estimator's body_glb lands as a param the
// compose reads — the photo→body path drivable end to end from the
// card, the MHR resurrection's client half.
import { createElement as h, useEffect, useRef, useState } from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import {
  fetchRunStatus,
  fieldsOfEnvelope,
  startVerbRun,
  type FormSpecDoc,
  type SpecField,
} from '@melite/card-base/client'
import { type DraftId } from '@melite/contracts/benchStage'
import { isTerminalStatus } from '@melite/contracts/stageView'
import { chromeCopy } from '../chromeCopy.ts'

/** One served verb row (the wire's own shape, narrowed for render). */
type VerbRow = NonNullable<FormSpecDoc['verbs']>[number]

export interface VerbBarProps {
  verbs: NonNullable<FormSpecDoc['verbs']>
  draftId: DraftId
  stageId: string
  /** The stage's CURRENT effective params — the intake mapping's
   *  read source (the estimator's photo reads body_image here). */
  params: Record<string, unknown>
  /** The hydration write: the drill's own patch verb (the same
   *  ledger every edit rides — a verb write is a write). */
  onWrite: (params: Record<string, unknown>) => void
  /** Default 1500ms; tests tighten it. */
  pollIntervalMs?: number
}

/** THE VERB BAR: one button per served verb — every verb's dialog
 *  is reachable (its knobs are viewable, local-only included); a
 *  verb with no flow route voices its own refusal AT THE PRESS,
 *  never a dead button. */
export function VerbBar({ verbs, draftId, stageId, params, onWrite, pollIntervalMs = 1500 }: VerbBarProps): ReturnType<typeof h> {
  const [openVerb, setOpenVerb] = useState<VerbRow | null>(null)
  // raw strings while typing (decimal dots survive); coercion is
  // the press's own verb (card-drill's editPatch law)
  const [values, setValues] = useState<Record<string, string>>({})
  const [phase, setPhase] = useState<'idle' | 'busy' | 'done' | 'failed'>('idle')
  const [note, setNote] = useState<string | null>(null)
  const pollAbort = useRef<AbortController | null>(null)
  useEffect(() => () => { pollAbort.current?.abort() }, [])

  const open = (verb: VerbRow): void => {
    setOpenVerb(verb)
    setPhase('idle')
    setNote(null)
    const seeded: Record<string, string> = {}
    for (const f of dialogFields(verb)) {
      if (f.default !== undefined) seeded[f.name] = String(f.default)
    }
    setValues(seeded)
  }

  const press = (verb: VerbRow): void => {
    // A LOCAL-ONLY VERB voices at the gesture itself — the bar keeps
    // the verb pressable to its own dialog (the knobs are the
    // verb's, viewable without a route) and the press names why it
    // cannot ride the wire.
    if (verb.flow === null) {
      setPhase('failed')
      setNote(chromeCopy.verbLocalOnly)
      return
    }
    // THE INTAKE READ: every mapped initial sources from the stage's
    // current params; a missing source is named, never guessed — the
    // door's initial gate backstops the unmapped half.
    const initials: Record<string, unknown> = {}
    for (const [init, param] of Object.entries(verb.initials)) {
      const v = params[param]
      if (typeof v !== 'string' || v === '') {
        setPhase('failed')
        setNote(chromeCopy.verbIntakeMissing({ init, param }))
        return
      }
      initials[init] = v
    }
    const overlay: Record<string, unknown> = {}
    for (const f of dialogFields(verb)) {
      const raw = values[f.name] ?? ''
      if (raw === '') continue
      overlay[f.name] = f.type === 'number' ? Number(raw) : raw
    }
    setPhase('busy')
    setNote(null)
    pollAbort.current?.abort()
    pollAbort.current = new AbortController()
    const signal = pollAbort.current.signal
    // THE SETTLE CHAIN'S ONE VOICE: any failure in the press — the
    // wire's refusal, a transport throw, or the hydration write's
    // own throw — faces the note (a detached void would drop the
    // write's crash on the floor: an unhandled rejection).
    const voiceFailure = (e: unknown): void => {
      setPhase('failed')
      setNote(e instanceof Error ? e.message : String(e))
    }
    void startVerbRun({ flowId: verb.flow, initials, params: overlay, draftId }, signal)
      .then((outcome) => {
        if (!('runId' in outcome)) {
          setPhase('failed')
          setNote(outcome.refused)
          return
        }
        // THE SETTLEMENT POLL: the run is the SSOT; the url lands on
        // its stage row (the estimator flow is single-stage — the
        // hero artifact IS the write). Terminal without a url voices
        // the run's own failure, never silence.
        const poll = async (): Promise<void> => {
          for (;;) {
            // THE ONE ABORT GUARD (post-sleep): an unmounted seat's
            // controller aborts during the wait, and the loop ends
            // here — before the next read, never mid-flight.
            await new Promise((r) => { setTimeout(r, pollIntervalMs) })
            if (signal.aborted) return
            let row
            try {
              row = await fetchRunStatus(outcome.runId, signal)
            } catch {
              continue // transport blips poll again (the poll law)
            }
            if (!isTerminalStatus(row.status)) continue
            const url = row.stages[0]?.url ?? ''
            const write = verb.writes[0]
            if (url !== '' && write !== undefined) {
              onWrite({ [write]: url })
              setPhase('done')
              setNote(chromeCopy.verbSeated({ write, runId: outcome.runId }))
            } else {
              setPhase('failed')
              setNote(row.error ?? row.stages[0]?.error ?? chromeCopy.verbNoArtifact({ runId: outcome.runId, status: row.status }))
            }
            return
          }
        }
        void poll().catch(voiceFailure)
      })
      .catch(voiceFailure)
  }

  return h('div', { 'data-testid': 'verb-bar', className: css.verbBar },
    verbs.map((verb) => h(Button, {
      key: verb.id,
      size: 'sm',
      variant: 'ghost',
      ...{ 'data-verb': verb.id },
      title: verb.flow === null ? chromeCopy.verbLocalOnly : undefined,
      onClick: () => { open(verb) },
    }, verb.label)),
    phase !== 'idle' && note !== null
      ? h('span', {
          'data-testid': 'verb-note',
          className: phase === 'failed' ? css.runError : css.enhanceNote,
        }, note)
      : null,
    openVerb !== null && h(Modal, {
      open: true,
      onClose: () => { setOpenVerb(null) },
      title: openVerb.label,
      closeLabel: chromeCopy.verbCloseDialog,
    },
      h('div', { 'data-testid': 'verb-dialog', className: css.rescue },
        dialogFields(openVerb).map((f) => h('label', { key: f.name, className: css.enhanceRow },
          h('span', null, f.label),
          h(Input, {
            ...{ 'data-field': f.name },
            type: f.type === 'number' ? 'number' : 'text',
            value: values[f.name] ?? '',
            onChange: (e: unknown) => {
              const target = e as { target: { value: string } }
              setValues((m) => ({ ...m, [f.name]: target.target.value }))
            },
          }),
        )),
        // THE INTAKE FACE: the press's sources are named before the
        // press — the stage's own params, read live at press time.
        Object.keys(openVerb.initials).length > 0
          ? h('p', { 'data-testid': 'verb-intake', className: css.enhanceNote },
              Object.entries(openVerb.initials).map(([init, param]) =>
                chromeCopy.verbIntakeNote({ init, param })).join('; '))
          : null,
        // A LOCAL-ONLY VERB names its state in its own dialog — the
        // knobs are viewable, the press voices why it cannot ride.
        openVerb.flow === null
          ? h('p', { 'data-testid': 'verb-local', className: css.enhanceNote }, chromeCopy.verbLocalOnly)
          : null,
        h(Button, {
          size: 'sm',
          ...{ 'data-testid': 'verb-run' },
          disabled: phase === 'busy',
          onClick: () => { press(openVerb) },
        }, phase === 'busy' ? chromeCopy.verbRunning : chromeCopy.verbRunWord({ label: openVerb.label })),
      ),
    ),
  )
}

/** The verb's dialog fields, derived from its served envelope (the
 *  same walker the card form rides — fieldsOfEnvelope). */
function dialogFields(verb: VerbRow): SpecField[] {
  return verb.fields === null ? [] : fieldsOfEnvelope(verb.fields)
}

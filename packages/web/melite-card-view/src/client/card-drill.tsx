/**
 * card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
 * system, ONE component every card surface drills through (the chat
 * toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
 * reborn 2026-09-11 as shared state + shared tool between the agent
 * and the user).
 *
 * DSH Modal (body portal, Escape/mask close — the operator's split
 * directive 2026-09-10): params LEFT (editable — switch fields ride
 * the Pill toggle, everything else a raw-string Input; editPatch
 * coerces ONCE at patch time so decimal dots survive typing), outputs
 * + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
 * the user SEES: the caller receives the coerced patch and owns the
 * write-then-run order (the shared-state law — the patch lands in the
 * domain BEFORE the run reads it).
 */
import { createElement as h, useState, type ReactNode } from 'react'
import { Button, Modal, Pill, Input } from '@deepseek-ai/dsh-client-ui-primitives'
import css from './card.module.css'
import type { EditMap, ParamField } from './draft.ts'
import { editPatch } from './draft.ts'
import { rejectionVoice } from './rejection-voice.ts'
import { RunRescue } from './run-rescue.tsx'
import { rescueOfLaneDetails, type Rescue } from './run-rescue-core.ts'

export interface CardDrillProps {
  /** Modal title — the surface names its card. */
  title: string
  /** The stage's params as editable fields (paramFields()). */
  fields: ParamField[]
  /** The card's live output thumb, when one exists (else null). */
  thumbUrl: string | null
  /** True while the caller's run is in flight (drives the button). */
  running: boolean
  /** The run gesture: receives the coerced patch (null when no
   *  edits) — the caller patches, then runs, then closes. */
  onRun(patch: Record<string, unknown> | null): Promise<void>
  onClose(): void
  /** The draft's stages for the run-gate rescue's provision
   *  targeting (familyOfStages — the chat tile passes doc.stages).
   *  Absent, no rescue mounts (the drill's only other caller
   *  needs none). */
  stages?: Array<{ params?: Record<string, unknown>; card?: string }>
}

export function CardDrill({ title, fields, thumbUrl, running, onRun, onClose, stages }: CardDrillProps): ReturnType<typeof h> {
  const [edits, setEdits] = useState<EditMap>(new Map())
  const [runError, setRunError] = useState<string | null>(null)
  const [rescue, setRescue] = useState<Rescue | undefined>(undefined)
  const patch = editPatch(fields, edits)

  const run = async (): Promise<void> => {
    setRunError(null)
    setRescue(undefined)
    try {
      await onRun(patch)
    } catch (e: unknown) {
      setRunError(rejectionVoice(e))
      // THE EXACT KEY (2026-10-22, the lane-miss popup's
      // follow-up): the estate's structured lane-miss rides the
      // thrown details — the popup keys on it exactly, no prose
      // parsing. A derived face without details still parses the
      // prose inside RunRescue.
      setRescue(rescueOfLaneDetails((e as { details?: Record<string, unknown> }).details) ?? undefined)
    }
  }

  const fieldNode = (f: ParamField): ReactNode => {
    if (f.atom === 'switch') {
      const current = typeof f.value === 'boolean' ? ((edits.get(f.key) ?? f.value) as boolean) : false
      return h(Pill, {
        active: current,
        onClick: () => { setEdits((m) => new Map(m).set(f.key, !current)) },
      }, typeof f.value === 'boolean' ? (current ? 'on' : 'off') : '?')
    }
    return h(Input, {
      value: String(edits.get(f.key) ?? f.value),
      onChange: (e: unknown) => {
        // RAW string while typing (decimal dots survive); editPatch
        // coerces once, at patch time.
        const target = e as { target: { value: string } }
        setEdits((m) => new Map(m).set(f.key, target.target.value))
      },
    })
  }

  return h(Modal, { open: true, onClose, title, closeLabel: 'Close card', className: css.drill },
    h('div', { className: css.split },
      h('div', { className: css.params },
        fields.map((f) => h('label', { key: f.key, className: css.field },
          h('span', { className: css.fieldKey }, f.key),
          fieldNode(f),
        ))),
      h('div', { className: css.outputs },
        thumbUrl !== null ? h('img', { className: css.outputImg, src: thumbUrl, alt: title }) : null,
        h('div', { className: css.runRow },
          runError !== null ? h('span', { className: css.runError }, runError) : null,
          // THE RUN-GATE RESCUE (the lane-miss popup's owed
          // follow-up): the chat tile's drill error face mounts the
          // same popup the cards-tab press surfaces mount — the
          // re-run rides the drill's own run, never an auto-fire.
          runError !== null && rescue !== undefined
            ? h(RunRescue, { error: runError, stages: stages ?? [], onRun: () => { void run() }, rescue })
            : null,
          h(Button, { variant: 'primary', disabled: running, onClick: () => { void run() } },
            running ? 'running…' : 'Run'),
        ),
      ),
    ),
  )
}

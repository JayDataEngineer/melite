/**
 * motion client entry — the card package's OWN cards.stage.view
 * surface (the composition-root correction's law, closed 2026-09-12
 * for motion per the DSH extension examples: a UI-bearing package
 * ships BOTH faces — the node half stays source-loaded, the browser
 * half rides lib/client.js through the dsh.client declaration +
 * ./client export; the loader materializes it from the module
 * table). The studio was DEAD on the lane before this face existed
 * (component.tsx exported, nothing imported it).
 *
 * THE MOUNT LAW (the studio removal, 2026-08-19: a card is a SEAM
 * and whatever renders its authoring surface is INJECTED): the
 * motion card's authoring surface is this package's own studio —
 * src/ui/studio/component.tsx (MotionCardEditor, the pose-authoring
 * tenant). This module is the ADAPTER that mounts it on the bench
 * slot — never a second definition site: props translate onto the
 * tenant contract {stage, onSave, upstreams?}; the document rides
 * stage.params; writes ride onSave → onPatch (patchStageParams'
 * partial merge); the run rides the host drill's own Run row.
 */
import { createElement as h } from 'react'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import { runCompiledGeneration } from '@melite/catalog'
import { defineStageViewRegistration } from '@melite/card-base'
import {
  projectStageView,
  projectUpstreamStages,
  type CardStage,
  type StageViewOwnerProps,
} from '@melite/contracts'
import { MotionCardEditor } from '../ui/studio/component.tsx'

/** The built-in registration (the ui-tool law, verbatim — the module
 * namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'motionStudio'

export interface MotionStudioInjected {
  runCompiledGeneration: typeof runCompiledGeneration
}

export const inject = ['slots']

export const apply = defineStageViewRegistration(
  'motion',
  MotionStudio,
  () => ({ runCompiledGeneration }),
)

export function motionUpstreamStages(
  props: Pick<StageViewOwnerProps, 'upstream' | 'priorStageIds'>,
): CardStage[] {
  const priorIds = props.priorStageIds === undefined
    ? null
    : new Set(props.priorStageIds)
  return projectUpstreamStages(props).filter(
    (upstream) => priorIds === null || priorIds.has(upstream.id),
  )
}

/** The motion surface — registered under key 'motion'. The ADAPTER:
 * the tenant mounted verbatim, one translate layer, zero paraphrase.
 * onWireSlot stays OMITTED (the tenant's own contract: omitting
 * hides the wire affordance — the bench slot has no wire door). */
export function MotionStudio(props: StageViewOwnerProps & MotionStudioInjected): ReturnType<typeof h> {
  const stage = projectStageView(props, { genre: 'motion' })
  const upstreams = motionUpstreamStages(props)
  return h(MotionCardEditor, {
    stage,
    onSave: (params: Record<string, unknown>): void => { props.onPatch(params) },
    onWireSlot: props.onWireSlot,
    upstreams,
    runCompiledGeneration: props.runCompiledGeneration,
  })
}

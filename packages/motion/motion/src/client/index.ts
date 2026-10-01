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
import { runCompiledGeneration, setContractToastSink } from '@melite/catalog'
import { defineStageViewRegistration, useToastStore } from '@melite/card-base/client'
import {
  projectStageView,
  type StageViewOwnerProps,
} from '@melite/contracts'
import { MotionCardEditor } from '../ui/studio/component.tsx'
import { motionUpstreamStages } from './upstream.ts'

// CONTRACT TOASTS — wire the inlined catalog contract stores to the
// row's toast store (the one host that outlives every reporting
// surface); verdicts surface from the same instance that renders them.
setContractToastSink((type, message, action) => {
  useToastStore.getState().addToast(type, message, action)
})
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

/**
 * img-to-mesh-studio — the FIRST-PARTY cards.stage.view surface
 * (2026-09-12, the ui-tool built-in law: the host package ships the
 * shipped cards' views; third-party cards register additively).
 *
 * Primitive ④ (2026-09-21): this file is a DECLARATION + seam
 * registration — the card's ~5 lines of surface data. The machinery
 * (spec fetch, seeding, squares, patch-first run, polling, shell)
 * is the base's DeclarativeStudio; the studio owns ORGANIZATION
 * over the SAME form-spec SSOT, and organization is data now.
 */
import { createElement as h } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: the service seats this entry touches ride cordis Context
// declaration-merging from each owning package's ./client entry — the
// renderer owns ctx.slots. (The card-view client's own law, verbatim.)
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: the 'cards.stage.view' seam declaration (card-base owns
// the card-UI seams). Erased — the bundle stays pure.
import type {} from '@melite/card-base/slots'
import type { StageViewOwnerProps } from '@melite/contracts'
import { DeclarativeStudio, defineStudioDeclaration } from '@melite/card-base'

/** The door's group truth (schema_groups, 2026-09-12 lane read):
 *  input, generation — exposed; stage, mesh, bake, lab — folded. */
const SURFACE = defineStudioDeclaration({
  model: 'img-to-mesh',
  expose: ['input', 'generation'],
  folds: {
    stage: 'Stage passes',
    mesh: 'Mesh',
    bake: 'Bake maps',
    lab: 'Lab (samplers & overrides)',
  },
  preview: 'mesh',
})

/** The studio surface component — registered under key 'img-to-mesh'. */
export function ImgToMeshStudio(props: StageViewOwnerProps): ReturnType<typeof h> {
  return h(DeclarativeStudio, { declaration: SURFACE, ...props })
}

/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes name/inject/apply). */
export const name = 'imgToMeshStudio'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
ctx.slots.inject('cards.stage.view', () =>
  ctx.slots.register({ name: 'cards.stage.view', key: 'img-to-mesh' }, ImgToMeshStudio))
}

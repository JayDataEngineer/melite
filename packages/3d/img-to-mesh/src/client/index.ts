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
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type { StageViewOwnerProps } from '@melite/contracts'
import {
  DeclarativeStudio,
  defineStageViewRegistration,
  defineStudioDeclaration,
} from '@melite/card-base/client'

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

// NO estate injects here (the fifth receipt, 2026-09-29): studios
// load BEFORE the mounter in the plugin URL, and a static estate
// inject parks this plugin forever waiting on card-view's own
// $mount. The estate bind rides the factory's armed lazy getter over
// the inject-free ctx.get seam — order-proof by construction.
export const inject = ['slots']

export const apply = defineStageViewRegistration('img-to-mesh', ImgToMeshStudio)

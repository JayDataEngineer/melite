/**
 * Browser client face for the input-prep card's OWN studio
 * registration (2026-11, the composition-root law — same seam as
 * img-to-mesh/h3/motion): the client bundle (lib/client.js) is the
 * artifact the DSH module table materializes; the node half (the
 * card face) rides the tsc plane. The studio itself lives in
 * src/ui/studio/component.tsx (the ANNY-style crop card, operator
 * defect 3).
 */
import { defineStageViewRegistration } from '@melite/card-base/client'
import { InputPrepStudio } from '../ui/studio/component.tsx'

/** The built-in registration (the ui-tool law, verbatim — the
 * module namespace IS the plugin: the loader consumes
 * name/inject/apply). */
export const name = 'inputPrepStudio'

// NO estate injects (the fifth receipt, 2026-09-29): studios load
// BEFORE the mounter in the plugin URL, and a static estate inject
// parks this plugin forever waiting on card-view's own $mount. The
// estate bind rides the factory's armed lazy getter over the
// inject-free ctx.get seam — order-proof by construction.
export const inject = ['slots']

export const apply = defineStageViewRegistration('input-prep', InputPrepStudio)

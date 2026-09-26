// Tier 3 — the anny card: author a body (11 identity sliders + the
// 254-morph sculpt panel — or attach a GLB — or load a preset) → the
// 8-view turnaround sheet.
//
// THE TRUTH PASS (stroke 89, operator order 2026-09-17): the old
// schema documented a fiction — SAM hair/outfit sprites, a REQUIRED
// body GLB. The real surface: photo→body is the hmr-estimate VERB
// (the MHR→SOMA→identity_coeffs chain, SubActionMod law — its knobs
// never join the card schema); the body is parametric end-to-end
// (AnnyParamsToGlb bakes the GLB FROM the numbers, so the neutral
// body is the all-defaults bake — no GLB is ever required); the 11
// identity dims are the SERVED space's own labels/range/defaults
// (GET /v1/poser/identity-space: dims 11, range [0,1], defaults
// 0.5 — the DECL carries the defaults, the schema carries hint-only
// floors per the RANGE RULE).
//
// STROKE 90 (the keep-all-features order, 2026-09-17): the studio's
// sculpt stages CONVERT, they don't die — the 254 local-change
// morphs ("a [REDACTED 2026-11-05] ton of sliders") ride the same pin law as the 11
// (kit morphs.ts, door-pinned: labels/range/defaults all 0; compose
// ships only NON-ZERO entries — absent = the engine's own 0), and
// the native figure viewport (the /poser shaped bind mesh — NEVER
// the low-poly GLB export, the 2026-09-06 order) rides the served
// preview.figure claim, rendered by the base form's mesh stage.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { annyLane, finalizeAnny } from '@melite/comfyui-card-kit'
import { vocabulary } from '@melite/comfyui-card-kit/vocab'
import { ANNY_MORPH_LABELS, ANNY_MORPH_RANGE, ANNY_MORPH_DEFAULT } from '@melite/comfyui-card-kit/morphs'
import { bag } from '@melite/contracts/extraKeys'

/** The served identity space's 11 dims, in its label order (the
 *  bake validator names the same eleven — gender/age/muscle/weight/
 *  height/proportions/cupsize/firmness/african/asian/caucasian). */
const PHENOTYPE_DIMS = [
  'gender', 'age', 'muscle', 'weight', 'height', 'proportions',
  'cupsize', 'firmness', 'african', 'asian', 'caucasian',
] as const

const schema = z.object({
  body_glb: z.string().role('path').description("Body GLB").extra('extra', bag({ order: 0, group: "body", columns: 1, tooltip: "Optional — attach a rigged body GLB to render as-is. Empty bakes the body FROM the identity sliders (parametric end-to-end; the neutral body is the all-defaults bake). Photo→body estimation is the 'Estimate body from photo' verb.", wtype: 'mesh' })),
  ...Object.fromEntries(PHENOTYPE_DIMS.map((dim, i) => [dim,
    z.number().description(dim.charAt(0).toUpperCase() + dim.slice(1)).min(0).max(1)
      .extra('extra', bag({ order: i, group: "identity", width: 1, wtype: 'slider', columns: 2, tooltip: `Identity dim ${i + 1}/11 — ${dim} (0..1, neutral 0.5; served by the poser's identity space).` })),
  ])),
  ...Object.fromEntries(ANNY_MORPH_LABELS.map((label, i) => [label,
    z.number().description(label).default(ANNY_MORPH_DEFAULT).min(ANNY_MORPH_RANGE[0]).max(ANNY_MORPH_RANGE[1])
      .extra('extra', bag({ order: 1000 + i, group: "morph", width: 1, wtype: 'slider', columns: 2, tooltip: `Morph ${i + 1}/254 — ${label} (${ANNY_MORPH_RANGE[0]}..${ANNY_MORPH_RANGE[1]}, neutral 0; the poser's local-changes vocabulary).` })),
  ])),
  resolution: z.number().description("View resolution").min(256).max(2048).step(64).default(768).extra('extra', bag({ order: 0, group: "turnaround", width: 1, tooltip: "Pixel size of each turnaround view." })),
  framing: z.number().description("Framing").min(1).max(3).step(0.05).default(1.2).extra('extra', bag({ order: 1, group: "turnaround", width: 1, tooltip: "Camera distance factor — larger frames the whole body looser." })),
  focal_length: z.number().description("Focal length (mm)").min(10).max(400).step(1).default(50).extra('extra', bag({ order: 2, group: "turnaround", width: 1, tooltip: "Lens focal length — lower = wider perspective.", wtype: 'slider' })),
  samples: z.number().description("Samples").min(1).max(4096).step(1).default(64).extra('extra', bag({ order: 3, group: "turnaround", width: 1, tooltip: "Render samples per view — more = cleaner but slower.", wtype: 'number' })),
  // bool or the Select's "true"/"false" wire string (the loose anny
  // law coerces in compose — python step-doc: str(x) != "false")
  transparent: vocabulary(["true", "false"]).description("Background").default("true").extra('extra', bag({ order: 4, group: "turnaround", width: 1, tooltip: "Transparent turnaround background (for compositing into sheets).", wtype: 'select' })),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Anny',
  description: 'Author a character body — 11 identity sliders (or attach a GLB, or load a preset), then render the 8-view turnaround sheet.',
  genre: '3d',
  icon: 'person',
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'anny',
    // no model families — a pure-tool card (requiresModel: false
    // skips the {model:} demand in cardGate, compose, CLI — the
    // flowKinds row below repeats it for discovery).
    requiresModel: false,
    // stage-row id the compose emits (retired skeleton= verbatim; TS owns the truth post-flip).
    skeleton: 'anny',
    boarded: ['anny'],
    tags: ['3d', 'character', 'generate'],
    identity,
    // THE DISCOVERY ROWS (migrated 2026-09-10 from the frozen
    // discovery export — the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 14 },
    // NO surface claim (stroke 89): the studio layout died with the
    // handroll — the emission's three declared groups render through
    // the base form's switchable parameter submenu. The card owns
    // its schema; the CONSTRUCTOR owns the surface.
    flowKinds: {
      inputs: { body_glb: 'mesh' },
      outputs: { default: 'image' },
      requiresModel: false,
    },
    flowOutputBindings: [
      { channel: 'default', node: 'SaveImage.0', nodeClass: 'SaveImage' },
    ],
    requires: ['melite-poser-nodes', 'melite-kimodo-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, _runId) {
      // THE SCHEMA GATE (the audio-trio admission precedent — the
      // card's own declaration validates the last hop into the
      // engine): schemastery walk enforces declared types + bounds
      // (a resolution=5000 draft refuses LOUD here, never composes
      // — declared 256..2048; identity dims cap at 1, morphs at
      // their pin range), fills defaults, passes undeclared keys
      // through inert. The composer's reads below are reads of the
      // GATED doc.
      const doc = schema(p) as Record<string, unknown>
      // THE BODY, three arms — a GLB is NEVER required (stroke 89):
      // 1. an attached GLB renders as-is;
      // 2. empty → the identity sliders BAKE the body
      //    (AnnyParamsToGlb: params_json → glb_path — parametric
      //    end-to-end; untouched sliders = the neutral bake).
      const body = String(doc.body_glb ?? '').trim()
      // THE MORPHS (stroke 90): sparse local_changes — only NON-ZERO
      // entries ride the wire (absent = the engine's own 0; the pin
      // pins every default at 0, so untouched sliders never ship).
      const localChanges: Record<string, number> = {}
      for (const label of ANNY_MORPH_LABELS) {
        const v = Number(doc[label])
        if (Number.isFinite(v) && v !== ANNY_MORPH_DEFAULT) localChanges[label] = v
      }
      const bodyPath = body !== ''
        ? g.node('PrimitiveString', { value: body }).out()
        : g.node('AnnyParamsToGlb', {
            params_json: JSON.stringify({
              dialect: 'authored',
              phenotype: PHENOTYPE_DIMS.map((dim) => Number(doc[dim] ?? 0.5)),
              local_changes: localChanges,
            }),
          }).out()
      annyLane(doc, g, bodyPath)
    },
    finalize: finalizeAnny,
    // THE NATIVE FIGURE (stroke 90): before any run lands, the mesh
    // stage shows the /poser shaped bind mesh (18k verts, smooth
    // normals — NEVER the low-poly GLB export, the 2026-09-06
    // "native ANNY not GLB" order). Served verbatim on the doc's
    // preview arm; run outputs take the stage once they exist.
    preview: { figure: { identityModel: 'anny' } },
  }))
}

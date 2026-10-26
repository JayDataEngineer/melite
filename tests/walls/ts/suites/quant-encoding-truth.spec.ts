// quant-encoding-truth.spec.ts — THE COORDINATE↔FILE TRUTH WALL
// (burn a, operator 2026-10-26: "ONE FORMAT FOR QUANT, ONE VOCAB …
// INT8 != INT8 CONVROT != INT8 CONVROT PRUNED — I MEANT THE SYSTEM
// NEEDS ALL THREE"). Registry row: models-quant-encoding-truth.
//
// THE GAP THIS WALL CLOSES (quant-vocab-drift audit, 2026-10-26,
// dev_docs/audits/quant-vocab-drift-2026-10-26.md): every quant
// wall that existed judged PROJECTIONS OF THE DECL against each
// other — pool-parity (mirror ≡ facts cells), facts-sync (DECL ↔
// facts ↔ served spec), planes-vocabulary (group literals),
// four-plane-canon (L4 MEMBERSHIP: `int8` is in NAMED_QUANTS, so a
// convrot file under `int8` registers green). Copy-vs-copy, all
// green, while nine families collapsed ConvRot weights under the
// plain `int8` word and h3 provisioned true pruned-convrot files
// NO cell served. No wall anywhere judged that a cell's coordinate
// names the REAL quant of the file the cell serves. THIS is that
// judge, on the real booted registry.
//
// MECHANICS — no copy of the DECL is reimplemented; the roster is
// the real boot (boot-models + getModel over registryIds), and the
// served file resolves through the seats the lane actually reads:
//   cell artifact — the download truth (cell.artifact.source_url
//     basename), judged whenever present;
//   inherited lane file — for artifact-less cells, the diffusion
//     body under lane_inputs (unet | dit) at cell → variant →
//     family precedence, exactly the inheritance z-image and h3
//     ride.
// The grammar derives the implied quant from the FILENAME's marks
// (upstream grammar stays upstream-true — `int8convrot`,
// `int8-convrot`, `int8_convrot`, `*Pruned*int8` all collapse to
// the canonical underscore coordinates by MARK, never by
// spelling): convrot+pruned ⇒ int8_convrot_pruned; convrot ⇒
// int8_convrot; pruned ⇒ int8_pruned (the Singularity line —
// upstream names carry no convrot mark; re-stamp only on audition
// evidence); bare int8 ⇒ int8; no int8-family mark ⇒ unjudged by
// this wall (a bf16 file under a bf16 coordinate is membership's
// and the family's own truth, not filename-derivable).
//
// ARMS (one invariant — the coordinate tells the truth about the
// file — and its firing paths):
//   TRUTH — a filename mark contradicting the coordinate reds
//     naming family/variant/coordinate/file. Fires today on
//     krea-2 ×3, z-image ×2, moss-image, pixal3d, trellis2-native,
//     yue2, music3, qwen-img-edit-2511 (convrot files under plain
//     int8) and h3-singularity (pruned file under plain int8).
//   FACE — a label claiming ConvRot or Pruned rides the matching
//     coordinate; the dropdown face must not claim what the
//     routing key denies. Fires today on every ConvRot/Pruned
//     label seated on a plain-int8 coordinate.
//   UNSERVED PROVISION — every provisioned diffusion_models file
//     is some cell's served file; a downloaded weight no cell can
//     load is dead disk. Fires today on h3's Comfy-Org
//     pruned_int8_convrot pair and the spare b25-49 hybrid.
//   OFFER ALL THREE — the operator's named law: where upstream
//     carries all three members, the family offers all three
//     cells (fixture: the 2026-10-26 HF census; h3 is the family —
//     int8 via the smhfacct hybrid, int8_convrot 34 GB,
//     int8_convrot_pruned 21 GB, all three upstream).
// Red-proof (the receipt pins it verbatim): re-stamp any one cured
// cell back to the collapsed `int8` → the TRUTH arm reds naming
// the family; remove a served tier's cell → OFFER reds; plant a
// ConvRot label on a plain coordinate → FACE reds; add an unserved
// diffusion provision → UNSERVED reds.
// Run: npx vitest run --project node tests/walls/ts/suites/quant-encoding-truth.spec.ts
import '../../../../tests/helpers/boot-models.ts'
import { describe, expect, it } from 'vitest'
import { getModel, registryIds } from '@melite/comfyui-cordis'

/** The diffusion-body keys the estate's lane_inputs spell (the
 * quant coordinate names the DIFFUSION tier — text encoders and
 * VAEs under their own keys are not this wall's truth). `unet` and
 * `dit` are the image families; `checkpoint` is the whole-body
 * weights seat of the audio/tts lines (yue2). */
const DIFFUSION_KEYS = ['unet', 'dit', 'checkpoint'] as const

/** @param filename a served or provisioned file basename
 *  @returns the quant the filename's marks imply, or undefined
 *  when the name carries no int8-family mark (unjudged here). */
export function impliedQuant(filename: string): string | undefined {
  // MARK grammar, spelling-agnostic: strip separators so the three
  // upstream grammars (int8convrot / int8-convrot / int8_convrot)
  // and the Pruned casings all collapse to their marks.
  const flat = filename.toLowerCase().replace(/[^a-z0-9]/g, '')
  const convrot = flat.includes('convrot')
  const pruned = flat.includes('pruned')
  const int8 = flat.includes('int8')
  if (convrot && pruned) return 'int8_convrot_pruned'
  if (convrot) return 'int8_convrot'
  if (pruned && int8) return 'int8_pruned'
  if (int8) return 'int8'
  return undefined
}

interface Finding {
  family: string
  variant: string
  quant: string
  file: string
  implied: string
}

const findings: Finding[] = []
const faceFindings: string[] = []
const unserved: string[] = []

for (const id of registryIds()) {
  const decl = getModel(id)
  const familyServed = new Set<string>()
  const familyLane = decl.lane_inputs ?? {}
  for (const variant of decl.variants) {
    const variantLane = { ...familyLane, ...(variant.lane_inputs ?? {}) }
    for (const cell of variant.cells) {
      const seat = `${id}/${variant.id} quant '${cell.quant}'`
      // [1] TRUTH — the download truth first, then the inherited
      // lane file for artifact-less cells.
      const names: string[] = []
      if (cell.artifact?.source_url) {
        names.push(cell.artifact.source_url.split('/').pop() ?? '')
      }
      if (!cell.artifact) {
        const cellLane = cell.lane_inputs ?? {}
        for (const key of DIFFUSION_KEYS) {
          const v = cellLane[key] ?? variantLane[key]
          if (typeof v === 'string' && v) names.push(v)
        }
      }
      for (const file of names) {
        const implied = impliedQuant(file)
        if (implied !== undefined && implied !== cell.quant) {
          findings.push({ family: id, variant: variant.id, quant: cell.quant, file, implied })
        }
        if (file) familyServed.add(file)
      }
      // [2] FACE — the label must not claim a mark the coordinate
      // denies (the agent-facing dropdown face: managePlane serves
      // label beside id, and an agent believing the face refuses).
      const label = cell.label ?? ''
      if (/convrot/i.test(label) && !cell.quant.includes('convrot')) {
        faceFindings.push(`${seat}: label '${label}' claims ConvRot`)
      }
      if (/pruned/i.test(label) && !cell.quant.includes('pruned')) {
        faceFindings.push(`${seat}: label '${label}' claims Pruned`)
      }
    }
  }
  // [3] UNSERVED PROVISION — a quant-tier provision no cell of
  // THIS family resolves is dead disk the installer still
  // downloads. Jurisdiction is the int8 family (the burn's class):
  // a provision whose name carries an int8-family mark must be a
  // served file. Auxiliary detectors upstream files under
  // diffusion_models (mask's rt_detr, fp32, card-constant-loaded —
  // a different crime, ROADMAP's lane-seat debt) carry no mark and
  // are not this wall's truth.
  for (const prov of decl.provisions ?? []) {
    if (prov.folder === 'diffusion_models' && impliedQuant(prov.name) !== undefined &&
        !familyServed.has(prov.name)) {
      unserved.push(`${id}: provision '${prov.name}' is no cell's served file`)
    }
  }
}

// [4] OFFER ALL THREE — the operator's named law, seated on the
// upstream census (HF, 2026-10-26 — Comfy-Org/MiniMax-H3
// diffusion_models carries the convrot 34 GB + pruned convrot
// 21 GB lines; the hybrid repo carries the plain-int8 file). This
// is upstream DATA, not a DECL projection — the one frozen literal
// this wall owns, dated and sourced.
const UPSTREAM_ALL_THREE: Record<string, string[]> = {
  'h3': ['int8', 'int8_convrot', 'int8_convrot_pruned'],
}

describe('models-quant-encoding-truth — the coordinate tells the truth about the file', () => {
  it('TRUTH: every int8-family filename mark agrees with its cell coordinate', () => {
    expect(findings, 'collapsed quant coordinates — the coordinate must name the real quant of the file it serves:\n' +
      findings.map((f) => `  ${f.family}/${f.variant}: '${f.quant}' serves ${f.file} (the file is ${f.implied})`).join('\n')
    ).toEqual([])
  })

  it('FACE: a label claiming ConvRot or Pruned rides the matching coordinate', () => {
    expect(faceFindings, 'label faces claiming marks the routing key denies:\n' +
      faceFindings.map((f) => `  ${f}`).join('\n')).toEqual([])
  })

  it('UNSERVED PROVISION: every provisioned diffusion file is some cell\'s served file', () => {
    expect(unserved, 'provisioned weights no cell can load:\n' +
      unserved.map((f) => `  ${f}`).join('\n')).toEqual([])
  })

  it('OFFER ALL THREE: families whose upstream carries all three members offer all three cells', () => {
    const missing: string[] = []
    for (const [family, members] of Object.entries(UPSTREAM_ALL_THREE)) {
      const offered = new Set<string>()
      for (const variant of getModel(family).variants) {
        for (const cell of variant.cells) offered.add(cell.quant)
      }
      for (const member of members) {
        if (!offered.has(member)) missing.push(`${family}: upstream carries '${member}' — no cell offers it`)
      }
    }
    expect(missing, missing.join('\n')).toEqual([])
  })
})

// cards-exports-rows.spec.ts — the exports-row plane's standing
// judge (cards-census-wave2 CURE-2, 2026-11-06: "a manifest row that
// dangles, or a src face that loses its row, reds nothing BY NAME" —
// the 2026-11-06 input-prep debt was caught by a gate regeneration
// sweep, not a wall). Row→target resolution for ./lib rows is W8's
// home (artifact-plane-law W8 judges every ./lib exports target
// against src); THIS wall owns the uncovered edge, both directions:
//
//   face → row   every canonical card face (src/card.ts, src/tool.ts,
//                src/wire.ts, src/client/index.ts) is importable by
//                name — a `./<seam>` exports row — or, for the card
//                face only, mounted by the bare `.` row
//                (src/card.ts as the package root: the sfx /
//                input-prep shape, cards-census-wave2 CURE-3b).
//   row → face   every `./card|./tool|./wire|./client` row names a
//                src face that exists.
//
// Population: every package under the card genres
// (packages/{3d,audio,image,motion,video}) — packages without
// canonical faces are not card packages by the face law and pass
// vacuously (the census's mask-studio shape).
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const PACKAGES = join(ROOT, 'packages')
const GENRES = ['3d', 'audio', 'image', 'motion', 'video']

/** The canonical card faces and the row each one is imported
 *  through. The card face may alternatively ride the package root
 *  mount; tool/wire/client have no mount arm. */
export const SEAM_FACES: Array<{ seam: string; src: string }> = [
  { seam: 'card', src: 'src/card.ts' },
  { seam: 'tool', src: 'src/tool.ts' },
  { seam: 'wire', src: 'src/wire.ts' },
  { seam: 'client', src: 'src/client/index.ts' },
]

/** One card-genre package's judged inputs (derived from the tree,
 *  never hand-listed). */
export interface CardExportsPkg {
  name: string
  exports: Record<string, unknown>
  faces: string[]
}

/** Every condition-target inside one exports row value. */
function rowTargets(value: unknown, sink: string[] = []): string[] {
  if (typeof value === 'string') sink.push(value)
  else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const v of Object.values(value as Record<string, unknown>)) rowTargets(v, sink)
  }
  return sink
}

/** The correspondence verdict, pure over its inputs (the negative
 *  controls' seam): both directions of the face↔row edge, each
 *  offender named.
 *  @returns offenders — empty when the plane is lawful. */
export function rowOffenders(pkg: CardExportsPkg): string[] {
  const offenders: string[] = []
  const rows = new Set(Object.keys(pkg.exports ?? {}))
  const dotDefault = rowTargets((pkg.exports ?? {})['.'])
  for (const { seam, src } of SEAM_FACES) {
    const rowKey = `./${seam}`
    if (pkg.faces.includes(src)) {
      // the card face may ride the row-mounted root instead
      // (CURE-3b: sfx, input-prep)
      const mounted = seam === 'card' && dotDefault.includes('./lib/card.js')
      if (!rows.has(rowKey) && !mounted) {
        offenders.push(`${pkg.name}: ${src} exists but no ${rowKey} row imports it and . does not mount ./lib/card.js — the face is unreachable by name`)
      }
    } else if (rows.has(rowKey)) {
      offenders.push(`${pkg.name}: ${rowKey} row names a face that does not exist (${src})`)
    }
  }
  return offenders
}

/** The live population: every card-genre package carrying at least
 *  one canonical face. */
function cardPkgs(): CardExportsPkg[] {
  const out: CardExportsPkg[] = []
  for (const genre of GENRES) {
    const base = join(PACKAGES, genre)
    if (!existsSync(base)) continue
    for (const card of readdirSync(base)) {
      const dir = join(base, card)
      const pj = join(dir, 'package.json')
      if (!existsSync(pj)) continue
      const faces = SEAM_FACES
        .map((f) => f.src)
        .filter((src) => existsSync(join(dir, src)))
      if (faces.length === 0) continue
      const manifest = JSON.parse(readFileSync(pj, 'utf8')) as { name?: string; exports?: Record<string, unknown> }
      out.push({ name: manifest.name ?? dir, exports: manifest.exports ?? {}, faces })
    }
  }
  return out
}

describe('cards — the exports-row plane (cards-census-wave2 CURE-2)', () => {
  it('every canonical card face carries its row, and every seam row names a real face', () => {
    const pkgs = cardPkgs()
    expect(pkgs.length, 'the card population cannot be empty (the face law derives it)').toBeGreaterThan(0)
    const offenders = pkgs.flatMap(rowOffenders)
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  it('a face that loses its row reds naming the face; a row naming no face reds (the input-prep class)', () => {
    // THE CURE-1 SHAPE: src/card.ts present, the ./card row gone,
    // . mounting the index — the exact latent debt the census found
    // on image-gen.
    const missingRow = rowOffenders({
      name: '@melite/x-y',
      exports: { '.': { types: './lib/index.d.ts', default: './lib/index.js' } },
      faces: ['src/card.ts', 'src/tool.ts'],
    })
    expect(missingRow.some((o) => o.includes('src/card.ts exists but no ./card row'))).toBe(true)
    expect(missingRow.some((o) => o.includes('src/tool.ts exists but no ./tool row'))).toBe(true)
    // THE REVERSE EDGE: a row whose src face was deleted reds.
    const danglingRow = rowOffenders({
      name: '@melite/x-y',
      exports: { '.': './lib/index.js', './card': './lib/card.js' },
      faces: [],
    })
    expect(danglingRow.some((o) => o.includes('./card row names a face that does not exist'))).toBe(true)
    // THE LAWFUL SHAPES pass: the row-mounted root (sfx/input-prep,
    // CURE-3b) and a fully-rowed package.
    expect(rowOffenders({
      name: '@melite/x-y',
      exports: { '.': { default: './lib/card.js' } },
      faces: ['src/card.ts'],
    })).toEqual([])
    expect(rowOffenders({
      name: '@melite/x-y',
      exports: { '.': './lib/index.js', './card': './lib/card.js', './client': './lib/client.js' },
      faces: ['src/card.ts', 'src/client/index.ts'],
    })).toEqual([])
  })
})

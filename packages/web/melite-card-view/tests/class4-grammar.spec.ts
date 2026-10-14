// @vitest-environment happy-dom
// class4-grammar.spec.ts — THE S7 CLASS-4 RESIDUE WALL (card-view
// face, 2026-11-05). Three grammar classes, one firing path each,
// judged against the DSH reference receipts:
//
//   TIP        — hover text on a trigger rides the estate Tip (the
//                DSH Tooltip over a real anchor — card-base
//                layout.tsx; reference Rows.tsx:297,
//                TeamAction.tsx:92). Native `title=` survives only at
//                the argued inventory: the labeled bench/rescue verb
//                buttons on catalog Button rest channels
//                (TrajectoryToolbar.tsx:60,92,105 — the reference's
//                own toolbar carries title= on labeled buttons), the
//                truncation/overflow spans (TrajectoryTable.tsx:1174,
//                :2881), and the picker card's description overflow
//                (ModelSelect.tsx:453 title on a row).
//   EMPTY      — the bench REFUSES empty faces (the documented
//                no-empty law — every region carries a real refusal
//                or its data); the exception stays pinned so it
//                cannot silently grow a bare empty div.
//   PANE       — a group title renders a real heading element
//                (reference PluginManagerPage.tsx:209
//                `h4.sectionTitle`, Reference.tsx:183 `h3.group`);
//                the bench's control header is the argued composite
//                (PluginManagerPage.tsx:208 `div.sectionHead` wraps
//                the h4 AND the controls — the benchHead is that
//                composite, rev tag + verb bar).
//
// The walk is the judge (DEPTH: real AST over the package source);
// the walk engine mirrors the card-base face of this wall.
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

const SRC = join(import.meta.dirname, '../src')
const CLIENT = join(SRC, 'client')

/** THE CATALOG ROSTER (derived from the installed primitives, the
 *  census's derivation seat) minus the semantic-title components —
 *  the same rule the card-base face of this wall states. */
const SEMANTIC_TITLE = new Set(['Modal', 'DisclosureRow', 'Tooltip', 'HoverCard', 'ConfigField'])
function catalogRoster(): Set<string> {
  const dts = join(import.meta.dirname, '../node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/types/index.d.ts')
  const text = readFileSync(dts, 'utf8')
  const names = new Set<string>()
  for (const m of text.matchAll(/^export \{ ([A-Za-z0-9_]+) \} from/gm)) names.add(m[1])
  expect(names.size, 'the primitives catalog roster derived non-empty').toBeGreaterThan(20)
  for (const s of SEMANTIC_TITLE) names.delete(s)
  return names
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

interface Seat { file: string; line: number; kind: 'element' | 'component' }

function titleSeats(): Seat[] {
  const roster = catalogRoster()
  const seats: Seat[] = []
  const visitFile = (file: string, text: string): void => {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const huntTitles = (node: ts.Node, kind: 'element' | 'component' | 'skip'): void => {
      if (kind === 'skip') return
      if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'title') {
        seats.push({ file, line: source.getLineAndCharacterOfPosition(node.name.pos).line + 1, kind })
        return
      }
      ts.forEachChild(node, (child) => { huntTitles(child, kind) })
    }
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && node.arguments.length >= 2
        && ts.isIdentifier(node.expression) && node.expression.text === 'h') {
        const tagArg = node.arguments[0]
        const props = node.arguments[1]
        if (ts.isStringLiteral(tagArg)) huntTitles(props, 'element')
        else if (ts.isIdentifier(tagArg)) huntTitles(props, roster.has(tagArg.text) ? 'component' : 'skip')
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const abs = join(dir, entry.name)
      const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(abs, relPath)
      else if (/\.tsx?$/.test(entry.name)) visitFile(relPath, readFileSync(abs, 'utf8'))
    }
  }
  walk(CLIENT, '')
  return seats
}

const count = (seats: Seat[], file: string, kind: Seat['kind']): number =>
  seats.filter((s) => s.file === file && s.kind === kind).length

describe('THE S7 CLASS-4 WALL · card-view · TIP GRAMMAR', () => {
  it('native-title seats sit exactly at the argued inventory — a new bare title reds, a cure shrinks by re-pin', () => {
    const seats = titleSeats()
    // ELEMENT seats — the truncation/overflow class (the reference's
    // own idiom, TrajectoryTable.tsx:1174,1265 + :2881): the tile's
    // run-error clip (:214) and transport word (:222), the zoom build
    // id (:259), the add-card picker card's label+description overflow
    // (:159; ModelSelect.tsx:453 receipt). The wired mark (:198) was
    // CONVERTED to the estate Tip this round — a revert reds the
    // count below.
    expect(count(seats, 'sortable-tile.tsx', 'element'), 'sortable-tile.tsx').toBe(2)
    expect(count(seats, 'zoom.tsx', 'element'), 'zoom.tsx').toBe(1)
    expect(count(seats, 'add-card-door.tsx', 'element'), 'add-card-door.tsx').toBe(1)
    // REST-CHANNEL seats — labeled verb hints on catalog Button rest
    // channels (TrajectoryToolbar.tsx:60,92,105 — the reference's
    // toolbar buttons carry visible text AND title=): bench run/clear/
    // undo/save (4), run-rescue install/download verbs (3), the
    // draft restore verb (1).
    expect(count(seats, 'bench-view.tsx', 'component'), 'bench-view.tsx').toBe(4)
    expect(count(seats, 'run-rescue.tsx', 'component'), 'run-rescue.tsx').toBe(3)
    expect(count(seats, 'draft-run-views.tsx', 'component'), 'draft-run-views.tsx').toBe(1)
    const argued = ['sortable-tile.tsx', 'zoom.tsx', 'add-card-door.tsx', 'bench-view.tsx', 'run-rescue.tsx', 'draft-run-views.tsx']
    expect(seats.filter((s) => !argued.includes(s.file)), 'no native-title seat outside the argued files').toEqual([])
  })

  it('the wired mark rides the estate Tip — the source stays converted (toggle guard)', () => {
    const text = readFileSync(join(CLIENT, 'sortable-tile.tsx'), 'utf8')
    expect(text, 'the wired mark seat rides h(Tip, ...)').toContain('h(Tip, { tip: chromeCopy.sourceWired')
    expect(text, 'no native title remains on the wired mark').not.toContain('css.wiredMark, title:')
  })
})

describe('THE S7 CLASS-4 WALL · card-view · EMPTY-STATE GRAMMAR', () => {
  it('the bench keeps its documented no-empty law — the allowlisted exception stays pinned', () => {
    const text = readFileSync(join(CLIENT, 'bench-view.tsx'), 'utf8')
    // THE ANTI-SEAT RECEIPT (the census O1 close): the bench refuses
    // empty states on principle; the wall pins the law's own words so
    // the exception cannot silently grow a bare empty div beside it.
    expect(text, 'the no-empty law stays stated at its seat').toContain('ONE SURFACE, NO STATES')
  })

  it('no hand-rolled `.empty` element seats exist in the tree — an empty face reds until it argues', () => {
    const offenders: string[] = []
    const walk = (dir: string, rel: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name)
        const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`
        if (entry.isDirectory()) { walk(abs, relPath); continue }
        if (!/\.tsx?$/.test(entry.name)) continue
        const text = readFileSync(abs, 'utf8')
        if (/\.empty\b(?!\w)/.test(text) && !/emptyGlyph|emptyHint|emptyTitle|pickEmpty|wireEmpty|timelineEmpty|emptyMesh/.test(text)) {
          offenders.push(relPath)
        }
      }
    }
    walk(CLIENT, '')
    expect(offenders, 'hand-rolled empty faces').toEqual([])
  })
})

describe('THE S7 CLASS-4 WALL · card-view · PANE GRAMMAR', () => {
  it('no non-heading element wears a group-title class — a group title is a real heading element', () => {
    const offenders: string[] = []
    const isHeading = (tag: string): boolean => /^h[1-6]$/.test(tag)
    const walk = (dir: string, rel: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name)
        const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`
        if (entry.isDirectory()) { walk(abs, relPath); continue }
        if (!/\.tsx?$/.test(entry.name)) continue
        const text = readFileSync(abs, 'utf8')
        const source = ts.createSourceFile(relPath, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
        const huntClass = (node: ts.Node, tag: string): void => {
          if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'className') {
            const cls = node.initializer.getText(source)
            if (/(Group|Genre)Title/.test(cls) && !isHeading(tag)) {
              offenders.push(`${relPath}:${source.getLineAndCharacterOfPosition(node.name.pos).line + 1} ${tag}`)
            }
          }
          ts.forEachChild(node, (child) => { huntClass(child, tag) })
        }
        const visit = (node: ts.Node): void => {
          if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h'
            && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
            huntClass(node.arguments[1], node.arguments[0].text)
          }
          ts.forEachChild(node, visit)
        }
        visit(source)
      }
    }
    walk(CLIENT, '')
    expect(offenders, 'group-title class on a non-heading element').toEqual([])
  })
})

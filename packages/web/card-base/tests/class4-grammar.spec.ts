// @vitest-environment happy-dom
// class4-grammar.spec.ts — THE S7 CLASS-4 RESIDUE WALL (card-base
// face, 2026-11-05). Three grammar classes, one firing path each,
// judged against the DSH reference receipts:
//
//   TIP        — hover text on an icon trigger rides the estate Tip
//                (the DSH Tooltip over a real anchor, layout.tsx;
//                reference Rows.tsx:297, TeamAction.tsx:92); native
//                `title=` survives ONLY at the argued inventory
//                (truncation spans: TrajectoryTable.tsx:1174,1265;
//                labeled verb buttons: TrajectoryToolbar.tsx:60,92,105;
//                embedded field faces: settings-form fields.tsx:96-105).
//   EMPTY      — every empty pane face rides EmptyState (layout.tsx;
//                the DSH empty-state shape, WorkspaceBrowser.tsx:266-280
//                EmptySessions: glyph over copy). A hand-rolled
//                `.empty` element seat is the disease; the wire
//                picker's list-row empty is the argued raw-list
//                exception (TrajectoryTable.tsx:1363 noPayload).
//   PANE       — a group title renders a real heading element with
//                its group-title class (reference PluginManagerPage.tsx:209
//                `h4.sectionTitle`, TrajectoryTable.tsx:846,850
//                `h4.usageHeading`); a div wearing the class is the
//                disease. Raw h3/h4 headings ARE the reference idiom —
//                the estate's h4 group titles argue their stay on it.
//
// The walk is the judge (DEPTH: real AST over the package source, the
// census's own engine); the behavior arms ride the real components.
import { cleanup, render } from '@testing-library/react'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { createElement as h } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import ts from 'typescript'

import { EmptyState } from '../src/layout.tsx'
import { SeedDice } from '../src/rows.tsx'
import { SpecPanel, schemaEnvelope } from '../src/index.ts'
import { VideoStagePreview, ImageStagePreview, AudioStagePreview, TextStagePreview } from '../src/preview.tsx'
import { GlbStagePreview } from '../src/glb-stage.tsx'
import { chromeCopy } from '../src/locales/chromeCopy.ts'

const SRC = join(import.meta.dirname, '../src')

afterEach(cleanup)

// ── the walk engine ──────────────────────────────────────────────────

/** One native-title seat: `file:line` plus the class of seat. */
interface TitleSeat { line: number; kind: 'element' | 'component' }

/** THE CATALOG ROSTER (DEPTH: derived from the installed primitives
 *  package — the census's own derivation seat) minus the components
 *  whose `title` is a SEMANTIC prop, never a DOM rest channel. A
 *  title assignment landing on a roster atom lands NATIVE on the DOM
 *  (the S6a rest channel); a title on Modal/DisclosureRow/Tooltip is
 *  the component's own contract and is not a tooltip seat. */
const SEMANTIC_TITLE = new Set(['Modal', 'DisclosureRow', 'Tooltip', 'HoverCard', 'ConfigField'])
function catalogRoster(): Set<string> {
  const dts = 'node_modules/@deepseek-ai/dsh-client-ui-primitives/lib/types/index.d.ts'
  const text = readFileSync(join(import.meta.dirname, '../', dts), 'utf8')
  const names = new Set<string>()
  for (const m of text.matchAll(/^export \{ ([A-Za-z0-9_]+) \} from/gm)) names.add(m[1])
  expect(names.size, 'the primitives catalog roster derived non-empty').toBeGreaterThan(20)
  for (const s of SEMANTIC_TITLE) names.delete(s)
  return names
}

function walkSource(sourceText: string, roster: Set<string>, onSeat: (seat: Pick<TitleSeat, 'kind'>, line: number) => void): void {
  const source = ts.createSourceFile('seat.tsx', sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  // Depth rule: a `title` PropertyAssignment anywhere inside an h()
  // props argument counts — conditional spreads
  // (`...(cond ? { title } : {})`) are seats exactly as much as direct
  // props (ACCURACY: the walk sees the seat the runtime renders).
  const huntTitles = (node: ts.Node, kind: 'element' | 'component' | 'skip'): void => {
    if (kind === 'skip') return
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'title') {
      onSeat({ kind }, node.getSourceFile().getLineAndCharacterOfPosition(node.name.pos).line + 1)
      return
    }
    ts.forEachChild(node, (child) => { huntTitles(child, kind) })
  }
  const visit = (node: ts.Node): void => {
    // JSX: `title=` on a host element tag (lowercase tag = element).
    if (ts.isJsxAttribute(node) && node.name.getText(source) === 'title') {
      let opening: ts.Node | undefined = node.parent
      while (opening !== undefined && !ts.isJsxOpeningElement(opening)) opening = opening.parent
      if (opening !== undefined) {
        const tag = (opening as ts.JsxOpeningElement).tagName.getText(source)
        const line = source.getLineAndCharacterOfPosition(node.pos).line + 1
        if (tag !== '' && tag[0] === tag[0].toLowerCase() && tag[0] !== tag[0].toUpperCase()) onSeat({ kind: 'element' }, line)
      }
    }
    // h(): hyperscript — the callee decides the class. A string tag is
    // an element seat; a catalog-atom identifier is a rest-channel
    // seat (S6a: native attrs pass through the atom to the DOM); any
    // other identifier is an estate/foreign component whose `title`
    // is its own contract — not a tooltip seat.
    if (ts.isCallExpression(node) && node.arguments.length >= 2) {
      const callee = node.expression
      if (ts.isIdentifier(callee) && callee.text === 'h') {
        const props = node.arguments[1]
        const tagArg = node.arguments[0]
        if (ts.isStringLiteral(tagArg)) huntTitles(props, 'element')
        else if (ts.isIdentifier(tagArg)) huntTitles(props, roster.has(tagArg.text) ? 'component' : 'skip')
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
}

function propertyName(name: ts.PropertyName): string | undefined {
  return ts.isIdentifier(name) || ts.isStringLiteral(name) ? name.text : undefined
}

function srcFiles(): Array<{ rel: string; text: string }> {
  const out: Array<{ rel: string; text: string }> = []
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.endsWith('.module.css') || entry.name.endsWith('.d.ts')) continue
      const abs = join(dir, entry.name)
      const relPath = rel === '' ? entry.name : `${rel}/${entry.name}`
      if (entry.isDirectory()) walk(abs, relPath)
      else if (/\.tsx?$/.test(entry.name)) out.push({ rel: relPath, text: readFileSync(abs, 'utf8') })
    }
  }
  walk(SRC, '')
  return out
}

function titleSeats(): Array<TitleSeat & { rel: string }> {
  const seats: Array<TitleSeat & { rel: string }> = []
  const roster = catalogRoster()
  for (const { rel, text } of srcFiles()) {
    walkSource(text, roster, (kind, line) => { seats.push({ rel, line, kind: kind.kind }) })
  }
  return seats
}

function seatsIn(seats: Array<TitleSeat & { rel: string }>, rel: string, kind: TitleSeat['kind']): number {
  return seats.filter((s) => s.rel === rel && s.kind === kind).length
}

/** Element seats whose className carries a member matching the
 *  group-title grammar (the pane-grammar class roster). */
function groupTitleSeats(): string[] {
  const offenders: string[] = []
  const isHeading = (tag: string): boolean => /^h[1-6]$/.test(tag)
  const huntClass = (node: ts.Node, tag: string, file: string): void => {
    if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'className') {
      const text = node.initializer.getText(node.getSourceFile())
      if (/(Group|Genre)Title/.test(text) && !isHeading(tag)) {
        const line = node.getSourceFile().getLineAndCharacterOfPosition(node.name.pos).line + 1
        offenders.push(`${file}:${line} ${tag} wears a group-title class`)
      }
    }
    ts.forEachChild(node, (child) => { huntClass(child, tag, file) })
  }
  for (const { rel, text } of srcFiles()) {
    const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h'
        && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
        huntClass(node.arguments[1], node.arguments[0].text, rel)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return offenders
}

/** Element seats (string-tag h()) whose className member is exactly
 *  `empty` — the hand-rolled empty face. */
function handRolledEmptySeats(): string[] {
  const offenders: string[] = []
  for (const { rel, text } of srcFiles()) {
    const source = ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
    const hunt = (node: ts.Node, file: string): void => {
      if (ts.isPropertyAssignment(node) && propertyName(node.name) === 'className') {
        const text2 = node.initializer.getText(node.getSourceFile())
        if (/\.empty\b(?!\w)/.test(text2) && !/emptyGlyph|emptyHint|emptyTitle|pickEmpty|wireEmpty|timelineEmpty|emptyMesh/.test(text2)) {
          const line = node.getSourceFile().getLineAndCharacterOfPosition(node.name.pos).line + 1
          offenders.push(`${file}:${line} className ${text2}`)
        }
      }
      ts.forEachChild(node, (child) => { hunt(child, file) })
    }
    const visit = (node: ts.Node): void => {
      // only ELEMENT seats — a component call's className is the
      // EmptyState conversion itself (the cure, never the disease)
      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'h'
        && node.arguments.length >= 2 && ts.isStringLiteral(node.arguments[0])) {
        hunt(node.arguments[1], rel)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  return offenders
}

// ── TIP GRAMMAR ──────────────────────────────────────────────────────

describe('THE S7 CLASS-4 WALL · card-base · TIP GRAMMAR', () => {
  it('the converted icon triggers ride the estate Tip — the dice button carries NO native title and sits in the Tip anchor', () => {
    const { container } = render(h(SeedDice, { random: true, onToggle: () => {} }))
    const dice = container.querySelector('[data-seed-dice="random"]') as HTMLElement
    expect(dice, 'the dice renders').not.toBeNull()
    expect(dice.getAttribute('title'), 'the hover text left the native title channel').toBeNull()
    // THE TIP ANCHOR: Tip wraps its child in the anchor span (layout.tsx)
    expect(dice.parentElement?.tagName, 'the dice sits inside the Tip anchor span').toBe('SPAN')
  })

  it('native-title seats sit exactly at the argued inventory — a new bare title reds, a cure shrinks by re-pin', () => {
    const seats = titleSeats()
    // THE ARGUED INVENTORY (element seats — every one carries its DSH
    // receipt; a NEW seat re-pins deliberately or converts to Tip):
    //  - truncation/overflow titles (the reference's own idiom,
    //    TrajectoryTable.tsx:1174,1265 `title={attachment.name}` on
    //    truncation spans): atoms.tsx:76 error text, preview.tsx:208
    //    dead artifact / :237 history names / :257 strip filename /
    //    :309 film thumb name, square.tsx:233 held raw value,
    //    mods.tsx:799,938,969 caption labels.
    //  - embedded field faces (S7g class: the reference renders the
    //    embedded control raw, settings-form fields.tsx:96-105; the
    //    labeled row's bubble voice is infoGlyph, rows.tsx:15-22):
    //    atoms.tsx:354 chips group, form.tsx:354,372,398,455,538
    //    stack head/cell tooltips.
    //  - positioned overlay controls (the Tip anchor span cannot host
    //    an absolutely-positioned child; the reference's compact
    //    controls carry raw title, TrajectoryToolbar.tsx:60,92,105):
    //    square.tsx:247,256 squareX/squarePick.
    //  - drag-mode hint on the sortable tile: mods.tsx:1017.
    //  - the single-family static Model select (the model-plane
    //    wave, 2026-11-05: a family count of ONE is a STATED face —
    //    the static select carries the row's own label, titled, the
    //    truncation class): axes.tsx.
    expect(seatsIn(seats, 'atoms.tsx', 'element'), 'atoms.tsx').toBe(2)
    expect(seatsIn(seats, 'axes.tsx', 'element'), 'axes.tsx').toBe(1)
    expect(seatsIn(seats, 'form.tsx', 'element'), 'form.tsx').toBe(5)
    expect(seatsIn(seats, 'mods.tsx', 'element'), 'mods.tsx').toBe(4)
    expect(seatsIn(seats, 'preview.tsx', 'element'), 'preview.tsx').toBe(4)
    expect(seatsIn(seats, 'square.tsx', 'element'), 'square.tsx').toBe(3)
    expect(seats.filter((s) => s.kind === 'element' && !['atoms.tsx', 'axes.tsx', 'form.tsx', 'mods.tsx', 'preview.tsx', 'square.tsx'].includes(s.rel)),
      'no element-title seat outside the argued files').toEqual([])
    // THE REST-CHANNEL CLASS (component seats — the title lands native
    // through a catalog atom's rest spread, the S6a channel; receipts
    // as above: labeled verb hints + embedded field faces):
    //  - atoms.tsx: the SpecMenuSelect trigger passthrough (:114, the
    //    landed S7h "tooltip on the trigger" law) + the two Input
    //    faces (:510,:519).
    //  - mods.tsx:865 the leaf's range Input.
    //  - preview.tsx:170 the StaleBadge capsule (the S7j Pill
    //    conversion kept the hover hint — TrajectoryToolbar class).
    expect(seatsIn(seats, 'atoms.tsx', 'component'), 'atoms.tsx rest channel').toBe(3)
    expect(seatsIn(seats, 'mods.tsx', 'component'), 'mods.tsx rest channel').toBe(1)
    expect(seatsIn(seats, 'preview.tsx', 'component'), 'preview.tsx rest channel').toBe(1)
    expect(seats.filter((s) => s.kind === 'component' && !['atoms.tsx', 'mods.tsx', 'preview.tsx'].includes(s.rel)),
      'no rest-channel title seat outside the argued files').toEqual([])
  })
})

// ── EMPTY-STATE GRAMMAR ──────────────────────────────────────────────

const PREVIEW_KINDS: Array<[string, (props: Record<string, unknown>) => ReturnType<typeof h>]> = [
  ['video', (p) => VideoStagePreview(p as never)],
  ['image', (p) => ImageStagePreview(p as never)],
  ['audio', (p) => AudioStagePreview(p as never)],
  ['text', (p) => TextStagePreview(p as never)],
]

describe('THE S7 CLASS-4 WALL · card-base · EMPTY-STATE GRAMMAR', () => {
  for (const [kind, Preview] of PREVIEW_KINDS) {
    it(`the ${kind} preview's empty face rides EmptyState — slot, glyph, copy`, () => {
      const { container } = render(h(Preview, { stageId: `t-${kind}`, runStatus: 'idle', artifacts: [] }))
      const face = container.querySelector('[data-slot="empty-state"]')
      expect(face, `the ${kind} empty face carries the EmptyState slot`).not.toBeNull()
      expect(face?.querySelector('svg'), `the ${kind} empty face carries the kind glyph`).not.toBeNull()
      expect(face?.textContent?.length ?? 0, `the ${kind} empty face carries copy`).toBeGreaterThan(0)
    })
  }

  it('the figure stage\'s empty faces ride EmptyState too (the failed and loading arms)', () => {
    const text = readFileSync(join(SRC, 'poser-figure.tsx'), 'utf8')
    expect((text.match(/h\(EmptyState/g) ?? []).length, 'the figure stage renders its empty faces through EmptyState').toBeGreaterThanOrEqual(2)
  })

  it('the mesh stage\'s empty face rides EmptyState (the shared viewport law)', () => {
    const { container } = render(h(GlbStagePreview, { assets: [], label: 'wall-mesh' }))
    expect(container.querySelector('[data-slot="empty-state"]'), 'the mesh empty face carries the slot').not.toBeNull()
    expect(container.textContent, 'the mesh empty copy stays the locale\'s').toContain(chromeCopy.emptyMeshHint)
  })

  it('EmptyState forwards element attrs — the testid channel the text faces ride', () => {
    const { container } = render(h(EmptyState, { title: 'x', ...{ 'data-testid': 'probe-empty' } }))
    expect(container.querySelector('[data-testid="probe-empty"]')).not.toBeNull()
  })

  it('no hand-rolled `.empty` element seats remain — an empty face outside EmptyState reds', () => {
    expect(handRolledEmptySeats(), 'hand-rolled empty faces').toEqual([])
  })
})

// ── PANE GRAMMAR ─────────────────────────────────────────────────────

describe('THE S7 CLASS-4 WALL · card-base · PANE GRAMMAR', () => {
  it('no div wears a group-title class — a group title is a real heading element', () => {
    expect(groupTitleSeats(), 'group-title class on a non-heading element').toEqual([])
  })

  it('SpecPanel renders its section titles as h4 (the reference section head)', () => {
    const doc = { form: 'any-card', schema: schemaEnvelope({}), variants: [] }
    const { container } = render(h(SpecPanel, {
      model: 'any-card',
      sections: [{ title: 'Engine', rows: [] }],
      values: {},
      onEdit: () => {},
      spec: doc as never,
    }))
    const head = container.querySelector('h4')
    expect(head, 'the section title is a heading element').not.toBeNull()
    expect(head?.textContent).toBe('Engine')
  })

  it('the refused-spec face renders its title as h4 too (one grammar, both arms)', () => {
    const { container } = render(h(SpecPanel, {
      model: 'any-card',
      sections: [],
      values: {},
      onEdit: () => {},
      spec: null,
      error: 'the spec door refused',
    }))
    const head = container.querySelector('[data-testid="spec-panel-error"] h4')
    expect(head, 'the error face title is a heading element').not.toBeNull()
  })
})

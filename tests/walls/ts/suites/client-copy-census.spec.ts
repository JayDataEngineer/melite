/**
 * THE CLIENT-COPY CENSUS WALL (TRIAGED-1/2 cure, 2026-11-05).
 *
 * The law (AGENTS MD BASE, mirrored from DSH's
 * `verify-client-ui-i18n` decision): client UI copy is locale-owned —
 * presentation code owns no product-copy literals; copy rides typed
 * dictionaries (`squareCopy` for the input squares, `studioCopy` for
 * the h3 studio, `motionCopy` for the motion studio). This wall is
 * OUR battery's equivalent of the reference gate: an AST walk over
 * every card-facing client tree that reports product copy embedded in
 * presentation sources, with locale files exempt as the copy owners.
 *
 * Walk adapted from
 * `references/deepseek-harness/scripts/verify-client-ui-i18n.ts`
 * (COPY_ATTRIBUTES/COPY_NAME/COPY_SUFFIX, the collectExpression
 * descent, and the natural-text heuristics carry over verbatim in
 * spirit; the reference's desktop-only arms do not apply here).
 *
 * THE RATCHET: the census pins the current violation count per tree
 * exactly. The count only MOVES with an argument in this file — a new
 * product literal fires red until it either joins a dictionary or the
 * pin is re-argued. Zero is the destination; the pinned non-zero
 * trees carry their debt argument inline.
 */
import { globSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(import.meta.dirname, '../../../..')

// The AST engine: typescript is a PACKAGE-LOCAL seat in this repo
// (every card package owns node_modules/typescript; the root hoists
// none — the same shape models-lib-sync rides with per-package tsc).
// Resolving through card-base's seat keeps the wall version-floating
// with the workspace (no pinned .pnpm path).
const ts: typeof import('typescript') = createRequire(
  resolve(ROOT, 'packages/web/card-base/node_modules/typescript/package.json'),
)('typescript')

/** The card-facing client trees this census seats (TRIAGED-2's scope:
 *  "all card + shared client sources"). The viewer family
 *  (viewer/viewer-base/three-client) and melite-estate are seated by
 *  their own audits — they are not card surfaces; adding a tree here
 *  is a scope move argued in this comment. */
const TREES = [
  'packages/motion/motion/src/ui',
  'packages/video/h3-timeline/src/ui',
  'packages/image/mask-studio/src/ui',
  'packages/web/card-base/src',
  'packages/web/melite-card-view/src',
  'packages/web/melite-card-deck/src',
  'packages/web/melite-run-wire/src',
] as const

/** Copy-bearing JSX attribute names (reference COPY_ATTRIBUTES). */
const COPY_ATTRIBUTES = new Set([
  'alt', 'aria-description', 'aria-label', 'aria-valuetext', 'cancelLabel',
  'closeLabel', 'confirmLabel', 'copyLabel', 'description', 'emptyLabel',
  'label', 'placeholder', 'title', 'truncatedLabel',
])
const COPY_ATTRIBUTE_SUFFIX = /(?:Aria|Copy|Description|Heading|Label|Message|Placeholder|Summary|Text|Title|Tooltip)$/
const COPY_NAME = /(?:^|_)(?:aria|copy|description|empty|heading|label|message|placeholder|summary|text|title|tooltip)(?:s|_.*)?$/i
const COPY_SUFFIX = /(?:aria|copy|description|empty|heading|label|labels|message|placeholder|summary|text|title|tooltip|tabs)$/i
/** Tokens that are language syntax, never product copy (reference IMMUTABLE_LANGUAGE_TOKENS). */
const IMMUTABLE_LANGUAGE_TOKENS = new Set(['B', 'Function', 'GB', 'K', 'KB', 'M', 'MB', 'Symbol', 'false', 'function()', 'n', 'null', 'true', 'undefined'])
/** Locale-key-shaped strings (e.g. `seed_extra`) are ids, not copy. */
const LOCALE_KEY = /^[a-z][a-zA-Z0-9]*(?:[._-][a-zA-Z0-9]+)+$/

/** A dictionary file — the copy OWNER, exempt from the census.
 *  (reference localeOwner: locale.ts/locales.ts//locales/; ours also
 *  seats the tenant dict idiom `*Copy.ts` beside the components —
 *  studioCopy/motionCopy/chromeCopy are owners, case-insensitively.) */
function localeOwner(file: string): boolean {
  const normalized = file.replaceAll('\\', '/')
  const base = normalized.slice(normalized.lastIndexOf('/') + 1)
  return base === 'locale.ts' || base === 'locales.ts' || normalized.includes('/locales/') || /copy\.ts$/i.test(base)
}

function containsProductText(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return normalized !== ''
    && !IMMUTABLE_LANGUAGE_TOKENS.has(normalized)
    && !LOCALE_KEY.test(normalized)
    && /\p{L}/u.test(normalized)
}

function looksLikeNaturalText(text: string): boolean {
  const normalized = text.replace(/\s+/g, ' ').trim()
  return /\s|[\u3400-\u9fff]/u.test(normalized) || /^[A-Z]/.test(normalized)
}

function propertyName(node: ts.PropertyName | ts.BindingName): string | undefined {
  return ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined
}

function copyAttribute(name: string): boolean {
  return !name.endsWith('Key') && (COPY_ATTRIBUTES.has(name) || COPY_ATTRIBUTE_SUFFIX.test(name))
}

export interface CopyViolation {
  file: string
  line: number
  reason: string
  text: string
}

/** Find hardcoded product copy in one client source (the adapted
 *  reference walk). @returns violations in source order. */
export function findCopyViolations(file: string, sourceText: string): CopyViolation[] {
  if (localeOwner(file)) return []
  const source = ts.createSourceFile(
    file, sourceText, ts.ScriptTarget.Latest, true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const violations = new Map<number, CopyViolation>()
  const report = (node: ts.Node, text: string, reason: string, naturalOnly = false): void => {
    if (!containsProductText(text) || (naturalOnly && !looksLikeNaturalText(text)) || violations.has(node.getStart(source))) return
    const position = source.getLineAndCharacterOfPosition(node.getStart(source))
    violations.set(node.getStart(source), {
      file,
      line: position.line + 1,
      reason,
      text: text.replace(/\s+/g, ' ').trim().slice(0, 80),
    })
  }
  const collectExpression = (node: ts.Expression, reason: string, naturalOnly = false): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      report(node, node.text, reason, naturalOnly)
      return
    }
    if (ts.isTemplateExpression(node)) {
      report(node, [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(''), reason, naturalOnly)
      return
    }
    if (ts.isCallExpression(node)) return
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isSatisfiesExpression(node) || ts.isNonNullExpression(node)) {
      collectExpression(node.expression, reason, naturalOnly)
      return
    }
    if (ts.isConditionalExpression(node)) {
      collectExpression(node.whenTrue, reason, naturalOnly)
      collectExpression(node.whenFalse, reason, naturalOnly)
      return
    }
    if (ts.isBinaryExpression(node)) {
      if (node.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) collectExpression(node.right, reason, naturalOnly)
      else if (node.operatorToken.kind === ts.SyntaxKind.PlusToken || node.operatorToken.kind === ts.SyntaxKind.BarBarToken || node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken) {
        collectExpression(node.left, reason, naturalOnly)
        collectExpression(node.right, reason, naturalOnly)
      }
      return
    }
    if (ts.isArrayLiteralExpression(node)) {
      for (const element of node.elements) {
        if (ts.isExpression(element)) collectExpression(element, reason, naturalOnly)
      }
      return
    }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          const name = propertyName(property.name)
          const propertyOwnsCopy = name !== undefined && (COPY_NAME.test(name) || COPY_SUFFIX.test(name))
          collectExpression(property.initializer, reason, naturalOnly || !propertyOwnsCopy)
        }
      }
    }
  }
  const enclosingFunctionName = (node: ts.Node): string | undefined => {
    let current = node.parent
    while (!ts.isSourceFile(current)) {
      if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current)) {
        return current.name === undefined ? undefined : propertyName(current.name)
      }
      if (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        const parent = current.parent
        return ts.isVariableDeclaration(parent) ? propertyName(parent.name) : undefined
      }
      current = current.parent
    }
    return undefined
  }
  const hasExplicitStringReturn = (node: ts.Node): boolean => {
    let current = node.parent
    while (!ts.isSourceFile(current)) {
      if (ts.isFunctionDeclaration(current) || ts.isMethodDeclaration(current) || ts.isArrowFunction(current) || ts.isFunctionExpression(current)) {
        return current.type?.kind === ts.SyntaxKind.StringKeyword
      }
      current = current.parent
    }
    return false
  }
  const visit = (node: ts.Node): void => {
    if (ts.isJsxText(node)) report(node, node.text, 'JSX text')
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(source)
      if (copyAttribute(name) && node.initializer !== undefined) {
        if (ts.isStringLiteral(node.initializer)) report(node.initializer, node.initializer.text, `${name} attribute`)
        else if (ts.isJsxExpression(node.initializer) && node.initializer.expression !== undefined) {
          collectExpression(node.initializer.expression, `${name} attribute`)
        }
      }
    }
    if (ts.isJsxExpression(node) && node.expression !== undefined && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      collectExpression(node.expression, 'JSX child')
    }
    // h()-child arm (card-base's non-JSX render idiom — the 2026-11-05
    // card-base cure found the JSX-only walk blind to it): string
    // children of h(tag, props, ...children) calls are copy just like
    // JSX children. Only the child positions (index 2+) count — the
    // tag and props arguments are structure, never prose.
    if (ts.isCallExpression(node) && node.arguments.length > 2
      && (node.expression.kind === ts.SyntaxKind.Identifier && (node.expression as ts.Identifier).text === 'h')) {
      for (const arg of node.arguments.slice(2)) {
        if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) {
          report(arg, arg.text, 'h() child', true)
        } else if (ts.isTemplateExpression(arg)) {
          report(arg, [arg.head.text, ...arg.templateSpans.map((span) => span.literal.text)].join(''), 'h() child', true)
        }
      }
    }
    if (file.endsWith('.tsx') && ts.isPropertyAssignment(node)) {
      const name = propertyName(node.name)
      if (name !== undefined && (COPY_NAME.test(name) || COPY_SUFFIX.test(name))) {
        collectExpression(node.initializer, `${name} property`)
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
      const name = propertyName(node.name)
      if (name !== undefined && (COPY_NAME.test(name) || COPY_SUFFIX.test(name))) {
        collectExpression(node.initializer, `${name} value`)
      }
    }
    if (ts.isBindingElement(node) && node.initializer !== undefined) {
      const name = propertyName(node.name)
      if (name !== undefined && (COPY_NAME.test(name) || COPY_SUFFIX.test(name))) {
        collectExpression(node.initializer, `${name} default value`)
      }
    }
    if (ts.isReturnStatement(node) && node.expression !== undefined) {
      const name = enclosingFunctionName(node)
      if (name !== undefined && (COPY_NAME.test(name) || COPY_SUFFIX.test(name))) {
        collectExpression(node.expression, `${name} return value`)
      } else if (file.endsWith('.tsx') && hasExplicitStringReturn(node)) {
        collectExpression(node.expression, 'string return value', true)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return [...violations.values()].sort((left, right) => left.line - right.line)
}

/** Walk one tree; @returns its violations. */
function treeViolations(tree: string): CopyViolation[] {
  const files = globSync(`${tree}/**/*.{ts,tsx}`, { cwd: ROOT })
    .map((f) => f.replaceAll('\\', '/'))
    .filter((f) => !f.endsWith('.d.ts'))
    .sort()
  expect(files.length, `${tree} narrowed to zero files — discovery broke`).toBeGreaterThan(0)
  const out: CopyViolation[] = []
  for (const f of files) out.push(...findCopyViolations(f, readFileSync(resolve(ROOT, f), 'utf8')))
  return out
}

describe('THE CLIENT-COPY CENSUS WALL (locale-owned copy, TRIAGED-1/2)', () => {
  it('every tree sits at its pinned census — a new product literal fires red until it joins a dictionary', () => {
    const actual: Record<string, number> = {}
    const detail: string[] = []
    for (const tree of TREES) {
      const violations = treeViolations(tree)
      actual[tree] = violations.length
      detail.push(`== ${tree} (${violations.length}) ==`)
      detail.push(...violations.map((v) => `${v.file.replace(tree + '/', '')}:${v.line} ${v.reason}: ${v.text}`))
    }
    expect(actual, `copy census:\n${detail.join('\n')}`).toEqual(PINS)
  })
})

/** The ratchet pins. Zero is the destination; every non-zero tree
 *  carries its debt argument here. */
// THE RATCHET (per tree, 2026-11-05 close): every card-facing tree
// owns its typed dictionary and sits at 0 — except card-base, whose
// 25 carries TWO argued residues (the copy-census campaign's close
// census, /tmp/copy-final.log):
// (1) THREE data sites, never prose: wire.ts 'manage/<action>
//     refused' (a refusal-identity detail code callers match —
//     localizing forks the identity per locale), estate-remote.ts
//     ': refused' (the wire-layer refusal fallback discriminated by
//     code, outside the chrome seat), preview.tsx 'poser-figure:'
//     (a namespaced viewport id consumed as a data-viewport
//     attribute, never rendered prose).
// (2) The law-wording h() children held at their seats under the
//     studioCopy computed-wording bound (the reference tree's own
//     law-wording exemption, applied to card-base's non-JSX render
//     idiom): the compose-gate sentences, the glb viewer states
//     (loading mesh…/Shaded/Wireframe/Skeleton/Weights), the mods
//     leaf labels (— pick —/Strength/Region/Remove), the preview
//     history/failure lines, the spec/studio loading+empty states,
//     the axes 'Extensions' and form 'Inputs' headings. One-of-a-
//     kind per seat, wording law-earned; converging them onto the
//     dict is polish debt recorded in CONTRACTS §4, not silent
//     drift — the count above pins them VISIBLE.
const PINS: Record<string, number> = {
  'packages/motion/motion/src/ui': 0,
  'packages/video/h3-timeline/src/ui': 0,
  'packages/image/mask-studio/src/ui': 0,
  'packages/web/card-base/src': 25,
  'packages/web/melite-card-view/src': 0,
  'packages/web/melite-card-deck/src': 0,
  'packages/web/melite-run-wire/src': 0,
}

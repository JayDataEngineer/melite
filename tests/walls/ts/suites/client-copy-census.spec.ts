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
 *  is a scope move argued in this comment.
 *
 *  SCOPE MOVE (2026-11-05, the copy-scope extension): the three
 *  pattern-wall trees outside the original seven join — infer-gallery
 *  (the media sidebar client), web-kit/timeline (the timeline UI kit),
 *  comfyui action_cards (the motion/ui viewers) — each with its own
 *  typed dictionary (galleryCopy/timelineCopy/actionCopy) and its own
 *  pin row below. */
const TREES = [
  'packages/motion/motion/src/ui',
  'packages/video/h3-timeline/src/ui',
  'packages/image/mask-studio/src/ui',
  'packages/web/card-base/src',
  'packages/web/melite-card-view/src',
  'packages/web/melite-card-deck/src',
  'packages/web/melite-run-wire/src',
  // the copy-scope extension (2026-11-05): the 3 pattern-wall trees
  'packages/web/infer-gallery/src',
  'packages/web-kit/timeline/src',
  'packages/engines/comfyui/src/action_cards',
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
  // The same-file copy-named-parameter index (the D2 arm's pre-pass):
  // function NAME → its copy-named parameter positions (declaration
  // order). Parameters whose names carry a copy suffix/name are the
  // positions product copy may sit at; everything else is structure.
  const copyParamIndices = new Map<string, number[]>()
  const copyParamNames = new Map<string, string[]>()
  const indexCopyParams = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node) && node.name !== undefined && ts.isIdentifier(node.name)) {
      const indices: number[] = []
      const names: string[] = []
      node.parameters.forEach((parameter, index) => {
        if (ts.isIdentifier(parameter.name)) {
          const parameterName = parameter.name.text
          if (COPY_NAME.test(parameterName) || COPY_SUFFIX.test(parameterName)) {
            indices.push(index)
            // aligned by parameter position (not compacted) — the call
            // site looks the name up by the argument's own position.
            names[index] = parameterName
          }
        }
      })
      if (indices.length > 0) {
        copyParamIndices.set(node.name.text, indices)
        copyParamNames.set(node.name.text, names)
      }
    }
    ts.forEachChild(node, indexCopyParams)
  }
  indexCopyParams(source)
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
    // THE COPY-POSITION ARROW (arm E of the D1 re-aim): the sidebar/tab
    // registries take `title: (): string => …` SEATS — the literal sits
    // in the arrow's body, one hop past the copy-named property. A copy
    // position owns its function body's expression; block-bodied seats
    // are still judged by the return arm through enclosingFunctionName.
    if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (ts.isExpression(node.body)) collectExpression(node.body, reason, naturalOnly)
      return
    }
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
        // arm F of the D1 re-aim: the function may sit at a PROPERTY
        // position (`title: (address: string): string => { … }` in an
        // object literal, or a class property arrow) — the property's
        // own name names the seat, same as a variable declaration.
        if (ts.isVariableDeclaration(parent) || ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent) || ts.isMethodDeclaration(parent)) {
          return propertyName(parent.name)
        }
        return undefined
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
    if (file.endsWith('.tsx') && ts.isJsxExpression(node) && node.expression !== undefined && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
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
    // THE .TS-ENTRY ARMS (the nativity audit's D1 re-aim, 2026-11-05):
    // dictionaries are .ts files, and the seats that read them live in
    // .ts entries (apply()/register()/title resolvers) — a walker that
    // only judges .tsx property positions is blind to exactly the file
    // kind the D1 cure touches. The property arm and the string-return
    // arm both fire in .ts now; a literal planted in a .ts entry seat
    // reds this wall (the red-proof receipt lives in the cure report).
    if (ts.isPropertyAssignment(node)) {
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
      } else if (hasExplicitStringReturn(node)) {
        collectExpression(node.expression, 'string return value', true)
      }
    }
    // THE COPY-NAMED-ARGUMENT ARM (D2 of the re-aim): a call to a
    // function DECLARED IN THE SAME FILE whose parameters carry copy
    // names (title/description/label…) is a copy POSITION — a literal
    // passed there is product copy, exactly like the property arm.
    // This is what catches the deck register()-helper pattern (its
    // title/guideDescription arguments) without the over-collection
    // the broader call arms caused (the rejection note above the
    // pins). Same-file declarations only: an imported callee's
    // parameter names are not visible here, so dictionary reads and
    // wire calls never fire this arm.
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const indices = copyParamIndices.get(node.expression.text)
      if (indices !== undefined) {
        for (const index of indices) {
          const arg = node.arguments[index]
          const param = copyParamNames.get(node.expression.text)![index]
          if (arg !== undefined && ts.isExpression(arg)) collectExpression(arg, `${node.expression.text}() ${param} argument`)
        }
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
//
//     RE-PIN 25→36 (2026-11-05, the S7j/class-4 merge — adjudicated
//     literal-by-literal, not bumped blind): the same triaged
//     wording moved from h()-children into COMPONENT PROPS through
//     the sanctioned conversions — Pill children (glb layer votes,
//     the preview stale badge + return verb), EmptyState title:
//     faces (the preview rendering/No-render pairs count BOTH
//     conditional arms; glb loading-mesh; spec/studio empties),
//     SpecMenuSelect label props (the catalog pick ghost + the
//     unregistered row). poser-figure's two load states (figure
//     failed:/loading figure…) ENTER the count — the EmptyState
//     conversion formalized a seat the old walk under-counted (the
//     class-4 report's "missed seat"). Every literal remains
//     one-of-a-kind law-wording at its seat; the dictionary
//     convergence debt is unchanged, still CONTRACTS §4.
//
// THE D1 RE-AIM RE-PIN (nativity audit 2026-11-05, the web-cards cure):
// the walker gained the .ts-entry arms — property positions in .ts
// (arm A), string-returning functions in .ts (arm B), copy-position
// arrow bodies (arm E), property-position enclosing names (arm F), and
// same-file copy-named call arguments (arm D2). The arms were chosen
// against two REJECTED broader arms, argued here so nobody re-tries
// them:
//   - REJECTED (probe C): descending collectExpression into EVERY call
//     argument. It over-collects: dictionary READ positions (`t('key')`,
//     `squareCopy.forceSentence({...})`) become violations and every
//     wire helper call sprays noise (card-base 42 -> 72, action_cards
//     0 -> 4 in the probe). Copy positions are structural (property
//     names, declared parameter names), so only those two faces collect.
//   - REJECTED (probe D): collecting all arguments at every call whose
//     NAME merely looks copy-ish. 22-57 per tree, mostly log voices —
//     the ratchet's signal dies.
// D2's shape is the narrow survivor: the callee must be a function
// DECLARED IN THE SAME FILE (its parameter names are visible evidence),
// and only the copy-named parameters' positions collect.
const PINS: Record<string, number> = {
  'packages/motion/motion/src/ui': 0,
  // h3-timeline re-pinned 5 -> 4 (2026-11-05, the timeline
  // completion, Phase-0 row F-B1): docCalls.ts's strip clip-header
  // `C${i+1} · ${s}s — ` came home to studioCopy.clipHeader — the
  // re-adjudication the 5-pin's own comment promised. Remaining 4:
  // the CallCard.tsx countTitle attribute pair (S-A1, computed law
  // wording with live numbers — studioCopy.ts:10-13's own bound),
  // the docModel.ts:376 seed prompt (S-A2, document data, never
  // presentation copy), and the docModel.ts:409 trackColor rgb
  // template (S-A3, a style value the walker's arm B over-collects).
  // Re-pinned 4 -> 5 (2026-10-17, B5's pick gate): RunRecipeEngine's
  // onPick face pushes the door's verbatim clause as an arm-A `message`
  // property ("card_compose: " + family) — the wire-refusal-voice
  // triage class (wire.ts:84 ×2, estate-remote.ts:216, the spec.ts
  // triad), not presentation copy.
  // Re-pinned 5 -> 6 (2026-11-08, h¹'s flip-settlement): the
  // settlement's RE-JUDGE pushes the same clause class on the reseated
  // candidate ("card_compose: " + reFam) — the same arm-A refusal
  // voice at the same gate, not presentation copy. The settlement's
  // USER-FACING voice rides studioCopy.gateSettled (the dictionary).
  'packages/video/h3-timeline/src/ui': 6,
  'packages/image/mask-studio/src/ui': 0,
  // card-base: 36 (the S7j/class-4 merge, argued above) + 6 from the
  // D1 .ts arms — all arm A `message` properties in .ts: the wire
  // refusal voices wire.ts:84 ×2 and estate-remote.ts:216, and the
  // spec.ts:1339/1361/1384 compose-refusal triad. The form/preview/
  // studio .tsx residue is unchanged.
  // RE-PIN 42→45 (2026-11-08, the drill null-set cure): +3 arm A
  // segments of the composeValidate MIRROR CLAUSE (spec.ts:1731) —
  // the door's own field-named refusal voice ("fires nothing on this
  // lane") spelled verbatim so the mirror and the admission gate
  // cannot drift; localizing it would fork the door's identity per
  // locale (the wire.ts data-site argument, class 1).
  // RE-PIN 45→48 (2026-11-08, the inject-keys pre-validation cure):
  // +3 fragments of the composeValidate FAMILY CLAUSE (spec.ts:1799) —
  // the t4r lane's own field-named refusal voice ("fires nothing on
  // the t4r lane — the lane refuses it (unsanctioned inject keys); the
  // estate walk refuses the same key at the door") spelled verbatim so
  // the gesture's gate and the estate walk speak one law; same class
  // as the mirror clause above (the wire.ts data-site argument,
  // class 1 — the voice IS the door's identity).
  'packages/web/card-base/src': 48,
  // card-view: 13 — the D1 dictionary moves landed (the cards-tab
  // title/guide trio + the mention title now ride chromeCopy), so the
  // residue is two DEBT classes, every seat computed law-voiceing:
  // cards-resource.ts failure() message arguments ×8 (arm D2 — the
  // resource rows' stream/failure frames) and draft.ts:517-520
  // unlandedWriteVoice ×5 (arm B string returns — the write-gate's
  // voice assembly). Dictionary convergence stays CONTRACTS §4.
  // RE-PIN 13→15 (2026-11-08, the P5 rescue-honesty cure): +2 arm B
  // string returns in run-rescue-core.ts:195/:197 — the
  // acquiredDetailOf ONE-HOME success voice (the "no declared total"
  // honesty face); one assembly seat, the tracker's own words.
  // RE-PIN 15→17 (2026-11-09, the SD-7 unstamp cure): +2 string
  // returns in stage-drill.tsx:123-124 — gateRefusalVoice's
  // COMPOSE-GATE refusal voice ("THE COMPOSE GATE REFUSED — / — the
  // write never left the studio…"), the string-contract helper's own
  // words; the same class as card-base's compose-refusal triad (the
  // wire.ts data-site argument, class 1 — the voice IS the door's
  // identity; localizing would fork the drill's identity per locale).
  // The affordance verb itself rides chromeCopy (unstampWord), never
  // a raw literal.
  'packages/web/melite-card-view/src': 17,
  // deck: 2 — the register() title/guideDescription positions now ride
  // assetsCopy (D2's proof seat: a literal at those arguments fires
  // this wall). Residue: index.ts:41 + :50 `message` embed notices
  // (arm A) — the embed's degraded-mode voices; next dictionary pass.
  'packages/web/melite-card-deck/src': 2,
  'packages/web/melite-run-wire/src': 0,
  // ── the copy-scope extension (2026-11-05) ──
  // gallery: 23 — the D1 moves landed (mediaTabTitle, mediaTabGuide,
  // artifactFallbackTitle ride galleryCopy; 27 -> 23). The residue is
  // ONE class: the media door's served-plane refusal voices (HTTP 404/
  // 405/422 error strings in index.ts ×18, decode.ts drop counters ×4,
  // media-kinds.ts fallback word ×1) — wire grammar the fetch caller
  // reads, never sidebar chrome.
  'packages/web/infer-gallery/src': 23,
  // action_cards: 0 — the pose stage, motion poster/viewer and poster
  // shell ride actionCopy.ts.
  'packages/engines/comfyui/src/action_cards': 0,
  // timeline: 7 — the ENTIRE residue is the vendored `viser-timeline/`
  // subtree, NVIDIA upstream kept pull-diff-clean (its barrel: "files
  // keep upstream's structure so later upstream pulls diff clean"), so
  // its rendered faces stay upstream's: the zoom aria names + "fit"
  // (timeline-overlays.tsx ×3), the canvas seconds unit + "(Empty)"
  // placeholder (timeline-render-background.ts ×2) — plus TWO DATA
  // SITES that are never prose: styles.ts PROMPT_TEXT_SHADOW and
  // HIGHLIGHT_TEXT_SHADOW_COLOR are canvas shadow COLOR constants the
  // walker's copy-NAME heuristic matches on `_TEXT_`. Every
  // melite-authored timeline file sits at 0 riding timelineCopy.ts; a
  // new literal anywhere in the tree (vendored files included) still
  // fires red against this pin.
  // timeline re-pinned 7 -> 4 (2026-11-05, F2 of the nativity
  // audit): the zoom cluster (aria names + "fit") re-homed OUT of
  // the vendored viser-timeline/ into melite-authored
  // TimelineScrollbar.tsx riding timelineCopy, returning the
  // subtree to 1:1 upstream (its barrel's pull-diff-clean promise
  // made true). Residue: the canvas seconds unit + "(Empty)" in
  // upstream's own timeline-render-background.ts, plus the two
  // data sites (styles.ts canvas shadow COLOR constants).
  // timeline re-pinned 5 -> 4 (2026-11-05, the timeline completion,
  // Phase-0 row F-B4 + the F-B5 comment cure): the one melite seat
  // the 5-pin admitted — store/timelineAudio.ts:41's `Audio ${n}`
  // fallback — now consumes timelineCopy.audioTrackFallback. The
  // TRUE residue composition (the F-B5 reword): FOUR seats, ALL
  // vendored-upstream faces or data — the canvas seconds unit +
  // "(Empty)" in upstream's own timeline-render-background.ts ×2
  // and the styles.ts canvas shadow COLOR constants ×2 (data,
  // matched on `_TEXT_`). No melite-authored literal remains
  // outside the dictionaries.
  'packages/web-kit/timeline/src': 4,
}

/**
 * The melite_construct toolview — THE FLOW LINK, rendered NATIVE in
 * the DSH React tree beside FlowCards.
 *
 * A construct call edits THE SHARED BENCH (no draft id exists to
 * card), so its chat face is not rows but the verdict title plus the
 * clickable link to the edited flow: the bench address opened
 * through the shell's navigation face (the register site's inject
 * share — ctx.sidebarRight.openResource, the same channel
 * FlowCards' rows ride to open the Cards tab). Operator 2026-11-05:
 * "when it edits a flow, the clickable link opens the right
 * sidebar flow view."
 *
 * The link derives from the NATIVE channel only: the tool's
 * persisted presentationMeta ({bench} — the projector melite-
 * construct.ts owns). Prose and args never carry the key, so a
 * block without meta renders the title alone — never a dead link.
 * Without the shell face the card degrades to the title (the
 * openMedia precedent: a door the shell did not provide does not
 * render); a shell refusal (false) stays put, never throws.
 *
 * The keyed hit REPLACES the generic row (the ToolCallTree
 * dispatch: keyed entry wins, GenericToolCard is the fallback), so
 * this card also owns the title face — the host presentCall's
 * `Bench <verb>[ · <stage|card>]` wording, mirrored from argsRaw —
 * and the refusal's first line (the render text the generic row's
 * OUT section would have shown).
 */
import { useMemo } from 'react'
import css from './card.module.css'
import { Button, Pill } from '@deepseek-ai/dsh-client-ui-primitives'
import { benchAddressOf } from './cards-resource.ts'
import type { ToolCallBlockView } from './types.ts'
import { chromeCopy } from '../chromeCopy.ts'

export interface ConstructCardProps {
  block: ToolCallBlockView
  /** The shell's navigation face — the register site's inject share
   *  (the client contract's own channel for cross-surface
   *  callbacks). Absent in headless harnesses/tests: the link does
   *  not render, never throws. Returns false when the shell
   *  refused. */
  openSurface?: (address: string) => boolean
}

/** The verdict title — the host presentCall's wording, mirrored
 *  from the frozen args (the keyed toolview replaces the generic
 *  row, so the title face lives here now). The literals live in the
 *  dictionary (chromeCopy.constructTitle — the copy census); this
 *  seat carries none. */
export function constructTitleOf(argsRaw: string): { title: string, malformedArgs: boolean } {
  if (argsRaw === '') return { title: chromeCopy.constructTitle({ verb: '?', on: '' }), malformedArgs: false }
  try {
    const args = JSON.parse(argsRaw) as Record<string, unknown>
    const verb = typeof args['verb'] === 'string' ? args['verb'] : '?'
    const on = typeof args['stage'] === 'string' && args['stage'] !== '' ? args['stage']
      : typeof args['card'] === 'string' && args['card'] !== '' ? args['card'] : ''
    return { title: chromeCopy.constructTitle({ verb, on }), malformedArgs: false }
  } catch {
    return { title: chromeCopy.constructTitle({ verb: '?', on: '' }), malformedArgs: true }
  }
}

/** Parse a melite_construct call: the verdict title + the linked
 *  bench key. NATIVE CHANNEL FIRST: a settled result carries the
 *  tool's persisted presentationMeta (ToolResultNode.meta) with
 *  {bench} — every construct verb emits it, refusals included. No
 *  legacy fallback exists (pre-projector prose never carried the
 *  key): those blocks render title-only, never a dead link. */
export function parseConstructBlock(block: ToolCallBlockView): {
  title: string
  malformedArgs: boolean
  bench: string | null
  settled: boolean
  isError: boolean
  errorLine: string | null
} {
  const settled = block.kind === 'tool-result'
  const argsRaw = settled ? (block.call?.argsRaw ?? '') : (block.argsRaw ?? '')
  const { title, malformedArgs } = constructTitleOf(argsRaw)
  const isError = settled && block.isError === true
  let bench: string | null = null
  if (settled) {
    const meta = block.meta
    if (meta !== null && typeof meta === 'object' && !Array.isArray(meta)) {
      const key = (meta as Record<string, unknown>)['bench']
      if (typeof key === 'string' && key !== '') bench = key
    }
  }
  // The refusal's voice: the keyed toolview replaces the generic
  // row's OUT section, so the first text line rides the badge —
  // a refused edit must never read as a clean one.
  let errorLine: string | null = null
  if (isError && Array.isArray(block.content)) {
    for (const part of block.content) {
      if (part === null || typeof part !== 'object') continue
      const text = (part as { text?: unknown }).text
      if (typeof text !== 'string' || text === '') continue
      const nl = text.indexOf('\n')
      errorLine = nl < 0 ? text : text.slice(0, nl)
      break
    }
  }
  return { title, malformedArgs, bench, settled, isError, errorLine }
}

/** One melite_construct call: the verdict title, the refusal voice,
 *  and the clickable link that opens the edited flow in the Cards
 *  tab (the right sidebar flow view). */
export function ConstructCard({ block, openSurface }: ConstructCardProps) {
  const parsed = useMemo(() => parseConstructBlock(block), [block])
  const address = parsed.bench === null ? null : benchAddressOf(parsed.bench)
  return (
    <div className={css.card} data-dsh-part="melite-construct-card" data-bench={parsed.bench ?? undefined}>
      <div className={css.head}>
        <Pill>{chromeCopy.brand}</Pill>
        <span className={css.model}>{parsed.title}</span>
        {parsed.malformedArgs && <span className={css.state} data-state="error">{chromeCopy.argsUnparseable}</span>}
        {parsed.isError && <span className={css.state} data-state="error" role="alert">{parsed.errorLine ?? chromeCopy.draftFailed}</span>}
        {/* THE FLOW LINK (the operator's verbatim demand): the
            edited flow opens in the Cards tab — the register site's
            inject share claims the bench address, places it, and
            reveals the column in one step. Ghost sm + the link-read
            class (the dismiss-× idiom's kin: catalog chrome, never
            a raw seat — the chrome canon; no title — the tip
            canon). Renders only with the shell face (the openMedia
            precedent); a shell refusal stays put, never throws. */}
        {address !== null && openSurface !== undefined && (
          <Button
            size="sm"
            variant="ghost"
            className={css.flowLink}
            aria-label={chromeCopy.openFlow}
            onClick={() => { openSurface(address) }}
          >
            {chromeCopy.openFlow}
          </Button>
        )}
      </div>
    </div>
  )
}

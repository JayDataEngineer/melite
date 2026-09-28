/**
 * runCard.ts — the DEFAULT run-card view: one settled model-card call
 * (a call that returned {model, run_id, ...} for a gateway run)
 * rendered from the durable slice plus the run's artifacts.
 *
 * EVERY run card gets this row WITHOUT shipping any view code: the
 * composition (@melite/viewer's client half) claims the card's tool
 * name with `claimRunCardToolview` — the ui-tool built-ins pattern
 * (central default views; a card's own client half is a takeover, the
 * keyed slot's replacement arm). A card ships a client half only when
 * it has a specific override; all-defaults cards ship none.
 *
 * The row model is replay-stable exactly like ui-skill's SkillRow:
 * derived ONLY from the frozen call block — args for the prompt, the
 * card's presentationMeta projection on the settled node (the same
 * payload presentResult reads host-side; see image-gen's tool.ts) for
 * model/run/error. The gallery is the one live arm: artifacts live on
 * the Melite gateway, so the row polls the viewer's same-origin run
 * proxy until the run settles and renders the artifacts through the
 * asset proxy (never an attachment loader — tool.call.images is the
 * DSH attachment plugin's; our bytes are gateway assets).
 */
import { TERMINAL_RUN_STATUSES } from '@melite-plugin/melite-run-wire'
import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { assetProxyUrl, runProxyUrl } from './wire.ts'

/**
 * The run-card meta projection every model card's tool emits via
 * `output.presentationMeta` (persisted on the settled node). The row
 * narrows defensively — a card projecting a subset still renders.
 */
export interface RunCardMeta {
  model?: string
  run_id?: string
  error?: string
}

type RowState = 'running' | 'ok' | 'refused' | 'error' | 'stopped'

interface RowModel {
  state: RowState
  model: string | null
  runId: string | null
  prompt: string | null
  headline: string | null
}

// the shared terminal vocabulary (melite-run-wire) — the one place
// a status means "stop asking"
const TERMINAL = new Set(TERMINAL_RUN_STATUSES)

/** Derive the row model from the durable slice alone (replay-safe). */
export function runCardModel(props: ToolCallViewProps): RowModel {
  const { block } = props
  const settled = 'kind' in block
  // 0.1.7's PreparingToolCall carries no argsRaw (a head alone); only
  // the dispatched StartedToolCall does — narrow by the field itself.
  const argsRaw = (settled ? block.call?.argsRaw : 'argsRaw' in block ? block.argsRaw : undefined) ?? ''
  let prompt: string | null = null
  try {
    const parsed = JSON.parse(argsRaw) as Record<string, unknown>
    if (typeof parsed.prompt === 'string') prompt = parsed.prompt
  } catch { /* truncated streaming prefix — the settled meta carries the facts */ }
  const meta = (settled ? (block.meta as RunCardMeta | undefined) : undefined) ?? {}
  const state: RowState = !settled
    ? 'running'
    : typeof meta.error === 'string' && meta.error !== ''
      ? 'refused'
      : block.error?.code === 'interrupted'
        ? 'stopped'
        : block.isError ? 'error' : 'ok'
  const textParts: string[] = []
  if (settled) {
    for (const item of block.content) {
      textParts.push(item.type === 'text' ? item.text : JSON.stringify(item))
    }
  }
  return {
    state,
    model: typeof meta.model === 'string' && meta.model !== '' ? meta.model : null,
    runId: typeof meta.run_id === 'string' && meta.run_id !== '' ? meta.run_id : null,
    prompt,
    headline: textParts.join('\n') || null,
  }
}

interface GalleryState {
  status: string | null
  artifacts: readonly string[]
}

/** Poll the same-origin run proxy until the run settles; collect artifacts. */
export function useRunGallery(runId: string | null): GalleryState {
  const [state, setState] = useState<GalleryState>({ status: null, artifacts: [] })
  useEffect(() => {
    if (runId === null) return
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    let stopped = false
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(runProxyUrl(runId), {
          signal: controller.signal,
          headers: { accept: 'application/json' },
        })
        if (res.ok) {
          const body = JSON.parse(await res.text()) as { status?: string; artifacts?: string[] }
          const status = typeof body.status === 'string' ? body.status : null
          const artifacts = Array.isArray(body.artifacts) ? body.artifacts.filter(
            (a): a is string => typeof a === 'string' && a !== '',
          ) : []
          if (!stopped) setState({ status, artifacts })
          if (status === null || TERMINAL.has(status)) return
        } else {
          // 404 unknown run: stop polling, keep the last known state.
          if (!stopped) setState((s) => ({ ...s, status: 'unknown' }))
          return
        }
      } catch { /* transient — retry below */ }
      if (!stopped) timer = setTimeout(poll, 2000)
    }
    void poll()
    return () => {
      stopped = true
      controller.abort()
      if (timer !== undefined) clearTimeout(timer)
    }
  }, [runId])
  return state
}

// The pinned primitives vocabulary (0.1.0-rc.7) has no neutral 'idle'
// (repo HEAD adds it); an interrupted call is user-attention, not an
// error — amber, and the badge word states the arm.
const DOT: Record<RowState, Parameters<typeof StateDot>[0]['state']> = {
  running: 'ongoing',
  ok: 'done',
  refused: 'warning',
  error: 'error',
  stopped: 'warning',
}

export function RunCardRow(props: ToolCallViewProps): JSX.Element {
  const model = runCardModel(props)
  const gallery = useRunGallery(model.state === 'running' ? null : model.runId)
  const badge = gallery.status ?? model.state
  return (
    <div data-melite-run-card style={{
      border: '1px solid rgba(128,128,128,0.35)',
      borderRadius: 8, padding: 10, fontSize: 13, lineHeight: 1.5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <StateDot state={DOT[model.state]} />
        <strong style={{ flex: 1 }}>
          {props.toolName}{model.model !== null ? ` [${model.model}]` : ''}
          {model.runId !== null ? ` \u2192 ${model.runId}` : ''}
        </strong>
        <span style={{ opacity: 0.7, fontSize: 12 }}>{badge}</span>
      </div>
      {model.prompt !== null && (
        <div style={{ opacity: 0.75, marginTop: 6 }}>{model.prompt}</div>
      )}
      {model.state === 'refused' && model.headline !== null && (
        <div style={{ marginTop: 6, whiteSpace: 'pre-wrap' }}>{model.headline}</div>
      )}
      {model.runId !== null && gallery.artifacts.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {gallery.artifacts.map((rel) => (
            <img
              key={rel}
              src={assetProxyUrl(model.runId ?? '', rel)}
              alt={rel}
              loading="lazy"
              style={{ width: 128, height: 128, objectFit: 'cover', borderRadius: 6, display: 'block' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * The narrow client-ctx face the claim needs (the real service merges
 * come from dsh-client-ui-renderer — `ctx.slots` — and cordis's
 * `ctx.effect`; typed locally so this library stays runtime-dep-free,
 * the media-plugin TabCtx law).
 */
export interface ClaimCtx {
  effect(fn: () => unknown, name?: string): unknown
  slots: {
    inject(key: string, callback: () => unknown): unknown
    register(options: { name: string; key: string }, component: unknown): unknown
  }
}

/**
 * Claim `tool.call.toolview` for one run card's wire tool name, with
 * the default row — the ui-skill registration shape (the
 * declaration-aware `slots.inject`, reconciling + disposal included).
 * Returns nothing; the claim lives and dies with `ctx`.
 */
export function claimRunCardToolview(ctx: ClaimCtx, toolName: string, label: string): void {
  ctx.effect(() => ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register(
      { name: 'tool.call.toolview', key: toolName },
      RunCardRow,
    )), label)
}

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
 * model/run/error. The gallery is the one live arm: it rides the run
 * resource's frames (runs/subscribe over the gateway's stream face),
 * handed down by the composition as the `runFrames` prop — the row
 * itself stays runtime-dep-free and presentational, deriving from
 * props only (the web-card law: raw events and persisted metadata,
 * never a fetch of its own). No source (a composition without the
 * estate's runs namespace) renders no gallery; the retired poll's
 * same-origin door answers 502 `estate_killed` by design since
 * 2026-09-10, so its answers were always the gone badge.
 */
import { useEffect, useState } from 'react'
import type { JSX } from 'react'
import { StateDot } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { listArtifactMediaUrl } from '@melite-plugin/melite-run-wire'

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

/** One gallery frame — the run row's live facts as the composition
 * serves them: the registry's status word plus the artifact names in
 * the runs row's own spelling (`<runId>/<rel>`; absolute and rooted
 * urls pass through the row's media rewrite verbatim). */
export interface RunGalleryFrame {
  readonly status: string
  readonly artifacts: readonly string[]
}

/** The live-run source the composition hands down: `runs/subscribe`
 * through the gateway's stream face, one frame per row that moved.
 * The source owns the stream's lifecycle laws — it ends on the
 * terminal row, disposes on abort, and re-serves nothing (the
 * row-change gate is the source's, one law with the run view's
 * tail); aborting the signal ends the iterable. */
export type RunFramesSource =
  (runId: string, signal: AbortSignal) => AsyncIterable<RunGalleryFrame>

/** Ride the composition's run frames for the gallery arm. No source
 * (a composition without the estate's runs namespace) is no arm: the
 * state stays empty and the row renders its durable model alone. An
 * ended source keeps the last frame standing (the terminal row is the
 * source's own last yield). */
export function useRunGallery(
  runId: string | null,
  source: RunFramesSource | undefined,
): GalleryState {
  const [state, setState] = useState<GalleryState>({ status: null, artifacts: [] })
  useEffect(() => {
    if (runId === null || source === undefined) return
    const controller = new AbortController()
    let stopped = false
    void (async () => {
      try {
        for await (const frame of source(runId, controller.signal)) {
          if (stopped) return
          setState({ status: frame.status, artifacts: frame.artifacts })
        }
      } catch (error) {
        // the source's law is to end, never throw; if it ever does,
        // the last gallery state stands — the durable model is the
        // row's truth, and a rejected async body must not go unhandled
        console.error('[melite/viewer-base] run gallery tail failed:', error)
      }
    })()
    return () => {
      stopped = true
      controller.abort()
    }
  }, [runId, source])
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

/** The row's props: the slot's view props plus the composition's
 * live-run source (optional — the claim threads it when the
 * composition holds the estate's runs namespace). */
export type RunCardRowProps = ToolCallViewProps & { readonly runFrames?: RunFramesSource }

export function RunCardRow(props: RunCardRowProps): JSX.Element {
  const { runFrames, ...view } = props
  const model = runCardModel(view)
  const gallery = useRunGallery(model.state === 'running' ? null : model.runId, runFrames)
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
          {gallery.artifacts.flatMap((name) => {
            // the one media rewrite (melite-run-wire): registry names
            // `<runId>/<rel>` ride the estate's media route; absolute
            // and rooted urls pass verbatim; an empty name is no image
            const url = listArtifactMediaUrl(name)
            return url === null ? [] : [(
              <img
                key={name}
                src={url}
                alt={name}
                loading="lazy"
                style={{ width: 128, height: 128, objectFit: 'cover', borderRadius: 6, display: 'block' }}
              />
            )]
          })}
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
 * `runFrames` (the composition's live-run source) rides the
 * registered component's props; absent, the row registers bare and
 * renders its durable model alone. Returns nothing; the claim lives
 * and dies with `ctx`.
 *
 * @param ctx the claiming composition's client ctx
 * @param toolName the card's wire tool name (the keyed slot's key)
 * @param label the effect's name (the composition's own line)
 * @param runFrames the live-run source the composition holds, if any
 */
export function claimRunCardToolview(
  ctx: ClaimCtx,
  toolName: string,
  label: string,
  runFrames?: RunFramesSource,
): void {
  const Row = runFrames === undefined ? RunCardRow
    : (props: ToolCallViewProps): JSX.Element =>
        <RunCardRow {...props} runFrames={runFrames} />
  ctx.effect(() => ctx.slots.inject('tool.call.toolview', () =>
    ctx.slots.register(
      { name: 'tool.call.toolview', key: toolName },
      Row,
    )), label)
}

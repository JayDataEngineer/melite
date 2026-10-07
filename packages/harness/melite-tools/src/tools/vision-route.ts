import type { GenerateOptions, LlmRuntime as DshLlmRuntime } from '@deepseek-ai/dsh-llm'
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'

/**
 * vision-route.ts — the maker lane's delegated eye (the vision-capable
 * route the charter owes, dev_docs/ROADMAP.md "A vision-capable route
 * for the maker lane").
 *
 * THE PROBLEM (Commission 17, transcript-015-20261001-0024 §3.2/§4-5):
 * the maker lane's chat route declares no image input, so `melite_view`
 * and `read_image` both refuse and every visual in a commission is
 * verified by ffprobe + PNG dimensions only. Declaring the image input
 * on the maker's own model row is the profile author's one-line cure
 * (the row lives in the lane profile overlay, outside this tree), so
 * the tool carries the other honest cure: when its own route is blind,
 * the viewing runs through a route that CAN see, and the verdict says
 * exactly which route looked.
 *
 * THE TWO LAWS THIS COMPOSES (both proven in this tree):
 * - the craft critic's route law (packages/engines/craft/src/
 *   craft-engine.ts `resolveImageCapableRoute`): enumerate every
 *   registered provider route round-robin and take the FIRST
 *   image-capable one — zero config to misconfigure; a lane with no
 *   vision route resolves none (loud, never fatal). A NAMED route is
 *   verified image-capable, never silently substituted (explicit means
 *   explicit).
 * - the enhance door's call law (../llm-complete.ts
 *   `harnessCompleteOnRoute`): one streaming completion on one exact
 *   route, assembled to text, terminal finish taxonomy enforced, the
 *   serving route echoed as `via` (no silent wrong-model answer).
 *
 * THE WIRE (DSH-native, no new seat): the vision call is one
 * `llm.stream` on the resolved route with a fixed verification
 * question + the durable image block (`{type:'image', attachment}` —
 * dsh-llm's own user-message shape; only user messages may carry
 * images). The chat route never receives the block, so a blind chat
 * route keeps working: it gets the seeing route's verdict as labeled
 * text instead of the pixels.
 */

/** One vision route on the harness model plane. */
export interface VisionRoute {
  provider: string
  model: string
}

/** "provider/model" — the only spelling a route is ever named by. */
export function visionRouteName(r: VisionRoute): string {
  return r.provider + '/' + r.model
}

/** The lane's declared eye. Unset = enumerate; `off` = explicit text-only. */
export const VIEW_ROUTE_ENV = 'MELITE_VIEW_ROUTE'

/** End-to-end deadline for one delegated verification (the enhance
 *  door's observed-live auxiliary-call shape: ~60s seen, 180s bound). */
export const VISION_DEADLINE_MS = 180_000

/** The structural llm seat this module exercises: resolveModelInfo for
 *  the gates (melite-view's own seam), listProviders/listModels for
 *  the enumeration (the enhance door's seam), stream for the one
 *  verification call. Real LlmRuntime satisfies all four; fakes stay
 *  structural (the tool-fs inject law). */
export interface VisionLlmSeam {
  listProviders(): Array<{ id: string }>
  listModels(provider: string): Promise<Array<{ id: string }>>
  resolveModelInfo(provider: string, model: string, signal?: AbortSignal): Promise<{ inputModalities?: readonly string[] }>
  stream(options: GenerateOptions): AsyncIterable<VisionStreamChunk>
}

/** The stream slice this module reads: text assembly + the terminal
 *  finish taxonomy (the enhance door's teeth, same shape). */
export type VisionStreamChunk =
  | { type: 'text-delta', text?: unknown }
  | { type: 'finish', reason?: { kind?: unknown, failure?: { message: string, code?: string } } }
  | { type: string }

/** The env preference, parsed once per view call (pure, pinnable). */
export type ViewRoutePreference =
  | { kind: 'named', route: VisionRoute }
  | { kind: 'enumerate' }
  | { kind: 'off' }

/**
 * Parse the lane's declared eye.
 * @param env - the process environment (defaults to the live one).
 * @returns the named route, the enumerate fallback, or explicit off.
 */
export function viewRoutePreference(env: Record<string, string | undefined> = process.env): ViewRoutePreference {
  const raw = (env[VIEW_ROUTE_ENV] ?? '').trim()
  if (raw === '') return { kind: 'enumerate' }
  if (raw.toLowerCase() === 'off' || raw.toLowerCase() === 'none') return { kind: 'off' }
  const named = /^([^/\s]+)\/(.+)$/.exec(raw)
  if (named === null) return { kind: 'enumerate' }
  return { kind: 'named', route: { provider: named[1]!, model: named[2]! } }
}

/**
 * Resolve the vision route for one viewing: the named route verified
 * image-capable (explicit means explicit — a named-but-blind route is
 * the caller's LOUD error, never a silent substitution), else the
 * first image-capable route in round-robin enumeration (the craft
 * law), else null (the lane has no eye — the caller serves labeled
 * measurements).
 * @param llm - the harness llm seat.
 * @param preference - the parsed lane preference.
 * @param signal - optional cancellation for adapter-owned lookups.
 * @returns the seeing route, or null when no route on this lane can see.
 */
export async function resolveVisionRoute(
  llm: VisionLlmSeam,
  preference: ViewRoutePreference,
  signal?: AbortSignal,
): Promise<VisionRoute | null> {
  if (preference.kind === 'off') return null
  if (preference.kind === 'named') {
    const wanted = preference.route
    let info: { inputModalities?: readonly string[] }
    try {
      info = await llm.resolveModelInfo(wanted.provider, wanted.model, signal)
    } catch (error) {
      throw new Error(
        'cannot verify visuals: ' + VIEW_ROUTE_ENV + '="' + visionRouteName(wanted) + '" does not resolve ('
        + (error instanceof Error ? error.message : String(error)) + ') — name a "provider/model" route this lane resolves',
      )
    }
    if (info.inputModalities === undefined || !info.inputModalities.includes('image')) {
      throw new Error(
        'cannot verify visuals: ' + VIEW_ROUTE_ENV + '="' + visionRouteName(wanted) + '" resolves with modalities ['
        + (info.inputModalities ?? []).join(', ') + '] (no image) — explicit means explicit: no silent substitution. '
        + 'Fix: declare input: [text, image] on its model row in the lane profile, or name a vision-capable route',
      )
    }
    return wanted
  }
  const providers = llm.listProviders()
  if (providers.length === 0) return null
  const perProvider: VisionRoute[][] = []
  for (const p of providers) {
    try {
      const models = await llm.listModels(p.id)
      if (models.length > 0) {
        perProvider.push(models.map((m) => ({ provider: p.id, model: m.id })))
      }
    } catch { /* a provider that cannot enumerate is skipped — the same quiet-step as the harness route resolver */ }
  }
  const routes: VisionRoute[] = []
  const depth = perProvider.reduce((n, list) => Math.max(n, list.length), 0)
  for (let i = 0; i < depth; i++) {
    for (const list of perProvider) {
      const row = list[i]
      if (row !== undefined) routes.push(row)
    }
  }
  for (const route of routes) {
    try {
      const info = await llm.resolveModelInfo(route.provider, route.model, signal)
      if ((info.inputModalities ?? []).includes('image')) return route
    } catch { /* unresolvable routes step past */ }
  }
  return null
}

/** The fixed verification protocol: the tool asks, never the caller
 *  (a caller-shaped prompt would be a prompt-injection surface in a
 *  viewing door). One question per arm — the still, the film sheet
 *  (frames in span order), the mesh poster. */
export const VISION_QUESTIONS = {
  still: 'You are verifying a commissioned media artifact. Describe exactly what you see in this image: subjects, composition, legible text, and anything anomalous. Do not infer beyond the pixels.',
  film: 'You are verifying a commissioned film. These are frames across its span in order. Describe what happens: subjects, setting, visible action, and whether the frames read as one continuous shot or several. Do not infer beyond the pixels.',
  poster: 'You are verifying a commissioned 3D model from its render. Describe exactly what you see: the subject, its pose or shape, and anything anomalous. Do not infer beyond the pixels.',
} as const

export type VisionQuestionKind = keyof typeof VISION_QUESTIONS

/**
 * One delegated verification: the fixed question + the durable image
 * block stream through the seeing route; the verdict text comes back.
 * @param llm - the harness llm seat.
 * @param route - the resolved seeing route (already verified image-capable).
 * @param image - the durable attachment ref (the store's own normalization).
 * @param kind - which fixed question the arm asks.
 * @param signal - the view call's cancellation (deadline-bounded).
 * @returns the seeing route's verdict plus the serving route (the `via` echo).
 */
export async function verifyVisual(
  llm: VisionLlmSeam,
  route: VisionRoute,
  image: ImageAttachmentRef,
  kind: VisionQuestionKind,
  signal?: AbortSignal,
): Promise<{ verdict: string, via: string }> {
  const timeout = AbortSignal.timeout(VISION_DEADLINE_MS)
  const combined = signal !== undefined ? AbortSignal.any([signal, timeout]) : timeout
  const options: GenerateOptions = {
    provider: route.provider,
    model: route.model,
    messages: [
      createUserMessage({
        content: [
          { type: 'text', text: VISION_QUESTIONS[kind] },
          { type: 'image', attachment: image },
        ],
        source: { kind: 'user' },
      }),
    ],
    signal: combined,
  }
  // THE ASSEMBLY TEETH (the enhance door's deliberate hand-roll,
  // same contract): malformed deltas are ignored, a finish-less
  // stream throws, a non-stop finish names its route and cause.
  let text = ''
  let finish: { kind: string, failure?: { message: string, code?: string } } | null = null
  for await (const chunk of llm.stream(options)) {
    if (chunk.type === 'text-delta' && 'text' in chunk && typeof chunk.text === 'string') {
      text += chunk.text
    } else if (chunk.type === 'finish' && 'reason' in chunk) {
      const reason = chunk.reason
      finish = {
        kind: typeof reason?.kind === 'string' ? reason.kind : JSON.stringify(reason ?? null),
        failure: reason?.failure,
      }
    }
  }
  if (finish === null) {
    throw new Error('cannot verify visuals: ' + visionRouteName(route) + ' ended without a terminal finish')
  }
  if (finish.kind !== 'stop') {
    const detail = finish.failure !== undefined ? finish.failure.message + ' [' + (finish.failure.code ?? '?') + ']' : finish.kind
    throw new Error('cannot verify visuals: ' + visionRouteName(route) + ' failed — ' + detail)
  }
  return { verdict: text, via: visionRouteName(route) }
}

/** Type-check the real seat against the structural seam (fail the
 *  build, not the lane, if DSH renames a field): the conditional
 *  type is `never` on mismatch, so the initializer stops compiling.
 *  A const assignment, not a function reference, so the check
 *  executes at module load and the coverage gate sees it. */
const _visionSeamHolds: DshLlmRuntime extends VisionLlmSeam ? true : never = true
void _visionSeamHolds

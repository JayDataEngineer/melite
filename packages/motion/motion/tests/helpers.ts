/**
 * Shared motion-studio spec setup — extracted VERBATIM from
 * the motion-studio suite (pure move; it lives as the sibling
 * motion-studio-*.spec.tsx files). Mount/stub factories plus the
 * per-test teardown body.
 */
import { vi } from 'vitest'
import { createElement as h } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CardStage } from '@melite/contracts'

import { MotionCardEditor } from '../src/ui/studio/component.tsx'
import { useToastStore } from '@melite/card-base/client'
import { schemaEnvelope } from '@melite/card-base/client'
import { SKIN_URL, MOTION_URL, skinResponse, motionResponse } from './fixtures.ts'
import { runCompiledGeneration } from '@melite/catalog'

export const mounted: Root[] = []

export function resetStudio(): void {
  while (mounted.length > 0) mounted.pop()!.unmount()
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  useToastStore.setState({ toasts: [] })
  localStorage.clear()
}

export function mkStage(over: Record<string, unknown> = {}): CardStage {
  return {
    id: 'm1', title: 'Motion', kind: 'motion', service: 'kimodo_motion',
    params: {}, inputSlots: ['preview_glb'], inputs: [], inputIndices: [], result: null,
    ...over,
  } as unknown as CardStage
}

/** Minimal valid-but-rigless GLB (empty scene) — the real GLTFLoader
 *  parses it, finds no 77-joint skinned mesh, and throws NotSomaxGlbError.
 *  Same family as the synthetic NPZ fixtures: real parser, fake bytes. */
export function minimalGlbBytes(): ArrayBuffer {
  const json = new TextEncoder().encode('{"asset":{"version":"2.0"},"scene":0,"scenes":[{"nodes":[]}]}')
  const pad = (4 - (json.length % 4)) % 4
  const total = 12 + 8 + json.length + pad
  const buf = new ArrayBuffer(total)
  const dv = new DataView(buf)
  dv.setUint32(0, 0x46546c67, true)
  dv.setUint32(4, 2, true)
  dv.setUint32(8, total, true)
  dv.setUint32(12, json.length + pad, true)
  dv.setUint32(16, 0x4e4f534a, true)
  const bytes = new Uint8Array(buf)
  bytes.set(json, 20)
  bytes.fill(0x20, 20 + json.length)
  return buf
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** THE SERVED DOC IS THE DECLARATION (the motion-params journey
 *  audit, 2026-10-16): the form-spec fixture derives from the
 *  REGISTERED motion card schema — the door serves schemastery's own
 *  toJSON (uid + refs), so the test envelope is the same
 *  serialization the real lane serves. A declared knob therefore
 *  reaches the rail whether or not any hand list remembers it — the
 *  exact seam that hid cfg_type for the card's whole history while
 *  the old fixture mirrored the omission. */
let motionEnvelope: Promise<unknown> | null = null
function motionFormEnvelope(): Promise<unknown> {
  motionEnvelope ??= (async () => {
    const { loadCardDefs } = await import('@melite/comfyui-cordis')
    const def = (await loadCardDefs()).get('motion')
    if (def === undefined) {
      throw new Error('the motion card def never registered — the form-spec fixture serves the DECLARATION, never a hand copy')
    }
    return (def.schema as { toJSON(): unknown }).toJSON()
  })()
  return motionEnvelope
}


/** Skin always serves; motion serves only when the stage has a result.
 *  Body/flow lanes opt in per test: bodies maps a URL substring to the
 *  served bytes ('glb' = the rigless mesh) or an HTTP status. */
export function stubLoads(opts: {
  motionT?: number; motionStatus?: number; skinStatus?: number;
  bodies?: Record<string, 'glb' | number>;
  draftsStatus?: number; startStatus?: number; startRaw?: string; startEmptyBody?: boolean;
  validateStatus?: number; validateRaw?: string;
  flow?: 'completed' | 'completed-noglb' | 'failed' | 'slow' | number;
} = {}): void {
  let statusCalls = 0
  vi.stubGlobal('fetch', async (input: unknown, init?: RequestInit) => {
    const u = typeof input === 'string' ? input : (input as Request).url ?? String(input)
    // RULE B: the kimodo form-spec door — the rail's SpecPanel fetches
    // the card family's served schema. THE SERVED DOC IS THE
    // DECLARATION (the motion-params journey audit's split-brain cure,
    // 2026-10-16): the envelope derives from the REGISTERED motion
    // card schema — never a hand-copied row list, the third copy of
    // the truth that let cfg_type drop out of the rail for its whole
    // history while the fixture mirrored the omission.
    if (u.includes('/v1/form-spec')) {
      return jsonResponse({
        form: 'motion',
        schema: await motionFormEnvelope(),
        variants: [],
        inputs: [],
        features: { modifiers: [], variant_groups: {} },
      })
    }
    if (u.includes(SKIN_URL)) {
      if (opts.skinStatus) return new Response('bad', { status: opts.skinStatus })
      return skinResponse()
    }
    if (u.includes(MOTION_URL)) {
      if (opts.motionStatus) return new Response('bad', { status: opts.motionStatus })
      return motionResponse(opts.motionT ?? 4, 30)
    }
    // artifact/assetUrl scans may point at other .npz names — same bytes
    if (u.endsWith('.npz')) return motionResponse(opts.motionT ?? 4, 30)
    if (opts.bodies) {
      for (const [sub, kind] of Object.entries(opts.bodies)) {
        if (u.includes(sub)) {
          if (kind === 'glb') return new Response(minimalGlbBytes())
          return new Response('bad', { status: kind })
        }
      }
    }
    if (u.includes('/v1/flows/drafts')) {
      if (opts.draftsStatus) return new Response('bad', { status: opts.draftsStatus })
      return jsonResponse({ draftId: 'd1' })
    }
    if (u.includes('/v1/flows/start')) {
      if (opts.startStatus) return new Response(opts.startEmptyBody ? '' : 'bad', { status: opts.startStatus })
      if (opts.startRaw !== undefined) return new Response(opts.startRaw)
      return jsonResponse({ run_id: 'r1' })
    }
    // COMPILE FIRST (pipe-carry retirement): runCompiledGeneration
    // validates at POST /v1/flows/validate before any start — the stub
    // seats the compile door beside the start door (same opt shape).
    if (u.includes('/v1/flows/validate')) {
      if (opts.validateStatus) return new Response(opts.validateRaw ?? 'bad', { status: opts.validateStatus })
      return jsonResponse({ ok: true })
    }
    if (u.includes('/v1/flows/status/')) {
      statusCalls += 1
      if (opts.flow === 'slow' && statusCalls === 1) {
        return jsonResponse({ run_id: 'r1', status: 'running', stages: [{ id: 's1', name: 'rig', index: 0, status: 'running' }] })
      }
      const flow = opts.flow === 'slow' ? 'completed' : (opts.flow ?? 'completed')
      if (typeof flow === 'number') return new Response('bad', { status: flow })
      if (flow === 'failed') {
        return jsonResponse({ run_id: 'r1', status: 'failed', stages: [], error: 'brick blew up' })
      }
      if (flow === 'completed-noglb') {
        return jsonResponse({
          run_id: 'r1', status: 'completed',
          stages: [{ id: 's1', name: 'rig', index: 0, status: 'done', url: 'https://host/rigged.png' }],
        })
      }
      return jsonResponse({
        run_id: 'r1', status: 'completed',
        stages: [{ id: 's1', name: 'rig', index: 0, status: 'done', url: 'https://host/rigged.glb' }],
      })
    }
    return new Response('nope', { status: 404 })
  })
  vi.stubGlobal('requestIdleCallback', (cb: () => void) => setTimeout(cb, 0) as never)
  vi.stubGlobal('cancelIdleCallback', (id: number) => clearTimeout(id))
}

/** No-act mount: render outside act, wait for settled content via polling. */
export function mountEditor(over: Record<string, unknown> = {}, props: Record<string, unknown> = {}) {
  const onSave = vi.fn()
  const stage = mkStage(over)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push(root)
  root.render(h(MotionCardEditor, {
    stage,
    onSave,
    runCompiledGeneration,
    ...props,
  } as never))
  return { container, onSave, stage }
}

/** The workspace root for spec disk reads: the nearest dir above the
 *  invocation cwd carrying pnpm-workspace.yaml — never a cwd
 *  assumption (the 2026-10-22 suite-red ENOENT class; the marker walk
 *  is the comfyui-cordis repo() law; import.meta.url is
 *  vite-rewritten under vitest and cannot anchor a disk read). */
export function repoRoot(): string {
  let dir = process.cwd()
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir
    const parent = dirname(dir)
    if (parent === dir) throw new Error(`no pnpm-workspace.yaml above the invocation cwd ${process.cwd()}`)
    dir = parent
  }
}

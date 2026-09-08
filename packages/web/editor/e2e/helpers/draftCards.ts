/**
 * draftCards — e2e helpers for the ACTION-CARD surfaces driven through the
 * gateway drafts API (the same door the agent's build_flow uses).
 *
 * Why: the chat embed (/editor/?meliteCards=<draftId>) renders the SAME
 * FlowTileGrid the Library canvas renders; seeding a draft + patching
 * render state gives every card surface a deterministic, GPU-free fixture.
 * Artifacts ride SVG DATA URLs — decodable <img>s with EXACT natural
 * dimensions, nothing on disk.
 *
 * Honest-state note (2026-08-26): the store hydrates runStatus === "done"
 * to "done" and EVERYTHING ELSE to "pending" (flowRunSlice.hydrateDraft)
 * — running/error states cannot be faked here. Live-state feedback belongs
 * to the real-run specs; these helpers cover the resting anatomy.
 */
import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** A decodable SVG data URL — an <img> whose natural size is EXACT. */
export function svgUrl(w: number, h: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<rect width='100%' height='100%' fill='%237788aa'/></svg>`
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
}

export interface SeededStage {
  id: string
}

/** Create a draft through THE one door, return its id + server-assigned ids. */
export async function seedDraft(
  request: APIRequestContext,
  stages: Array<{ title: string; params?: Record<string, unknown> }>,
): Promise<{ draftId: string; stages: SeededStage[] }> {
  const res = await request.post('/v1/flows/drafts', {
    data: {
      intent: 'e2e: card surface law',
      stages: stages.map((s) => ({
        title: s.title,
        kind: 'generation',
        service: 'krea-2',
        params: { prompt: s.title, ...(s.params ?? {}) },
      })),
    },
  })
  expect(res.ok(), `seed draft: ${res.status()} ${await res.text()}`).toBeTruthy()
  return (await res.json()) as { draftId: string; stages: SeededStage[] }
}

/** Mark one stage DONE with a ready artifact URL (the post-run state). */
export async function markDone(
  request: APIRequestContext,
  draftId: string,
  stageId: string,
  url: string,
  extraResult: Record<string, unknown> = {},
): Promise<void> {
  const res = await request.patch(
    `/v1/flows/drafts/${draftId}/stages/${stageId}`,
    {
      data: {
        runStatus: 'done',
        result: {
          assetUrls: [url],
          artifacts: {},
          metadata: {},
          completedAt: 1,
          durationSec: 9.4,
          ...extraResult,
        },
      },
    },
  )
  expect(res.ok(), `mark done: ${res.status()} ${await res.text()}`).toBeTruthy()
}

/** Wire a stage's input to an upstream stage (the wire PATCH the editor sends). */
export async function markInput(
  request: APIRequestContext,
  draftId: string,
  stageId: string,
  upstreamId: string,
): Promise<void> {
  const res = await request.patch(
    `/v1/flows/drafts/${draftId}/stages/${stageId}`,
    { data: { inputs: [upstreamId] } },
  )
  expect(res.ok(), `mark input: ${res.status()} ${await res.text()}`).toBeTruthy()
}

/** Open the chat cards embed for a draft. Fresh chromium contexts
 * intermittently drop vite module fetches with net::ERR_NETWORK_CHANGED
 * (observed live 2026-08-26: React never boots, #root stays empty) — a pure
 * transport flake, so NAVIGATION RETRIES: three attempts, tiles-attached
 * each time, before this is allowed to fail. */
export async function gotoEmbed(page: Page, draftId: string): Promise<void> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`/editor/?meliteCards=${draftId}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-card-tile]', {
        state: 'attached',
        timeout: 12_000,
      })
      return
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

/** Open the embed and wait until every <img> inside the tiles is fully
 * decoded (geometry assertions need real boxes). */
export async function openCards(page: Page, draftId: string): Promise<void> {
  await gotoEmbed(page, draftId)
  await page.waitForFunction(() => {
    const imgs = Array.from(
      document.querySelectorAll('[data-card-tile] img'),
    ) as HTMLImageElement[]
    return imgs.length > 0 && imgs.every((i) => i.complete && i.naturalWidth > 0)
  }, undefined, { timeout: 30_000 })
}

/** Open the embed for a draft with NO images (idle cases): tiles attached
 * is the whole wait. */
export async function openCardsIdle(page: Page, draftId: string): Promise<void> {
  await gotoEmbed(page, draftId)
  await page.waitForTimeout(600)
}

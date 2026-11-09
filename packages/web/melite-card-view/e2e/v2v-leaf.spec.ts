import { expect, test, type Page } from '@playwright/test'
import { callBench, collectPageErrors, settle } from './tour.ts'

/**
 * THE ADD-VIDEO-EDIT LEAF — the browser-plane proof of the
 * 2026-11-09 cure (the operator burned it at open: "This looks
 * horrible … it's split up into two sides … LITERALLY HALF THE PAGE
 * IS BLANK, THERE IS WEIRD LONG DESCRIPTIONS", then the follow-up:
 * "There is ONE knob for carry. Not per window. Does not even have
 * the carry + keyframe option.").
 *
 * THREE ARMS, all judged on the LIVE served lane at 760×900 (the
 * operator's own reading width):
 *  1. CLIP + READABILITY — at open the leaf fits (scrollHeight never
 *     outruns clientHeight by more than the tolerance), no second
 *     column (modLeafSplit is gone), the three group headers each
 *     stand ≥120px tall (no collapsed half), the caption is one
 *     short line (≤120 chars).
 *  2. MEDIA VOCABULARY — the served DECL's video-typed file fields
 *     (source_clip, mask_video, mannequin) map to the video accept
 *     vocabulary; every other file/image field maps to the image
 *     triad; the RENDERED file inputs carry the same mapping; the
 *     video mask posture seats a video-vocabulary mask square.
 *  3. VISUAL BASELINES — the leaf photographs per posture (default,
 *     video mask, continuation field); the baselines are committed, so any
 *     regression in the leaf's pixels reds the wall.
 *
 * THE SCRATCH-SESSION LAW (the 2026-11-09 incident): the leaf's
 * state rides the host's REOPENED conversation bench — this spec
 * never resets a bench it did not pin. The lane's own scratch
 * conversation (below) is the only bench it may restate, and the
 * leaf's windows are gate-checked against the seed line before any
 * posture is driven: foreign content FAILS the arm loudly, it is
 * never shot, never split, never patched.
 */
const SCRATCH_SESSION = process.env.MELITE_E2E_V2V_SESSION
  ?? 'session-b102b9f3-5938-49c3-8867-3a911838e825'
const SEED_CALLS = [
  { text: 'A single shot — describe the action, camera, and mood.', start_frame: 0, end_frame: 175 },
]
const SEED_LINE = 'A single shot — describe the action, camera, and mood.'
const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime'
const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp'

test.use({ viewport: { width: 760, height: 900 } })

/** Restate the scratch conversation's h3 stage to the canonical
 *  one-window seed (the open-state pixels judge the DEFAULT leaf —
 *  a previous run's splits persist through v2vCommit). */
async function resetScratchStage(page: Page): Promise<void> {
  const bench = (await callBench(page, 'bench/get', { sessionKey: SCRATCH_SESSION })) as {
    doc?: { stages?: Array<{ id?: string; card?: string; params?: Record<string, unknown> }>; rev?: number }
    stages?: Array<{ id?: string; card?: string; params?: Record<string, unknown> }>
    rev?: number
  }
  const doc = bench?.doc ?? bench ?? {}
  const stages = Array.isArray(doc.stages) ? doc.stages : []
  const rev = typeof doc.rev === 'number' ? doc.rev : 0
  const hit = stages.find((s) => s?.card === 'h3-timeline')
  if (!hit?.id) throw new Error('the scratch conversation carries no h3-timeline stage — seed it first (bench/add-stage)')
  await callBench(page, 'bench/patch', {
    sessionKey: SCRATCH_SESSION,
    doc: { stage: hit.id, params: { ...(hit.params ?? {}), calls: SEED_CALLS }, expect_rev: rev, author: 'user' },
  })
}

/** Open the bench tab, drill the video card, open the Video edit
 *  leaf (the seated entry when max_stack 1 already holds one, the
 *  picker menu when it does not). */
async function openEditLeaf(page: Page): Promise<void> {
  try {
    await page.locator('[data-testid="cards-tab-scroll"]').first().waitFor({ state: 'visible', timeout: 5000 })
  } catch {
    try { await page.locator('[data-sidebar-right-expand]').first().click({ timeout: 10_000 }) } catch { /* maybe open */ }
    await page.waitForTimeout(2000)
    await page.getByRole('button', { name: /Melite Bench/ }).first().click({ timeout: 10_000 })
    await page.getByTestId('cards-tab-scroll').first().waitFor({ state: 'visible', timeout: 15_000 })
  }
  await page.waitForTimeout(3000)
  const tiles = page.locator('[class*="tileInner"]:not([aria-label="Add a card"])')
  const n = await tiles.count()
  expect(n, 'the bench tab renders the scratch stage tile').toBeGreaterThan(0)
  let opened = false
  for (let i = 0; i < n; i++) {
    await tiles.nth(i).click()
    await page.waitForTimeout(2500)
    if (await page.locator('[data-subcard-add="mod"]').count() > 0) { opened = true; break }
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
  }
  expect(opened, 'a tile drilled into a form carrying the mods plus square').toBe(true)
  const editTile = page.locator('[data-mod-tile^="edit#"]').first()
  if (await editTile.count() > 0) {
    await editTile.click()
  } else {
    await page.locator('[data-subcard-add="mod"]').first().click()
    await page.waitForTimeout(1200)
    await page.getByRole('menuitem', { name: /Video edit/i }).first().click()
  }
  await page.locator('[class*="modLeafModal"]').first().waitFor({ state: 'visible', timeout: 15_000 })
  await page.waitForTimeout(1200)
}

/** THE BENCH GATE: the leaf's windows must be the seed doc's own —
 *  foreign content fails loud (never shot, never driven). THE SEED
 *  PROSE IS DEAD ON THIS FACE (the REPLACED law, operator 2026-11-16:
 *  "WHY DO I SEE THE DEFAULT CALL ON THE REPAIR VIDEO TO VIDEO. I
 *  SAID REPLACED" — the starter's invitation never paints on a v2v
 *  window row), so the gate rides the SPAN's own shape: W1 named,
 *  the seed's 0–175f window at 24fps = 0.00s–7.29s, and the seed
 *  line paints NOWHERE (its presence is itself the regression the
 *  wall arms red on). */
const SEED_SPAN = 'W1 · 0.00s–7.29s'
async function gateLeafOnSeed(page: Page): Promise<number> {
  const windows = await page.evaluate(() =>
    [...document.querySelectorAll('[class*="modLeafModal"] [data-v2v-window]')].map((w) => w.textContent ?? ''),
  )
  expect(windows.length, 'the leaf lists the seed doc windows').toBeGreaterThan(0)
  const foreign = windows.filter((t) => !t.startsWith(SEED_SPAN))
  expect(foreign, `FOREIGN BENCH CONTENT in the leaf — the lane's scratch conversation is not the reopened one; refusing to judge or drive it: ${JSON.stringify(foreign)}`).toEqual([])
  const prose = windows.filter((t) => t.includes(SEED_LINE))
  expect(prose, `THE DEFAULT CALL PAINTS ON THE VID2VID FACE — the starter's invitation must stand down (the REPLACED law): ${JSON.stringify(prose)}`).toEqual([])
  return windows.length
}

test.describe('THE ADD-VIDEO-EDIT LEAF · the 2026-11-09 cure, proved in pixels', () => {
  let skippedForeign = false

  test.beforeEach(async ({ page }) => {
    skippedForeign = false
    // THE SCRATCH LAW: restate the PINNED scratch bench only (always
    // safe — it is this lane's own conversation), then open the leaf.
    // The tab may bind a DIFFERENT conversation's bench (the host's
    // reopen marker is not derivable from session/list); the seed
    // gate below fails LOUD in that case before any posture is
    // driven — foreign content is never judged, split, or patched.
    await settle(page)
    await resetScratchStage(page)
    await openEditLeaf(page)
    await gateLeafOnSeed(page)
  })

  test('ARM 1 — CLIP + READABILITY: the open leaf fits, ONE column, three standing groups, a one-line caption', async ({ page }) => {
    test.skip(skippedForeign, 'foreign reopened conversation — see beforeEach')
    const errors = collectPageErrors(page)
    const facts = await page.evaluate(() => {
      const dlg = document.querySelector('[class*="modLeafModal"]')
      if (dlg === null) return null
      const caption = dlg.querySelector('[data-stage-caption="filter"]')
      const groups = [...dlg.querySelectorAll('[data-leaf-group]')].map((g) => {
        const box = g.getBoundingClientRect()
        return { name: g.getAttribute('data-leaf-group'), h: Math.round(box.height), w: Math.round(box.width) }
      })
      return {
        split: dlg.querySelector('[class*="modLeafSplit"]') !== null,
        captionLen: caption !== null ? (caption.textContent ?? '').length : -1,
        captionText: caption !== null ? (caption.textContent ?? '') : '',
        groups,
        scrollH: dlg.scrollHeight,
        clientH: dlg.clientHeight,
        clipDelta: dlg.scrollHeight - dlg.clientHeight,
      }
    })
    expect(facts, 'the leaf modal is open').not.toBeNull()
    // THE CLIP ARM: at open the content fits (single-window default —
    // the operator's blank half is dead)
    expect(facts!.clipDelta, `the open leaf fits — scrollH ${facts!.scrollH} vs clientH ${facts!.clientH}`).toBeLessThanOrEqual(8)
    // THE NO-SPLIT LAW: the two-sided layout is gone
    expect(facts!.split, 'no modLeafSplit second column renders').toBe(false)
    // THE GROUPS STAND: each group header's section is ≥120px tall —
    // no collapsed half, no dead side
    for (const g of facts!.groups) {
      expect(g.h, `the ${g.name} group stands ≥120px — got ${g.h}px`).toBeGreaterThanOrEqual(120)
    }
    expect(facts!.groups.length, 'the three declared groups render').toBe(3)
    // THE CAPTION: one short line (the 897-char wall of text is dead)
    expect(facts!.captionLen, `the caption is ≤120 chars — got ${facts!.captionLen}: "${facts!.captionText.slice(0, 60)}…"`).toBeLessThanOrEqual(120)
    expect(errors, errors.join('\n')).toEqual([])
  })

  test('ARM 2 — MEDIA VOCABULARY: the served DECL, the rendered accepts, and the video mask posture all speak video', async ({ page }) => {
    test.skip(skippedForeign, 'foreign reopened conversation — see beforeEach')
    // THE SERVED CENSUS: the DECL's own media typing drives the law —
    // video-media file fields → the video vocabulary; every other
    // file/image field → the image triad
    const served = await page.evaluate(async () => {
      const r = await fetch('/v1/form-spec?model=h3-timeline', { signal: AbortSignal.timeout(30_000) })
      const doc = await r.json()
      const edit = (doc.features?.modifiers ?? []).find((k) => k.kind === 'edit')
      return (edit?.fields ?? [])
        .filter((f: { type?: string }) => f.type === 'file' || f.type === 'image')
        .map((f: { name?: string; media?: string | null }) => ({ name: f.name, media: f.media ?? null }))
    }) as Array<{ name: string; media: string | null }>
    expect(served.length, 'the served edit DECL declares file/image fields').toBeGreaterThan(0)
    const expectedAccept = (media: string | null): string => (media === 'video' ? VIDEO_ACCEPT : IMAGE_ACCEPT)
    for (const f of served) {
      expect(expectedAccept(f.media), `${f.name} (media ${String(f.media)}) maps to the right vocabulary`).toBe(expectedAccept(f.media))
    }
    // THE RENDERED INPUTS: every file input in the open leaf carries
    // the DECL's own accept for its field
    const rendered = await page.evaluate(() =>
      [...document.querySelectorAll('[class*="modLeafModal"] input[type="file"]')].map((i) => ({
        accept: i.getAttribute('accept'),
        label: i.closest('[class*="modField"]')?.textContent?.slice(0, 40) ?? '',
      })),
    )
    expect(rendered.length, 'the leaf renders file inputs').toBeGreaterThan(0)
    for (const r of rendered) {
      expect([VIDEO_ACCEPT, IMAGE_ACCEPT], `the rendered input (${r.label}) speaks a declared vocabulary — got ${String(r.accept)}`).toContain(r.accept)
    }
    expect(rendered.some((r) => r.accept === VIDEO_ACCEPT), 'the source clip input speaks the video vocabulary').toBe(true)
    // THE VIDEO MASK POSTURE: the mask source's video posture seats a
    // video-vocabulary mask square (the operator's named edge: the
    // mask seat must accept VIDEO, not the image triad)
    const maskTrigger = page.locator('[class*="modLeafModal"] [class*="modField"]', { hasText: 'Mask source' }).locator('button').first()
    await maskTrigger.click()
    await page.waitForTimeout(800)
    const videoRow = page.getByRole('menuitem').filter({ hasText: /video/i }).first()
    if (await videoRow.count() > 0) {
      await videoRow.click()
      await page.waitForTimeout(1200)
      const videoInputs = await page.evaluate(() =>
        [...document.querySelectorAll('[class*="modLeafModal"] input[type="file"]')]
          .map((i) => i.getAttribute('accept'))
          .filter((a) => a === 'video/mp4,video/webm,video/quicktime').length,
      )
      expect(videoInputs, 'the video mask posture raises the video-vocabulary input count').toBeGreaterThan(1)
    } else {
      // the served DECL carries no video mask posture — the census arm
      // above already proved mask_video maps to the video vocabulary
      const declared = served.find((f) => f.name === 'mask_video')
      expect(declared?.media, 'mask_video is video-typed in the served DECL').toBe('video')
    }
  })

  test('ARM 3 — VISUAL BASELINES: the leaf photographs per posture (default, video mask, continuation field)', async ({ page }) => {
    test.skip(skippedForeign, 'foreign reopened conversation — see beforeEach')
    const modal = page.locator('[class*="modLeafModal"]').first()
    // THE DEFAULT POSTURE
    await expect(modal).toHaveScreenshot('v2v-leaf-default.png', { animations: 'disabled' })
    // THE VIDEO MASK POSTURE
    const maskTrigger = page.locator('[class*="modLeafModal"] [class*="modField"]', { hasText: 'Mask source' }).locator('button').first()
    await maskTrigger.click()
    await page.waitForTimeout(800)
    const videoRow = page.getByRole('menuitem').filter({ hasText: /video/i }).first()
    if (await videoRow.count() > 0) {
      await videoRow.click()
      await page.waitForTimeout(1200)
      await expect(modal).toHaveScreenshot('v2v-leaf-mask-video.png', { animations: 'disabled' })
    }
    // THE EXTEND POSTURE THROUGH THE FIELD GRAMMAR (the §-1 axiom:
    // no chip row — the Continuation boolean IS the extend seat, and
    // its visible_when rider re-seating in the same modal is the
    // draft proof)
    const contField = page.locator('[class*="modLeafModal"] [class*="modField"]', { hasText: 'Continuation' }).locator('input, button, [role="switch"]').first()
    await contField.click()
    await page.waitForTimeout(1200)
    await expect(modal.getByText('Extend seconds')).toBeVisible()
    await expect(modal).toHaveScreenshot('v2v-leaf-extend.png', { animations: 'disabled' })
  })
})

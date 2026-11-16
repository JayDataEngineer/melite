import type { Page } from '@playwright/test'

/**
 * The deck's lane settle law — the shared boot-shake every SWEEP_LANE_URL
 * spec rides. Ported from the card-view tour's settle/dismissOnboarding
 * stack (the 2026-11-01 settled-run 3/3 red), hardened by the 2026-11-17
 * battery deck-leg burn: each probe carried its own inline single-pass
 * dismiss (Notice only, never the account dialog), and the shell's
 * "Get started" dialog — CLIENT state that mounts LATE, once the
 * readiness join resolves — landed AFTER the pass with its aria-hidden
 * mask eating every pointer (probes died on the sidebar click with
 * "<div aria-hidden …> intercepts pointer events").
 *
 * The law: goto, then THREE dismiss passes around the boot grace. A
 * dialog that lands during the grace wait is caught by the second pass;
 * the post-grace third pass catches the late re-mount. Each Close
 * commits nothing; a miss is a host that never showed the dialog.
 */

/** One bounded dismiss pass over every masking dialog the shell mounts.
 * Notice FIRST — it stacks OVER the other dialogs, so any other order
 * leaves the shell masked behind it. */
async function dismissMasking(page: Page): Promise<void> {
  try {
    await page.getByRole('dialog').filter({ hasText: /Notice/ })
      .getByRole('button', { name: 'Continue' }).click({ timeout: 10_000 })
  } catch { /* no first-run notice on this host */ }
  try {
    await page.getByRole('dialog').filter({ hasText: /Get started/ })
      .getByRole('button', { name: 'Close' }).click({ timeout: 4_000 })
  } catch { /* no account onboarding dialog on this host */ }
  try {
    await page.getByRole('button', { name: 'Configure later' }).click({ timeout: 4_000 })
  } catch { /* host already configured — no onboarding dialog */ }
}

/** Goto the lane URL and settle the shell: three dismiss passes
 * bracketing the 8s boot grace, ending only when nothing masks. */
export async function settleLane(page: Page, laneUrl: string): Promise<void> {
  await page.goto(laneUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await dismissMasking(page)
  await page.waitForTimeout(8_000)
  await dismissMasking(page)
  await page.waitForTimeout(2_000)
  await dismissMasking(page)
}

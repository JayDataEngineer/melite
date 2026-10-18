// @vitest-environment happy-dom
// run-rescue.honesty-arms.spec.ts — DOWNLOAD/STATUS HONESTY ARMS
// (ERRORS.md k + m; purge plan §7 P5 RESCUE HONESTY —
// dev_docs/audits/ui-engine-fidelity-purge-2026-11-08.md).
//
// THE CLASS LAW: the UI must never show a state the engine did not
// report. The operator's burns: a download stuck at X% is declared
// complete ("Weight ready") with no retry and no delete, the face
// then offers Run on a weight that is not there, and the popup
// re-pops endlessly after it was closed.
//
// MOCK-FREE AT THE STATE PLANE: the wire is faked at the estate
// boundary ONLY (postManageAction — the one seam a jsdom arm can
// ride); every state word, byte count, and total these arms judge is
// one the FAKE ENGINE reported verbatim through that door. No arm
// pre-mocks a success — the decorative `state: 'active'`-as-success
// mocks of run-rescue.spec.tsx:94,106,117,134 are exactly what these
// arms refuse. Hop [6]→[1]: the engine's report is the input, the
// consumer face is the judged output.
//
// GREEN SINCE 821475e43 (the P5 rescue-honesty landing: ACQUIRE_TERMINAL
// drop, stall watchdog, acquiredDetailOf, the stuck face + dismissal
// memory): all 8 arms fire on today's tree. The wall now GUARDS the
// law — each red names the dishonest face it caught. Registry row
// cards-run-rescue-honesty (receipted, toggle-proven).
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RunRescue } from '../src/client/run-rescue.tsx'
import { chromeCopy } from '../src/chromeCopy.ts'

const wire = vi.hoisted(() => ({ postManageAction: vi.fn() }))
vi.mock('@melite/card-base/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@melite/card-base/client')>()),
  postManageAction: wire.postManageAction,
}))

// THE OPERATOR'S OWN BURN NUMBERS (ERRORS.md m): 39% of the moss
// image weight — the exact freeze the popup showed.
const FAMILY = 'moss-image'
const FILE = 'moss_image_sft_int8_convrot.safetensors'
const OP = 'op-honesty'
const PARTIAL = 2_096_567_476
const TOTAL = 5_413_698_958
// THE ENGINE'S OWN REFUSAL PROSE (the lane-presence voice —
// parseRescue's anchored sentence, names only).
const MISS =
  `lane presence: family '${FAMILY}' declares unet '${FILE}' but no store copy exists (folders checked: /m/models) — fetch it: https://models.example/moss`
const STAGES = [{ params: { model: FAMILY } }]

const reply = (state: string, bytes: number, total: number, detail?: string) => ({
  ok: true,
  ...(detail === undefined ? {} : { detail }),
  data: { operation_id: OP, state, bytes, total },
})

const pollCalls = (): number =>
  wire.postManageAction.mock.calls.filter((call) => {
    const payload = call[1] as Record<string, unknown>
    return typeof payload['operation_id'] === 'string'
  }).length

/** An affordance is present when a button NAMES the verb —
 *  discoverability is the invariant (the audit's "undiscoverable
 *  retry"): a generic Download re-press is not a retry affordance. */
const affordance = (verb: RegExp): HTMLElement | null =>
  screen.queryByRole('button', { name: verb })

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('CLASS 1 — UNMOCKED ACTIVE: no face may report the download done on a non-terminal engine report', () => {
  it("ARM 1 — first poll 'active' at partial bytes must keep the tracker on the door, never render Weight ready", async () => {
    // The engine's verbatim reports: START 'acquiring' at 39%, the
    // FIRST POLL 'active' at the same 39% ('active' is the service's
    // LIVE state — managePlane re-arms on it; it is not a landing).
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockResolvedValueOnce(reply('active', PARTIAL, TOTAL, `acquire_weight ${OP}: ${PARTIAL}/${TOTAL} bytes (verifying)`))
      // post-cure landing the tracker may finally settle on:
      .mockResolvedValue(reply('installed', TOTAL, TOTAL))
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(pollCalls()).toBeGreaterThanOrEqual(1) })
    // THE LAW: 'active' is not a landing — the ready face must not
    // render on it, and the tracker must keep polling.
    expect(screen.queryByText('Weight ready'),
      "the UI declared the download complete ('Weight ready') on the engine's NON-terminal 'active' report at 39% — a state the engine did not report",
    ).toBeNull()
    expect(screen.queryByRole('button', { name: 'Run again' }),
      "the ready face's Run-again was offered on the same non-terminal report",
    ).toBeNull()
    // the non-terminal report must keep the door polled, not settle
    await new Promise((r) => { setTimeout(r, 900) })
    expect(pollCalls(),
      "the tracker settled after the 'active' report instead of polling on — one live answer ended the flight",
    ).toBeGreaterThanOrEqual(2)
  })
})

describe('CLASS 2 — STUCK + RETRY/DELETE: a stuck download must expose retry and delete affordances that act', () => {
  const driveStuck = async (): Promise<void> => {
    // THE STUCK TRUTH: bytes frozen at 39%, state never terminal —
    // the loop rides its poll ceiling into the face the arm judges.
    vi.useFakeTimers()
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockResolvedValue(reply('acquiring', PARTIAL, TOTAL))
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    fireEvent.click(screen.getByTestId('weight-download'))
    // the whole ceiling: 150 polls × 400ms — driven, not waited out
    await vi.advanceTimersByTimeAsync(62_000)
  }

  it('ARM 2 — the stuck face exposes a RETRY affordance, and the press re-issues the fetch through the real door', async () => {
    await driveStuck()
    const retry = affordance(/retry/i)
    expect(retry,
      'a download stuck at the poll ceiling (frozen 39%) exposes NO retry affordance — the stuck face offers no discoverable way to re-issue the fetch',
    ).not.toBeNull()
    fireEvent.click(retry!)
    const starts = wire.postManageAction.mock.calls.filter((call) => {
      const payload = call[1] as Record<string, unknown>
      return call[0] === 'acquire_weight' && typeof payload['model'] === 'string'
    }).length
    expect(starts,
      'the retry press did not re-issue acquire_weight (names only: the family + the missing file) — the affordance does not reach the real door',
    ).toBeGreaterThanOrEqual(2)
  })

  it('ARM 3 — the stuck face exposes a DELETE affordance, and the press reaches the manage door with the stuck operation id', async () => {
    await driveStuck()
    const remove = affordance(/delete|cancel|remove|discard/i)
    expect(remove,
      'a download stuck at the poll ceiling exposes NO delete/cancel affordance — the wedged fetch cannot be removed from the face (ERRORS.md k: "no retry, no delete, just stuck")',
    ).not.toBeNull()
    fireEvent.click(remove!)
    const doorCall = wire.postManageAction.mock.calls.find((call) => JSON.stringify(call[1]).includes(OP))
    expect(doorCall,
      "the delete press reached no manage door carrying the stuck operation's identity — the removal cannot act on the engine",
    ).toBeDefined()
  })
})

describe('CLASS 3 — NEVER-RUN-ON-INCOMPLETE: a run must be refused, loudly, while the engine report is incomplete', () => {
  it("ARM 4 — on a non-complete report ('active' at 39%) the run affordance is not offered, and a press is refused loudly, never fired silently", async () => {
    const onRun = vi.fn()
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockResolvedValue(reply('active', PARTIAL, TOTAL))
    render(<RunRescue error={MISS} stages={STAGES} onRun={onRun} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(pollCalls()).toBeGreaterThanOrEqual(1) })
    const runBtn = screen.queryByRole('button', { name: 'Run again' })
    expect(runBtn,
      "the face offers Run while the engine's report is non-complete ('active', 39%) — the run gate is absent at the consumer (ERRORS.md k: it assumes X% is complete and runs the card)",
    ).toBeNull()
    if (runBtn !== null) {
      // the run-attempted state: the press must be a LOUD refusal at
      // this face, never a silent fire into the caller's run
      await userEvent.click(runBtn)
      expect(onRun,
        'a run press on an incomplete input fired the caller silently — no refusal, the run left for the engine',
      ).not.toHaveBeenCalled()
      expect(screen.queryByText(/incomplete|still downloading|not (?:yet )?(?:landed|complete|downloaded|ready)|refus/i),
        'the refused run voiced nothing — a silent skip, not a loud refusal',
      ).not.toBeNull()
    }
  })
})

describe('CLASS 4 — PROGRESS-BAR FACE: the meter reads the engine report, never a cosmetic completion', () => {
  it("ARM 5 — whenever the face claims completion, the meter must read 100% of the engine's own total", async () => {
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockResolvedValue(reply('active', PARTIAL, TOTAL))
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(pollCalls()).toBeGreaterThanOrEqual(1) })
    const readyClaimed = screen.queryByText('Weight ready') !== null
      || screen.queryByRole('button', { name: 'Run again' }) !== null
    if (readyClaimed) {
      const fill = screen.getByTestId('weight-meter-fill') as HTMLElement
      expect(fill.style.width,
        `cosmetic completion: the face claims the download is ready while the meter reads the engine's ${PARTIAL}/${TOTAL} report (${fill.style.width}) — a completion the engine did not report`,
      ).toBe('100%')
    }
  })

  it('ARM 6 — a report with no declared total renders no progress measure (the dead 0/0 meter)', async () => {
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', 0, 0))
      .mockResolvedValue(reply('acquiring', 0, 0))
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(screen.getByTestId('weight-progress')).toBeTruthy() })
    expect(screen.getByTestId('weight-progress').textContent,
      'a report with no declared total renders as a 0% progress measure — the dead meter dressing absence as progress; the face must voice the undeclared size',
    ).not.toMatch(/0\/0 bytes \(0%\)/)
    expect(screen.getByTestId('weight-meter').getAttribute('aria-valuemax'),
      'the meter advertises a 0-byte maximum — a denominator the engine never reported',
    ).not.toBe('0')
  })
})

describe('CLASS 5 — NO RE-POP: a cancelled/deleted download must not re-appear in the face', () => {
  it("ARM 7 — after the popup is closed mid-flight, the cancelled flight's ledger must not re-appear when the popup re-opens", async () => {
    // the parked poll: the flight is ALIVE and mid-download at 25%
    // when the operator cancels it
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', 1, 4))
      .mockImplementationOnce(() => new Promise(() => {}))
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(wire.postManageAction.mock.calls.length).toBe(2) })
    await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
    expect(screen.queryByTestId('weight-popup')).toBeNull()
    // re-open via the inline offer — the only press the face gives
    await userEvent.click(screen.getByRole('button', { name: 'Download weight' }))
    expect(screen.queryByTestId('weight-progress'),
      "the CANCELLED download's ledger (1/4, 25%) re-appears in the reopened popup — a cancelled fetch re-populated as if live; until a new engine report lands the tracker must be empty",
    ).toBeNull()
  })

  it('ARM 8 — a closed popup must not re-pop on the same run error: a fresh mount of the same miss serves the inline offer, never the modal', async () => {
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockResolvedValue(reply('active', PARTIAL, TOTAL))
    const { unmount } = render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    await userEvent.click(screen.getByTestId('weight-download'))
    await waitFor(() => { expect(screen.getByRole('button', { name: 'Run again' })).toBeTruthy() })
    await userEvent.click(screen.getByRole('button', { name: 'Close weight popup' }))
    unmount()
    // the tab's every re-derivation of the same failed row rides a
    // fresh mount of this face — the dismissal must outlive it
    render(<RunRescue error={MISS} stages={STAGES} onRun={() => {}} />)
    expect(screen.queryByTestId('weight-popup'),
      'the popup RE-POPPED: a fresh mount of the same run error re-opened the modal with no new engine event — nothing remembers the dismissal (ERRORS.md m: an endless popup that re-pops over and over)',
    ).toBeNull()
  })
})

describe('CLASS 6 — CEILING EXPIRY (SD-8b, FALSE-READY #2): a poll ceiling expiring non-terminal is a stuck flight, never a landing', () => {
  it('ARM 9 — bytes advancing every poll rides the FULL ceiling; the expiry lands the stuck face, never Weight ready, and Run refuses loud', async () => {
    // THE UNFROZEN STALL: unlike CLASS 2 (bytes frozen → the stall
    // watch ends the flight early), this flight LOOKS healthy — the
    // engine advances bytes every poll — but never reaches terminal
    // within the 150-poll ceiling. The pre-cure lie declared the
    // download done at expiry. The law: ceiling expiry IS the stuck
    // truth — the stuck face serves, no completion claim renders, and
    // the Run door (the stuck face's own trapdoor) refuses LOUD: the
    // press fires onRun ZERO times.
    const onRun = vi.fn()
    vi.useFakeTimers()
    let n = 0
    wire.postManageAction
      .mockResolvedValueOnce(reply('acquiring', PARTIAL, TOTAL))
      .mockImplementation(() => {
        n += 1
        return Promise.resolve(reply('acquiring', PARTIAL + n * 1_000, TOTAL))
      })
    render(<RunRescue error={MISS} stages={STAGES} onRun={onRun} />)
    // ARM 8's dismissal memory is module state and this miss is the
    // same key — the face may mount dismissed (inline offer) or open
    // (full popup) depending on what ran before; both roads reach the
    // download press through the dismissal's own re-open door.
    const closer = screen.queryByRole('button', { name: 'Close weight popup' })
    if (closer !== null) fireEvent.click(closer)
    fireEvent.click(screen.getByRole('button', { name: 'Download weight' }))
    fireEvent.click(screen.getByTestId('weight-download'))
    // the whole ceiling: 150 polls × 400ms — driven, not waited out
    await vi.advanceTimersByTimeAsync(62_000)
    expect(screen.queryByText('Weight ready'),
      "the poll ceiling expired non-terminal and the face declared the download complete ('Weight ready') — FALSE-READY #2: a ceiling is not an engine terminal report",
    ).toBeNull()
    expect(screen.getByText('Weight stuck'),
      "the expired ceiling served neither the success face nor the stuck face — the flight ended into no named truth",
    ).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Run again' }))
    expect(onRun).not.toHaveBeenCalled()
    expect(screen.getByText(chromeCopy.stuckRunRefusal),
      "the expired ceiling's Run press neither refused in its own voice nor stayed silent — a run on an incomplete weight must refuse LOUD, never fire",
    ).toBeTruthy()
  })
})

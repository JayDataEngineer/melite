/**
 * studio-mods-listing.spec.tsx — THE REFMODS LISTING DOOR'S CLIENT
 * ARM (2026-11-05, the estate-side door lands; the interim retires).
 *
 * The tenant loads the manage door `refmods_list` ONCE on mount and
 * feeds deps.modsListing (the square's candidate set). The arms judge
 * the FEED at the tenant — the card-level faces (candidates minus
 * committed, honest-empty, the manual fallback) stay pinned by
 * studio-call-card.spec.tsx — and every miss keeps S4's arms green:
 * the absent manage remote is a DEGRADE (the studio boots, the manual
 * path writes), never a boot failure.
 */
import { describe, expect, it, afterEach } from "vitest"
import assert from "node:assert/strict"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { bindEstateRemote, unbindEstateRemote, type EstateNamespaces } from "@melite/card-base/client"
import { VideoTimelineStudio } from "../src/ui/studio/component.tsx"
import type { ManageNamespace } from "@melite/card-base/client"

const DOC = {
  calls: [
    { text: "one", start_frame: 0, end_frame: 80 },
    { text: "two", start_frame: 80, end_frame: 168 },
  ],
  fps: 24,
}

function studio(extra?: Record<string, unknown>) {
  const saved: Record<string, unknown>[] = []
  const els = render(
    <VideoTimelineStudio
      stageId="s_4"
      cardName="h3-timeline"
      row={{ id: "s_4", card: "h3-timeline", title: "H3 Timeline", params: DOC, ...extra }}
      runStatus=""
      onPatch={(p: Record<string, unknown>) => { saved.push(p) }}
      onRun={() => {}}
      onStop={() => {}}
      onRemove={() => {}}
      onSurface={() => {}}
      upstream={[]}
      runId={null}
    />,
  )
  return { saved, els }
}

/** Focus call 0 — the rail swaps to its editor (the bar-clip click,
 *  the studio-component harness's own gesture). */
function focusCall0(): void {
  const clip = document.body.querySelector('[data-prompt-clip="call-0"]')!
  fireEvent.pointerDown(clip, { button: 0, clientX: 100 })
  fireEvent.pointerUp(document.body, { clientX: 100 })
}

/** The serve shape the manage lane returns (RemoteResult ok). */
const served = (stems: unknown): { ok: true; value: Record<string, unknown> } => ({
  ok: true,
  value: { action: "refmods_list", ok: true, detail: "", data: { stems } },
})

interface FakeAct {
  calls: Array<{ doc: Record<string, unknown>; signal: AbortSignal }>
  resolve: (answer: unknown) => void
}

/** A manage namespace fake: records the doc + signal; the answer is
 *  deferred so the abort arm can land the resolution after unmount. */
function fakeManage(answer?: unknown): { lane: ManageNamespace; act: FakeAct } {
  const act: FakeAct = {
    calls: [],
    resolve: () => {},
  }
  const lane = {
    act: (doc: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> => {
      act.calls.push({ doc, signal: signal ?? new AbortController().signal })
      if (answer !== undefined) return Promise.resolve(answer)
      return new Promise((resolve) => { act.resolve = resolve })
    },
  } as unknown as ManageNamespace
  return { lane, act }
}

function bindWith(manage: ManageNamespace | undefined): void {
  bindEstateRemote({
    bench: {}, drafts: {}, runs: {}, media: { list: (): null => null },
    ...(manage === undefined ? {} : { manage }),
  } as unknown as EstateNamespaces)
}

afterEach(() => {
  unbindEstateRemote()
})

async function openModsPicker(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
  fireEvent.click(await screen.findByRole("menuitem", { name: "From flow" }))
}

/** The FILE arm's REAL gesture (the provider's law: the shared
 * input re-targets at click time — a bare change is a dropped
 * write): square → menu → From file → hand the pack over. */
async function dropPack(): Promise<void> {
  fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
  fireEvent.click(await screen.findByRole("menuitem", { name: "From file" }))
  // the row's OWN input (each SourceRow hosts its provider's input —
  // the document's first input belongs to another row)
  const inp = document.querySelector('[data-source-row="+ ref mods"] input[type=file]') as HTMLInputElement
  assert.ok(inp, "the file arm is the fallback write")
  // (re-pin 2026-11-06, the ANY-MEDIA cure fdf838a9e) the refmod
  // seat takes MEDIA at every door — the manual fallback drops a
  // media file (a MIME-less .safetensors is refused loud now; the
  // refusal arm below pins that door).
  fireEvent.change(inp, { target: { files: [new File(["p"], "manual.png", { type: "image/png" })] } })
}

describe("the refmods listing door — the tenant's feed (2026-11-05)", () => {
  it("THE FED ARM: the door's stems reach the pick candidates and the pick commits the wire form", async () => {
    const { lane, act } = fakeManage(served(["pack_one", "pack_two"]))
    bindWith(lane)
    const { saved } = studio()
    focusCall0()
    await openModsPicker()
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 2)
    assert.ok(rows.some((r) => r.textContent!.includes("pack_one")), "stem one rides the picker")
    assert.ok(rows.some((r) => r.textContent!.includes("pack_two")), "stem two rides the picker")
    // the feed rode the manage door exactly once, with the door's own
    // action word — no second fetch, no waterfall beyond the mount
    assert.equal(act.calls.length, 1)
    assert.equal((act.calls[0]!.doc as { action?: string }).action, "refmods_list")
    fireEvent.click(rows.find((r) => r.textContent!.includes("pack_two"))!)
    await waitFor(() => {
      assert.ok(saved.some((p) => JSON.stringify(p).includes("pack_two.safetensors")),
        "the pick commits stem.safetensors — the compose's wire form")
    })
  })

  it("THE WIRED-EMPTY ARM: the door answers no stems — the picker is honestly empty, never a synthetic row", async () => {
    bindWith(fakeManage(served([])).lane)
    studio()
    focusCall0()
    await openModsPicker()
    assert.ok(await screen.findByText("nothing to pick yet"))
    assert.equal(screen.queryAllByTestId("source-pick-row").length, 0)
  })

  it("THE ABSENT-REMOTE ARM: no manage contribution — the studio boots, the manual fallback writes (the degrade, S4's arms stay green)", async () => {
    // NO bind: the manage lane is absent (a host without the estate's
    // manage contribution) — the loud wiring refusal lands in the
    // tenant's catch and the square rides its honest empty.
    studio()
    focusCall0()
    await openModsPicker()
    assert.ok(await screen.findByText("nothing to pick yet"), "the honest empty, never a boot failure")
    // (the path form died with the square, 2026-11-05) the degrade's
    // fallback write is the FILE arm — a dropped .safetensors pack
    // commits at the gesture; junk suffix refuses loud
    await dropPack()
    await waitFor(() => {
      assert.equal(screen.getAllByTestId("tl-call-mod-chip").length, 1, "the manual pack still writes")
    })
  })

  it("THE REFUSAL ARM: the door refuses — the same honest empty, the manual fallback unchanged", async () => {
    bindWith(fakeManage({ ok: false, error: { message: "refmods_list refused" } }).lane)
    studio()
    focusCall0()
    await openModsPicker()
    assert.ok(await screen.findByText("nothing to pick yet"))
    await dropPack()
    await waitFor(() => {
      assert.equal(screen.getAllByTestId("tl-call-mod-chip").length, 1)
    })
  })

  it("THE MIME-LESS REFUSAL ARM (any-media, 2026-11-06): a .safetensors File refuses LOUD — the seat takes media, never a bare pack", async () => {
    bindWith(fakeManage(served(["pack_one"])).lane)
    studio()
    focusCall0()
    await openModsPicker()
    // the old .safetensors gesture — the ANY-MEDIA law refuses it at
    // the gesture (modsNotMediaLine), the chip never lands
    fireEvent.click(screen.getByRole("button", { name: "+ ref mods source" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "From file" }))
    const inp = document.querySelector('[data-source-row="+ ref mods"] input[type=file]') as HTMLInputElement
    fireEvent.change(inp, { target: { files: [new File(["p"], "manual.safetensors")] } })
    const face = await screen.findByTestId("tl-call-mods-error")
    assert.match(face.textContent ?? "", /manual\.safetensors/)
    assert.equal(document.querySelectorAll('[data-testid="tl-call-mod-chip"]').length, 0, "a refused file never chips")
  })

  it("THE WIRE-CHECK ARM: a junk or mixed stems row serves only its string members", async () => {
    // junk data (no stems row) — the empty answer
    bindWith(fakeManage(served(undefined)).lane)
    const first = studio()
    focusCall0()
    await openModsPicker()
    assert.ok(await screen.findByText("nothing to pick yet"))
    first.els.unmount()
    // mixed members — non-strings fall away, the real stems ride
    unbindEstateRemote()
    bindWith(fakeManage(served(["pack_a", 42, null, "pack_b"])).lane)
    studio()
    focusCall0()
    await openModsPicker()
    const rows = await screen.findAllByTestId("source-pick-row")
    assert.equal(rows.length, 2, "the two string members ride; 42 and null fell away")
    assert.ok(rows.every((r) => r.textContent!.includes("pack_a") || r.textContent!.includes("pack_b")))
  })

  it("THE ABORT LAW: the unmount aborts the in-flight door; a late answer writes nothing", async () => {
    const { lane, act } = fakeManage()
    bindWith(lane)
    const { els } = studio()
    focusCall0()
    await waitFor(() => {
      assert.equal(act.calls.length, 1, "the door rode once on mount")
    })
    els.unmount()
    assert.equal(act.calls[0]!.signal.aborted, true, "the unmount aborted the door's signal")
    act.resolve(served(["late_pack"]))
    await new Promise((r) => setTimeout(r, 0))
    // no post-unmount write, no crash — the late answer lands nowhere
  })
})

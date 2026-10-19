/**
 * card-rail-seat.tsx — THE CARD RAIL SEAT KIT (ERROR d, 2026-10-19:
 * the h3 recipe-face wall proved a card's REAL rail can burn in jsdom
 * exactly as it burns on the lane — same served spec, same hydration,
 * same gesture, same docs, no law mocked). card-base owns every seam
 * the kit drives ([data-recipe-select], AxisMenuSelect, the compose
 * gate, bindEstateRemote) and every card package already depends on
 * this package — so the kit lives HERE, exported at
 * `@melite/card-base/tests/card-rail-seat`, and a wall for ANY card
 * rides the same four primitives instead of re-deriving them:
 *
 *   1. THE REAL SPEC — realServedSpec(model): formSpecArm over the
 *      booted registry (the doc the door serves, byte for byte —
 *      never a fixture envelope).
 *   2. THE REAL SEAMS — serveFormSpec / bindDeadEstateRemote /
 *      releaseRailSeat: the fetch seam serves THAT doc and nothing
 *      else (a fetch stub answers no other estate verb — the harness
 *      law); the estate remote is dead namespaces, so a seat wider
 *      than the wall declared fails loud.
 *   3. THE REAL GESTURE — pickRecipe / recipeFace / gateFace: the
 *      menu click through the card-base AxisMenuSelect seam, the
 *      trigger's resting journal, the compose gate's refusal voice —
 *      the exact event path a hand drives, no programmatic writes.
 *   4. THE LIVE LAYER — mountLiveLayer: the rail mounted over a
 *      stateful host that re-renders on commit and rides the card's
 *      own settle round-trip (hydrate∘serialize — the projection the
 *      pane shows after a write settles), so a face is judged over
 *      the doc the lane actually shows, never the in-process patch.
 *
 * THE RECEIPT CHAIN a kit-built wall asserts (the d-wall's arms): the
 * LAW over the raw held docs (the value half), the FACE over the live
 * seat (the derivation half), the GATE (the refusal voice). All three
 * together pin a card contract end to end.
 */
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { useState, type ReactElement } from "react"
import { vi } from "vitest"
import { Context } from "@deepseek-ai/cordis"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { bindEstateRemote, unbindEstateRemote } from "../../src/client/index.ts"
import type { FormSpecDoc } from "../../src/client/index.ts"

/** PRIMITIVE 1 — the REAL served spec: the booted registry's own
 *  form-spec body for `model` (the discovery door's formSpecArm face)
 *  over the lane-store overlay the contract walls boot. Throws when
 *  the model answers nothing: a wall renders the REAL spec or fails
 *  loud, never a fixture. Installs the overlay; pair with
 *  restoreLaneOverlay in afterAll. */
export async function realServedSpec(model: string): Promise<FormSpecDoc> {
  const { formSpecArm } = await import("../../../../../packages/harness/melite-tools/src/discovery.ts")
  const { CardRegistryService } = await import("../../../../../packages/harness/estate-queue/src/cardsRegistry.ts")
  const { installLaneStoreOverlay } = await import("../../../../../tests/helpers/lane-store-overlay.ts")
  const boot = new Context()
  ;(boot as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "rail-seat-boot-")),
    stateRoots: [] as string[],
  }
  const svc = new CardRegistryService(boot)
  await svc.prime()
  installLaneStoreOverlay()
  const doc = await formSpecArm(model)
  if (doc === null) throw new Error("rail-seat: the served form-spec for '" + model + "' did not answer — the wall renders the REAL spec, not a fixture")
  return doc
}

/** The overlay restore, paired with realServedSpec's install (the
 *  wall's afterAll). */
export async function restoreLaneOverlay(): Promise<void> {
  const { restoreLaneStoreOverlay } = await import("../../../../../tests/helpers/lane-store-overlay.ts")
  restoreLaneStoreOverlay()
}

/** PRIMITIVE 2a — the fetch seam serves THE spec (and nothing else:
 *  any other URL refuses loud — the no-stub-estate-verb law). */
export function serveFormSpec(served: FormSpecDoc): void {
  vi.stubGlobal("fetch", (input: unknown) => {
    const url = String(input)
    if (url.includes("/v1/form-spec")) {
      return Promise.resolve(new Response(JSON.stringify(served), { headers: { "content-type": "application/json" } }))
    }
    return Promise.reject(new Error("this wall fetches only the form-spec: " + url))
  })
}

/** PRIMITIVE 2b — the estate remote bound to dead namespaces: the
 *  rail under test must need no bench/run door for a face verdict;
 *  a call reaching these means the seat under test is wider than the
 *  wall declared. */
export function bindDeadEstateRemote(): void {
  const dead = (method: string) => async (): Promise<never> => { throw new Error("unused namespace in this wall: " + method) }
  bindEstateRemote({
    bench: { get: dead("bench/get"), "add-stage": dead("bench/add-stage"), "remove-stage": dead("bench/remove-stage") },
    drafts: { get: dead("drafts/get"), patch: dead("drafts/patch") },
    runs: { list: dead("runs/list"), start: dead("runs/start"), status: dead("runs/status"), stop: dead("runs/stop"), validate: dead("runs/validate") },
    media: { list: async () => ({ ok: true as const, value: { items: [] } }) },
  } as unknown as Parameters<typeof bindEstateRemote>[0])
}

/** PRIMITIVE 2c — release every seam the kit seized (per test). */
export function releaseRailSeat(): void {
  cleanup()
  unbindEstateRemote()
  vi.unstubAllGlobals()
}

/** The recipe trigger, once the async spec seat renders it (the seat
 *  lands after the form-spec fetch settles — the poll is the seam's
 *  own settling law, never a sleep). */
async function recipeTrigger(): Promise<HTMLElement> {
  const deadline = Date.now() + 4000
  for (;;) {
    const trigger = document.querySelector("[data-recipe-select]")
    if (trigger !== null) return trigger as HTMLElement
    if (Date.now() > deadline) throw new Error("rail-seat: no [data-recipe-select] trigger rendered — the rail never seated the recipe axis")
    await new Promise((r) => setTimeout(r, 25))
  }
}

/** PRIMITIVE 3a — the recipe face text off the card-base seam
 *  ([data-recipe-select]): the trigger's resting journal — a row
 *  label when a stamp holds, the '-- recipe --' placeholder when the
 *  derivation names no row. */
export async function recipeFace(): Promise<string> {
  return ((await recipeTrigger()).textContent ?? "").trim()
}

/** PRIMITIVE 3b — the REAL pick gesture: click the trigger, click the
 *  menu row. No programmatic setLayerA — the pick rides the exact
 *  event path a hand drives (AxisMenuSelect → onPick → the host's
 *  gate → the commit). */
export async function pickRecipe(label: RegExp): Promise<void> {
  fireEvent.click(await recipeTrigger())
  const item = await screen.findByRole("menuitem", { name: label }, { timeout: 4000 })
  fireEvent.click(item)
}

/** The compose gate's refusal voice, when the pick was refused
 *  (null = the write was admitted). */
export function gateFace(): string | null {
  const el = document.querySelector("[data-gate-face]")
  return el === null ? null : (el.textContent ?? "").trim()
}

/** PRIMITIVE 4 — THE LIVE LAYER HOST: the rail mounted over a
 *  stateful owner that (a) re-renders on every commit (a static prop
 *  shows the stale birth face — the d-wall's own first harness bug)
 *  and (b) rides `settle` after each commit — the card's own
 *  hydrate∘serialize round-trip, so the face is judged over the doc
 *  the lane shows AFTER the write settles.
 *
 *  @param opts.renderRail the card's own rail element factory — it
 *  receives the LIVE layerA and the commit verb to seat, and returns
 *  the rail element (the card owns its component; the kit owns the
 *  state). @param opts.settle the projection round-trip; absent = the
 *  commit rides verbatim (cards without a hydrate map).
 *  @returns the live layer reader for the receipt asserts. */
export function mountLiveLayer<T>(opts: {
  base?: Record<string, unknown>
  seed: T
  renderRail: (seat: { layerA: T, setLayerA: (updater: unknown) => void }) => ReactElement
  settle?: (doc: T, base: Record<string, unknown>) => T
}): { layer: () => T } {
  let doc: T = opts.seed
  let bump: () => void = () => {}
  function Host(): ReactElement {
    const [, setN] = useState(0)
    bump = () => setN((n) => n + 1)
    return opts.renderRail({
      layerA: doc,
      setLayerA: (updater: unknown) => {
        doc = (typeof updater === "function"
          ? (updater as (p: unknown) => unknown)(doc)
          : updater) as T
        if (opts.settle !== undefined) doc = opts.settle(doc, opts.base ?? {})
        bump()
      },
    })
  }
  render(<Host />)
  return { layer: () => doc }
}

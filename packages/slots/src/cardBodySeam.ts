/**
 * cardBodySeam — THE card body slot (2026-08-19, the studio removal;
 * 2026-08-19: rebuilt ON the uiSlot kernel — the overrides doctrine).
 * There is no "studio card" and no "form card" — a card is a SEAM, and
 * whatever renders its authoring surface is INJECTED into it. A wide
 * tenant (motion, mask, the video timeline) and the schema form are the
 * SAME kind of thing: providers that claim a stage and supply a body
 * component plus layout hints. The historical resolveCardSurface union
 * ({studio|form|fixed}) is dead — closed unions of card classes are the
 * disease this repo is purging.
 *
 * This module is now a THIN TYPED FACE over the generic kernel
 * (shell/uiSlotSeam) — the same laws (tiers, shadow hint, live store)
 * live there ONCE. Card-specific vocabulary stays here: the claim
 * payload (CardBody) and the walk input (CardStage).
 *
 * The contract every injected body obeys (spec §3, unchanged): a param
 * editor — it writes node inputs via onSave ONLY. The per-tenant
 * boundary/contract tests enforce the write channel against the DECLARED
 * writes. Layout is provider DATA (fullBleed, ownsParams), never a type
 * fork: chrome reads the flags the way it reads badgeTone.
 *
 * melite-core is the zeroth provider set (dogfood law — the schema form
 * rides the SAME seam a third-party body would):
 *
 *   100  melite-core/studio-tenants — the served body claims (§16 C0)
 *    50  melite-core/schema-form    — ParamGrid over the served form-spec
 *
 * NO FALLBACKS (2026-08-24): a provider CLAIMS stages by predicate; nothing
 * catches "whatever nobody wanted". A null from the walk is legal for
 * exactly one class of stage — the STRUCTURAL kinds (structuralCardKinds():
 * no form spec, not the body kind) whose surface IS the frame's shared
 * detail host by contract. Any OTHER unclaimed stage is a provider-contract
 * VIOLATION: the host renders it loud (console.error naming the kind +
 * a visible diagnostic strip), never silently.
 */
import type { ComponentType } from "react"
import { createUiSlot, type UiSlotClaim } from "./uiSlotSeam"
import { kindDef, registeredCardKinds } from "./cardSeam"
import type { CardStage } from "@melite/contracts"
import type { StudioTenantProps } from "@melite/contracts"
/** One injected card body: a component + the declared layout/contract.
 *  This is what a provider hands the frame — a studio tenant, the schema
 *  form, the shared detail host. ONE shape, no type union. */
export interface CardBody {
  /** The body component. Props are the tenant contract (E1): the frame
   *  forwards {stage, running, onSave} + the optional caller forwards
   *  (upstreams / onRun / onWireSlot) — never store access. */
  body: ComponentType<StudioTenantProps>
  /** TRUE when the body renders its ENTIRE param surface itself — the
   *  frame hides its read-only inputs fold (a duplicate flat form next
   *  to the body's own controls buries the grammar). Served from the
   *  studio.yaml (owns_params) for tenant bindings. */
  ownsParams?: boolean
  /** TRUE when the body wants the WIDE frame (full-bleed layout, rail
   *  chrome, max width) instead of the standard detail card look. This
   *  replaces the old "is a studio" card class: it is a layout hint a
   *  provider declares, exactly like badgeTone — not a type of card. */
  fullBleed?: boolean
  /** Every param key this body may write (E4 as data): the signature
   *  inputs ∪ registered UI-only params, declared where the binding is
   *  (the studio.yaml; the schema form's served field set). The
   *  per-tenant contract tests assert observed onSave keys ∈ this set. */
  writes: ReadonlySet<string>
  /** TRUE when the provider owns the ENTIRE square (non-wide) surface:
   *  the frame mounts claim.body INSTEAD of the shared detail host, with
   *  the full tenant contract forwarded ({stage, running, onSave,
   *  upstreams, onRun, onWireSlot, onSaveToMedia}). This is the plugin
   *  axis for card surfaces that are neither the schema form nor a wide
   *  studio — a claim WITHOUT this flag renders inside the detail host's
   *  chrome (the built-in contract), it never replaces the host. */
  mountInline?: boolean
}

/** A body provider — one registration, one definition site. */
export interface CardBodyProvider extends UiSlotClaim<CardBody, CardStage> {
  /** Claim the stage's body, or null to defer down the walk. */
  resolve: (stage: CardStage) => CardBody | null
}

const slot = createUiSlot<CardBody, CardStage>("card-body")

/** Register a body provider. Returns the disposer. Duplicate ids and
 *  shared precedences are LOUD — one claim per tier, by design. */
export function registerCardBody(provider: CardBodyProvider): () => void {
  return slot.register(provider)
}

/** The STRUCTURAL kinds — card classes that are NOT authoring surfaces and
 *  therefore carry NO body claim by contract: the frame's shared detail
 *  host IS their surface. Derived from the kind registry (everything
 *  without a form spec that is not the body kind) so a new kind forces an
 *  explicit decision — give it a body provider or watch it render loud in
 *  the host's diagnostic strip. The gate test pins the exact membership.
 *  PURE derivation over the kinds spine (cardSeam.ts — runtime import is
 *  acyclic; cardSeam imports nothing at runtime). */
export function structuralCardKinds(): string[] {
  return registeredCardKinds().filter((k) => k !== "body" && !kindDef(k).formSpec)
}

/** THE walk — the first claim (highest precedence) renders. Null is legal
 *  ONLY for the structural kinds (their host lives in the frame); any
 *  other null is a provider-contract violation the frame diagnoses LOUD
 *  (console.error + visible strip — see pipelineCardZoom.tsx). There is no
 *  catch-all tier and no silent default renderer. */
export function resolveCardBody(stage: CardStage): CardBody | null {
  return slot.resolve(stage)
}

/** Every registered provider id, highest precedence first (gates). */
export function registeredCardBodyProviders(): string[] {
  return slot.registered()
}

/** useSyncExternalStore plumbing (see useCardBodiesVersion). */
export function subscribeCardBodies(fn: () => void): () => void {
  return slot.subscribe(fn)
}

/** The seam version — bumps on every register/dispose. */
export function getCardBodiesVersion(): number {
  return slot.getVersion()
}

/** Live propagation: subscribe React to provider flips. */
export function useCardBodiesVersion(): number {
  return slot.useVersion()
}

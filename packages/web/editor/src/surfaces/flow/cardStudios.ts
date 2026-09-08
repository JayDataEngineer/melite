/**
 * cardStudios — melite-core's body PROVIDERS (the studio removal,
 * 2026-08-19). There is no "studio registry" anymore: a card is a SEAM
 * (cardBodySeam) and whatever renders its authoring surface is INJECTED.
 * A wide tenant and the schema form are the same kind of thing.
 *
 * This file is the first-party provider set (the dogfood law — melite-core
 * rides the SAME seam a plugin body would):
 *
 *   100  melite-core/studio-tenants — the served body claims (§16 C0): the
 *        body: block on a card under packages/<id>/cards/ declares tenant +
 *        owns_params + the E4 writes allowlist (ONE definition site,
 *        served on the family entry via /v1/model-catalog); this
 *        provider resolves stage route → family → claim and maps ONLY
 *        the tenant string to a component. No match predicates, no
 *        TS-side allowlists, no genre heuristics: adding a wide surface
 *        is a card with a body: claim + a component beside it.
 *    50  melite-core/schema-form — ParamEditor over the served spec (the
 *        SAME component the standard detail composition renders).
 *
 * The walk's terminal is the shared detail host — the documented
 * fail-safe: an unclaimed card NEVER blanks.
 *
 * THE RULE (spec §3) every injected body must obey: it is a param
 * editor — it writes node inputs via onSave only (E1: props are exactly
 * {stage, running, onSave} + caller forwards), no body-only params, no
 * body-only capabilities. The per-tenant contract test enforces the
 * write channel against the DECLARED writes (observed ⊆ declared).
 *
 * BODY is the one kind-matched binding (an authoring surface, not an
 * action card — no family, no route, no catalog declaration, never
 * compiles). Its entry stays local.
 */
import { createElement, lazy, Suspense } from "react"
import type { ComponentType } from "react"
import type { CardStage } from "@melite/contracts"
import type { StudioTenantProps } from "@melite/contracts"
import { studioOf } from "@melite/catalog"
import { registerCardBody } from "@melite/slots"
import type { CardBody } from "@melite/slots"
export type { CardBody }
import { ParamEditor } from "./flowParamEditor"
import { kindDef } from "@melite/slots"


// ── Plugin tenants (PLUGIN-ARCHITECTURE.md §6; §16 C0 one card lane) ───────
// First-party tenants stay STATIC imports (zero change). A plugin tenant
// resolves through this glob over
// packages/engines/*/action_cards/<genre>/<card>/ui/studio/component.tsx
// (operator order 2026-09-03: ALL card UI lives under the card's ui/
// subfolder — the card root carries data + python/ only; a custom UI is an
// OVERRIDE of the default schema form, never a second definition site)
// — code-split in build (one dynamic chunk per plugin card body).
// THE 2026-09 FORMALIZATION: packages/engines/<engine>/cards/<plugin>/<card>/
// is the engine-scoped home of card tenants (the comfyui engine's React
// cards live there today; audio-cpp and others grow theirs the same way).
// The MELITE-* PREFIX stays the lane discriminator — the bare card dirs
// (body/, 3d-gen/, …) at cards/ depth 1 are the gateway's C++ lane
// assets, NOT editor tenants.
// The tenant id is "<plugin-id>/<card-dir>" — exactly what the card's
// body: claim declares in body.tenant, unchanged from the flat layout.
// The component sees ONLY the props contract: card-studio-boundary.test.ts
// source-scans every globbed file and fails the gate on any import
// outside react + the contract types.
const PLUGIN_TENANT_LOADERS = import.meta.glob<{
  default: ComponentType<StudioTenantProps>
}>("../../../../../../packages/engines/*/action_cards/*/*/ui/studio/component.tsx")

// Card-body studios claim action_cards/<genre>/<card>/ui/studio/component.tsx
// (THE ui/studio claim = the authoring-surface override). Other ui/<claim>/
// dirs are SLOT claims owned by shell/pluginUi.ts — the two seams are
// disjoint by claim name, exactly as the override order intends.
// DERIVATION ANCHORS ON THE /action_cards/ SEGMENT: vite normalizes glob
// keys (a leading ../../plugins collapses into ../../ — the literal
// "packages/engines" prefix DISAPPEARS), so an absolute-prefix regex
// silently yields zero tenants in the vitest module runner. The segment
// after /action_cards/ is stable everywhere.
const ACTION_CARD_BODY =
  /^\/action_cards\/([^/]+)\/([^/]+)\/ui\/studio\/component\.tsx$/

function pluginTenantId(path: string): string | null {
  const i = path.indexOf("/action_cards/")
  if (i < 0) return null
  const m = ACTION_CARD_BODY.exec(path.slice(i))
  return m ? `${m[1]}/${m[2]}` : null
}

/** Every plugin tenant id the glob resolves (boundary test introspection). */
export function pluginTenantIds(): string[] {
  return Object.keys(PLUGIN_TENANT_LOADERS)
    .map(pluginTenantId)
    .filter((x): x is string => x !== null)
    .sort()
}

/** Lazy-mount a plugin tenant behind a Suspense boundary (code-split). */
function lazyPluginTenant(path: string): ComponentType<StudioTenantProps> {
  const Lazy = lazy(async () => {
    const mod = await PLUGIN_TENANT_LOADERS[path]!()
    return { default: mod.default }
  })
  const Wrapped: ComponentType<StudioTenantProps> = (props) =>
    createElement(
      Suspense,
      { fallback: createElement("div", { className: "card-studio-tenant-skeleton" }) },
      createElement(Lazy, props),
    )
  return Wrapped
}

const PLUGIN_TENANTS: Record<string, ComponentType<StudioTenantProps>> = {}
for (const path of Object.keys(PLUGIN_TENANT_LOADERS)) {
  const id = pluginTenantId(path)
  if (id) PLUGIN_TENANTS[id] = lazyPluginTenant(path)
}

/** Resolve a tenant id → component across BOTH surfaces (first-party
 *  static first, then the plugin glob). Undefined = unknown tenant. */
export function resolveTenantComponent(
  tenantId: string,
): ComponentType<StudioTenantProps> | undefined {
  return PLUGIN_TENANTS[tenantId]
}

const _unknownTenants = new Set<string>()

/** The Character Maker body claim — the one kind-matched wide binding.
 * The component is the 3d/body PLUGIN TENANT (same seam as every
 * other studio); writes is the full Character param bag downstream cards
 * consume as their identity source. */
const BODY_WRITES = new Set(["identityModel", "coeffs", "localChanges", "customTargets"])

/** The wide claim for a stage, or null.
 *
 * Resolution: kind body → the local entry; everything else → the stage's
 * route through the catalog (familyOf chain) to the family's served
 * body claim (§16 C0 — declared on the card row, served on the family).
 * No catalog (or a family that declares none) → null — the walk falls
 * through to the next provider. */
export function getCardStudio(stage: CardStage): CardBody | null {
  if (stage.kind === "body") {
    const body = resolveTenantComponent("3d/body")
    if (!body) {
      if (typeof console !== "undefined" && !_unknownTenants.has("3d/body")) {
        _unknownTenants.add("3d/body")
        console.error("cardStudios: 3d/body plugin tenant missing — publish packages/engines/comfyui/action_cards/3d/body/ui/studio/component.tsx")
      }
      return null
    }
    return { body, fullBleed: true, writes: BODY_WRITES }
  }
  const binding = studioOf(stage.service)
  if (!binding) return null
  // Named "injected" (not "tenant"): the boundary gate scans claim-body
  // idents against CardStudio.tsx — the host must not name tenants, and a
  // local called "tenant" would false-positive on StudioTenantProps docs.
  const injected = resolveTenantComponent(binding.tenant)
  if (!injected) {
    if (typeof console !== "undefined" && !_unknownTenants.has(binding.tenant)) {
      _unknownTenants.add(binding.tenant)
      console.error(
        `cardStudios: catalog declares body tenant ${JSON.stringify(binding.tenant)} `
          + `but no component is registered for it — publish packages/<id>/cards/<dir>/component.tsx or fix the card's body: claim`,
      )
    }
    return null
  }
  // Presentation notches ride the claim (web-registry §7): layout picks
  // the frame — studio mounts full-bleed, panel embeds beside the rail.
  // The default keeps every pre-notch binding full-bleed (wire compat).
  const layout = (binding as { layout?: string }).layout ?? "studio"
  return {
    body: injected,
    ownsParams: binding.owns_params ?? false,
    fullBleed: layout === "studio",
    writes: new Set(binding.writes ?? []),
  }
}

// ── First-party body providers (the dogfood law, BOTH directions) ───────────
// The studio removal (2026-08-19): a card is a SEAM. Whatever renders
// its authoring surface is INJECTED — a wide tenant (motion, mask,
// the video timeline, plugin tenants) and the schema form are the SAME
// kind of thing, providers claiming stages at distinct precedencies.
// There is no {studio|form|fixed} union and no resolveCardSurface:
// the frame asks resolveCardBody(stage) and reads the claim's FLAGS
// (fullBleed picks the wide frame; ownsParams folds the inputs rail).
//
//   100  melite-core/studio-tenants — the served studio.yaml bindings
//    50  melite-core/schema-form   — ParamEditor over the served spec
//
// The walk's terminal is the shared detail host (the zoom's standard
// 680px composition) — the documented fail-safe: an unclaimed
// card (provider disabled, catalog miss) NEVER blanks; it falls to
// the same detail frame every standard card uses.
export const disposeCardBodyProviders: (() => void)[] = [
  registerCardBody({
    id: "melite-core/studio-tenants",
    precedence: 100,
    resolve: getCardStudio,
  }),
  registerCardBody({
    id: "melite-core/schema-form",
    precedence: 50,
    resolve(stage) {
      if (!kindDef(stage.kind).formSpec) return null
      return { body: SchemaFormBody, writes: new Set() }
    },
  }),
]

// The schema form AS AN INJECTED BODY: the SAME ParamEditor the
// standard detail composition renders, mounted through the tenant
// contract ({stage, running, onSave}) — ONE form implementation,
// two mount sites (the seam's claim and the detail host's region).
// writes is the served spec's field set itself: the renderer cannot
// emit a key outside the spec, so the empty set here means bounded
// by the served contract, not may-write-nothing.
function SchemaFormBody({ stage, onSave }: StudioTenantProps) {
  return createElement(ParamEditor, {
    stage,
    onSave: (params: Record<string, unknown>) => onSave(params),
  })
}

// ── Studio preview/strip (superseded, 2026-09-07) ─────────────────────────
// The 2026-09 element-slot decomposition (cardStudioPreviewSlot /
// cardStudioStripSlot + the h3 plugin's timelineSlots.ts registrant)
// never gained a consumer and is DELETED. The studio's preview and
// strip ride the StudioShell seams now: the tenant body declares
// center={...} (the preview pane) and bottom={...} (the strip in a
// PaneShell + PaneHeader) directly — no claim registry, no plugin
// load-path coupling. The shared chrome lives in @melite/ui
// (studioShell.tsx, pane-header.tsx — docs/design/studio-chrome.md).

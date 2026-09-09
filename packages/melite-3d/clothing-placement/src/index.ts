// @melite/melite-3d-clothing-placement — the clothing-placement
// card (the Blender MCP card): garment-on-body placement through
// a PERSISTENT Blender session.
//
// PACKAGE HOME (M2′ stroke 1, 2026-09-09, P48.1): a card IS a
// plugin — its own package (receipt: references/deepseek-harness
// packages/shell/tool-bash), self-registering via named exports
// name/inject/apply (Harness-Packages law: function plugins
// named-export; no default export, no mixed forms). The glob walk
// in loadCardDefs never sees it again; composition is the explicit
// package list.
//
// TWO FACES, ONE PACKAGE (the operator's module receipt,
// 2026-09-09): card.ts owns the card face (data + registerCard —
// the engine registry); tool.ts owns the DSH tool face
// (registerTool — the harness tools service); this entry only
// wires them. BOTH services are probed at the use site (the
// tutorial's optional-dependency receipt — "skip inject and probe
// at the use site"; the object inject form is name→intercept-config
// in the vendored cordis, not optionality).
//
// The card RUNS via the flow path (card stages → cardGate →
// ctx.comfyui.compose), never the {model:}/draft path; the tool
// face rides the same law through the gateway's flow doors.
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { ComfyUIService } from '@melite/comfyui/service'
import { registerCard } from './card.ts'
import { buildCardTool } from './tool.ts'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'

export const name = 'clothing-placement'
/** The documented Config idiom (tutorial ch.5): the interface is
 *  the type, the const is the runtime schema, one name. The env var
 *  resolves INSIDE the schema default — a schema-side .default()
 *  would otherwise mask it at every use site. */
export interface Config {
  gateway: string
}

export const Config: Schema<Config> = Schema.object({
  gateway: Schema.string()
    .default(process.env.MELITE_GATEWAY_URL || 'http://localhost:33081')
    .description('The Melite gateway base URL (the flow doors the tool face calls)'),
})

// BOTH faces are optional dependencies (tutorial ch.3: skip inject,
// probe at the use site). inject = ['comfyui'] would be a hard gate:
// in a standalone dsh agent host — no ComfyUI service in-process,
// the tool face talks to the gateway over HTTP — apply would sit
// PENDING forever and the tool would never register. The gateway
// process provides comfyui but no tools; the agent host provides
// tools but no comfyui; each composition takes the faces it can.
export const inject: string[] = []

export function apply(ctx: Context, config: Config): void {
  const comfy = ctx.get('comfyui') as ComfyUIService | undefined
  if (comfy !== undefined) registerCard(ctx, comfy)
  const tools = ctx.get('tools') as ToolRuntime | undefined
  if (tools !== undefined) {
    // BARE registration, the tool-bash shape: the entry owns the
    // register call; tool.ts exports the definition builder. The
    // service attaches its own disposer (tutorial ch.2).
    tools.register(buildCardTool((config?.gateway ?? '').trim() || 'http://localhost:33081'))
  }
}

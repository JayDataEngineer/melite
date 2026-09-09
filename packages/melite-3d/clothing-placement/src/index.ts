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
// wires them. inject declares the card's required seam; the tools
// service is probed at the use site — the tutorial's
// optional-dependency receipt ("skip inject and probe at the use
// site"; the object inject form is name→intercept-config in the
// vendored cordis, not optionality).
//
// The card RUNS via the flow path (card stages → cardGate →
// ctx.comfyui.compose), never the {model:}/draft path; the tool
// face rides the same law through the gateway's flow doors.
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { registerCard } from './card.ts'
import { registerTool } from './tool.ts'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'

export const name = 'clothing-placement'
export const inject = ['comfyui']

export const Config = z.object({
  gateway: z.string().default('http://localhost:33081').description(
    'The Melite gateway base URL (the flow doors the tool face calls)'),
})

export function apply(ctx: Context, config: ReturnType<typeof Config>): void {
  registerCard(ctx)
  // Optional dependency (tutorial ch.3): probe at the use site —
  // undefined when the composing host provides no tools service
  // (the gateway process), so there only the card face lands.
  const tools = ctx.get('tools') as ToolRuntime | undefined
  if (tools !== undefined) {
    const gatewayUrl = (config?.gateway ?? '').trim() || process.env.MELITE_GATEWAY_URL || 'http://localhost:33081'
    registerTool(ctx, tools, gatewayUrl)
  }
}

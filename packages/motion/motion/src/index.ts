// index.ts — the package entry: a thin coordinator (the
// tool-bash law — registration lives HERE, modules export data
// and builders).
//
// BOTH services are optional dependencies (tutorial ch.3: skip
// inject, probe at the use site). A hard comfyui gate would hold
// the plugin PENDING in a standalone dsh agent host — no
// in-process ComfyUI service, the tool face talks to the gateway
// over HTTP — so the tool would never register. The gateway
// process provides comfyui but no tools; the agent host provides
// tools but no comfyui; each composition takes the faces it can.
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { ComfyUIService } from '@melite/comfyui-cordis/service'
import { registerCard } from './card.ts'
import { buildMotionTool } from './tool.ts'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'

export const name = '@melite/motion/motion'

export const inject: string[] = []

/** The documented Config idiom (tutorial ch.5): the interface is
 *  the type, the const is the runtime schema, one name. The env
 *  var resolves INSIDE the schema default — a schema-side
 *  .default() would otherwise mask it at every use site. */
export interface Config {
  gateway: string
}

export const Config: Schema<Config> = Schema.object({
  gateway: Schema.string()
    .default(process.env.MELITE_GATEWAY_URL || 'http://localhost:33081')
    .description('The Melite gateway base URL (the flow doors the tool face calls)'),
})

export function apply(ctx: Context, config: Config): void {
  const comfy = ctx.get('comfyui') as ComfyUIService | undefined
  if (comfy !== undefined) registerCard(ctx, comfy)
  const tools = ctx.get('tools') as ToolRuntime | undefined
  if (tools !== undefined) {
    // BARE registration, the tool-bash shape: the entry owns the
    // register call; tool.ts exports the definition builder. The
    // service attaches its own disposer (tutorial ch.2).
    tools.register(buildMotionTool((config?.gateway ?? '').trim() || 'http://localhost:33081'))
  }
}

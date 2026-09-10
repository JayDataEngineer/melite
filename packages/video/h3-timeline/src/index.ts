// index.ts — the package entry: a thin coordinator (the
// tool-bash law — registration lives HERE, modules export data
// and builders).
//
// BOTH services are optional dependencies (probe at the use
// site): the gateway process provides comfyui but no tools; the
// agent host provides tools but no comfyui (the tool face talks
// to the gateway over HTTP); each composition takes its faces.
import type { Context } from '@deepseek-ai/cordis'
import Schema from '@deepseek-ai/schemastery'
import { ComfyUIService } from '@melite/comfyui-cordis/service'
import { registerCard } from './card.ts'
import { buildH3TimelineTool } from './tool.ts'
import type { ToolRuntime } from '@deepseek-ai/dsh-tools'

export const name = '@melite/video-h3-timeline'

export const inject: string[] = []

export interface Config {
  gateway: string
}

export const Config: Schema<Config> = Schema.object({
  gateway: Schema.string()

    .description('The Melite gateway base URL (the flow doors the tool face calls)'),
})

export function apply(ctx: Context, config: Config): void {
  const comfy = ctx.get('comfyui') as ComfyUIService | undefined
  if (comfy !== undefined) registerCard(ctx, comfy)
  const tools = ctx.get('tools') as ToolRuntime | undefined
  if (tools !== undefined) {
    tools.register(buildH3TimelineTool(config.call))
  }
}

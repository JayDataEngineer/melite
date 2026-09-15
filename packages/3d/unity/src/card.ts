// Tier 3 — the unity card (the 3d lane's command-line arm,
// 2026-09-15). ONE-IMPLEMENTATION RULE (the quad-remesh precedent):
// the Unity Editor IS the lane, driven headless through the
// vendored melite-unity-nodes pack — MeliteUnityBatch (project +
// ClassName.MethodName in, run log out) IS the render, and this
// two-node graph (batch + SaveText log tail) IS the card.
//
// NODE CONTRACT (vendor/comfyui_extensions/melite-unity-nodes/):
// the pack NEVER installs Unity (host requirement: MELITE_UNITY_BIN
// / UNITY_BIN, else PATH); unresolvable = loud refusal at RUN time.
// extra_args is a JSON list of CLI args appended after the method —
// a non-list (or unparseable) value refuses IN THE NODE, named; the
// card pre-validates the shape at compose so a typo fails BEFORE
// the run queues. filename_prefix is compose-stamped per run
// (`<runId>/unity_log` — the family constant shape, never a knob).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

const schema = z.object({
  // Ride keys (no .default — refused loud at compose when absent):
  // the project directory and the static method are the whole
  // command line; everything else is optional seasoning.
  project_path: z.string().description("Unity project directory").extra('extra', { order: 0, tooltip: "Absolute path to the Unity project directory (contains Assets/)", required: true, wtype: 'text', }),
  execute_method: z.string().description("Method to run").extra('extra', { order: 1, tooltip: "Static method to run (ClassName.MethodName in the project)", required: true, wtype: 'text', }),
  scene: z.string().description("Scene to open").default('').extra('extra', { order: 2, tooltip: "Scene opened first (-openScene; empty = the project default)", wtype: 'text', }),
  extra_args: z.string().description("Extra CLI args").default('[]').extra('extra', { order: 3, tooltip: "JSON list of extra CLI args appended after the method (e.g. [\"-nographics\"])", wtype: 'textarea', }),
  // RANGE RULE (whoever owns the default owns the floor): the card
  // owns both — the node's INPUT_TYPES floor (60–3600) mirrors this,
  // never the reverse.
  timeout: z.number().description("Timeout seconds").min(60).max(3600).step(60).default(600).extra('extra', { order: 4, tooltip: "Seconds before the headless run is killed", min: 60, max: 3600 }),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Unity',
  description: 'Run a Unity Editor method headless (unity -batchmode command line); the run log rides the artifacts',
  genre: '3d',
  icon: 'box',
  principles: [
    'project_path + execute_method are the whole command line — everything else is seasoning',
    'the method must be static and reachable as ClassName.MethodName in the project',
    'extra_args is a JSON list — a typo fails at compose, never mid-run',
    'Unity itself is a host requirement (MELITE_UNITY_BIN / UNITY_BIN, else PATH)',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'unity',
    // stage-row id the compose emits (TS owns the truth post-flip).
    skeleton: 'unity',
    // no model families — the second pure-tool card
    // (clothing-placement precedent: boarded [] + requiresModel
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    tags: ['3d', 'unity', 'batch'],
    identity,
    // THE DISCOVERY ROWS (the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 23 },
    flowKinds: {
      inputs: { project_path: 'text' },
      outputs: { default: 'text' },
      requiresModel: false,
    },
    requiresModel: false,
    requires: ['melite-unity-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      const missing: string[] = []
      if (!String(p.project_path ?? '').trim()) missing.push('project_path')
      if (!String(p.execute_method ?? '').trim()) missing.push('execute_method')
      if (missing.length > 0) {
        throw new Error(
          `required param(s) ${missing.join(', ')} missing on the unity lane — the batch needs the project directory and the ClassName.MethodName to run`)
      }
      // extra_args rides the node as a JSON list — pre-validate the
      // shape HERE (the node refuses too, but a typo should fail at
      // compose, never after the run queues).
      let args: unknown
      try {
        args = JSON.parse(String(p.extra_args ?? '[]'))
      } catch {
        throw new Error(
          `extra_args is not a JSON list on the unity lane — the batch appends it after the method (got ${JSON.stringify(p.extra_args)})`)
      }
      if (!Array.isArray(args)) {
        throw new Error(
          `extra_args must be a JSON list on the unity lane — the batch appends it after the method (got ${JSON.stringify(p.extra_args)})`)
      }
      const log = g.node('MeliteUnityBatch', {
        project_path: String(p.project_path).trim(),
        execute_method: String(p.execute_method).trim(),
        scene: String(p.scene ?? ''),
        extra_args: JSON.stringify(args.map((a) => String(a))),
        timeout: p.timeout as number,
      }).out()
      g.node('SaveText', {
        text: log,
        format: 'txt',
        filename_prefix: `${runId}/unity_log`,
      })
    },
  }))
}

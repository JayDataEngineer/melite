// Tier 3 — the blender card (the 3d lane's command-line arm,
// 2026-09-15). ONE-IMPLEMENTATION RULE (the quad-remesh precedent):
// Blender IS the lane, driven headless through the vendored
// melite-blender-proxy-nodes pack — MeliteBlenderRunScript (script +
// argv in, run log out) IS the render, and this two-node graph
// (run-script + SaveText log tail) IS the card.
//
// NODE CONTRACT (vendor/comfyui_extensions/melite-blender-proxy-nodes/):
// the pack NEVER installs Blender (host requirement:
// SKINTOKEN_BLENDER_BIN / BLENDER_BIN, else PATH); unresolvable =
// loud refusal at RUN time, and a missing script_path =
// FileNotFoundError at RUN time (the card cannot stat the engine
// host's disk at compose — it refuses only the blank shape here).
// script_args is a JSON list of string args appended after `--`
// (reachable in-Blender via sys.argv) — a non-list (or unparseable)
// value refuses IN THE NODE, named; the card pre-validates the shape
// at compose so a typo fails BEFORE the run queues.
// filename_prefix is compose-stamped per run (`<runId>/blender_log` —
// the family constant shape, never a knob).
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { ComfyUIService } from '@melite/comfyui-cordis/service'

const schema = z.object({
  // Ride keys (no .default — refused loud at compose when absent):
  // the script path is the whole command line; everything else is
  // optional seasoning.
  script_path: z.string().description("Blender script").extra('extra', { order: 0, tooltip: "Absolute path to a Blender Python script (runs under blender -b --python)", required: true, wtype: 'text', }),
  script_args: z.string().description("Script argv").default('[]').extra('extra', { order: 1, tooltip: "JSON list of string args appended after -- (reachable in-Blender via sys.argv)", wtype: 'textarea', }),
  // RANGE RULE (whoever owns the default owns the floor): the card
  // owns both — the node's INPUT_TYPES floor (60–3600) mirrors this,
  // never the reverse.
  timeout: z.number().description("Timeout seconds").min(60).max(3600).step(60).default(600).extra('extra', { order: 2, tooltip: "Seconds before the headless run is killed", min: 60, max: 3600 }),
})

export const inject = ['comfyui']

// THE IDENTITY RUNG (native 2026-09-10 — migrated from the frozen
// identity ring; the card owns its label/description/genre/icon).
export const identity = {
  label: 'Blender',
  description: 'Run a Blender Python script headless (blender -b --python command line); the run log rides the artifacts',
  genre: '3d',
  icon: 'box',
  principles: [
    'script_path is the whole command line — everything else is seasoning',
    'the script runs under blender -b --python with argv after -- visible via sys.argv',
    'script_args is a JSON list — a typo fails at compose, never mid-run',
    'Blender itself is a host requirement (SKINTOKEN_BLENDER_BIN / BLENDER_BIN, else PATH)',
  ],
}

export function apply(ctx: Context): void {
  ctx.effect(() => ctx.comfyui.registerCard({
    id: 'blender',
    // stage-row id the compose emits (TS owns the truth post-flip).
    skeleton: 'blender',
    // no model families — the third pure-tool card
    // (clothing-placement precedent: boarded [] + requiresModel
    // false skips the {model:} demand in cardGate, compose, CLI).
    boarded: [],
    tags: ['3d', 'blender', 'batch'],
    identity,
    // THE DISCOVERY ROWS (the card owns its sidebar, surface, and
    // flow-stage declarations; the discovery arms derive from here).
    sidebar: { key: '3d', order: 24 },
    flowKinds: {
      inputs: { script_path: 'text' },
      outputs: { default: 'text' },
      requiresModel: false,
    },
    requiresModel: false,
    requires: ['melite-blender-proxy-nodes'],
    schema: schema as unknown as (v: unknown) => Record<string, unknown>,
    compose(p, _model, g, runId) {
      if (!String(p.script_path ?? '').trim()) {
        throw new Error(
          `required param(s) script_path missing on the blender lane — the run needs the Blender Python script to execute`)
      }
      // script_args rides the node as a JSON list — pre-validate the
      // shape HERE (the node refuses too, but a typo should fail at
      // compose, never after the run queues).
      let args: unknown
      try {
        args = JSON.parse(String(p.script_args ?? '[]'))
      } catch {
        throw new Error(
          `script_args is not a JSON list on the blender lane — the run appends it after -- (got ${JSON.stringify(p.script_args)})`)
      }
      if (!Array.isArray(args)) {
        throw new Error(
          `script_args must be a JSON list on the blender lane — the run appends it after -- (got ${JSON.stringify(p.script_args)})`)
      }
      const log = g.node('MeliteBlenderRunScript', {
        script_path: String(p.script_path).trim(),
        script_args: JSON.stringify(args.map((a) => String(a))),
        timeout: p.timeout as number,
      }).out()
      g.node('SaveText', {
        text: log,
        format: 'txt',
        filename_prefix: `${runId}/blender_log`,
      })
    },
  }))
}

// THE PROVISIONER LAW (operator 2026-11-09: "if a model is not on
// disk, that is not a red unless our auto-provisioner sucks") —
// shared home for the test tier's two runners (the compose-liveness
// sweep and the golden driver). The live compose door REFUSES a
// filename the engine cannot serve (the download prompt owns the
// miss before the door ever sees it) — only the test tier stands
// the miss down, and only while the family's DECL declares the
// artifact downloadable. With no declared source the estate
// dead-ends instead of offering the download — THAT miss stays red.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { assertWiringAgainst } from '../../packages/engines/comfyui-cordis/src/wiringWall.ts'
import { ComposeRefusal } from '../../packages/engines/comfyui-card-kit/src/errors.ts'
import type { WiringInputSpec } from '../../packages/engines/comfyui-cordis/src/wiringWall.ts'

/** The census shape both runners derive from the boot fixture. */
export type WiringCensus = {
  nodes: ReadonlySet<string>
  inputs: ReadonlyMap<string, ReadonlyMap<string, WiringInputSpec>>
}

/** Whether an ATOM's DECL declares this artifact downloadable — the
 *  provisioner's own contract. A wired FILENAME absent from the
 *  engine's folder enum is PROVISIONING STATE while the DECL
 *  carries it (a url tail or a provision name in
 *  packages/models/<atom>/src/index.ts — the download prompt can
 *  offer it). Non-filename literals (mode pickers like
 *  CLIPLoader.type) never pass: those are engine-build vocabulary,
 *  not folder state.
 *  @param atom the owning family (a package dir under models/, not
 *    a route address — fold routes through the owning-atom read
 *    before this door)
 *  @param filename the wired literal the enum refused
 *  @returns true when the DECL declares the artifact downloadable */
export function atomDeclares(atom: string, filename: string): boolean {
  if (!/\.(safetensors|sft|gguf|bin|pth|onnx|engine|npz|ckpt)$/i.test(filename)) return false
  const decl = join(process.cwd(), 'packages', 'models', atom, 'src', 'index.ts')
  if (!existsSync(decl)) return false
  const text = readFileSync(decl, 'utf8')
  return text.includes(`/${filename}"`) || text.includes(`"${filename}"`)
}

/** The route-addressed read the compose-liveness sweep uses: the
 *  fold (the service's own owningAtom) resolves a route to its
 *  owning atom — a lane address is not a package, its family's DECL
 *  carries the provision (2026-11-09, the h3-singularity row). The
 *  fold's throw is the miss (fail closed — the skip must never pass
 *  on a table that cannot speak).
 *  @param modelId the family or route id the graph composes under
 *  @param filename the wired literal the enum refused
 *  @param fold the owning-atom read (the booted service's own)
 *  @returns true when the owning atom's DECL declares the artifact */
export function declaredProvision(modelId: string, filename: string, fold: (id: string) => string): boolean {
  let atom = modelId
  try {
    atom = fold(modelId)
  } catch {
    return false
  }
  return atomDeclares(atom, filename)
}

/** The wiring judgment with the provisioner law applied: every
 *  node, edge, and value is judged, and a DECL-declared filename
 *  the folder enum lacks is NEUTRALIZED with an enum member (the
 *  judgment copy only — the caller's own bytes never move) and
 *  re-judged, up to 8 neutralizations per graph. Any refusal the
 *  law does not own rethrows — this pass never weakens the wall.
 *  @param census the derived wiring doc (the boot fixture's truth)
 *  @param atom the owning family the graph composes under (the
 *    golden driver derives it from the models package path)
 *  @param graph the serialized graph to judge (never mutated) */
export function assertWiringProvisioned(census: WiringCensus, atom: string, graph: unknown): void {
  let probe: unknown = graph
  for (let pass = 0; pass < 8; pass++) {
    try {
      assertWiringAgainst(census.nodes, census.inputs, atom, probe)
      return
    } catch (err) {
      if (!(err instanceof ComposeRefusal) || err.code !== 'bad-value') throw err
      const message = err instanceof Error ? err.message : String(err)
      const wired = /wired '[^']+' = "([^"]*)"/.exec(message)?.[1]
      const seat = /^[\s\S]*?wired '([^'.]+)\.([^']+)'/.exec(message)
      if (wired === undefined || seat === null || !atomDeclares(atom, wired)) throw err
      const member = census.inputs.get(seat[1]!)?.get(seat[2]!)?.enum?.find((m): m is string => typeof m === 'string')
      if (member === undefined) return // no enum member to neutralize with — the download prompt owns the miss
      probe = JSON.parse(JSON.stringify(probe), (_k, v: unknown) => (v === wired ? member : v))
    }
  }
}

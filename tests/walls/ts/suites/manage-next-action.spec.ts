/**
 * THE MANAGE NEXT-ACTION VOCABULARY WALL (vocab audit 2026-11-01 W2,
 * the F20 wall, estate-wide) — every `next_action` string the manage
 * seat emits ∈ ACTIONS, or the envelope carries none.
 *
 * THE BURN (rank 1 HIGH): `operatorConfirmGate` returned
 * `next_action: "operator_confirmed"` on the 409 for
 * install_extension_url / download_model / lora_fetch — a boolean
 * REQUEST PARAM, not a manage action — and the client renders any
 * non-empty next_action as a pressable Button, so the operator's
 * exact F20 shape fired: the refusal named X the enum refused, and
 * the press could only 422. The cure retired the field from the
 * 409 (the detail teaches the wire field; there is no door to
 * follow).
 *
 * Arm 1 — EMITTED ⊆ ACTIONS: every next_action literal the seat
 *   emits (direct, ternary branches, withNextAction call sites,
 *   manageOps) is a member of the seat's own ACTIONS SSOT. A dead
 *   name (operator_confirmed, reintroduced) REDS BY NAME.
 * Arm 2 — VARIABLE FORWARDS ARE CLOSED: the only variable-valued
 *   next_actions are nextActionFor (returns swept, pinned to
 *   ACTIONS), the 422-gated request `action` (parseReq refuses
 *   unknown actions before any handler runs), and data
 *   passthroughs whose caller literals arm 1 already judges.
 * Arm 3 — THE RETIRE PIN: the confirm-gate 409 carries NO
 *   next_action at all — the boolean param never rides the field
 *   again.
 * Arm 4 — CLIENT FALLBACKS ⊆ ACTIONS: assets-tab inferredNextAction
 *   fallbacks (list_extensions→install_extension,
 *   snapshot_list→snapshot_save, restartRequired→restart) are
 *   members too — a fallback the enum refuses would 422 the same way.
 *
 * Depth: the real seat text + the real client text, never a hand
 * list (the ACTIONS set itself is derived from the seat's SSOT).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '../../../..')
const PLANE = readFileSync(join(ROOT, 'packages/harness/estate-queue/src/managePlane.ts'), 'utf8')
const OPS = readFileSync(join(ROOT, 'packages/harness/estate-queue/src/manageOps.ts'), 'utf8')
const CLIENT = readFileSync(join(ROOT, 'packages/web/melite-card-deck/src/client/assets-tab.tsx'), 'utf8')

/** The seat's own SSOT, derived from the real declaration. */
function actionsOf(): Set<string> {
  const m = /export const ACTIONS = \[([\s\S]*?)\] as const/.exec(PLANE)
  expect(m, 'the ACTIONS SSOT must parse (else this wall judges nothing)').not.toBeNull()
  const out = new Set<string>()
  for (const lit of m![1]!.matchAll(/"([^"]+)"/g)) out.add(lit[1]!)
  expect(out.size, 'the SSOT derivation must find the actions').toBeGreaterThan(20)
  return out
}

/** Every literal the seat can emit as a next_action. */
function emittedOf(): string[] {
  const texts = [PLANE, OPS]
  const out = new Set<string>()
  for (const text of texts) {
    // direct: next_action: "status" (never matches next_action_after_install — the _ breaks the colon)
    for (const m of text.matchAll(/next_action:\s*["']([^"']+)["']/g)) out.add(m[1]!)
    // ternary branches on next_action lines: ? "restart" : "status"
    for (const line of text.split('\n')) {
      if (!line.includes('next_action') || line.includes('next_action_after_install')) continue
      for (const m of line.matchAll(/\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["']/g)) {
        out.add(m[1]!)
        out.add(m[2]!)
      }
    }
    // withNextAction(response, "install_extension") call sites
    for (const m of text.matchAll(/withNextAction\([^,]+,\s*["']([^"']+)["']\)/g)) out.add(m[1]!)
  }
  return [...out].sort()
}

describe('THE MANAGE NEXT-ACTION VOCABULARY (every emitted next_action ∈ ACTIONS)', () => {
  it('arm 1 — every next_action literal the seat emits is a member of ACTIONS (a dead name reds BY NAME)', () => {
    const actions = actionsOf()
    const emitted = emittedOf()
    expect(emitted.length, 'the emission sweep must find the seat voices (else the wall judges nothing)').toBeGreaterThan(5)
    const dead = emitted.filter((v) => !actions.has(v))
    expect(dead, 'dead next_action (a refusal naming X the enum refuses — the F20 shape): ' + JSON.stringify(dead)).toEqual([])
  })

  it('arm 2 — the variable forwards are closed (nextActionFor returns ∈ ACTIONS; the action-valued forward rides the 422 gate)', () => {
    const actions = actionsOf()
    // nextActionFor's returns are the only function-valued source besides the gated action
    const fn = /function nextActionFor\([\s\S]*?\n\}/.exec(PLANE)
    expect(fn, 'nextActionFor must exist').not.toBeNull()
    // literals AFTER `return` on each return line only (a whole-line
    // sweep would also catch the state-name guards on the if lines)
    const returns: string[] = []
    for (const line of fn![0]!.split('\n')) {
      const i = line.indexOf('return')
      if (i === -1) continue
      for (const m of line.slice(i).matchAll(/"([^"]+)"/g)) returns.push(m[1]!)
    }
    expect(returns.length, 'nextActionFor must return literals (else the sweep judges nothing)').toBeGreaterThan(2)
    for (const r of returns) {
      expect(actions.has(r!), `nextActionFor returns ${r}: not a member of ACTIONS`).toBe(true)
    }
    // the action-valued forward (provisionEnvelope: ? action : "status") is safe ONLY because
    // parseReq 422s unknown actions before any handler runs
    expect(PLANE.includes('if (!(ACTIONS as readonly string[]).includes(action))'), 'the parseReq 422 gate pins the action-valued forward').toBe(true)
    // withNextAction call sites pass literals, never variables
    const varCalls = [...PLANE.matchAll(/withNextAction\([^,]+,\s*([a-zA-Z][a-zA-Z0-9_]*)\s*\)/g)]
      .map((m) => m[1]!)
      .filter((v) => !['"', "'"].includes(v[0]!))
    expect(varCalls, 'withNextAction must be called with literals, never variables: ' + JSON.stringify(varCalls)).toEqual([])
  })

  it('arm 3 — the retire pin: the confirm-gate 409 carries NO next_action (operator_confirmed is a param, never a door)', () => {
    const gate = /function operatorConfirmGate\([\s\S]*?\n\}/.exec(PLANE)
    expect(gate, 'operatorConfirmGate must exist').not.toBeNull()
    expect(gate![0].includes('next_action'), 'the 409 envelope must carry no next_action — the detail teaches the wire field, there is no door to follow').toBe(false)
    expect(gate![0].includes('operator_confirmed=true'), 'the 409 detail must still teach the wire field').toBe(true)
    // belt: no next_action literal anywhere in the seat names the retired param
    for (const [name, text] of [['managePlane.ts', PLANE], ['manageOps.ts', OPS]] as const) {
      expect(
        new RegExp(/next_action:\s*["']operator_confirmed["']/).test(text),
        `${name}: the retired boolean param rides next_action again`,
      ).toBe(false)
    }
  })

  it('arm 4 — the client fallbacks are members too (a fallback the enum refuses 422s the same way)', () => {
    const actions = actionsOf()
    const start = CLIENT.indexOf('function inferredNextAction')
    expect(start, 'inferredNextAction must exist in assets-tab.tsx').toBeGreaterThan(-1)
    const body = CLIENT.slice(start, CLIENT.indexOf('\n}\n', start))
    const fallbacks = [...body.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]!).filter((v) => v !== '')
    expect(fallbacks.length, 'the fallback sweep must find the client voices').toBeGreaterThanOrEqual(3)
    const dead = fallbacks.filter((v) => !actions.has(v!))
    expect(dead, 'dead client fallback next_action: ' + JSON.stringify(dead)).toEqual([])
  })

  it('arm 5 — serve_after_install is a TIMING, never an action impersonation (the pixel-anim cure, 2026-11-15)', () => {
    // THE INVERSE LAW: the lora verbs' serve timing ('next-compose')
    // names WHEN a landed row serves, not a manage verb to dispatch.
    // The first cure draft emitted next_action:'compose' — a fake
    // action the client would render as a follow-up button the
    // plane 422s. A serve-timing value must never be an ACTIONS
    // member, and the fake next_action_after_install field stays
    // dead (the lora answers carry no next_action at all — arm 1
    // sweeps none).
    const actions = actionsOf()
    const timings = [...PLANE.matchAll(/serve_after_install:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]!)
    expect(timings.length, 'the serve-timing field must survive (the lora verbs teach it)').toBeGreaterThanOrEqual(1)
    for (const v of timings) {
      expect(actions.has(v!), `serve_after_install value ${v} impersonates an action — a dead button`).toBe(false)
    }
    expect(PLANE.match(/next_action_after_install:/), 'the fake next_action_after_install field grew back').toBeNull()
    expect(emittedOf().includes('compose'), 'a lora verb still emits the fake compose action').toBe(false)
  })
})

#!/usr/bin/env node
// official-parity.mjs — THE REUSABLE CLI over official-parity-core:
// compare a canonical ComfyUI workflow export against a composed lane
// graph (API-prompt shape) and print the 1:1 verdict.
//
//   node tools/official-parity.mjs \
//     --canonical tests/walls/fixtures/official-pixal-trellis2.workflow.json \
//     --ours tests/walls/fixtures/composed-lane-snapshots/trellis.json \
//     --leg trellis [--json] [--quiet]
//
// EXIT 0 = 1:1 (modulo the named sanctioned rows passed via
// --allow-absent/--allow-extra, each "Class=reference"); EXIT 1 =
// drift, every finding printed by name. The composed-graph input is
// any API-prompt JSON: a wall snapshot, a compose-door dump, or a
// run receipt's serialized graph. The wall
// (official-template-parity.spec.ts) regenerates the snapshots and
// calls the same core — ONE engine, two doors.
import { readFileSync } from 'node:fs'
import { parseArgs } from 'node:util'
import { activePipeline, compareLane, DEFAULT_WIDGET_NAMES, MESH_LINEAGE } from './official-parity-core.mjs'

const { values: args } = parseArgs({
  options: {
    canonical: { type: 'string' },
    ours: { type: 'string' },
    leg: { type: 'string', short: 'l' }, // trellis | pixal — the primitive override value
    'lane-primitive': { type: 'string', default: 'Switch to Trellis2' },
    terminal: { type: 'string', default: 'Save3DAdvanced' },
    'allow-absent': { type: 'string', default: '' }, // "Class=ref,Class=ref"
    'allow-extra': { type: 'string', default: '' },
    json: { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
  },
  strict: true,
})

if (args.canonical === undefined || args.ours === undefined || args.leg === undefined) {
  console.error('usage: official-parity.mjs --canonical <workflow.json> --ours <api-prompt.json> --leg trellis|pixal [--allow-absent Class=ref,...] [--allow-extra Class=ref,...] [--json] [--quiet]')
  process.exit(2)
}

const parseAllow = (raw) => Object.fromEntries(
  raw.split(',').filter((row) => row.includes('=')).map((row) => {
    const i = row.indexOf('=')
    return [row.slice(0, i).trim(), row.slice(i + 1).trim()]
  }),
)

const canonical = JSON.parse(readFileSync(args.canonical, 'utf8'))
const ours = JSON.parse(readFileSync(args.ours, 'utf8'))
const leg = activePipeline(canonical, {
  lanePrimitive: args['lane-primitive'],
  laneValue: args.leg === 'trellis',
  terminal: args.terminal,
})
const findings = compareLane({
  canonical,
  leg,
  ours,
  lanePrimitive: args['lane-primitive'],
  laneValue: args.leg === 'trellis',
  absentAllowed: parseAllow(args['allow-absent']),
  extraAllowed: parseAllow(args['allow-extra']),
  inputIgnore: {
    KSampler: new Set(['seed', 'control_after_generate']),
    Save3DAdvanced: new Set(['filename_prefix']),
  },
  widgetNames: DEFAULT_WIDGET_NAMES,
  lineageClasses: MESH_LINEAGE,
})

const drift = [
  ...findings.missing, ...findings.extras,
  ...findings.calibration, ...findings.lineage, ...findings.unmappedWidgets,
]
if (args.json) {
  console.log(JSON.stringify({ leg: args.leg, oneToOne: drift.length === 0, findings }, null, 2))
} else if (!args.quiet) {
  const canonClasses = [...leg.values()].map((n) => n.type).sort()
  console.log(`official-parity — leg "${args.leg}" vs ${args.canonical}`)
  console.log(`  canonical pipeline: ${canonClasses.length} nodes; ours: ${Object.keys(ours).length} nodes`)
  for (const f of findings.missing) console.log(`  MISSING  ${f}`)
  for (const f of findings.extras) console.log(`  EXTRA    ${f}`)
  for (const f of findings.calibration) console.log(`  DRIFT    ${f}`)
  for (const f of findings.lineage) console.log(`  LINEAGE  ${f}`)
  for (const f of findings.unmappedWidgets) console.log(`  MAP      ${f}`)
  console.log(drift.length === 0 ? '  VERDICT: 1:1 (modulo named sanctioned rows)' : `  VERDICT: DRIFT — ${drift.length} finding(s)`)
}
process.exit(drift.length === 0 ? 0 : 1)

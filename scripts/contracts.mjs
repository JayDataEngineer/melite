#!/usr/bin/env node
/** contracts.mjs — THE CONTRACT CLI (AGENTS.md LAW 4, the two-tier
 *  contract tracking, operator 2026-10-16): the only writer of
 *  registry rows after the initial migration. Deterministic updates,
 *  zero hand-edited tables.
 *
 *  Verbs:
 *    list    [--tier <t>]            rows of one tier (or all)
 *    show    <ID>                    the full row + its receipt path
 *    record-proof --id <ID> --toggle <what> --red-output <verbatim>
 *                 [--commit <sha>]   append the receipt, set
 *                 receipt_ref, regenerate INVARIANTS.md
 *    regenerate                        rebuild INVARIANTS.md from the
 *                                      registries (never hand-edited
 *                                      past curation marks)
 *
 *  The registry lives at dev_docs/contracts/registry/<tier>-tier.yaml
 *  (schema in AGENTS.md LAW 4); receipts at
 *  dev_docs/contracts/receipts/<date>-<contract>.md.
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync, readdirSync } from 'node:fs'
import { join, basename } from 'node:path'
import { argv, exit, cwd } from 'node:process'
import YAML from 'yaml'

const ROOT = cwd()
const CONTRACTS = join(ROOT, 'dev_docs/contracts')
const REGISTRY = join(CONTRACTS, 'registry')
const RECEIPTS = join(CONTRACTS, 'receipts')
const INVARIANTS = join(CONTRACTS, 'INVARIANTS.md')
const TIERS = ['models', 'cards', 'gates', 'flows', 'infra']

const fail = (msg) => { console.error('contract: ' + msg); exit(1) }

function tierRows(tier) {
  const file = join(REGISTRY, `${tier}-tier.yaml`)
  if (!existsSync(file)) return []
  const doc = YAML.parse(readFileSync(file, 'utf8'))
  const rows = Array.isArray(doc) ? doc : doc?.rows
  if (!Array.isArray(rows)) throw new Error(`${file}: no rows (expected {tier, law, rows: [...]})`)
  return rows.map((r) => ({ ...r, tier }))
}

function allRows() {
  return TIERS.flatMap((t) => tierRows(t))
}

function findRow(id) {
  const row = allRows().find((r) => r.id === id)
  if (row === undefined) {
    fail(`no registry row carries id ${JSON.stringify(id)} — 'pnpm contract list' enumerates the law`)
  }
  return row
}

function rowFile(tier) {
  return join(REGISTRY, `${tier}-tier.yaml`)
}

function writeTier(tier, rows) {
  const doc = YAML.parse(readFileSync(rowFile(tier), 'utf8'))
  doc.rows = rows.map(({ tier: _t, ...r }) => r)
  writeFileSync(rowFile(tier), YAML.stringify(doc))
}

/** INVARIANTS.md is REGENERATED between the curation marks; curated
 *  prose outside the marks survives every regeneration. */
function regenerate() {
  const rows = allRows().filter((r) => r.status === 'active')
  const open = existsSync(INVARIANTS) ? readFileSync(INVARIANTS, 'utf8') : ''
  const MARK = /<!--\s*INVARIANTS:BEGIN\s*-->[\s\S]*<!--\s*INVARIANTS:END\s*-->/
  const header = [
    '# ACTIVE INVARIANTS — the contract cheat sheet',
    '',
    'Generated from `dev_docs/contracts/registry/*.yaml` by `pnpm contract regenerate`;',
    'the registry is the truth, this file is its one-line projection',
    '(AGENTS.md LAW 4, the two-tier contract tracking). Never edit the',
    'generated block by hand — curate between the marks, rows via the CLI.',
    '',
  ]
  const lines = []
  for (const tier of TIERS) {
    const tierRowsOut = rows.filter((r) => r.tier === tier)
    if (tierRowsOut.length === 0) continue
    lines.push('', `## ${tier}`, '')
    for (const r of tierRowsOut) {
      const wall = r.wall?.spec ?? 'NO WALL (§4 debt)'
      lines.push(`- **${r.id}** — ${r.invariant} — wall: \`${wall}\``)
    }
  }
  lines.push('', '<!-- INVARIANTS:END -->', '')
  // The BEGIN/END marks ride the BLOCK, not the header: the replace branch
  // splices the block between the marks, so a header-borne BEGIN would be
  // consumed by the first replace (no BEGIN → every later regenerate takes
  // the append path and stacks a full copy — the 18-heading drift).
  const block = ['<!-- INVARIANTS:BEGIN -->', ...lines].join('\n')
  const next = MARK.test(open)
    ? open.replace(MARK, block)
    : (open === '' ? header.concat(['<!-- INVARIANTS:BEGIN -->'], lines).join('\n') : open.replace(/\n*$/, '\n\n') + header.concat(['<!-- INVARIANTS:BEGIN -->'], lines).join('\n') + '\n')
  writeFileSync(INVARIANTS, next)
  console.log(`contract: INVARIANTS.md regenerated (${rows.length} active rows)`)
}

function recordProof(opts) {
  const row = findRow(opts.id)
  const date = new Date().toISOString().slice(0, 10)
  // receipt_ref may be store-rooted (dev_docs/contracts/...) or
  // contracts-rooted (the migration carries both spellings)
  const rawName = row.receipt_ref ?? `receipts/${date}-${opts.id.toLowerCase()}.md`
  const receiptName = rawName.startsWith('dev_docs/') ? rawName.slice('dev_docs/contracts/'.length) : rawName
  const receiptPath = join(CONTRACTS, receiptName)
  const entry = [
    '',
    `## toggle-proof ${date}`,
    '',
    `- toggle: ${opts.toggle}`,
    `- red: ${opts.redOutput}`,
    ...(opts.commit ? [`- commit: ${opts.commit}`] : []),
  ].join('\n')
  const head = existsSync(receiptPath) ? '' : [
    `# RECEIPT — ${opts.id}`,
    '',
    `Forensic log for the registry row \`${opts.id}\` (${row.tier} tier).`,
    'Append via `pnpm contract record-proof` — never read to code against.',
    '',
  ].join('\n')
  if (existsSync(receiptPath)) appendFileSync(receiptPath, entry + '\n')
  else writeFileSync(receiptPath, head + entry + '\n')
  const rows = tierRows(row.tier)
  const target = rows.find((r) => r.id === opts.id)
  target.receipt_ref = receiptName
  writeTier(row.tier, rows)
  regenerate()
  console.log(`contract: proof recorded for ${opts.id} -> ${receiptName}`)
}

function main() {
  const [verb, ...rest] = argv.slice(2)
  const arg = (name) => {
    const i = rest.indexOf('--' + name)
    if (i === -1 || rest[i + 1] === undefined) fail(`--${name} is required for ${verb}`)
    return rest[i + 1]
  }
  if (verb === 'list') {
    const tierIdx = rest.indexOf('--tier')
    const rows = tierIdx === -1 ? allRows() : tierRows(rest[tierIdx + 1])
    if (rows.length === 0) fail('no rows — the registry is empty or the tier name is wrong (' + TIERS.join(', ') + ')')
    for (const r of rows) {
      console.log(`${r.id.padEnd(34)} ${r.status.padEnd(10)} ${r.tier.padEnd(7)} ${r.invariant}`)
    }
    return
  }
  if (verb === 'show') {
    const id = rest[0]
    if (id === undefined || id.startsWith('--')) fail('show <ID>')
    const r = findRow(id)
    console.log(YAML.stringify(r))
    return
  }
  if (verb === 'record-proof') {
    recordProof({
      id: arg('id'),
      toggle: arg('toggle'),
      redOutput: arg('red-output'),
      commit: rest.includes('--commit') ? arg('commit') : undefined,
    })
    return
  }
  if (verb === 'set-wall') {
    // deterministic wall-spec correction: a row naming a dead or
    // moved spec re-points here, never by hand-editing the YAML
    const id = arg('id')
    const spec = arg('spec').split(',').map((s) => s.trim()).filter(Boolean)
    const row = findRow(id)
    if (spec.length === 0) fail('--spec needs at least one file path')
    for (const s of spec) {
      if (!existsSync(join(ROOT, s))) fail(`wall spec ${s} does not exist on disk — the registry never names a dead wall`)
    }
    const rows = tierRows(row.tier)
    const target = rows.find((r) => r.id === id)
    target.wall = { ...(target.wall ?? {}), spec: spec.length === 1 ? spec[0] : spec }
    writeTier(row.tier, rows)
    regenerate()
    console.log(`contract: ${id} wall -> ${spec.join(', ')}`)
    return
  }
  if (verb === 'seat-row') {
    // a new contract lands as a registry row + a receipt — never a
    // prose table row (AGENTS.md LAW 4)
    const tier = arg('tier')
    if (!TIERS.includes(tier)) fail(`--tier must be one of ${TIERS.join(', ')}`)
    const id = arg('id')
    if (allRows().some((r) => r.id === id)) fail(`row ${id} already exists — edit it, do not seat it twice`)
    const wall = arg('wall')
    if (!existsSync(join(ROOT, wall))) fail(`wall spec ${wall} does not exist on disk`)
    const rows = tierRows(tier)
    const row = {
      id,
      status: 'active',
      invariant: arg('invariant'),
      truth_home: { files: (rest.includes('--truth-home') ? arg('truth-home') : '').split(',').map((s) => s.trim()).filter(Boolean) },
      wall: { spec: wall, arms: rest.includes('--arms') ? arg('arms') : 'see spec' },
      depth: rest.includes('--depth') ? arg('depth') : 'real_doors',
      receipt_ref: null,
    }
    rows.push(row)
    rows.sort((a, b) => a.id.localeCompare(b.id))
    writeTier(tier, rows)
    regenerate()
    console.log(`contract: seated ${id} (${tier}) — owes a receipt (record-proof)`)
    return
  }
  if (verb === 'regenerate') {
    regenerate()
    return
  }
  fail(`unknown verb ${JSON.stringify(verb)} — list | show | seat-row | set-wall | record-proof | regenerate`)
}

main()

#!/usr/bin/env node
/**
 * Package README conformance gate — melite's replication of the DSH
 * doc-automation levels (references/deepseek-harness/.agents/skills/
 * dsh-doc/references/metadata-links-i18n.md, cookbook/adding-a-package.md
 * step 4). Machines own the shape; authors own the prose.
 *
 * For every packages/<group>/<pkg>/package.json the sibling README.md
 * must:
 *   1. exist, with frontmatter `description` and `kind`
 *   2. carry the kind DERIVED from the manifest (mechanical, same order
 *      as the DSH rule): dsh.bundle.patch -> package-bundle; exports
 *      map -> package-library; else package-reference
 *   3. exactly one H1, no heading deeper than H3
 *   4. end with the canonical sequence: `## Model Experience` (with
 *      `#### What the model sees`, `#### Token effect`,
 *      `#### KV Cache effect`) then `## Known Limitations and Deferred
 *      Work` as the final H2
 *   5. name every declared exports subpath (drift check: the contract
 *      section cannot go silent while the manifest grows a door)
 *   6. stay under the word budget (default 600 body words)
 *   7. carry no FIXME/TODO/XXX markers
 *
 * Exit 0 clean; exit 1 prints every offender. `--only group[/pkg]`
 * scopes a run (authoring workers self-check their batch).
 *
 * @example node tools/check-package-readmes.mjs
 * @example node tools/check-package-readmes.mjs --only models/counterfeit
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

function flagValue (argv, flag) {
  const i = argv.indexOf(flag)
  return i >= 0 ? argv[i + 1] : undefined
}

const root = join(import.meta.dirname, '..')
const packagesDir = join(root, 'packages')
const only = flagValue(process.argv, '--only')
const budget = Number(flagValue(process.argv, '--budget') ?? 600)
const KINDS = new Set(['package-group', 'package-bundle', 'package-library', 'package-reference'])

/** Mechanical kind derivation, mirroring the DSH order. */
function deriveKind (manifest) {
  if (manifest.dsh?.bundle?.patch || manifest['dsh.bundle.patch']) return 'package-bundle'
  if (manifest.exports && typeof manifest.exports === 'object' && Object.keys(manifest.exports).length > 0) {
    return 'package-library'
  }
  return 'package-reference'
}

const offenders = []
let checked = 0
for (const group of readdirSync(packagesDir).sort()) {
  const groupDir = join(packagesDir, group)
  let entries
  try {
    entries = readdirSync(groupDir).sort()
  } catch {
    continue
  }
  for (const pkg of entries) {
    const manifestPath = join(groupDir, pkg, 'package.json')
    if (!existsSync(manifestPath)) continue
    const rel = `${group}/${pkg}`
    if (only && !(only === rel || only === group)) continue
    checked++
    const readmePath = join(groupDir, pkg, 'README.md')
    if (!existsSync(readmePath)) {
      offenders.push(`${rel}: README.md missing`)
      continue
    }
    const text = readFileSync(readmePath, 'utf8')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))

    // 1+2 — frontmatter and mechanical kind
    const fm = text.match(/^---\n([\s\S]*?)\n---\n/)
    if (!fm) {
      offenders.push(`${rel}: no frontmatter block (--- description/kind ---)`)
    } else {
      const desc = fm[1].match(/^description:\s*(\S.*)$/m)
      const kind = fm[1].match(/^kind:\s*(\S.*)$/m)
      if (!desc) offenders.push(`${rel}: frontmatter lacks description`)
      if (!kind || !KINDS.has(kind[1].trim())) {
        offenders.push(`${rel}: frontmatter kind missing or unknown (need one of ${[...KINDS].join('|')})`)
      } else {
        const expected = deriveKind(manifest)
        if (kind[1].trim() !== expected) {
          offenders.push(`${rel}: kind ${kind[1].trim()} but the manifest derives ${expected}`)
        }
      }
    }

    // 3 — one H1, depth ceiling H3
    const h1s = [...text.matchAll(/^# (?!=) *(.+)$/gm)]
    if (h1s.length !== 1) offenders.push(`${rel}: ${h1s.length} H1 headings (need exactly 1)`)
    if (/^#####+ /m.test(text.replace(/^```[\s\S]*?^```/gm, ''))) {
      offenders.push(`${rel}: heading deeper than H3 outside code fences`)
    }

    // 4 — canonical ending sequence
    const modelExp = text.indexOf('## Model Experience')
    const knownLim = text.indexOf('## Known Limitations and Deferred Work')
    if (modelExp < 0) offenders.push(`${rel}: no "## Model Experience" section`)
    if (knownLim < 0) offenders.push(`${rel}: no "## Known Limitations and Deferred Work" section`)
    if (modelExp >= 0 && knownLim >= 0) {
      if (knownLim < modelExp) offenders.push(`${rel}: Known Limitations must follow Model Experience`)
      if (!/#### What the model sees/.test(text)) offenders.push(`${rel}: Model Experience lacks "#### What the model sees"`)
      if (!/#### Token effect/.test(text)) offenders.push(`${rel}: Model Experience lacks "#### Token effect"`)
      if (!/#### KV Cache effect/.test(text)) offenders.push(`${rel}: Model Experience lacks "#### KV Cache effect"`)
      if (text.slice(knownLim).indexOf('## ') > 0) offenders.push(`${rel}: Known Limitations must be the final H2`)
    }

    // 5 — every exports subpath is named somewhere in the contract.
    // The standard `./package.json` re-export is exempt: it is
    // mechanical, identical across all manifests, and carries no
    // contract content to document.
    const exportsMap = typeof manifest.exports === 'object' && manifest.exports ? Object.keys(manifest.exports) : []
    for (const key of exportsMap) {
      if (key === './package.json' || key === 'package.json') continue
      const name = key === '.' ? 'package entry' : `./${key.replace(/^\.\//, '')}`
      if (!text.includes(key === '.' ? '.' : `./${key.replace(/^\.\//, '')}`) && key !== '.') {
        offenders.push(`${rel}: exports subpath ${name} not named in the README`)
      }
    }

    // 6 — word budget (body, code fences stripped)
    const body = text.replace(/^---[\s\S]*?---\n/, '').replace(/```[\s\S]*?```/g, ' ')
    const words = body.split(/\s+/).filter(Boolean).length
    if (words > budget) offenders.push(`${rel}: ${words} body words exceed the ${budget} budget`)

    // 7 — marker hygiene
    const marker = text.match(/\b(FIXME|TODO|XXX)\b/)
    if (marker) offenders.push(`${rel}: ${marker[1]} marker in README (semantics live in code)`)
  }
}

const rel = relative(root, process.cwd())
console.log(`package-readmes: checked ${checked} package(s)${only ? ` (scoped: ${only})` : ''}`)
if (offenders.length > 0) {
  console.log(`incomplete: ${offenders.length} offender(s)`)
  for (const line of offenders.slice(0, 80)) console.log(`  ${line}`)
  if (offenders.length > 80) console.log(`  … and ${offenders.length - 80} more`)
  process.exit(1)
}
console.log(`done: all ${checked} README(s) conform`)

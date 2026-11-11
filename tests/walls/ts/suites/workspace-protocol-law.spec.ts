import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

// workspace-protocol-law — THE PROTOCOL SPELLING WALL (the 2026-11-17
// cordis audit's MINOR-6): one mapping, no inversions. The audit
// caught the tree contradicting its own pnpm-workspace.yaml comment —
// a vendored platform package at `workspace:~` beside vendor-rescoped
// `@melite-plugin/*` rows at `workspace:*`, with the comment claiming
// `workspace:*` for both tiers. The discipline (one sentence,
// pnpm-workspace.yaml:32): `@melite/*` native carriers consume
// `workspace:*` (exact substitution at publish); every vendor tier —
// `@melite-plugin/*` (rescoped tenants) and the vendored
// `@deepseek-ai/cordis-plugin-*` rows from vendor/cordis_plugins —
// consumes `workspace:~`. The wall rides the REAL manifests via git
// ls-files (canon axis 4): any row spelled the other way reds, and a
// new package inherits the law with no baseline to bump.

const ROOT = resolve(import.meta.dirname, '..', '..', '..', '..')
const DEP_KEYS = ['dependencies', 'devDependencies', 'peerDependencies'] as const

/** Every workspace manifest the tree carries (derived, never a list). */
function workspaceManifests(): string[] {
  const out = execFileSync('git', ['ls-files', '*/package.json'], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 })
  return out.split('\n').map((f) => f.trim()).filter((f) => f.endsWith('.json'))
}

/** The protocol spec a manifest row spells for name, or none. */
function specOf(file: string, name: string): string | undefined {
  const manifest = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as Record<string, unknown>
  for (const key of DEP_KEYS) {
    const rows = manifest[key]
    if (rows !== undefined && typeof rows === 'object' && rows !== null && name in (rows as Record<string, string>)) {
      return (rows as Record<string, string>)[name]
    }
  }
  return undefined
}

/** Whether the package name resolves inside this workspace (a
 *  workspace member's own name — the vendor tier and the natives). */
function workspaceNames(): Set<string> {
  const names = new Set<string>()
  for (const file of workspaceManifests()) {
    try {
      const m = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as { name?: string }
      if (typeof m.name === 'string') names.add(m.name)
    } catch { /* vendored or malformed manifest — not a member */ }
  }
  return names
}

describe('THE WORKSPACE PROTOCOL LAW (one mapping, no inversions)', () => {
  it('every vendored-tier row spells workspace:~ and every native @melite/* row spells workspace:*', () => {
    const names = workspaceNames()
    const offenders: string[] = []
    for (const file of workspaceManifests()) {
      const manifest = JSON.parse(readFileSync(join(ROOT, file), 'utf8')) as Record<string, unknown>
      for (const key of DEP_KEYS) {
        const rows = manifest[key]
        if (rows === undefined || typeof rows !== 'object' || rows === null) continue
        for (const [name, spec] of Object.entries(rows as Record<string, string>)) {
          if (!spec.startsWith('workspace:')) continue
          // Only judge rows whose target is a workspace member: an
          // outside name with a workspace spec is a different fault
          // (a row that cannot resolve) — named below, not here.
          if (!names.has(name)) {
            offenders.push(`${file}: ${name} at "${spec}" — not a workspace member`)
            continue
          }
          const vendorTier = name.startsWith('@melite-plugin/') || /^@deepseek-ai\/cordis-plugin-[a-z-]+$/.test(name)
          const nativeTier = name.startsWith('@melite/')
          if (vendorTier && spec !== 'workspace:~') {
            offenders.push(`${file}: ${name} at "${spec}" — vendor tier consumes workspace:~`)
          }
          if (nativeTier && spec !== 'workspace:*') {
            offenders.push(`${file}: ${name} at "${spec}" — @melite/* native carriers consume workspace:*`)
          }
        }
      }
    }
    expect(offenders, 'the workspace-protocol mapping holds across every manifest').toEqual([])
  })

  it('the pnpm-workspace comment still states the law (the comment IS the discipline home)', () => {
    const yaml = readFileSync(join(ROOT, 'pnpm-workspace.yaml'), 'utf8')
    expect(yaml, 'the one-sentence discipline names both tiers and their spellings').toMatch(
      /WORKSPACE-PROTOCOL LAW.*@melite\/\* native carriers consume workspace:\*.*workspace:~/s,
    )
  })
})

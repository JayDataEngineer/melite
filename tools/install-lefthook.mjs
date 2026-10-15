#!/usr/bin/env node
// install-lefthook.mjs — the postinstall that seats the git hooks
// (lefthook.yml's own header promised "or `pnpm install` once a
// postinstall lands" — F-12, 2026-11-05: it landed).
//
// Mechanism mirrored from DSH's scripts/install-lefthook.mjs
// (references/deepseek-harness), scoped to this single-checkout
// repo: skip on CI, skip outside a git worktree, skip when the
// lefthook binary is absent (a dependency-less `pnpm install
// --ignore-scripts` flow), and REFUSE to clobber a user-owned
// core.hooksPath — an operator who pointed hooks elsewhere keeps
// their wiring; the refusal says so instead of silently winning.
//
// This script NEVER runs `lefthook install` by hand guidance — it is
// only ever executed by the package manager's postinstall lifecycle.

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const skip =
  process.env.CI === 'true' ||
  process.env.GITHUB_ACTIONS === 'true' ||
  process.env.MELITE_SKIP_LEFTHOOK_INSTALL === '1'

if (skip) process.exit(0)

const probe = spawnSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' })
if (probe.status !== 0 || !probe.stdout) process.exit(0)
const root = probe.stdout.replace(/\r?\n$/, '')

const bin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'lefthook.cmd' : 'lefthook')
if (!existsSync(bin)) process.exit(0)

// A user-owned core.hooksPath is never overwritten: lefthook install
// would repoint it. The skip is loud so the gate's absence is a named
// fact, not operator archaeology.
const hooksPath = spawnSync('git', ['config', '--get', 'core.hooksPath'], { cwd: root, encoding: 'utf8' })
if (hooksPath.status === 0 && hooksPath.stdout.trim() !== '') {
  console.log(
    `[install-lefthook] core.hooksPath is user-owned (${hooksPath.stdout.trim()}) — lefthook not installed; ` +
    'chain lefthook.yml through that path yourself if you want the gates.',
  )
  process.exit(0)
}

const install = spawnSync(bin, ['install'], { cwd: root, stdio: 'inherit' })
if (install.status !== 0) {
  console.error('[install-lefthook] lefthook install failed — run `pnpm exec lefthook install` and inspect the error.')
  process.exitCode = 1
}

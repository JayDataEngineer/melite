#!/usr/bin/env node
// render-seat-patch.mjs — renders the repo-root bundle patch that the DSH
// plugin install seats.
//
// The repo root package ("melite") is THE seat: `dsh plugin --profile <name>
// add github:JayDataEngineer/melite#<ref>` lands the root package itself as
// the profile's one new direct dependency, and the plugin manager's bundle
// reconciliation appends it to `dsh.profile.bundles` because its manifest
// declares `dsh.bundle.patch`. The root patch therefore must carry the rows
// the mounted melite packages would have carried themselves — this render
// DERIVES those rows from the carrier packages' own cordis.patch.yml files
// (the channel-law SSOTs) in tools/consumer-install.mjs PROFILE_BASES order,
// so a seat installed through `dsh plugin add` composes the same rows the
// consumer-install renderer's profile composes (the parity law, bin/
// infer-provision.mjs).
//
// Web-surface policy: consumer-install disables the four web-surface rows on
// non-web mounts (no webServer service to activate them). A bundle patch is
// one static layer that cannot know the mount shape at render time, so the
// four rows carry a `disabled: !!js` expression over ProfileContext
// .startedBundles instead — the runtime form of the same policy (the
// dsh-web-app bundle patch's `ctx.get('profileContext')` rows are the
// precedent).
//
// Usage:
//   node tools/render-seat-patch.mjs           # render cordis.patch.yml
//   node tools/render-seat-patch.mjs --check   # exit 1 naming the drift
//
// Run this after any carrier patch changes and commit the rendered file; the
// seat-parity wall reds on an unrendered carrier change.

import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Document, parse, visit } from 'yaml'
import { execFileSync } from 'node:child_process'

const ROOT = resolve(import.meta.dirname, '..')

// The melite carriers of the studio profile, in PROFILE_BASES['melite-test']
// order (the in-box @deepseek-ai rows are dsh installation bundles, never
// dependencies of this seat). Synced with tools/consumer-install.mjs.
const CARRIERS = [
  ['@melite/harness-provisioner', 'packages/harness/provisioner'],
  ['@melite/harness-tools', 'packages/harness/melite-tools'],
  ['@melite-plugin/dsh-estate', 'packages/web/melite-estate'],
  ['@melite/card-base', 'packages/web/card-base'],
  ['@melite/three-client', 'packages/web/three-client'],
  ['@melite-plugin/dsh-card-view', 'packages/web/melite-card-view'],
  ['@melite-plugin/dsh-card-deck', 'packages/web/melite-card-deck'],
  ['@melite-plugin/dsh-gallery', 'packages/web/infer-gallery'],
  ['@melite/video-h3-timeline', 'packages/video/h3-timeline'],
  ['@melite/motion-motion', 'packages/motion/motion'],
  ['@melite/image-input-prep', 'packages/image/input-prep'],
]

// The web-surface rows, disabled when the composition carries no web app —
// consumer-install's `webRows`, keyed to the runtime mount check.
const WEB_SURFACE_IDS = ['melite-tools-doors', 'infer-card-view', 'ray-card-deck', 'infer-gallery']
const WEB_APP_BUNDLE = '@deepseek-ai/dsh-web-app'
const WEB_DISABLE_EXPR = `!(ctx.get('profileContext')?.startedBundles ?? []).includes('${WEB_APP_BUNDLE}')`

const PATCH_PATH = join(ROOT, 'cordis.patch.yml')

/** Concatenate the carrier patches' rows in PROFILE_BASES order and pin the
 *  web-surface rows' runtime disable. @returns {Array<object>} the seat rows. */
function renderRows() {
  const rows = CARRIERS.flatMap(([, dir]) => {
    const text = readFileSync(join(ROOT, dir, 'cordis.patch.yml'), 'utf8')
    const parsed = parse(text)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error(`${dir}/cordis.patch.yml carries no rows`)
    }
    return parsed
  })
  for (const row of rows) {
    if (!Array.isArray(row.insert)) continue
    for (const entry of row.insert) {
      if (WEB_SURFACE_IDS.includes(entry.id)) entry.disabled = WEB_DISABLE_EXPR
    }
  }
  return rows
}

/** Render the patch file text: the contract header, then the rows. */
function renderPatchText() {
  const doc = new Document(renderRows())
  visit(doc, {
    Scalar(_key, node) {
      if (node.value === WEB_DISABLE_EXPR) node.tag = '!!js'
    },
  })
  const header = [
    '# melite — the repo-root bundle patch, rendered by tools/render-seat-patch.mjs.',
    '# DO NOT EDIT THE ROWS BY HAND: they derive from the carrier packages\' own',
    "# cordis.patch.yml files (listed inside the renderer) in tools/consumer-install.mjs's",
    '# PROFILE_BASES order, so a profile seated with',
    '#   dsh plugin --profile <name> add github:JayDataEngineer/melite#<ref>',
    '# composes the same rows a consumer-install profile composes. Re-render and',
    '# commit after any carrier patch change; the seat-parity wall reds otherwise.',
    `# The four web-surface rows are disabled at composition time when the profile`,
    `# carries no ${WEB_APP_BUNDLE} bundle (the startedBundles check), which is the`,
    '# runtime form of consumer-install\'s non-web mount policy.',
    '',
  ].join('\n')
  return header + doc.toString({ lineWidth: 0 })
}

const check = process.argv.includes('--check')
const rendered = renderPatchText()
const current = (() => {
  try { return readFileSync(PATCH_PATH, 'utf8') } catch { return '' }
})()
if (check && rendered !== current) {
  console.error('render-seat-patch: cordis.patch.yml is stale — re-run `pnpm run seat:render` and commit')
  process.exit(1)
}
if (!check) writeFileSync(PATCH_PATH, rendered)
console.log(`render-seat-patch: ${PATCH_PATH} (${CARRIERS.length} carrier patches)`)

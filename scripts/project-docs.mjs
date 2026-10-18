#!/usr/bin/env node
/**
 * project-docs.mjs — the docs-site projector (the DSH website law at
 * melite scale: references/deepseek-harness/.agents/skills/dsh-doc/
 * references/website-sync.md — "a tested projection of repository
 * Markdown, never a second copy").
 *
 * Reads the explicit public allowlist (website/docs.mjs), rewrites each
 * canonical source into the disposable website/.generated/ tree, and
 * VitePress builds that tree. Link rules (website-sync.md, "Preserve
 * link behavior"):
 *   - a target present in the manifest becomes a site route;
 *   - an existing repository target outside the manifest becomes a
 *     GitHub source link (blob for files, tree for directories);
 *   - external, protocol-relative, site-absolute, mailto, and
 *     fragment-only links stay unchanged;
 *   - an image is copied into the generated tree and referenced from
 *     there, so the site serves it regardless of repository visibility;
 *   - a missing repository-relative target FAILS projection instead of
 *     silently producing a broken link.
 *
 * The repo slug comes from DOCS_REPO_SLUG or GITHUB_REPOSITORY. A
 * repository link that needs a GitHub URL without a slug available FAILS
 * projection — the alternative (leaving a relative link) is a dead link
 * the VitePress build refuses anyway; local preview builds set
 * DOCS_REPO_SLUG explicitly. CI always has GITHUB_REPOSITORY.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const { pages } = await import(pathToFileURL(join(root, 'website/docs.mjs')))
const genDir = join(root, 'website/.generated')
const slug = process.env.DOCS_REPO_SLUG ?? process.env.GITHUB_REPOSITORY
const branch = process.env.DOCS_BRANCH ?? 'main'
let rewritten = 0

const routeBySource = new Map(pages.map((p) => [p.source, p.route]))

/** Classify a markdown link target; null means "leave unchanged". */
function classify (target) {
  if (target.startsWith('#')) return 'fragment'
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return 'external'
  if (target.startsWith('//')) return 'external'
  if (target.startsWith('/')) return 'site-absolute'
  return 'repository'
}

function rewriteTarget (target, source) {
  const hash = target.indexOf('#')
  const pathPart = hash >= 0 ? target.slice(0, hash) : target
  const anchor = hash >= 0 ? target.slice(hash) : ''
  if (pathPart === '') return target
  const sourceDir = dirname(join(root, source))
  const resolved = resolve(sourceDir, pathPart)
  const rel = relative(root, resolved).split('\\').join('/')
  if (rel.startsWith('..')) {
    throw new Error(`project-docs: ${source} links outside the repository: ${target}`)
  }
  const route = routeBySource.get(rel)
  if (route !== undefined) {
    rewritten++
    // 'index.md' is the home route; every other route drops its .md
    // suffix — VitePress resolves /guide/x to the generated page.
    return route === 'index.md' ? '/' : `/${route.replace(/\.md$/, '')}${anchor}`
  }
  if (!existsSync(resolved)) {
    throw new Error(`project-docs: ${source} links a missing repository target: ${target}`)
  }
  if (statSync(resolved).isDirectory()) {
    if (!slug) {
      throw new Error(`project-docs: ${source} links ${target} but no repo slug is set (DOCS_REPO_SLUG / GITHUB_REPOSITORY) — cannot project to a GitHub tree URL`)
    }
    rewritten++
    return `https://github.com/${slug}/tree/${branch}/${rel}${anchor}`
  }
  rewritten++
  if (!slug) {
    throw new Error(`project-docs: ${source} links ${target} but no repo slug is set (DOCS_REPO_SLUG / GITHUB_REPOSITORY) — cannot project to a GitHub blob URL`)
  }
  return `https://github.com/${slug}/blob/${branch}/${rel}${anchor}`
}

rmSync(genDir, { recursive: true, force: true })
mkdirSync(genDir, { recursive: true })

for (const page of pages) {
  const sourcePath = join(root, page.source)
  if (!existsSync(sourcePath)) {
    throw new Error(`project-docs: manifest source is missing: ${page.source}`)
  }
  const text = readFileSync(sourcePath, 'utf8')
  // The label alternative handles badge-style one-level nesting —
  // [![alt](image)](href) — so the outer href is the link the projector
  // rewrites; a standalone image keeps its leading `!` outside the match.
  const out = text.replace(
    /\[(?:(!?\[[^\]]*\]\([^)\s]*\))|([^\]]*))\]\(([^)\s]+)\)/g,
    (full, nestedLabel, plainLabel, target) => {
      const label = nestedLabel ?? plainLabel
      const kind = classify(target)
      if (kind !== 'repository') return full
      const hash = target.indexOf('#')
      const pathPart = hash >= 0 ? target.slice(0, hash) : target
      const resolved = resolve(dirname(join(root, page.source)), pathPart)
      const isImage = /\.(png|jpe?g|gif|svg|webp|ico|avif)$/i.test(pathPart)
      if (isImage && existsSync(resolved) && statSync(resolved).isFile()) {
        // Images are served from the generated tree itself, regardless of
        // repository visibility (website-sync.md "Preserve link behavior").
        const rel = relative(root, resolved).split('\\').join('/')
        cpSync(resolved, join(genDir, rel))
        const fromPage = dirname(page.route)
        return `[${label}](${posix.relative(fromPage, rel)})`
      }
      return `[${label}](${rewriteTarget(target, page.source)})`
    }
  )
  const outPath = join(genDir, page.route)
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, out)
}

for (const page of pages) {
  console.log(`project-docs: ${page.source} -> ${page.route}`)
}
console.log(`project-docs: ${pages.length} page(s), ${rewritten} link(s) rewritten`)

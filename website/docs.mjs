/**
 * The docs-site manifest — the explicit public allowlist (the DSH law:
 * the website is a projection of repository Markdown, never a second
 * copy; see references/deepseek-harness/.agents/skills/dsh-doc/
 * references/website-sync.md).
 *
 * `source` is the repository-relative canonical Markdown file; `route`
 * is its path in the generated tree (the VitePress page path). The
 * projector (scripts/project-docs.mjs) owns every rewrite between the
 * two; nothing under website/.generated/ is ever edited or committed.
 */
export const pages = [
  { source: 'docs/index.md', route: 'index.md' },
  { source: 'README.md', route: 'guide/overview.md' },
  { source: 'docs/guide/what-is-melite.md', route: 'guide/what-is-melite.md' },
  { source: 'docs/guide/install.md', route: 'guide/install.md' },
  { source: 'docs/guide/getting-started.md', route: 'guide/getting-started.md' },
  { source: 'docs/guide/composing.md', route: 'guide/composing.md' },
  { source: 'docs/guide/license.md', route: 'guide/license.md' },
  { source: 'docs/guide/architecture.md', route: 'guide/architecture.md' },
  { source: 'docs/guide/testing.md', route: 'guide/testing.md' }
]

/**
 * The Melite documentation site (VitePress) — the DSH website law at
 * melite scale: this config is site chrome only; every page is a
 * projection of canonical repository Markdown through the manifest
 * (website/docs.mjs, scripts/project-docs.mjs), never a second copy.
 *
 * DEPLOYMENT-VARYING FACTS resolve from the environment, never hardcoded:
 * - `DOCS_BASE` is the Pages base path. CI passes
 *   `${{ steps.pages.outputs.base_path }}/` from actions/configure-pages
 *   (the DSH docs-pages.yml shape); locally it falls through to '/',
 *   so `vitepress dev` serves at localhost.
 * - `DOCS_REPO_SLUG` / `GITHUB_REPOSITORY` derive the repo URL for the
 *   social + edit links (and the projector's out-of-manifest GitHub
 *   links); `DOCS_BRANCH` overrides the edit-link branch (default
 *   `main`, the public default branch).
 */
import { defineConfig } from 'vitepress'

const repoSlug = process.env.DOCS_REPO_SLUG ?? process.env.GITHUB_REPOSITORY
const repoUrl = repoSlug ? `https://github.com/${repoSlug}` : undefined
const branch = process.env.DOCS_BRANCH ?? 'main'

export default defineConfig({
  lang: 'en-US',
  title: 'Melite',
  description:
    'An agent media-creation kit: compose cards on a shared bench, queue one run, and serve the artifacts.',
  srcDir: '.generated',
  outDir: '.dist',
  base: process.env.DOCS_BASE ?? '/',
  themeConfig: {
    siteTitle: 'Melite',
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/what-is-melite' },
      { text: 'License', link: '/guide/license' }
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Overview', link: '/guide/overview' },
            { text: 'What is Melite?', link: '/guide/what-is-melite' },
            { text: 'Install from a release', link: '/guide/install' },
            { text: 'Getting started', link: '/guide/getting-started' },
            { text: 'Composing and running', link: '/guide/composing' },
            { text: 'License', link: '/guide/license' }
          ]
        },
        {
          text: 'Development',
          items: [
            { text: 'Architecture and repository map', link: '/guide/architecture' },
            { text: 'Testing', link: '/guide/testing' }
          ]
        }
      ]
    },
    socialLinks: repoUrl ? [{ icon: 'github', link: repoUrl }] : [],
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: 'Search docs', buttonAriaLabel: 'Search docs' },
          modal: { noResultsText: 'No results', footer: { selectText: 'to select', navigateText: 'to navigate', closeText: 'to close' } }
        }
      }
    },
    // No global editLink: VitePress patterns key on the projected path,
    // which diverges from the canonical source (README.md projects to
    // guide/overview). Per-page canonical edit links are owed — the
    // projector must stamp them from the manifest.
    outline: { level: [2, 3], label: 'On this page' },
    footer: {
      message: 'Code released under the GNU AGPL-3.0-or-later license.',
      copyright: 'Melite — an agent media-creation kit'
    }
  }
})

/**
 * Shared browser platform modules. Seeding, bundling externals, and Vite
 * aliases consume this list so their module identities cannot drift.
 *
 * LAW 1: this list is 1:1 with the DSH SSOT
 * (`@deepseek-ai/dsh-client-web/src/platform`, mirrored in
 * `references/deepseek-harness/packages/client/web/src/platform.ts`) —
 * every word must name a module the DSH shell seeds into its frozen module
 * table. Row-4 reconciliation (2026-09-10):
 * - DROPPED `dsh-client-web-react` + `dsh-client-schema-form`: phantom
 *   words — no such packages exist upstream (upstream's own
 *   client-bundle-purity.spec.ts rejects web-react as unshippable). A
 *   bundle importing one would throw at table-require time; absence
 *   converts that to a build-time purity error instead.
 * - ADDED `dsh-client-store` (the snapshot-store engine) +
 *   `dsh-client-ui-dockkit`: real platform words the DSH shell seeds, so
 *   our bundles resolve them from the shared table instead of inlining a
 *   duplicate instance (the module-graph law).
 * @module @deepseek-ai/dsh-client-web/src/platform
 */

/** The module specifiers the shell shares into the frozen module table. */
export const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
] as const

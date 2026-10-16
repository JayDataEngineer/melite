/**
 * Shared browser platform modules. Seeding, bundling externals, and Vite
 * aliases consume this list so their module identities cannot drift.
 *
 * LAW 1 (RESEATED, the 2026-10-16 boot death): this list is 1:1 with the
 * platform words the SEATED DSH shell can answer from its frozen module
 * table — the published release the lanes actually boot, never upstream
 * main. The upstream SSOT (`@deepseek-ai/dsh-client-web/src/platform`,
 * mirrored in `references/deepseek-harness/packages/client/web/src/
 * platform.ts`) may run AHEAD of the seated release: on 2026-10-16 a
 * bundle rebuild followed the mirror's newly gained `zod` +
 * `@tanstack/react-virtual` while every lane still booted a shell that
 * seeds no such word — the rebuilt card-view client externalized zod,
 * `require("zod") missed the module table` at boot, card-view died and
 * card-deck pended on remote.manage behind it, through three green full
 * gates. Upstream-ahead words are LEDGERED in platform-ssot.spec.ts
 * (PENDING_SHELL_WORDS) and enter this list only after the seated shell
 * ships them (live boot receipt). Row-4 reconciliation (2026-09-10):
 * - DROPPED `dsh-client-web-react` + `dsh-client-schema-form`: phantom
 *   words — no such packages exist upstream (upstream's own
 *   client-bundle-purity.spec.ts rejects web-react as unshippable). A
 *   bundle importing one would throw at table-require time; absence
 *   converts that to a build-time purity error instead.
 * - ADDED `dsh-client-store`: a real platform word the DSH shell seeds,
 *   so our bundles resolve it from the shared table instead of inlining
 *   a duplicate instance (the module-graph law).
 * - KEPT 'dsh-client-ui-dockkit' (2026-10-16 correction): the seated
 *   shell's shipped frontend names it in its seed-table literal — a
 *   real platform word despite resolving from no manifest we probe.
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

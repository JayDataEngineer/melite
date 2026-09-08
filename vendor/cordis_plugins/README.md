# Vendored platform tier — `@deepseek-ai/cordis-plugin-{loader,timer,logger-console}`

Date: 2026-09-08
Status: landed

Operator order (2026-09-08, verbatim): "how does dsh github deal with
this? Do they use npm install?" — NO. The harness SOURCE-VENDORS the
platform tier (`deepseek-harness/vendor/README.md`): pinned-commit
source copies renamed into `@deepseek-ai`, workspace linking,
`verify-vendored-links` hygiene. "npm publish is their byproduct, not
their consumption path. npm-install would be registry-lag, no
patchability, no pin — banned." Registry install of these names is
banned here too. Fork core `@deepseek-ai/cordis` deliberately stays
registry (published-frozen — operator step 3).

## Provenance (harness commit 141eb6f, dsh-0.1.0-rc.8)

Copied from `/home/user/Documents/programs/deepseek-harness`
(verified `git rev-parse HEAD` = `141eb6f…`): each package carries
`src/` + `package.json` + `README.md` + `LICENSE`, byte-identical to
the harness (only the manifest deltas O1–O3 below differ). The
harness's own copies are its patched `@deepseek-ai`-scoped forks —
these are vendored from the HARNESS, not from upstream cordiverse.
Upstream repos/commits (from the harness vendor table):

| package | harness pkg version | upstream repo | upstream commit |
|---|---|---|---|
| loader | 1.0.2 | cordiverse/cordis | 56b3d4f… |
| timer | 1.1.3 | cordiverse/cordis | 56b3d4f… |
| logger-console | 1.0.1 | cordiverse/cordis | abb0a307… |

Excluded, as arbitrated: `hmr/` (dev-loop watcher — prod boot
watches nothing), `include/` (file-backed config tree FOR live
reload — single-shot boot reads the manifest once), `group/`
(loader needs only cosmokit + the cordis peer at runtime —
verified in the manifests).

## Method: workspace members + workspace:* (harness-mirror)

`vendor/cordis_plugins/*` are pnpm WORKSPACE MEMBERS
(`pnpm-workspace.yaml` — mirrors the harness listing `vendor/*` as
workspace members) and `plugins/gateway` consumes them via
`"workspace:*"` (`plugins/gateway/package.json` — mirrors the
harness consumers' workspace protocol). pnpm materializes every link
on each root install (the lockfile's gateway importer resolves all
three names to `link:../../vendor/cordis_plugins/*`); no hand-rolled
`node_modules` links exist anywhere (workspace law), and resolution
can never reach the registry — the no-registry hygiene holds BY
CONSTRUCTION. `scripts/link-vendored-platform.sh` owns only what
pnpm cannot (the `lib/` build, below) plus the `--check` hygiene
gate (mirrors harness `verify-vendored-links`, scoped to the
gateway: vendor-prefix resolution, cordis version parity, lockfile
`link:`, `lib/` presence).

## Manifest deltas vs the harness (the ONLY divergences)

- O1 `private: true` on all three manifests (never published from here).
- O2 `workspace:^` ranges refloored to registry floors (the harness
  resolves them against its own workspace; ours has no such
  providers): `@deepseek-ai/cosmokit workspace:^` → `^1.8.1`,
  `@deepseek-ai/schemastery workspace:^` → `^3.18.0` (logger-console),
  `@deepseek-ai/cordis` peer `workspace:^` → `^4.0.2` (exact-range
  peer match with the gateway's own cordis dep). Plus
  `devDependencies: { "@types/node": "^22.20.0" }` on all three (the
  boundary-tsc `types: ["node"]` must resolve through pnpm-owned
  links — hand links get pruned on install). Entry points stay the
  harness `lib/` layout.
- O3 boundary `tsconfig.json` per package (OUR files, not harness
  divergence): the harness tsconfig relaxations
  (`noImplicitAny:false`, unused-locals/params off,
  `noUncheckedIndexedAccess`/`exactOptionalPropertyTypes`/
  `noImplicitOverride` off, `target es2024`) with the layout adapted
  (no harness `tsconfig.base.json` here). FULL EMIT into gitignored
  `lib/` (`lib/*.js` + `lib/types/*.d.ts`, the harness lib/ layout,
  `rewriteRelativeImportExtensions`): the harness sources are NOT
  strip-types-erasable (parameter properties in
  `loader/src/index.ts`), so the runtime loads the emitted JS while
  the gateway program consumes the declarations via tsconfig `paths`
  — the strict gateway program never typechecks vendor sources.

## The lib/ build (load-bearing, gitignored)

Fresh clone order: root `pnpm install` (links) →
`plugins/gateway/scripts/link-vendored-platform.sh` (emits `lib/`
with the repo tsc) → gateway `tsc` / walls. Without `lib/`, the
manifest entry points dangle and the boot refuses.

## DIVERGENCE D1 — two cordis@4.0.2 store paths (proven inert)

pnpm splits the framework by peer context: the gateway resolves
cordis to `…cordis@4.0.2_…loader@vendor+cordis_plugins+loader…`
while the vendored loader's own peer resolves to
`…cordis@4.0.2_…loader@1.0.3…` (the pre-existing dsh-family
registry graph's copy). Same version, two paths, two module
instances. Unification levers tried and exhausted:
`dedupe-peer-dependencies: true` (no-op — it dedups versions, not
peer contexts; reverted) and exact-range peer match `^4.0.2`
(no-op); removing the competing graph or vendoring cordis core are
out of scope (operator step 3 forbids the latter). Proven inert
for our graph: (i) the fork core + loader sources perform ZERO
cross-copy identity checks (only `Error`/`GeneratorFunction`
globals — verified by grep); (ii) every seam is string-keyed
(services, events, builtins); (iii) fork-boundary probes green
(`ctx.loader`/`ctx.timer` attach, cross-copy `ctx.interval`
fires+disposes, gateway fiber resolves ACTIVE through the vendored
loader); (iv) the full wall battery is green (e2e 46, refusals 77
with byte-exact REFUSING, queue 36, drafts 140, validate 102,
runs 69, + the rest). Compile-time stays single-identity: the
gateway tsconfig pins `@deepseek-ai/cordis` to its own stable link
so the vendor `declare module` augmentations land on the one
program copy (without it, `ctx.loader`/`ctx.interval` fail to
typecheck). The `--check` gate asserts version parity (VIOLATION
on drift) and reports a path split as a NOTE citing this section.

## Homolog conformance (docs/dsh-homolog/cordis-tutorial/05+06)

Entry shape mirrors the homolog: stable `id` on every entry (the
loader diffs modification vs remove+add by id), platform `name`
values are REAL specifiers (06-style), `config` blocks are
schema-validated before apply (misconfig fails LOUD, fiber FAILED
— 05), `disabled: true` is honored (entry kept, never mounted —
06), providers mount before consumers (gateway-errors first — the
06/07 PENDING lesson), logger-console precedes timer (06's
canonical order). Divergences with causes live in the manifest
`$comment` (driver-side `cordis:` aliasing, door builtins, no
include/hmr, no `!!js`, programmatic `$runtime` config). NOTE: the
homolog EN tutorial files are 14-byte 404 stubs — only the
`.zh.md` mirrors carry content (parent to fix that mirror
separately).

## Sync procedure (mirror the harness vendor discipline)

1. `git -C /home/user/Documents/programs/deepseek-harness rev-parse HEAD` → record the commit above.
2. Re-copy `src/ package.json README.md LICENSE` per package; re-apply O1–O2; byte-diff to confirm.
3. Root `pnpm install`, rebuild `lib/`, run `--check`, gateway `tsc`, the wall battery.
4. Log the sync + any new local mod in the next section.

## Local-modification log

- 2026-09-08 (landed): initial vendor @ harness `141eb6f` + O1/O2/O3 as above. No `src/` patch.

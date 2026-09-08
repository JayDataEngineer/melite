// storage/plugins.ts — the persistence tier as loader builtins.
//
// The DSH storage packages export plugin PIECES (name/inject/Config/
// apply), not a single default plugin object — so this module composes
// the loader-ready objects and core/context.ts aliases them as
// `cordis:` builtins, exactly like the platform services (which ride
// builtins imported by real specifier through the gateway's links,
// then aliased: the loader must NEVER bare-import, so every entry
// resolves through the builtins table — one mechanism, manifest
// order). No new Config shapes here: both Configs are the packages'
// own schemastery contracts (plugin Config stays schemastery — the
// zod-at-the-seam boundary in domains.ts is untouched), validated by
// the registry BEFORE apply; entry configs ride the manifest's
// $runtime marker and are built programmatically in core/context.ts.
//
// Erasable-syntax TS only (node --experimental-strip-types): no
// enums, import type for types, .ts specifiers for relative imports.

import {
  apply as applyJsonBackend,
  Config as JsonBackendConfig,
  inject as jsonBackendInject,
  name as jsonBackendName,
} from "@deepseek-ai/dsh-storage-json";
import {
  apply as applyDomainFacility,
  Config as DomainFacilityConfig,
  inject as domainFacilityInject,
  name as domainFacilityName,
} from "@deepseek-ai/dsh-storage-domain";

/** The json backend plugin (unit files under its root) — config
 *  `{ root }` rides the $runtime marker (env-derived, never pinned). */
export const storageJsonBackend = {
  name: jsonBackendName,
  inject: jsonBackendInject,
  Config: JsonBackendConfig,
  apply: applyJsonBackend,
};

/** The domain facility plugin (`ctx.storageDomain` + the
 *  `ctx.storage.domain` projection) — config `{ backend: "json" }`
 *  rides the $runtime marker (routes reserved for a second backend). */
export const storageDomainFacility = {
  name: domainFacilityName,
  inject: domainFacilityInject,
  Config: DomainFacilityConfig,
  apply: applyDomainFacility,
};

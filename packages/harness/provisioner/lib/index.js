// index.ts — @melite/harness-provisioner's import-safe library door.
//
// The package's imperative surface is the bin (bin/infer-provision.mjs:
// renders ready-to-boot profiles into a DSH_HOME) and its Cordis rows
// (cordis.patch.yml, mounted by the host runtime). Neither is
// import-safe — the bin executes its argv switch at load — so the "."
// exports row lands here instead: the package identity, no imports, no
// side effects, importable under plain Node from a bare extract.
export const PROVISIONER_NAME = '@melite/harness-provisioner';
//# sourceMappingURL=index.js.map

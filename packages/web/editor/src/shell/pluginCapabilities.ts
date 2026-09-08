/**
 * pluginCapabilities — the capabilities lane's frontend materializer
 * (2026-08-21). Every packages/<id>/capabilities/client.ts loads at
 * shell boot: those modules register session-scoped agent tools +
 * studio-context loaders into @melite/slots seams. Tiny, pure (seam package
 * + the plugin's own modules only — the boundary gate source-scans them
 * like any plugin file).
 *
 * Boot-time is the point: capabilities are session facts (the plugin is
 * installed), not mount facts. Per-module failures are contained — a
 * broken capability logs one line and never bricks boot (the shell
 * lane's contract, same law as pluginUi).
 */
const modules = import.meta.glob("../../../../../packages/*/capabilities/client.ts")

for (const [path, load] of Object.entries(modules)) {
  load().catch((err) => {
    console.warn(`pluginCapabilities: ${path} failed to load`, err)
  })
}

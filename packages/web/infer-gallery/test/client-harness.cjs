/**
 * Headless harness for the @melite-plugin/dsh-gallery client bundle.
 *
 * 1. Executes lib/client.js exactly as the GUI module loader would:
 *    sandboxed `window.__ModuleLoader__.load({id, factory})`, then calls the
 *    factory with a platform require table (react, react/jsx-runtime).
 * 2. Drives apply() against a mock cordis ctx and asserts the two slot
 *    contributions (sidebar.footer.action + shell.overlay) register with the
 *    right keys/ids and that ctx.slots.inject's wait seam is used.
 * 3. Renders the real RunsView component via react-dom/server over states
 *    produced by the real fetchRuns() pointed at the LIVE proxy (:3084) and
 *    at the dead-gateway proxy (:3085), asserting the rendered HTML carries
 *    run cards (thumbnail URLs, statuses) and the verbatim 502 error body.
 */
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')

const PKG = process.argv[2]
const REACT = require(path.join(PKG, 'node_modules/react'))
const JSX = require(path.join(PKG, 'node_modules/react/jsx-runtime'))
const SERVER = require(path.join(PKG, 'node_modules/react-dom/server'))

// ---- 1. load the bundle through a fake __ModuleLoader__ --------------------
let loaded = null
const window = { __ModuleLoader__: { load(m) { loaded = m } } }
const code = fs.readFileSync(path.join(PKG, 'lib/client.js'), 'utf8')
vm.runInNewContext(code, { window }, { filename: "lib/client.js" })
if (!loaded || loaded.id !== "@melite-plugin/dsh-gallery") throw new Error("bundle did not register under @melite-plugin/dsh-gallery")

let requireLog = []
const table = {
  react: REACT,
  "react/jsx-runtime": JSX,
  "react-dom/client": {},
  "@deepseek-ai/cordis": {},
}
const mod = loaded.factory((spec) => {
  requireLog.push(spec)
  if (!(spec in table)) throw new Error("bundle required non-platform module: " + spec)
  return table[spec]
})
console.log("[1] bundle factory executed; id =", loaded.id)
console.log("[1] requires:", JSON.stringify(requireLog))
console.log("[1] exports:", Object.keys(mod).sort().join(","))
if (typeof mod.apply !== "function" || !Array.isArray(mod.inject)) throw new Error("missing plugin face")
if (!mod.inject.includes("slots")) throw new Error("inject must wait for slots")

// ---- 2. drive apply() against a mock ctx ----------------------------------
const registrations = []
const injectWaits = []
const ctx = {
  effect(fn) { if (typeof fn === "function") fn() },
  slots: {
    inject(key, cb) {
      injectWaits.push(key)
      // SlotRegistry.inject semantics: when the declaration already exists the
      // callback runs synchronously (the shipped ui-layout/ui-sidebar declare
      // both slots). Emulate that here so register() is actually exercised.
      const disposer = cb()
      return () => { if (typeof disposer === "function") disposer() }
    },
    register(options, component) {
      registrations.push({ options, component })
      if (typeof component !== "function") throw new Error("component missing for " + options.name)
      return () => {}
    },
  },
  logger: { info() {}, warn() {} },
}
// First application wins; second must no-op.
mod.apply(ctx)
mod.apply(ctx)
console.log("[2] inject waits:", JSON.stringify(injectWaits.sort()))
console.log("[2] registrations:", JSON.stringify(registrations.map(r => r.options.name + "#" + r.options.id)))
if (JSON.stringify(injectWaits.sort()) !== '["shell.overlay","sidebar.footer.action"]') throw new Error("wrong slot wait set")
if (registrations.length !== 2) throw new Error("apply guard failed: registered twice?")
for (const r of registrations) if (r.options.id !== "melite-gallery") throw new Error("bad registration id")

// ---- 2b. render the REGISTERED components (not re-imported copies) --------
const bySlot = Object.fromEntries(registrations.map(r => [r.options.name, r.component]))
const entryWideHtml = SERVER.renderToStaticMarkup(JSX.jsx(bySlot["sidebar.footer.action"], { wide: true }))
const entryRailHtml = SERVER.renderToStaticMarkup(JSX.jsx(bySlot["sidebar.footer.action"], { wide: false }))
const entryOk = entryWideHtml.includes(">Melite<") && entryWideHtml.includes('data-wide="true"')
const railOk = !entryRailHtml.includes(">Melite<") && !entryRailHtml.includes('data-wide="true"')
console.log("[2b] sidebar entry wide:", entryOk, "rail icon-only:", railOk)
if (!entryOk || !railOk) throw new Error("sidebar entry DOM wrong")

const overlayClosed = SERVER.renderToStaticMarkup(JSX.jsx(bySlot["shell.overlay"], {}))
mod.galleryStore.toggle()
const overlayOpen = SERVER.renderToStaticMarkup(JSX.jsx(bySlot["shell.overlay"], {}))
mod.galleryStore.toggle()
const overlayOk = overlayClosed === "" && overlayOpen.includes('data-dsh-part="gallery-overlay"') && overlayOpen.includes("generation runs")
console.log("[2b] overlay closed renders empty, open renders panel:", overlayOk)
if (!overlayOk) throw new Error("overlay toggle DOM wrong")

// Fire the inject callbacks to exercise the register options for real.

// ---- 3. render the real view over REAL proxy responses ---------------------
async function grab(base) {
  const state = await mod.fetchRuns((url) => fetch(base + url))
  const el = JSX.jsx(mod.RunsView, { state })
  return { state, html: SERVER.renderToStaticMarkup(el) }
}

async function main() {
  // happy path: live gateway behind the :3084 proxy
  const ok = await grab("http://127.0.0.1:3084")
  console.log("[3] happy phase:", ok.state.phase, "runs:", ok.state.phase === "ready" ? ok.state.runs.length : "-")
  const thumbOk = /<img[^>]+class="[^"]*thumbImg[^"]*"[^>]+src="\/melite-gallery\/artifact\?path=/.test(ok.html)
  const cardsOk = (ok.html.match(/data-openable="true"/g) || []).length
  const statusOk = /data-status="(completed|failed|stopped|interrupted)"/.test(ok.html)
  console.log("[3] happy html: cards(openable)=" + cardsOk, "proxiedThumbs=" + thumbOk, "statusPills=" + statusOk)
  if (ok.state.phase !== "ready" || ok.state.runs.length < 10) throw new Error("expected real runs from :3084")
  if (!thumbOk || !statusOk || cardsOk === 0) throw new Error("happy-path DOM incomplete")

  // failure path: dead gateway behind the :3086 proxy (3085 is a foreign process)
  const bad = await grab("http://127.0.0.1:3086")
  console.log("[4] error phase:", bad.state.phase, "status:", bad.state.status)
  console.log("[4] verbatim body:", bad.state.body)
  const errOk = bad.html.includes("Gallery data unavailable (HTTP 502)") && bad.html.includes("gateway_unreachable") && bad.html.includes("http://localhost:33999/v1/flows/runs")
  console.log("[4] error DOM carries HTTP 502 + gateway_unreachable + dead upstream URL:", errOk)
  if (bad.state.phase !== "error" || bad.state.status !== 502) throw new Error("expected 502 error state")
  if (!errOk) throw new Error("error body not surfaced in DOM")

  console.log("HARNESS PASS")
}

main().catch((e) => { console.error("HARNESS FAIL:", e.message); process.exit(1) })

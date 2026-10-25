// client-module-scope-law.spec.ts — THE MODULE-SCOPE SUBSCRIPTION
// LAW (HMR audit 009 F4, 2026-10-24, walled 2026-11-12): a client
// bundle's entry (src/client/index.ts — the file the loader marks as
// the client plugin) must never subscribe at MODULE SCOPE. The
// dsh-client-hmr swap runs `tearDownEntryFiber → removeOwnedStyles →
// import` on every rebuild: a module-scope addEventListener/
// setInterval/setTimeout survives the fiber teardown (the registry
// entry is gone, the handler still fires) and a hot-swapped bundle
// leaks one ghost per rebuild — the exact class the audit's Arm 2
// cleared by inspection and this wall holds by law. A subscription
// that belongs to the plugin's lifetime rides ctx.effect / a fiber
// dispose chain (the registration-is-an-effect convention); one that
// belongs to a call's lifetime rides its own scope (viewer's
// signal-scoped abort listener is the clean shape).
//
// The judge is a brace-depth walk over each entry file with comments
// and string/template literals stripped: a subscription TOKEN at
// depth 0 followed by a call paren is a module-scope subscription.
// There is NO allow-list today — the baseline is clean; if a real
// sink wiring ever needs one, it lands here NAMED, never by deleting
// the arm.
// @contract client-module-scope-law
import { readFileSync } from "node:fs"
import { globSync } from "node:fs"
import { describe, expect, it } from "vitest"

/** Strip block/line comments and string/template literals so the
 * depth walk cannot be fooled by prose or text that merely mentions
 * the tokens. @param src the raw entry source @returns the walkable
 * source with comments/literals blanked */
function walkable(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``")
}

const ENTRIES = [
  ...globSync("packages/*/src/client/index.ts"),
  ...globSync("packages/*/*/src/client/index.ts"),
]

describe("the module-scope subscription law (HMR audit 009 F4)", () => {
  it("every client entry exists — a renamed entry face is a law nobody walks (the census floor)", () => {
    expect(ENTRIES.length, "the client entry census found no entries — the glob broke, the wall is vacuous").toBeGreaterThan(5)
  })

  it("no client entry subscribes at module scope — a hot swap would leak the handler past the fiber teardown", () => {
    expect(ENTRIES.length).toBeGreaterThan(0)
    const offenders: string[] = []
    for (const file of ENTRIES) {
      const src = walkable(readFileSync(file, "utf8"))
      let depth = 0
      let line = 1
      for (let i = 0; i < src.length; i += 1) {
        const c = src[i]
        if (c === "\n") line += 1
        else if (c === "{" || c === "(") depth += 1
        else if (c === "}" || c === ")") depth -= 1
        else if (depth === 0) {
          const m = /^(addEventListener|setInterval|setTimeout)/.exec(src.slice(i))
          if (m !== null) {
            let k = i + m[1].length
            while (k < src.length && (src[k] === " " || src[k] === "\t")) k += 1
            if (src[k] === "(") offenders.push(`${file}:${String(line)} — ${m[1]} at module scope rides no fiber; move it into ctx.effect or a call scope`)
            i += m[1].length - 1
          }
        }
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([])
  })
})

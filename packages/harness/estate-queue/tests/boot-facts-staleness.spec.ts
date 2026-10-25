/**
 * boot-facts-staleness — THE F2 WALL (HMR audit 009, 2026-10-24:
 * "Facts + card-def caches are process-global with no mtime guard …
 * A DECL or facts edit on a live host is invisible with zero
 * signal — the operator cannot distinguish 'edit not served' from
 * 'edit wrong'").
 *
 * The audit's own wall prescription, verbatim: "a test that edits a
 * fixture facts file and asserts the staleness report flips —
 * firing red while a stale cache serves." This is that test, riding
 * the REAL doors:
 *   - CardRegistryService.factsStaleness() over the REAL facts
 *     file (mtime moved past the prime — the content never changes,
 *     git stays clean);
 *   - cardDefsStaleness() over a real model family's BUILT lib;
 *   - bootFactsArm(registry) — the /v1/boot-facts door's own arm,
 *     including the unmounted-registry visibility voice.
 *
 * RED MEANS: the staleness signal lies — a stale cache serving
 * while the report says fresh (or the report crashing instead of
 * answering) is exactly the zero-signal class the audit named.
 */
import { describe, expect, it } from "vitest"
import { utimesSync, statSync, readdirSync } from "node:fs"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { cardDefsStaleness, resetCardDefsForTests } from "@melite/comfyui-cordis"
import { bootFactsArm } from "@melite/harness-tools"
import { factsPath } from "../src/cardsFacts.ts"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")

/** Touch a file's mtime FORWARD without touching content: the
 * edit-on-disk signal, hermetic (the original mtime restores in
 * the arm's finally). */
async function withTouchedMtime(path: string, run: () => Promise<void> | void): Promise<void> {
  const before = statSync(path).mtime
  // THE TOUCH LANDS IN THE FUTURE of any prime (an old file's own
  // birth + 5s can still sit BEFORE the prime — the flip never fires)
  const next = new Date(Date.now() + 5_000)
  utimesSync(path, next, next)
  try {
    await run()
  } finally {
    utimesSync(path, before, before)
  }
}

describe("the facts cache's staleness signal (F2: the report flips when the truth moves)", () => {
  it("a primed registry reports fresh, and the report flips STALE the moment the facts file's truth moves past the prime", async () => {
    const { CardRegistryService } = await import("../src/cardsRegistry.ts")
    const { Context } = await import("@deepseek-ai/cordis")
    const ctx = new Context() as never
    const svc = new CardRegistryService(ctx)
    await svc.prime()
    // PRIMED: the facts load is LAZY — modelFacts() answering is
    // what starts the clock (prime alone does not touch facts)
    expect(Object.keys(svc.modelFacts()).length, "the facts rows answered").toBeGreaterThan(0)
    const fresh = svc.factsStaleness()
    expect(fresh.primed_at, "the prime time answers (never null after modelFacts served)").not.toBeNull()
    expect(fresh.source, "the source names the real facts file").toBe(factsPath())
    expect(fresh.stale, "fresh at prime: the file has not moved").toBe(false)
    // THE FLIP: the truth on disk moves past the prime — the same
    // cache serves on, and the report is the ONLY signal
    await withTouchedMtime(factsPath(), () => {
      const stale = svc.factsStaleness()
      expect(stale.stale, "the report flips STALE while the cache still serves the old rows").toBe(true)
      expect(stale.source_mtime, "the moved mtime is the named witness").not.toBe(fresh.source_mtime)
    })
    // restored: the verdict returns (the signal is live, not latched)
    expect(svc.factsStaleness().stale, "the verdict returns to fresh once the mtime restores").toBe(false)
  }, 120_000)

  it("an unprimed registry reports primed_at null and stale false — the report is visibility, never a crash", async () => {
    const { CardRegistryService } = await import("../src/cardsRegistry.ts")
    const { Context } = await import("@deepseek-ai/cordis")
    const fresh = new CardRegistryService(new Context() as never)
    const report = fresh.factsStaleness()
    expect(report.primed_at).toBeNull()
    expect(report.stale).toBe(false)
  })
})

describe("the card-defs cache's staleness signal", () => {
  it("a primed cell names its prime time and its source; a family lib moving past the prime flips it STALE", async () => {
    resetCardDefsForTests()
    const { loadCardDefs } = await import("@melite/comfyui-cordis")
    await loadCardDefs()
    // probe: what root does THIS copy resolve?
    const fresh = cardDefsStaleness()
    expect(fresh.primed_at, "the defs prime time answers").not.toBeNull()
    expect(fresh.source_mtime, "the models-lib walk found a newest mtime").not.toBeNull()
    expect(fresh.stale).toBe(false)
    // THE FLIP on the defs side: one family's BUILT lib moves
    const families = readdirSync(join(ROOT, "packages/models"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
    expect(families.length, "the models tree carries families").toBeGreaterThan(0)
    // the first family's newest lib file is the touch target
    const famLib = join(ROOT, "packages/models", families[0]!.name, "lib")
    const someLibFile = readdirSync(famLib).find((f) => f.endsWith(".js"))
    expect(someLibFile, "the family lib carries built files").toBeDefined()
    await withTouchedMtime(join(famLib, someLibFile!), () => {
      expect(cardDefsStaleness().stale, "a built lib moving past the prime flips the defs report STALE").toBe(true)
    })
    expect(cardDefsStaleness().stale, "the defs verdict returns once the mtime restores").toBe(false)
  }, 120_000)
})

describe("the /v1/boot-facts arm (the door's own shape)", () => {
  it("carries both halves; a fiber without the registry provider names it — never a silent empty", () => {
    const report = bootFactsArm(undefined) as { card_defs: { primed_at: string | null }, model_facts: { primed_at: string | null, error?: string } }
    expect(report.card_defs, "the defs half always answers").toBeDefined()
    expect(report.model_facts.primed_at, "the unmounted half reports unprimed").toBeNull()
    expect(report.model_facts.error, "the unmounted voice NAMES the missing provider").toMatch(/estate-card-registry provider is not mounted/)
    const withRegistry = bootFactsArm({
      factsStaleness: () => ({ primed_at: "2026-10-24T00:00:00.000Z", source: "facts", source_mtime: "2026-10-24T00:00:01.000Z", stale: true }),
    }) as { model_facts: { stale: boolean } }
    expect(withRegistry.model_facts.stale, "the registry's own verdict rides through the arm verbatim").toBe(true)
  })
})

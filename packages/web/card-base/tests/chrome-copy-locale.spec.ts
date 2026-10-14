/**
 * chrome-copy-locale.spec.tsx — THE shared-chrome dictionary's
 * consumption face (the copy-census campaign's v8 seat, 2026-11-05).
 *
 * WHY THIS SPEC EXISTS: every PRESENTATION consumer of
 * src/locales/chromeCopy.ts (atoms.tsx, form.tsx, rows.tsx, …) is
 * exercised by DEPENDENT packages through card-base's BUILT client
 * bundle — the source file itself never executes under the root
 * pool, so v8 measures it 0% while the copy is in fact served. The
 * estate-side census wall judges consumption by AST; this spec makes
 * v8 the second judge by importing and resolving the dictionary at
 * its source seat — the same shape h3's studio-copy spec holds for
 * studioCopy.ts.
 *
 * THE LAW (mirrors square-copy-locale.spec.tsx, one law per face):
 * the dictionary is the ONLY owner of chrome copy; every entry is a
 * non-empty string or a template returning a non-empty string for
 * its declared params; a template resolved without params renders
 * its holes EMPTY (never the string "undefined" in the UI).
 */
import { describe, expect, it } from "vitest";
import { allChromeCopy, chromeCopy, chromeT, type ChromeCopyKey } from "../src/locales/chromeCopy.ts";

/** A param bag answering every property read with the key's own
 *  name — template entries destructure known keys, so one bag shape
 *  exercises every template without this spec hand-mirroring the
 *  dictionaries' param vocabularies (the wall stays DRY when keys
 *  land). */
function keyedParamBag(): Record<string, string> {
  return new Proxy({}, { get: (_t, k) => String(k) }) as Record<string, string>
}

describe("THE SHARED-CHROME COPY DICTIONARY (locale-owned, served non-empty)", () => {
  it("every entry is a non-empty string or a template that resolves non-empty for its params", () => {
    for (const [key, entry] of Object.entries(chromeCopy)) {
      if (typeof entry === "string") {
        expect(entry.length, `${key} is a non-empty string`).toBeGreaterThan(0)
      } else {
        const resolved = chromeT(key as ChromeCopyKey, keyedParamBag())
        expect(resolved.length, `${key} resolves non-empty`).toBeGreaterThan(0)
        expect(resolved, `${key} never leaks the string "undefined"`).not.toContain("undefined")
      }
    }
  })

  it("plain entries resolve verbatim; templates without params render their holes EMPTY (never \"undefined\")", () => {
    expect(chromeT("modelLabel")).toBe("Model")
    // stackAddCell's declared param is { label } — absent renders the
    // hole empty, the seat's own pinned law (chromeCopy.ts's resolver).
    expect(chromeT("stackAddCell")).toBe("Add ")
    expect(chromeT("stackAddCell", { label: "LoRA" })).toBe("Add LoRA")
  })

  it("allChromeCopy enumerates the whole dictionary — one non-empty pair per key, dead keys impossible to miss", () => {
    const pairs = allChromeCopy(keyedParamBag())
    expect(pairs.length).toBe(Object.keys(chromeCopy).length)
    for (const [key, text] of pairs) {
      expect(typeof text, `${key} enumerates as a string`).toBe("string")
      expect(String(text).length, `${key} enumerates non-empty`).toBeGreaterThan(0)
    }
  })
})

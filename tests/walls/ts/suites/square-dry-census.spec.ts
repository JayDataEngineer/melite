/**
 * square-dry-census.spec.ts — THE input-selection construction law
 * (the operator's DSH conformance order, 2026-10-27: "full dsh doc
 * conformance and dry treatment… the input selection squares across
 * all the cards").
 *
 * square.tsx's own founding law: "a card package EMITS an image
 * input → the base constructs THIS square automatically. One input
 * component; no card hand-rolls its own file field ever again."
 * This wall pins the census side of that law across the whole
 * product tree — the law's render side is pinned by the package
 * specs (square/wire-picker/form-provider).
 *
 * Census axes:
 * 1. FILE INPUTS: exactly two product `type: 'file'` inputs exist —
 *    square.tsx's (the square's own OS dialog) and
 *    square-provider.tsx's (the From-file re-targeting input). A
 *    third anywhere is a hand-rolled field.
 * 2. THE READ PATH: `readAsDataURL` is DEFINED once (web-kit
 *    formats) and consumed via imports; a FileReader outside that
 *    one module is a second read path.
 * 3. THE SQUARE ITSELF: `InputSquare` is defined once; every
 *    product consumer imports it from @melite/card-base/client.
 * 4. THE PICKER TRIO imports the locale seat — no card-side copy of
 *    the dictionary (the locale wall pins the trio's internals;
 *    this census pins that no OTHER module grew a square dictionary).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = join(import.meta.dirname, '..', '..', '..', '..')
const PKG = join(ROOT, 'packages')

interface SrcFile { path: string; rel: string; text: string }

/** Product source files: every package's src tree, excluding
 *  built lib/, vendored engine mods, and tests. */
function productSources(): SrcFile[] {
  const out: SrcFile[] = []
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      const st = statSync(full)
      if (st.isDirectory()) {
        if (name === 'lib' || name === 'node_modules' || name === 'mods' || name === 'dist') continue
        walk(full)
        continue
      }
      if (!/\.(ts|tsx)$/.test(name) || /\.spec\./.test(name) || /\.d\.ts$/.test(name)) continue
      const rel = full.slice(PKG.length + 1)
      out.push({ path: full, rel, text: readFileSync(full, 'utf8') })
    }
  }
  const collect = (full: string): void => {
    const src = join(full, 'src')
    if (statSync(src, { throwIfNoEntry: false })?.isDirectory()) { walk(src); return }
    // a GENRE dir (web, video, motion, …) nests its packages one level down
    for (const sub of readdirSync(full)) {
      const subFull = join(full, sub)
      if (statSync(subFull, { throwIfNoEntry: false })?.isDirectory()) collect(subFull)
    }
  }
  for (const name of readdirSync(PKG)) {
    const full = join(PKG, name)
    if (statSync(full, { throwIfNoEntry: false })?.isDirectory()) collect(full)
  }
  return out
}

const SRC = productSources()

describe('input-selection dry census (the construction law)', () => {
  it("the DOM file-input census: the square's two seats + the ONE named upload-form door — nothing else", () => {
    // The DOM seat only: an <input type="file"> element being
    // CONSTRUCTED (createElement or JSX). Declarative descriptors
    // (wtype: 'file', field rows with type: "file") are the
    // construction law's own triggers — they demand the square,
    // they are not hand-rolled seats.
    //
    // The enumerated third kind is the civit upload door
    // (lora-section): a FORM UPLOAD (bytes → the uploads rail with
    // progress), not a slot-shaped param pick — a different seat by
    // design, commented at its site. A FOURTH site anywhere is a
    // hand-rolled duplicate: it must adopt the square (slot-shaped)
    // or be added to this census with its kind, deliberately.
    const domInput = (text: string): number =>
      (text.match(/h\('input',\s*\{[\s\S]{0,400}?type:\s*'file'/g) ?? []).length
      + (text.match(/<input[^>]{0,200}type="file"/g) ?? []).length
      + (text.match(/<input[^>]{0,200}type='file'/g) ?? []).length
    const hits = SRC.flatMap((f) => Array.from({ length: domInput(f.text) }, () => f.rel))
    expect(hits.sort()).toEqual([
      'web/card-base/src/square-provider.tsx',
      'web/card-base/src/square.tsx',
      'web/melite-card-deck/src/client/lora-section.tsx',
    ])
  })

  it('the ONE read path: readAsDataURL is defined once (web-kit formats); no FileReader lives outside it', () => {
    const defs = SRC.filter((f) => /export function readAsDataURL/.test(f.text)).map((f) => f.rel)
    expect(defs).toEqual(['web-kit/formats/src/readFile.ts'])
    const readers = SRC.filter((f) => /new FileReader\(/.test(f.text) && f.rel !== 'web-kit/formats/src/readFile.ts').map((f) => f.rel)
    expect(readers, 'a second read path exists').toEqual([])
  })

  it('InputSquare is defined once; every product consumer imports it from @melite/card-base/client', () => {
    const defs = SRC.filter((f) => /export function InputSquare|export const InputSquare/.test(f.text)).map((f) => f.rel)
    expect(defs).toEqual(['web/card-base/src/square.tsx'])
    const stripComments = (text: string): string =>
      text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    // card-base's own internals import the source directly — the
    // barrel law binds consumers OUTSIDE card-base.
    const consumers = SRC.filter((f) => !f.rel.startsWith('web/card-base/') && /InputSquare/.test(stripComments(f.text)))
    for (const c of consumers) {
      expect(c.text.includes('@melite/card-base/client'),
        `${c.rel} references InputSquare without importing from @melite/card-base/client — a hand-rolled seat`).toBe(true)
    }
  })

  it('the locale seat is owned once — no second square copy dictionary', () => {
    const dicts = SRC.filter((f) => /squareCopy/.test(f.text) && !/\.spec\./.test(f.rel) && !f.rel.includes('locales/')).map((f) => f.rel)
    // the trio consumes t() — only the locale module owns the dictionary object
    const owners = SRC.filter((f) => /export const squareCopy/.test(f.text)).map((f) => f.rel)
    expect(owners).toEqual(['web/card-base/src/locales/square.ts'])
    expect(dicts.filter((r) => /export const squareCopy/.test(readFileSync(join(PKG, r), 'utf8'))), 'a second dictionary definition').toEqual([])
  })
})

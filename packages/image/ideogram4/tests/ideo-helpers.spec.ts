// @vitest-environment happy-dom
/**
 * ideoHelpers.ts — the ideogram4 editor's pure core (grid math, hex
 * hygiene, the wire JSON shape, the caption bridge, PNG re-inflation).
 * No DOM, no fakes beyond crafted PNG bytes: every arm pinned by
 * return value.
 */
import { type Dispatch, type SetStateAction } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { deflateSync } from 'node:zlib'
import {
  applyCaptionToEditor,
  assembleCaption,
  bboxToRect,
  clamp,
  clampBbox,
  extractIdeogramCaptionFromPNG,
  fileToDataUrl,
  flattenCaption,
  genId,
  isValidElementsArray,
  normalizeHex,
  parseElementsJSON,
  rectToBbox,
  sanitizeHexList,
  serializeElements,
  snap,
} from '../src/ui/studio/ideoHelpers.ts'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('grid math', () => {
  test('clamp pins both rails', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(30, 0, 10)).toBe(10)
  })

  test('clampBbox swaps inverted axes, rounds, and pins to the grid', () => {
    // inverted + out of range + fractional, all at once
    expect(clampBbox([900.6, 800.4, 100.2, -50])).toEqual([100, 0, 901, 800])
    expect(clampBbox([10, 20, 30, 40])).toEqual([10, 20, 30, 40])
  })

  test('bboxToRect floors negative sizes at zero; rectToBbox inverts', () => {
    expect(bboxToRect([100, 200, 400, 600])).toEqual({ x: 200, y: 100, w: 400, h: 300 })
    expect(bboxToRect([300, 300, 100, 100])).toEqual({ x: 300, y: 300, w: 0, h: 0 })
    expect(rectToBbox(200, 100, 400, 300)).toEqual([100, 200, 400, 600])
  })

  test('snap passes through when disabled and normalizes -0 when enabled', () => {
    expect(snap(37, false)).toBe(37)
    expect(snap(37, true)).toBe(25)
    expect(snap(38, true)).toBe(50)
    expect(Object.is(snap(-0.1, true), 0)).toBe(true)
  })

  test('genId prefixes and never repeats', () => {
    const a = genId()
    const b = genId()
    expect(a.startsWith('el_')).toBe(true)
    expect(genId('imp0').startsWith('imp0_')).toBe(true)
    expect(new Set([a, b, genId()]).size).toBe(3)
  })
})

describe('hex hygiene', () => {
  test('normalizeHex seats #, expands #RGB, upcases, refuses garbage', () => {
    expect(normalizeHex('ff0000')).toBe('#FF0000')
    expect(normalizeHex('#abc')).toBe('#AABBCC')
    expect(normalizeHex('  #AABBCC  ')).toBe('#AABBCC')
    expect(normalizeHex('')).toBeNull()
    expect(normalizeHex('   ')).toBeNull()
    expect(normalizeHex('#zzzzzz')).toBeNull()
    expect(normalizeHex('#abcd')).toBeNull()
    expect(normalizeHex('#abcde')).toBeNull()
  })

  test('sanitizeHexList splits on commas/spaces and drops the invalid', () => {
    expect(sanitizeHexList('#ff0000, bogus #00ff00')).toEqual(['#FF0000', '#00FF00'])
    expect(sanitizeHexList('')).toEqual([])
  })
})

describe('the wire JSON shape', () => {
  test('isValidElementsArray admits the three types, refuses everything else', () => {
    expect(isValidElementsArray('nope')).toBe(false)
    expect(isValidElementsArray([null])).toBe(false)
    expect(isValidElementsArray([{ type: 'weird', desc: 'x' }])).toBe(false)
    expect(isValidElementsArray([{ type: 'obj' }])).toBe(false)
    expect(isValidElementsArray([{ type: 'obj', desc: 'x', bbox: 'wide' }])).toBe(false)
    expect(isValidElementsArray([{ type: 'obj', description: 'legacy key' }])).toBe(true)
    expect(isValidElementsArray([{ type: 'text', desc: 'x' }])).toBe(true)
  })

  test('parseElementsJSON: empty in, empty out; garbage in, null out', () => {
    expect(parseElementsJSON('')).toEqual([])
    expect(parseElementsJSON('   ')).toEqual([])
    expect(parseElementsJSON('not json')).toBeNull()
    expect(parseElementsJSON('[1]')).toBeNull()
  })

  test('parseElementsJSON fills defaults, clamps the array bbox', () => {
    const els = parseElementsJSON(JSON.stringify([
      { type: 'obj', desc: 'mug', bbox: [100.6, -20, 400, 1200] },
    ]))!
    expect(els.length).toBe(1)
    expect(els[0]!.bbox).toEqual([101, 0, 400, 1000])
    expect(els[0]!.color_palette).toEqual([])
    expect(els[0]!.text).toBeUndefined()
    expect(els[0]!.id.startsWith('imp0_')).toBe(true)
  })

  test('parseElementsJSON reads the normalized x/y/w/h form and the default box', () => {
    const els = parseElementsJSON(JSON.stringify([
      { type: 'logo', desc: 'mark', x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      { type: 'obj', desc: 'plain' },
      { type: 'obj', desc: 'short', bbox: [1, 2, 3] },
    ]))!
    expect(els[0]!.bbox).toEqual([200, 100, 600, 400])
    expect(els[0]!.type).toBe('logo')
    expect(els[1]!.bbox).toEqual([200, 200, 500, 500])
    expect(els[2]!.bbox).toEqual([200, 200, 500, 500])
  })

  test('parseElementsJSON maps palettes (both keys), text, and font', () => {
    const els = parseElementsJSON(JSON.stringify([
      { type: 'text', desc: 123, description: 'legacy desc', text: 'HELLO', font: 'bold', color_palette: ['#ff0000', 'bogus'] },
      { type: 'logo', description: 'mark', palette: ['#00ff00'], font: '' },
      { type: 'text', desc: 'quiet', text: 7 },
      { type: 'obj', description: 'box', font: 'ignored', color_palette: 'red' },
    ]))!
    expect(els[0]!.desc).toBe('123')
    expect(els[0]!.text).toBe('HELLO')
    expect(els[0]!.font).toBe('bold')
    expect(els[0]!.color_palette).toEqual(['#FF0000'])
    expect(els[1]!.color_palette).toEqual(['#00FF00'])
    expect(els[1]!.font).toBeUndefined()
    expect(els[1]!.text).toBe('')
    expect(els[2]!.text).toBe('7')
    expect(els[3]!.text).toBeUndefined()
    expect(els[3]!.font).toBeUndefined()
    expect(els[3]!.color_palette).toEqual([])
  })

  test('serializeElements round-trips the text/font/palette arms', () => {
    const wire = serializeElements([
      { id: 'a', type: 'obj', desc: 'mug', bbox: [1, 2, 3, 4], color_palette: [] },
      { id: 'b', type: 'text', desc: 'sign', text: 'OPEN', font: 'bold', bbox: [1, 2, 3, 4], color_palette: ['#FF0000'] },
      { id: 'c', type: 'logo', desc: 'mark', bbox: [1, 2, 3, 4], color_palette: [] },
    ])
    const back = JSON.parse(wire)
    expect(back[0]).toEqual({ type: 'obj', bbox: [1, 2, 3, 4], desc: 'mug' })
    expect(back[1].text).toBe('OPEN')
    expect(back[1].font).toBe('bold')
    expect(back[1].color_palette).toEqual(['#FF0000'])
    expect(back[2].font).toBeUndefined()
    // and the parse side re-inflates what serialize wrote
    expect(parseElementsJSON(wire)!.length).toBe(3)
  })
})

describe('the caption bridge', () => {
  test('flattenCaption degrades every foreign shape to the blank flat', () => {
    for (const raw of [null, '', 'not json', 42]) {
      const flat = flattenCaption(raw, 1024, 768)
      expect(flat.high_level_description).toBe('')
      expect(flat.style_type).toBe('none')
      expect(flat.background).toBe('')
      expect(flat.elements).toBe('[]')
      expect(flat.width).toBe(1024)
      expect(flat.height).toBe(768)
    }
  })

  test('flattenCaption unpacks photo vs art_style vs a bare palette', () => {
    // objects ride through verbatim (the slot seats flat values back in)
    const obj = flattenCaption({
      high_level_description: 'still life',
      style_description: { photo: 'portra', color_palette: ['#FF0000'] },
      compositional_deconstruction: { background: 'desk', elements: [{ type: 'obj' }] },
    }, 100, 200)
    expect(obj.style_type).toBe('photo')
    expect(obj.style_palette).toBe('#FF0000')
    expect(obj.width).toBe(100)
    const photo = flattenCaption(JSON.stringify({
      high_level_description: 'still life',
      style_description: { aesthetics: 'clean', photo: 'portra', color_palette: ['#FF0000'] },
      compositional_deconstruction: { background: 'desk', elements: [{ type: 'obj' }] },
    }), 100, 200)
    expect(photo.style_type).toBe('photo')
    expect(photo.style_value).toBe('portra')
    expect(photo.style_palette).toBe('#FF0000')
    expect(photo.background).toBe('desk')
    expect(JSON.parse(photo.elements as string).length).toBe(1)

    const art = flattenCaption(JSON.stringify({
      style_description: { art_style: 'baroque', color_palette: 'not-a-list' },
      compositional_deconstruction: {},
    }), 1, 2)
    expect(art.style_type).toBe('art_style')
    expect(art.style_value).toBe('baroque')
    expect(art.style_palette).toBe('')
    expect(art.background).toBe('')
  })

  test('assembleCaption emits the placeholder background and skips empty style', () => {
    expect(assembleCaption({})).toEqual({
      compositional_deconstruction: { background: '(describe the scene background)', elements: [] },
    })
  })

  test('assembleCaption packs photo and art_style (palette scrubbed)', () => {
    const photo = assembleCaption({
      high_level_description: '  still life ',
      style_type: 'photo',
      aesthetics: 'clean',
      lighting: 'softbox glow',
      medium: '35mm',
      style_value: 'portra',
      style_palette: '#ff0000, bogus',
      background: 'desk',
      elements: JSON.stringify([{ type: 'obj', desc: 'mug' }]),
    })
    expect(photo.high_level_description).toBe('still life')
    expect(photo.style_description).toEqual({
      aesthetics: 'clean', lighting: 'softbox glow', medium: '35mm',
      photo: 'portra', color_palette: ['#FF0000'],
    })
    expect(photo.compositional_deconstruction.background).toBe('desk')

    const art = assembleCaption({ style_type: 'art_style', style_value: 'baroque', background: '', elements: 'garbage' })
    expect(art.style_description).toEqual({ art_style: 'baroque' })
    expect(art.compositional_deconstruction).toEqual({ background: '(describe the scene background)', elements: [] })

    // a style block with no seated keys stays off the wire
    const bare = assembleCaption({ style_type: 'photo', background: 'b', elements: '{"a":1}' })
    expect(bare.style_description).toBeUndefined()
    expect(bare.compositional_deconstruction.elements).toEqual([])
  })

  test('applyCaptionToEditor unpacks elements + flat fields (both style arms)', () => {
    const commits: unknown[] = []
    let state: Record<string, unknown> = {}
    const setValues: Dispatch<SetStateAction<Record<string, unknown>>> = (action) => {
      state = typeof action === 'function'
        ? (action as (prev: Record<string, unknown>) => Record<string, unknown>)(state)
        : action
    }
    applyCaptionToEditor({
      high_level_description: 'still life',
      style_description: {
        aesthetics: 'clean', lighting: 'soft', medium: 'film',
        photo: 'portra', color_palette: ['#fff', 42],
      },
      compositional_deconstruction: {
        background: 'desk',
        elements: [{ type: 'obj', desc: 'mug', bbox: [1, 2, 3, 4] }],
      },
    }, (u) => { commits.push(u([])) }, setValues)
    expect(commits.length).toBe(1)
    expect(state.high_level_description).toBe('still life')
    expect(state.background).toBe('desk')
    expect(state.style_type).toBe('photo')
    expect(state.style_value).toBe('portra')
    expect(state.style_palette).toBe('#fff')
    expect(state.aesthetics).toBe('clean')

    // the art arm + the no-commit arms (empty/invalid element lists)
    const commits2: unknown[] = []
    applyCaptionToEditor({
      style_description: { art_style: 'baroque' },
      compositional_deconstruction: { elements: [] },
    }, (u) => { commits2.push(u([])) }, setValues)
    expect(commits2.length).toBe(0)
    expect(state.style_type).toBe('art_style')
    applyCaptionToEditor({ compositional_deconstruction: { elements: 'nope' } }, (u) => {
      commits2.push(u([]))
    }, setValues)
    expect(commits2.length).toBe(0)
  })

  test('applyCaptionToEditor ignores non-string fields and a missing style block', () => {
    let state: Record<string, unknown> = { high_level_description: 'keep' }
    const setValues: Dispatch<SetStateAction<Record<string, unknown>>> = (action) => {
      state = typeof action === 'function'
        ? (action as (prev: Record<string, unknown>) => Record<string, unknown>)(state)
        : action
    }
    applyCaptionToEditor({
      high_level_description: 42,
      style_description: 'flat',
      compositional_deconstruction: {},
    }, () => {}, setValues)
    expect(state.high_level_description).toBe('keep')
    expect(state.style_type).toBeUndefined()
    applyCaptionToEditor({}, () => {}, setValues)
    expect(state.high_level_description).toBe('keep')
    // a style block with neither photo nor art seats no style at all
    applyCaptionToEditor({ style_description: { aesthetics: 'clean' } }, () => {}, setValues)
    expect(state.style_type).toBeUndefined()
    expect(state.aesthetics).toBe('clean')
  })

  test('fileToDataUrl reads the shared read path', async () => {
    const url = await fileToDataUrl(new File(['hi'], 'a.txt', { type: 'text/plain' }))
    expect(url.startsWith('data:')).toBe(true)
  })
})

describe('PNG re-inflation', () => {
  const SIG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  function chunk(type: string, data: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + data.length)
    new DataView(out.buffer).setUint32(0, data.length)
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i)
    out.set(data, 8)
    return out // CRC left zeroed — the parser never checks it
  }
  function png(chunks: Uint8Array[]): File {
    const buf = new Uint8Array(SIG.length + chunks.reduce((a, c) => a + c.length, 0))
    buf.set(SIG, 0)
    let o = SIG.length
    for (const c of chunks) { buf.set(c, o); o += c.length }
    return new File([buf], 'gen.png', { type: 'image/png' })
  }
  function textChunk(keyword: string, value: string): Uint8Array {
    const enc = new TextEncoder()
    const kw = enc.encode(keyword)
    const val = enc.encode(value)
    const data = new Uint8Array(kw.length + 1 + val.length)
    data.set(kw, 0)
    data[kw.length] = 0
    data.set(val, kw.length + 1)
    return chunk('tEXt', data)
  }
  const CAPTION = JSON.stringify({
    compositional_deconstruction: {
      background: 'desk',
      elements: [{ type: 'obj', desc: 'mug', bbox: [100, 200, 400, 600] }],
    },
  })

  test('a stub file is refused (never a crash)', async () => {
    expect(await extractIdeogramCaptionFromPNG(new File([], 'e.png', { type: 'image/png' }))).toBeNull()
    expect(await extractIdeogramCaptionFromPNG(new File(['1234567'], 's.png', { type: 'image/png' }))).toBeNull()
  })

  test('a non-PNG payload is refused', async () => {
    expect(await extractIdeogramCaptionFromPNG(new File(['not a png at all....'], 't.png', { type: 'image/png' }))).toBeNull()
  })

  test('the prompt chunk inflates the layout directly', async () => {
    const els = (await extractIdeogramCaptionFromPNG(png([
      textChunk('prompt', CAPTION),
      chunk('IEND', new Uint8Array(0)),
    ])))!
    expect(els.length).toBe(1)
    expect(els[0]!.desc).toBe('mug')
  })

  test('chunks without a keyword separator are skipped, unknown keys fall through to null', async () => {
    // nul at 0 (empty keyword) → skipped; a non-JSON prompt → no match
    const els = await extractIdeogramCaptionFromPNG(png([
      textChunk('', 'keyless'),
      textChunk('prompt', 'just words, no json'),
      chunk('IEND', new Uint8Array(0)),
    ]))
    expect(els).toBeNull()
  })

  test('a truncated chunk stops the walk (never a crash)', async () => {
    const full = textChunk('prompt', CAPTION)
    // declare a far longer chunk than the buffer holds
    new DataView(full.buffer).setUint32(0, 500)
    expect(await extractIdeogramCaptionFromPNG(png([full]))).toBeNull()
  })

  test('a keyless zTXt chunk and an unknown chunk type walk past silent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await extractIdeogramCaptionFromPNG(png([
      chunk('zTXt', new Uint8Array([65, 1, 2, 3])),
      chunk('iCCP', new Uint8Array([1, 2, 3, 4])),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
    expect(warn).not.toHaveBeenCalled()
  })

  test('an almost-JSON prompt falls through to the blob hunt (then null)', async () => {
    expect(await extractIdeogramCaptionFromPNG(png([
      textChunk('prompt', '{oops'),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })

  test('declared elements that fail validation keep looking (then null)', async () => {
    expect(await extractIdeogramCaptionFromPNG(png([
      textChunk('prompt', JSON.stringify({ compositional_deconstruction: { elements: [1] } })),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })

  test('an embedded blob without usable elements keeps looking (then null)', async () => {
    expect(await extractIdeogramCaptionFromPNG(png([
      textChunk('parameters', 'note {"compositional_deconstruction": 7}'),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })

  test('an embedded blob that is not JSON gives up silent', async () => {
    expect(await extractIdeogramCaptionFromPNG(png([
      textChunk('parameters', 'note {"a": "compositional_deconstruction": }'),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })

  test('a JSON prompt without elements keeps looking (then null)', async () => {
    expect(await extractIdeogramCaptionFromPNG(png([
      textChunk('prompt', '{"foo":1}'),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })

  test('A1111 parameters style: the embedded caption blob is pulled out', async () => {
    const block = `a still life\nNegative prompt: ugly\nSteps: 20\n${CAPTION}`
    const els = (await extractIdeogramCaptionFromPNG(png([
      textChunk('parameters', block),
      chunk('IEND', new Uint8Array(0)),
    ])))!
    expect(els.length).toBe(1)
    expect(els[0]!.desc).toBe('mug')
  })

  test('the zTXt arm inflates deflated metadata', async () => {
    const enc = new TextEncoder()
    const kw = enc.encode('prompt')
    const comp = deflateSync(Buffer.from(CAPTION, 'utf-8'))
    const data = new Uint8Array(kw.length + 2 + comp.length)
    data.set(kw, 0)
    data[kw.length] = 0
    data[kw.length + 1] = 0 // compression method: deflate
    data.set(comp, kw.length + 2)
    const els = (await extractIdeogramCaptionFromPNG(png([
      chunk('zTXt', data),
      chunk('IEND', new Uint8Array(0)),
    ])))!
    expect(els.length).toBe(1)
    expect(els[0]!.desc).toBe('mug')
  })

  test('a corrupt zTXt chunk warns and keeps walking (best-effort)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const enc = new TextEncoder()
    const kw = enc.encode('prompt')
    const data = new Uint8Array([...kw, 0, 0, 1, 2, 3])
    const els = await extractIdeogramCaptionFromPNG(png([
      chunk('zTXt', data),
      chunk('IEND', new Uint8Array(0)),
    ]))
    expect(els).toBeNull()
    expect(warn).toHaveBeenCalled()
  })

  test('without DecompressionStream the zTXt arm skips silent', async () => {
    vi.stubGlobal('DecompressionStream', undefined)
    const enc = new TextEncoder()
    const kw = enc.encode('prompt')
    const comp = deflateSync(Buffer.from(CAPTION, 'utf-8'))
    const data = new Uint8Array(kw.length + 2 + comp.length)
    data.set(kw, 0)
    data[kw.length] = 0
    data[kw.length + 1] = 0
    data.set(comp, kw.length + 2)
    expect(await extractIdeogramCaptionFromPNG(png([
      chunk('zTXt', data),
      chunk('IEND', new Uint8Array(0)),
    ]))).toBeNull()
  })
})

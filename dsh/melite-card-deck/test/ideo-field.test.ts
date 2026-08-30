/**
 * Unit tests for the deck ideogram_canvas field helpers — ported from
 * web/editor/src/__tests__/ideogram-canvas-editor.test.ts (the advanced
 * mode behavior pins) + NEW pins for flattenCaption/assembleCaption (the
 * Slots.tsx bridge this import resurrects). The wire format is the contract:
 * generate_ideogram rejects an empty prompt and the graph template crosses
 * prompt as resolve:json — these tests lock the bytes that reach it.
 */
import { describe, expect, it } from 'bun:test'
import { __test } from '../src/client/ideoField.ts'
import type { IdeoElement } from '../src/client/ideoField.ts'

const {
  GRID_SIZE, SNAP_UNITS, MIN_BOX,
  clampBbox, bboxToRect, rectToBbox, snap,
  normalizeHex, sanitizeHexList,
  isValidElementsArray, parseElementsJSON, serializeElements,
  flattenCaption, assembleCaption,
} = __test
describe("normalizeHex", () => {
  it("normalizes a 6-digit hex with leading #", () => {
    expect(normalizeHex("#FF8800")).toBe("#FF8800")
  })
  it("uppercases lowercase hex", () => {
    expect(normalizeHex("#ff8800")).toBe("#FF8800")
  })
  it("adds the missing # prefix", () => {
    expect(normalizeHex("ff8800")).toBe("#FF8800")
  })
  it("expands 3-digit shorthand", () => {
    expect(normalizeHex("#F80")).toBe("#FF8800")
    expect(normalizeHex("F80")).toBe("#FF8800")
  })
  it("rejects invalid input with null", () => {
    expect(normalizeHex("nope")).toBeNull()
    expect(normalizeHex("#12345")).toBeNull()
    expect(normalizeHex("#1234567")).toBeNull()
    expect(normalizeHex("")).toBeNull()
  })
})
describe("sanitizeHexList", () => {
  it("splits comma-separated colors", () => {
    expect(sanitizeHexList("#FF0000,#00FF00,#0000FF")).toEqual(["#FF0000", "#00FF00", "#0000FF"])
  })
  it("splits whitespace-separated colors", () => {
    expect(sanitizeHexList("#FF0000 #00FF00")).toEqual(["#FF0000", "#00FF00"])
  })
  it("handles mixed separators and drops invalid entries", () => {
    // "abc" would be valid 3-digit hex (#AABBCC); "nope" exercises rejection.
    expect(sanitizeHexList("  #FF0000 , #00FF00  ,nope  ")).toEqual(["#FF0000", "#00FF00"])
  })
  it("returns empty array for empty input", () => {
    expect(sanitizeHexList("")).toEqual([])
    expect(sanitizeHexList("    ")).toEqual([])
  })
})
describe("clampBbox", () => {
  it("passes through valid bboxes rounded to ints", () => {
    expect(clampBbox([100, 200, 300, 400])).toEqual([100, 200, 300, 400])
    expect(clampBbox([10.4, 20.5, 30.6, 40.7])).toEqual([10, 21, 31, 41])
  })
  it("clamps to [0, GRID_SIZE]", () => {
    expect(clampBbox([-100, -50, 500, 600])).toEqual([0, 0, 500, 600])
    expect(clampBbox([500, 600, 9999, 9999])).toEqual([500, 600, GRID_SIZE, GRID_SIZE])
  })
  it("unswaps inverted min/max", () => {
    expect(clampBbox([500, 600, 100, 200])).toEqual([100, 200, 500, 600])
    expect(clampBbox([100, 600, 500, 200])).toEqual([100, 200, 500, 600])
  })
})
describe("bboxToRect / rectToBbox", () => {
  it("bboxToRect extracts {x,y,w,h} from [ymin,xmin,ymax,xmax]", () => {
    expect(bboxToRect([100, 200, 400, 600])).toEqual({ x: 200, y: 100, w: 400, h: 300 })
  })
  it("rectToBbox builds [ymin,xmin,ymax,xmax] from x,y,w,h", () => {
    expect(rectToBbox(200, 100, 400, 300)).toEqual([100, 200, 400, 600])
  })
  it("round-trips cleanly", () => {
    const bbox: [number, number, number, number] = [128, 256, 768, 896]
    const r = bboxToRect(bbox)
    expect(rectToBbox(r.x, r.y, r.w, r.h)).toEqual(bbox)
  })
})
describe("snap", () => {
  it("is a no-op when disabled", () => {
    expect(snap(123, false)).toBe(123)
  })
  it("snaps to the nearest SNAP_UNITS increment when enabled", () => {
    expect(snap(0, true)).toBe(0)
    expect(snap(SNAP_UNITS, true)).toBe(SNAP_UNITS)
    expect(snap(SNAP_UNITS + 1, true)).toBe(SNAP_UNITS)
    expect(snap(SNAP_UNITS * 2 - 1, true)).toBe(SNAP_UNITS * 2)
    expect(snap(123, true)).toBe(125)
    expect(snap(137, true)).toBe(125)
    expect(snap(138, true)).toBe(150)
  })
  it("handles negative values", () => {
    expect(snap(-12, true)).toBe(0)
    expect(snap(-13, true)).toBe(-25)
  })
})
describe("isValidElementsArray", () => {
  it("accepts a well-formed element array", () => {
    expect(isValidElementsArray([{ type: "obj", desc: "a car", bbox: [0, 0, 100, 100] }])).toBe(true)
  })
  it("accepts text elements", () => {
    expect(isValidElementsArray([{ type: "text", desc: "headline", text: "HELLO", bbox: [0, 0, 100, 100] }])).toBe(true)
  })
  it("accepts the legacy description key as fallback for desc", () => {
    expect(isValidElementsArray([{ type: "obj", description: "a car" }])).toBe(true)
  })
  it("rejects non-array input", () => {
    expect(isValidElementsArray(null)).toBe(false)
    expect(isValidElementsArray({})).toBe(false)
    expect(isValidElementsArray("not an array")).toBe(false)
    expect(isValidElementsArray(42)).toBe(false)
  })
  it("rejects unknown element types", () => {
    expect(isValidElementsArray([{ type: "shape", desc: "x" }])).toBe(false)
    expect(isValidElementsArray([{ type: null, desc: "x" }])).toBe(false)
  })
  it("rejects elements missing a description", () => {
    expect(isValidElementsArray([{ type: "obj" }])).toBe(false)
  })
  it("rejects non-array bbox", () => {
    expect(isValidElementsArray([{ type: "obj", desc: "x", bbox: "wide" }])).toBe(false)
  })
  it("does not short-circuit: every element must be valid", () => {
    const mixed = [{ type: "obj", desc: "ok" }, { type: "shape", desc: "bad" }]
    expect(isValidElementsArray(mixed)).toBe(false)
  })
})
describe("parseElementsJSON", () => {
  it("returns [] for empty input", () => {
    expect(parseElementsJSON("")).toEqual([])
    expect(parseElementsJSON("   ")).toEqual([])
  })
  it("returns null for malformed JSON", () => {
    expect(parseElementsJSON("[not json")).toBeNull()
    expect(parseElementsJSON("{")).toBeNull()
  })
  it("returns null for valid JSON of the wrong shape", () => {
    expect(parseElementsJSON("\"hello\"")).toBeNull()
    expect(parseElementsJSON("42")).toBeNull()
    expect(parseElementsJSON("{}")).toBeNull()
    expect(parseElementsJSON("[{}]")).toBeNull()
    expect(parseElementsJSON('[{"type":"shape","desc":"x"}]')).toBeNull()
  })
  it("parses a full element", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"a red car","bbox":[100,200,500,800],"color_palette":["#FF0000","#AA0000"]}]')!
    expect(result).toHaveLength(1)
    expect(result![0].type).toBe("obj")
    expect(result![0].desc).toBe("a red car")
    expect(result![0].bbox).toEqual([100, 200, 500, 800])
    expect(result![0].color_palette).toEqual(["#FF0000", "#AA0000"])
    expect(result![0].id).toBeTruthy()
  })
  it("parses a text element and preserves its text content", () => {
    const result = parseElementsJSON('[{"type":"text","text":"HELLO","desc":"bold sans-serif","bbox":[0,0,100,500]}]')!
    expect(result![0].type).toBe("text")
    expect(result![0].text).toBe("HELLO")
  })
  it("uses the legacy description key as fallback when desc is missing", () => {
    const result = parseElementsJSON('[{"type":"obj","description":"legacy"}]')!
    expect(result![0].desc).toBe("legacy")
  })
  it("clamps out-of-range bbox values to [0, 1000]", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"x","bbox":[-100,-50,2000,2000]}]')!
    expect(result![0].bbox).toEqual([0, 0, GRID_SIZE, GRID_SIZE])
  })
  it("unswaps inverted bbox coordinates", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"x","bbox":[800,900,200,100]}]')!
    expect(result![0].bbox).toEqual([200, 100, 800, 900])
  })
  it("accepts normalized x/y/w/h fractions as bbox fallback", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"frac","x":0.1,"y":0.2,"w":0.5,"h":0.4}]')!
    // x=0.1,y=0.2,w=0.5,h=0.4 -> [ymin=200, xmin=100, ymax=600, xmax=600]
    expect(result![0].bbox).toEqual([200, 100, 600, 600])
  })
  it("normalizes and uppercases color_palette entries", () => {
    // "bad" is valid 3-digit hex (#BBAADD); use "nope" for the reject path.
    const result = parseElementsJSON('[{"type":"obj","desc":"x","color_palette":["ff0000","#0f0","nope"]}]')!
    expect(result![0].color_palette).toEqual(["#FF0000", "#00FF00"])
  })
  it("caps color_palette at 5 entries", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"x","color_palette":["#111111","#222222","#333333","#444444","#555555","#666666"]}]')!
    expect(result![0].color_palette).toHaveLength(5)
  })
  it("synthesizes distinct ids for imported elements", () => {
    const result = parseElementsJSON('[{"type":"obj","desc":"a"},{"type":"obj","desc":"b"}]')!
    expect(result![0].id).not.toBe(result![1].id)
  })
})
describe("serializeElements", () => {
  it("produces a compact JSON array", () => {
    const out = serializeElements([{ id: "x", type: "obj", desc: "a red car", bbox: [100, 200, 500, 800], color_palette: ["#FF0000"] }])
    expect(JSON.parse(out)).toEqual([{ type: "obj", desc: "a red car", bbox: [100, 200, 500, 800], color_palette: ["#FF0000"] }])
  })
  it("omits color_palette when empty", () => {
    const out = serializeElements([{ id: "x", type: "obj", desc: "x", bbox: [0, 0, 10, 10], color_palette: [] }])
    expect(JSON.parse(out)[0]).not.toHaveProperty("color_palette")
  })
  it("always includes text on text elements (even if empty)", () => {
    const out = serializeElements([{ id: "x", type: "text", desc: "headline", text: "", bbox: [0, 0, 10, 10], color_palette: [] }])
    expect(JSON.parse(out)[0].text).toBe("")
  })
  it("carries font on logo elements when set", () => {
    const out = serializeElements([{ id: "x", type: "logo", desc: "mark", text: "ACME", font: "stencil sans-serif", bbox: [0, 0, 10, 10], color_palette: [] }])
    expect(JSON.parse(out)[0].font).toBe("stencil sans-serif")
  })
  it("never includes the local-only id field on the wire", () => {
    const out = serializeElements([{ id: "secret", type: "obj", desc: "x", bbox: [0, 0, 10, 10], color_palette: [] }])
    expect(JSON.parse(out)[0]).not.toHaveProperty("id")
  })
  it("round-trips through parseElementsJSON (modulo ids)", () => {
    const els = parseElementsJSON('[{"type":"obj","desc":"a","bbox":[100,200,300,400]},{"type":"text","desc":"t","text":"HI","bbox":[0,0,10,10]}]')!
    const reparsed = parseElementsJSON(serializeElements(els))!
    const strip = (e: IdeoElement) => { const copy = { ...e }; delete copy.id; return copy }
    expect(reparsed.map(strip)).toEqual(els.map(strip))
  })
})
describe("flattenCaption / assembleCaption (the Slots.tsx bridge)", () => {
  it("flattenCaption unpacks every caption block into flat fields", () => {
    const flat = flattenCaption({
      high_level_description: "A workspace",
      style_description: { aesthetics: "cinematic", lighting: "golden hour", medium: "35mm", photo: "Portra 400", color_palette: ["#112233", "#445566"] },
      compositional_deconstruction: { background: "a desk", elements: [{ type: "obj", desc: "mug", bbox: [1, 2, 3, 4] }] },
    }, 1216, 832)
    expect(flat.high_level_description).toBe("A workspace")
    expect(flat.style_type).toBe("photo")
    expect(flat.aesthetics).toBe("cinematic")
    expect(flat.style_value).toBe("Portra 400")
    expect(flat.style_palette).toBe("#112233, #445566")
    expect(flat.background).toBe("a desk")
    expect(JSON.parse(flat.elements as string)).toEqual([{ type: "obj", desc: "mug", bbox: [1, 2, 3, 4] }])
    expect(flat.width).toBe(1216)
    expect(flat.height).toBe(832)
  })
  it("flattenCaption prefers the photo key when both style keys exist", () => {
    const flat = flattenCaption({ style_description: { photo: "P", art_style: "A" } }, 1024, 1024)
    expect(flat.style_type).toBe("photo")
  })
  it("flattenCaption tolerates junk input without throwing", () => {
    expect(flattenCaption(null, 1024, 1024).background).toBe("")
    expect(flattenCaption("not json", 1024, 1024).elements).toBe("[]")
    expect(() => flattenCaption(42, 1024, 1024)).not.toThrow()
  })
  it("assembleCaption always emits a compositional_deconstruction block", () => {
    const cap = assembleCaption({})
    expect(cap.compositional_deconstruction.background).toBe("(describe the scene background)")
    expect(cap.compositional_deconstruction.elements).toEqual([])
  })
  it("assembleCaption includes style_description only in non-none modes", () => {
    expect(assembleCaption({ style_type: "none", aesthetics: "x" }).style_description).toBeUndefined()
    const photo = assembleCaption({ style_type: "photo", style_value: "Portra", style_palette: "#ff0000 nope #00ff00" })
    expect(photo.style_description?.photo).toBe("Portra")
    expect(photo.style_description?.art_style).toBeUndefined()
    expect(photo.style_description?.color_palette).toEqual(["#FF0000", "#00FF00"])
    const art = assembleCaption({ style_type: "art_style", style_value: "Baroque" })
    expect(art.style_description?.art_style).toBe("Baroque")
  })
  it("assembleCaption serializes elements from the flat JSON string", () => {
    const els = [{ type: "text", desc: "headline", text: "HI", bbox: [10, 20, 30, 40] }]
    const cap = assembleCaption({ background: "bg", elements: JSON.stringify(els) })
    expect(cap.compositional_deconstruction.elements).toEqual(els)
    // Unparseable elements degrade to [] — never throw into onChange.
    expect(assembleCaption({ elements: "{nope" }).compositional_deconstruction.elements).toEqual([])
  })
  it("ROUND TRIP: assemble -> flatten -> assemble is stable (the field value contract)", () => {
    const imported = parseElementsJSON('[{"type":"logo","desc":"brand","text":"ACME","font":"deco serif","bbox":[100,150,300,450],"color_palette":["#ABCDEF"]}]')!
    const first = assembleCaption({
      high_level_description: "Shot",
      style_type: "photo",
      aesthetics: "moody",
      lighting: "low key",
      medium: "digital",
      style_value: "grainy",
      style_palette: "#AA0000,#00AA00",
      background: "studio",
      elements: serializeElements(imported),
    })
    const flat = flattenCaption(first, 1024, 1024)
    const second = assembleCaption(flat)
    expect(second).toEqual(first)
  })
})
describe("constants", () => {
  it("exposes the expected ideogram grid size", () => {
    expect(GRID_SIZE).toBe(1000)
  })
  it("exposes sane MIN_BOX and snap granularity", () => {
    expect(MIN_BOX).toBeGreaterThan(0)
    expect(MIN_BOX).toBeLessThan(GRID_SIZE / 10)
    expect(SNAP_UNITS).toBeGreaterThan(0)
    expect(GRID_SIZE % SNAP_UNITS).toBe(0)
  })
})

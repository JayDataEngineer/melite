/**
 * Unit tests for surfaces/canvas/ideoHelpers.ts — pure utility functions for
 * the Ideogram canvas editor. Had ZERO test imports (every ideo surface test
 * mocks the entire module away).
 *
 * Coverage:
 *   - Constants: GRID_SIZE, MIN_BOX, SNAP_UNITS, CANVAS_MAX_HEIGHT.
 *   - genId: prefix, uniqueness, counter increment.
 *   - clamp: basic clamping, within-range passthrough.
 *   - clampBbox: normalization (swaps min>max), rounding, [0,GRID_SIZE] clamp.
 *   - bboxToRect: [ymin,xmin,ymax,xmax]→{x,y,w,h}, negative-width floor.
 *   - rectToBbox: inverse of bboxToRect.
 *   - snap: enabled/disabled, SNAP_UNITS=25 rounding, -0 normalization.
 *   - normalizeHex: #RGB→#RRGGBB expansion, uppercase, no-# prefix add,
 *     invalid→null.
 *   - sanitizeHexList: comma/space splitting, invalid filtered out.
 *   - isValidElementsArray: type guard (non-array, bad type, missing desc).
 *   - parseElementsJSON: empty, invalid JSON, valid parse with bbox/palette/
 *     normalized x/y/w/h, default bbox fallback.
 *   - serializeElements: round-trip with parseElementsJSON, omits undefined.
 */
import { describe, it, expect } from "vitest"
import {
  GRID_SIZE,
  MIN_BOX,
  SNAP_UNITS,
  CANVAS_MAX_HEIGHT,
  genId,
  clamp,
  clampBbox,
  bboxToRect,
  rectToBbox,
  snap,
  normalizeHex,
  sanitizeHexList,
  isValidElementsArray,
  parseElementsJSON,
  serializeElements,
} from "../../../../../packages/engines/comfyui-cordis/src/cards/image/ideogram4/ui/studio/ideoHelpers"

// ─── Constants ─────────────────────────────────────────────────────────────

describe("ideoHelpers — constants", () => {
  it("GRID_SIZE is 1000 (the ideogram coordinate space)", () => {
    expect(GRID_SIZE).toBe(1000)
  })

  it("MIN_BOX is 30 (3% of grid)", () => {
    expect(MIN_BOX).toBe(30)
  })

  it("SNAP_UNITS is 25 (2.5% snap granularity)", () => {
    expect(SNAP_UNITS).toBe(25)
  })

  it("CANVAS_MAX_HEIGHT is 460px", () => {
    expect(CANVAS_MAX_HEIGHT).toBe(460)
  })
})

// ─── genId ────────────────────────────────────────────────────────────────

describe("ideoHelpers — genId", () => {
  it("uses the default prefix 'el' when none is provided", () => {
    expect(genId()).toMatch(/^el_/)
  })

  it("uses a custom prefix", () => {
    expect(genId("img")).toMatch(/^img_/)
  })

  it("produces unique ids across consecutive calls", () => {
    const ids = new Set<string>()
    for (let i = 0; i < 50; i++) ids.add(genId())
    expect(ids.size).toBe(50)
  })

  it("embeds a monotonically increasing counter", () => {
    const a = genId()
    const b = genId()
    const cA = parseInt(a.split("_").pop()!, 10)
    const cB = parseInt(b.split("_").pop()!, 10)
    expect(cB).toBeGreaterThan(cA)
  })
})

// ─── clamp ────────────────────────────────────────────────────────────────

describe("ideoHelpers — clamp", () => {
  it("returns the value unchanged when within [lo, hi]", () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it("clamps to the lower bound", () => {
    expect(clamp(-3, 0, 10)).toBe(0)
  })

  it("clamps to the upper bound", () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it("works with negative ranges", () => {
    expect(clamp(-15, -10, -5)).toBe(-10)
    expect(clamp(-3, -10, -5)).toBe(-5)
  })

  it("handles exact boundary values", () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

// ─── clampBbox ────────────────────────────────────────────────────────────

describe("ideoHelpers — clampBbox", () => {
  it("rounds float coordinates to integers", () => {
    const out = clampBbox([10.4, 20.7, 100.6, 200.3])
    expect(out).toEqual([10, 21, 101, 200])
  })

  it("swaps ymin>ymax to normalize the bbox", () => {
    const out = clampBbox([500, 100, 100, 400])
    expect(out[0]).toBeLessThanOrEqual(out[2])
    expect(out).toEqual([100, 100, 500, 400])
  })

  it("swaps xmin>xmax to normalize the bbox", () => {
    const out = clampBbox([100, 400, 500, 100])
    expect(out[1]).toBeLessThanOrEqual(out[3])
    expect(out).toEqual([100, 100, 500, 400])
  })

  it("clamps values to [0, GRID_SIZE]", () => {
    expect(clampBbox([-50, -100, 2000, 1500])).toEqual([0, 0, 1000, 1000])
  })

  it("preserves an already-normalized bbox", () => {
    const bbox: [number, number, number, number] = [100, 200, 300, 400]
    expect(clampBbox(bbox)).toEqual(bbox)
  })
})

// ─── bboxToRect ───────────────────────────────────────────────────────────

describe("ideoHelpers — bboxToRect", () => {
  it("converts [ymin, xmin, ymax, xmax] to {x, y, w, h}", () => {
    expect(bboxToRect([100, 200, 300, 400])).toEqual({ x: 200, y: 100, w: 200, h: 200 })
  })

  it("calculates width as xmax - xmin", () => {
    expect(bboxToRect([0, 100, 0, 500])).toEqual({ x: 100, y: 0, w: 400, h: 0 })
  })

  it("calculates height as ymax - ymin", () => {
    expect(bboxToRect([50, 0, 250, 0])).toEqual({ x: 0, y: 50, w: 0, h: 200 })
  })

  it("floors negative width to 0", () => {
    // If xmin > xmax (shouldn't happen after clampBbox, but defensive).
    expect(bboxToRect([0, 500, 0, 100])).toEqual({ x: 500, y: 0, w: 0, h: 0 })
  })
})

// ─── rectToBbox ───────────────────────────────────────────────────────────

describe("ideoHelpers — rectToBbox", () => {
  it("converts (x, y, w, h) to [ymin, xmin, ymax, xmax]", () => {
    expect(rectToBbox(200, 100, 200, 200)).toEqual([100, 200, 300, 400])
  })

  it("is the inverse of bboxToRect for valid bboxes", () => {
    const orig = rectToBbox(100, 50, 300, 200)
    const back = bboxToRect(orig)
    expect(back).toEqual({ x: 100, y: 50, w: 300, h: 200 })
  })

  it("handles zero-width/height", () => {
    expect(rectToBbox(0, 0, 0, 0)).toEqual([0, 0, 0, 0])
  })
})

// ─── snap ─────────────────────────────────────────────────────────────────

describe("ideoHelpers — snap", () => {
  it("returns the value unchanged when disabled", () => {
    expect(snap(37, false)).toBe(37)
  })

  it("rounds to the nearest SNAP_UNITS (25) multiple when enabled", () => {
    expect(snap(0, true)).toBe(0)
    expect(snap(12, true)).toBe(0)    // 12 < 12.5 → 0
    expect(snap(13, true)).toBe(25)   // 13 > 12.5 → 25
    expect(snap(37, true)).toBe(25)   // 37 → 25 (nearest)
    expect(snap(38, true)).toBe(50)   // 38 → 50
    expect(snap(100, true)).toBe(100) // exact multiple
  })

  it("normalizes -0 to +0 (no negative zero)", () => {
    expect(Object.is(snap(-0, true), -0)).toBe(false)
    expect(snap(-0, true)).toBe(0)
  })

  it("handles negative values", () => {
    expect(snap(-13, true)).toBe(-25)
    expect(snap(-12, true)).toBe(0)  // -12/25=-0.48 → round→-0 → *25=-0 → +0=0
    expect(snap(-100, true)).toBe(-100)
  })
})

// ─── normalizeHex ─────────────────────────────────────────────────────────

describe("ideoHelpers — normalizeHex", () => {
  it("uppercases a valid 6-digit hex", () => {
    expect(normalizeHex("#ff0000")).toBe("#FF0000")
  })

  it("adds the # prefix if missing", () => {
    expect(normalizeHex("ff0000")).toBe("#FF0000")
  })

  it("expands a 3-digit hex to 6 digits", () => {
    expect(normalizeHex("#f00")).toBe("#FF0000")
    expect(normalizeHex("0fc")).toBe("#00FFCC")
  })

  it("trims whitespace before processing", () => {
    expect(normalizeHex("  #abc  ")).toBe("#AABBCC")
  })

  it("returns null for an empty string", () => {
    expect(normalizeHex("")).toBeNull()
    expect(normalizeHex("   ")).toBeNull()
  })

  it("returns null for invalid hex characters", () => {
    expect(normalizeHex("#GGG")).toBeNull()
    expect(normalizeHex("#xyz123")).toBeNull()
  })

  it("returns null for wrong-length input (not 3 or 6 digits)", () => {
    expect(normalizeHex("#1234")).toBeNull()
    expect(normalizeHex("#1234567")).toBeNull()
    expect(normalizeHex("#12")).toBeNull()
  })
})

// ─── sanitizeHexList ──────────────────────────────────────────────────────

describe("ideoHelpers — sanitizeHexList", () => {
  it("splits on commas and normalizes each color", () => {
    expect(sanitizeHexList("#f00, #0f0, #00f")).toEqual(["#FF0000", "#00FF00", "#0000FF"])
  })

  it("splits on whitespace", () => {
    expect(sanitizeHexList("#ff0000 #00ff00 #0000ff")).toEqual(["#FF0000", "#00FF00", "#0000FF"])
  })

  it("splits on mixed comma + space separators", () => {
    expect(sanitizeHexList("#f00, #0f0  #00f")).toEqual(["#FF0000", "#00FF00", "#0000FF"])
  })

  it("filters out invalid colors", () => {
    expect(sanitizeHexList("#f00, invalid, #00f")).toEqual(["#FF0000", "#0000FF"])
  })

  it("returns an empty array for an empty string", () => {
    expect(sanitizeHexList("")).toEqual([])
    expect(sanitizeHexList("   ")).toEqual([])
  })

  it("returns an empty array when all colors are invalid", () => {
    expect(sanitizeHexList("xxx, yyy, zzz")).toEqual([])
  })

  it("handles colors without # prefix", () => {
    expect(sanitizeHexList("ff0000, 00ff00")).toEqual(["#FF0000", "#00FF00"])
  })
})

// ─── isValidElementsArray ─────────────────────────────────────────────────

describe("ideoHelpers — isValidElementsArray", () => {
  it("returns true for a valid array of obj elements", () => {
    expect(isValidElementsArray([{ type: "obj", desc: "A product" }])).toBe(true)
  })

  it("returns true for text and logo types", () => {
    expect(isValidElementsArray([
      { type: "text", desc: "Headline" },
      { type: "logo", desc: "Brand mark" },
    ])).toBe(true)
  })

  it("accepts 'description' as an alternative to 'desc'", () => {
    expect(isValidElementsArray([{ type: "obj", description: "Alt" }])).toBe(true)
  })

  it("returns false for a non-array input", () => {
    expect(isValidElementsArray(null)).toBe(false)
    expect(isValidElementsArray("string")).toBe(false)
    expect(isValidElementsArray({})).toBe(false)
  })

  it("returns false when any element has an invalid type", () => {
    expect(isValidElementsArray([{ type: "shape", desc: "X" }])).toBe(false)
    expect(isValidElementsArray([{ type: "obj", desc: "OK" }, { type: "bad", desc: "Bad" }])).toBe(false)
  })

  it("returns false when any element lacks both desc AND description", () => {
    expect(isValidElementsArray([{ type: "obj" }])).toBe(false)
  })

  it("returns false when bbox is present but not an array", () => {
    expect(isValidElementsArray([{ type: "obj", desc: "X", bbox: "not-array" }])).toBe(false)
  })

  it("returns true when bbox is a valid array", () => {
    expect(isValidElementsArray([{ type: "obj", desc: "X", bbox: [0, 0, 100, 100] }])).toBe(true)
  })

  it("returns true for an empty array", () => {
    expect(isValidElementsArray([])).toBe(true)
  })
})

// ─── parseElementsJSON ────────────────────────────────────────────────────

describe("ideoHelpers — parseElementsJSON", () => {
  it("returns [] for an empty string", () => {
    expect(parseElementsJSON("")).toEqual([])
    expect(parseElementsJSON("   ")).toEqual([])
  })

  it("returns null for invalid JSON", () => {
    expect(parseElementsJSON("{invalid")).toBeNull()
    expect(parseElementsJSON("not json")).toBeNull()
  })

  it("returns null for valid JSON that is not a valid elements array", () => {
    expect(parseElementsJSON('"string"')).toBeNull()
    expect(parseElementsJSON("42")).toBeNull()
    expect(parseElementsJSON('[{"type":"bad"}]')).toBeNull()
  })

  it("parses a valid element array with bbox", () => {
    const json = JSON.stringify([
      { type: "obj", desc: "Product", bbox: [100, 200, 300, 400] },
    ])
    const result = parseElementsJSON(json)!
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe("obj")
    expect(result[0].desc).toBe("Product")
    expect(result[0].bbox).toEqual([100, 200, 300, 400])
  })

  it("assigns a unique id to each parsed element", () => {
    const json = JSON.stringify([{ type: "obj", desc: "A" }, { type: "obj", desc: "B" }])
    const result = parseElementsJSON(json)!
    expect(result[0].id).not.toBe(result[1].id)
  })

  it("uses default bbox [200,200,500,500] when neither bbox nor x/y/w/h is present", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X" }])
    const result = parseElementsJSON(json)!
    expect(result[0].bbox).toEqual([200, 200, 500, 500])
  })

  it("converts normalized x/y/w/h (0-1) to grid coordinates", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X", x: 0.1, y: 0.2, w: 0.3, h: 0.4 }])
    const result = parseElementsJSON(json)!
    // x=0.1*1000=100, y=0.2*1000=200, w=0.3*1000=300, h=0.4*1000=400
    // rectToBbox(100, 200, 300, 400) = [200, 100, 600, 400]
    expect(result[0].bbox).toEqual([200, 100, 600, 400])
  })

  it("normalizes color_palette entries via normalizeHex", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X", color_palette: ["#f00", "invalid", "#00ff00"] }])
    const result = parseElementsJSON(json)!
    expect(result[0].color_palette).toEqual(["#FF0000", "#00FF00"])
  })

  it("accepts 'palette' as an alternative to 'color_palette'", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X", palette: ["#abc"] }])
    const result = parseElementsJSON(json)!
    expect(result[0].color_palette).toEqual(["#AABBCC"])
  })

  it("caps color_palette to 5 entries", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X", color_palette: ["#000", "#111", "#222", "#333", "#444", "#555", "#666"] }])
    const result = parseElementsJSON(json)!
    expect(result[0].color_palette).toHaveLength(5)
  })

  it("extracts text + font for text/logo elements", () => {
    const json = JSON.stringify([{ type: "text", desc: "Headline", text: "SALE", font: "bold sans" }])
    const result = parseElementsJSON(json)!
    expect(result[0].text).toBe("SALE")
    expect(result[0].font).toBe("bold sans")
  })

  it("does NOT set text/font for obj elements", () => {
    const json = JSON.stringify([{ type: "obj", desc: "X", text: "ignored" }])
    const result = parseElementsJSON(json)!
    expect(result[0].text).toBeUndefined()
    expect(result[0].font).toBeUndefined()
  })

  it("accepts 'description' as an alternative to 'desc'", () => {
    const json = JSON.stringify([{ type: "obj", description: "Via description" }])
    const result = parseElementsJSON(json)!
    expect(result[0].desc).toBe("Via description")
  })

  it("returns null when desc is a non-string type (validator rejects)", () => {
    // isValidElementsArray requires typeof desc === 'string'. A number desc
    // is rejected → parseElementsJSON returns null.
    const json = JSON.stringify([{ type: "obj", desc: 42 }])
    expect(parseElementsJSON(json)).toBeNull()
  })
})

// ─── serializeElements ────────────────────────────────────────────────────

describe("ideoHelpers — serializeElements", () => {
  it("serializes elements back to a JSON string", () => {
    const elements = [
      { id: "x", type: "obj" as const, desc: "Product", bbox: [0, 0, 100, 100] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const json = serializeElements(elements)
    const parsed = JSON.parse(json)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].type).toBe("obj")
    expect(parsed[0].desc).toBe("Product")
    expect(parsed[0].bbox).toEqual([0, 0, 100, 100])
  })

  it("includes text for text/logo elements", () => {
    const elements = [
      { id: "x", type: "text" as const, desc: "Label", text: "Hello", bbox: [0, 0, 100, 100] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0].text).toBe("Hello")
  })

  it("includes font for text/logo elements when present", () => {
    const elements = [
      { id: "x", type: "logo" as const, desc: "Brand", text: "Co", font: "serif", bbox: [0, 0, 100, 100] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0].font).toBe("serif")
  })

  it("omits text for obj elements", () => {
    const elements = [
      { id: "x", type: "obj" as const, desc: "Product", bbox: [0, 0, 100, 100] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0]).not.toHaveProperty("text")
  })

  it("omits font when not set", () => {
    const elements = [
      { id: "x", type: "text" as const, desc: "L", text: "T", bbox: [0, 0, 100, 100] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0]).not.toHaveProperty("font")
  })

  it("includes color_palette when non-empty", () => {
    const elements = [
      { id: "x", type: "obj" as const, desc: "P", bbox: [0, 0, 1, 1] as [number, number, number, number], color_palette: ["#FF0000"] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0].color_palette).toEqual(["#FF0000"])
  })

  it("omits color_palette when empty", () => {
    const elements = [
      { id: "x", type: "obj" as const, desc: "P", bbox: [0, 0, 1, 1] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0]).not.toHaveProperty("color_palette")
  })

  it("does NOT serialize the local-only id field", () => {
    const elements = [
      { id: "local_id_123", type: "obj" as const, desc: "P", bbox: [0, 0, 1, 1] as [number, number, number, number], color_palette: [] as string[] },
    ]
    const parsed = JSON.parse(serializeElements(elements))
    expect(parsed[0]).not.toHaveProperty("id")
  })

  it("handles an empty elements array", () => {
    expect(JSON.parse(serializeElements([]))).toEqual([])
  })

  it("round-trips: parse → serialize → parse preserves data", () => {
    const original = JSON.stringify([
      { type: "obj", desc: "A", bbox: [10, 20, 30, 40], color_palette: ["#ff0000"] },
      { type: "text", desc: "B", text: "Hi", font: "sans", bbox: [50, 60, 70, 80] },
    ])
    const parsed1 = parseElementsJSON(original)!
    const reserialized = serializeElements(parsed1)
    const parsed2 = parseElementsJSON(reserialized)!
    expect(parsed2).toHaveLength(2)
    expect(parsed2[0].desc).toBe("A")
    expect(parsed2[0].bbox).toEqual([10, 20, 30, 40])
    expect(parsed2[1].text).toBe("Hi")
    expect(parsed2[1].font).toBe("sans")
  })
})

// mediaRange.spec.ts — THE BYTE-RANGE LAW's every arm (the
// audio-seek stroke, 2026-10-08): one pure parse behind every route
// that serves run artifact bytes. null = the full-200 ignore arm;
// 'unsatisfiable' = the loud 416; {start,end} = the 206 slice.
import { describe, expect, test } from "vitest"
import { parseRangeHeader } from "../src/mediaRange.ts"

// 10 bytes: 0..9 — the canonical fixture every arm slices against.
const SIZE = 10

describe("no/ignorable header → null (the full 200 arm)", () => {
  test("undefined header", () => {
    expect(parseRangeHeader(undefined, SIZE)).toBe(null)
  })
  test("empty header", () => {
    expect(parseRangeHeader("", SIZE)).toBe(null)
  })
  test("malformed spellings never slice", () => {
    for (const h of ["bytes=abc", "bytes=", "bytes=-", "bytes=5-2", "chunks=0-4", "BYTES=0-4", "bytes 0-4"]) {
      expect(parseRangeHeader(h, SIZE), h).toBe(null)
    }
  })
  test("multi-range lists are ignored, never partially honored", () => {
    expect(parseRangeHeader("bytes=0-1,3-4", SIZE)).toBe(null)
  })
  test("surrounding whitespace is tolerated", () => {
    expect(parseRangeHeader(" bytes=2-5 ", SIZE)).toEqual({ start: 2, end: 5 })
  })
})

describe("satisfiable ranges → the 206 slice", () => {
  test("a bounded mid-file window is inclusive on both ends", () => {
    expect(parseRangeHeader("bytes=2-5", SIZE)).toEqual({ start: 2, end: 5 })
  })
  test("an open end runs to EOF", () => {
    expect(parseRangeHeader("bytes=6-", SIZE)).toEqual({ start: 6, end: 9 })
  })
  test("an end past EOF clamps to the last byte", () => {
    expect(parseRangeHeader("bytes=8-999", SIZE)).toEqual({ start: 8, end: 9 })
  })
  test("a suffix range serves the LAST n bytes", () => {
    expect(parseRangeHeader("bytes=-3", SIZE)).toEqual({ start: 7, end: 9 })
  })
  test("a suffix longer than the file clamps to byte 0", () => {
    expect(parseRangeHeader("bytes=-99", SIZE)).toEqual({ start: 0, end: 9 })
  })
  test("the whole file is a legal window", () => {
    expect(parseRangeHeader("bytes=0-9", SIZE)).toEqual({ start: 0, end: 9 })
  })
})

describe("unsatisfiable asks → the loud 416 arm", () => {
  test("a start at EOF", () => {
    expect(parseRangeHeader("bytes=10-", SIZE)).toBe("unsatisfiable")
  })
  test("a start past EOF", () => {
    expect(parseRangeHeader("bytes=99-200", SIZE)).toBe("unsatisfiable")
  })
  test("a zero-length suffix tail", () => {
    expect(parseRangeHeader("bytes=-0", SIZE)).toBe("unsatisfiable")
  })
  test("any ask against an empty file", () => {
    expect(parseRangeHeader("bytes=0-", 0)).toBe("unsatisfiable")
    expect(parseRangeHeader("bytes=-5", 0)).toBe("unsatisfiable")
  })
})

describe("the boundary between the arms", () => {
  test("the last byte alone is satisfiable; one past it is not", () => {
    expect(parseRangeHeader("bytes=9-", SIZE)).toEqual({ start: 9, end: 9 })
    expect(parseRangeHeader("bytes=10-", SIZE)).toBe("unsatisfiable")
  })
  test("a one-byte file serves its only byte whole", () => {
    expect(parseRangeHeader("bytes=0-", 1)).toEqual({ start: 0, end: 0 })
  })
})

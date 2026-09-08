/**
 * Unit tests for lib/utils.ts — cn (clsx+twMerge), parseNumber (locale-aware),
 * clampNumber (fallback on NaN/Infinity).
 *
 * Zero prior coverage. parseNumber's dual-separator logic (de 1.234,5 vs en
 * 1,234.5) is the highest-value target — a regression would mis-parse every
 * comma-decimal locale's slider input.
 */
import { describe, it, expect } from "vitest"
import { cn, parseNumber, clampNumber } from "@melite/ui"

describe("utils — cn (clsx + tailwind-merge)", () => {
 it("passes through a single class", () => {
 expect(cn("p-4")).toBe("p-4")
 })
 it("merges multiple classes with whitespace filtering", () => {
 expect(cn("p-4", "", "bg-red-500")).toBe("p-4 bg-red-500")
 })
 it("dedupes conflicting tailwind classes (twMerge — last wins)", () => {
 expect(cn("p-4", "p-8")).toBe("p-8")
 expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500")
 })
 it("handles conditional class values (clsx false/undefined)", () => {
 expect(cn("base", false && "no", undefined, "ok")).toBe("base ok")
 })
})

describe("utils — parseNumber (locale-aware)", () => {
 it("parses a plain integer", () => {
 expect(parseNumber("42")).toBe(42)
 })
 it("parses a dot-decimal float (en/US default)", () => {
 expect(parseNumber("1.5")).toBe(1.5)
 })
 it("parses a comma-decimal float (de/EU locales: '1,5' → 1.5)", () => {
 expect(parseNumber("1,5")).toBe(1.5)
 })
 it("parses en/US thousands: '1,234.5' → 1234.5 (comma = thousands)", () => {
 expect(parseNumber("1,234.5")).toBe(1234.5)
 })
 it("parses de/EU thousands: '1.234,5' → 1234.5 (dot = thousands, comma = decimal)", () => {
 expect(parseNumber("1.234,5")).toBe(1234.5)
 })
 it("returns NaN for an empty string", () => {
 expect(parseNumber("")).toBeNaN()
 })
 it("returns NaN for a whitespace-only string", () => {
 expect(parseNumber(" ")).toBeNaN()
 })
 it("returns NaN for a non-numeric string", () => {
 expect(parseNumber("abc")).toBeNaN()
 })
 it("trims surrounding whitespace before parsing", () => {
 expect(parseNumber(" 3.14 ")).toBe(3.14)
 })
 it("handles negative numbers", () => {
 expect(parseNumber("-1.5")).toBe(-1.5)
 expect(parseNumber("-1,5")).toBe(-1.5)
 })
 it("passes non-string inputs through Number()", () => {
 expect(parseNumber(42 as unknown as string)).toBe(42)
 })
})

describe("utils — clampNumber (with fallback)", () => {
 it("returns v when within [min, max]", () => {
 expect(clampNumber(5, 0, 10, -1)).toBe(5)
 })
 it("clamps to min when v < min", () => {
 expect(clampNumber(-3, 0, 10, -1)).toBe(0)
 })
 it("clamps to max when v > max", () => {
 expect(clampNumber(99, 0, 10, -1)).toBe(10)
 })
 it("returns the fallback when v is NaN", () => {
 expect(clampNumber(NaN, 0, 10, 42)).toBe(42)
 })
 it("returns the fallback when v is Infinity", () => {
 expect(clampNumber(Infinity, 0, 10, 42)).toBe(42)
 })
 it("returns the fallback when v is -Infinity", () => {
 expect(clampNumber(-Infinity, 0, 10, 42)).toBe(42)
 })
})

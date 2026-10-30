// @melite/models-h3 — THE LORA PLANE'S ONE-OWNER CONTRACTS
// (actions.ts h3DefaultLoraEntry / h3LoraStackOf / h3ShiftVideoOf).
// The film renderer and the swap renderer BOTH read these three —
// neither may hand-roll a stack or a shift. The faces:
//   • the absent-bag default resolves the CATALOG row (mods/loras —
//     one owner of every filename and default strength) for both
//     consumers: the compose wire (loraStackDefault) and the card's
//     ghost chip (h3DefaultLoraEntry);
//   • a resolved bag rides {on, lora, str} verbatim onto the wire;
//   • the married shift grid: stated-on-the-entry first, else the
//     catalog row's declared shift_video (highest count wins across
//     a stacked pair), a pinned shift is the user's word;
//   • the marriage is a LOOSE-DICT reader (hand-authored and
//     agent-shaped bags): a null or non-object row marries nothing,
//     a row with no string name marries nothing, a fictional
//     filename marries nothing — the doc's own shift rides on.
// Every expectation is DERIVED from the catalog row (the file's
// derived-assertion law), never a frozen literal.
import { describe, it, expect } from "vitest";
import { H3_DEFAULT_LORA_ID, h3DefaultLoraEntry, h3LoraStackOf, h3ShiftVideoOf } from "../src/actions.ts";
import { H3_LORA_ROWS } from "@melite/models-h3/mods/loras";

const turbo = H3_LORA_ROWS.find((r) => r.id === H3_DEFAULT_LORA_ID);
const turbo4 = H3_LORA_ROWS.find((r) => r.id === "h3_turbo4_v1");

describe("the lora plane's one-owner contracts (the swap + film renderers' shared reads)", () => {
  it("the ghost chip's entry face IS the catalog row: id, default strength, steps — one owner, derived", () => {
    expect(turbo, "the absent-bag default's catalog row serves").toBeDefined();
    expect(h3DefaultLoraEntry()).toEqual({
      id: turbo!.id,
      strength: turbo!.default_strength,
      steps: turbo!.steps,
    });
  });

  it("the absent-bag stack wire resolves the same catalog row: on, the filename, the default strength, the four fixed mode flags", () => {
    const stack = JSON.parse(h3LoraStackOf({})) as Array<{
      on: boolean; lora: string; str: number; v: number; a: number; t: number;
    }>;
    expect(stack).toEqual([{
      on: true,
      lora: turbo!.filename,
      str: turbo!.default_strength,
      v: 1, a: 1, t: 1,
    }]);
  });

  it("a resolved bag rides verbatim: {name, strength} becomes {on, lora, str} on the wire", () => {
    const stack = JSON.parse(h3LoraStackOf({
      loras: [{ name: "stacked-a.safetensors", strength: 0.5 }],
    })) as Array<{ on: boolean; lora: string; str: number; v: number; a: number; t: number }>;
    expect(stack).toEqual([{ on: true, lora: "stacked-a.safetensors", str: 0.5, v: 1, a: 1, t: 1 }]);
  });

  it("a bag row naming the catalog row marries its DECLARED shift grid over the doc's own row", () => {
    expect(h3ShiftVideoOf({ shift_video: 8, loras: [{ name: turbo!.filename }] }))
      .toBe(turbo!.shift_video);
  });

  it("a stated shift on the ENTRY beats the catalog row's — the author's word is the marriage's first voice", () => {
    expect(h3ShiftVideoOf({ shift_video: 8, loras: [{ name: turbo!.filename, shift_video: 9 }] }))
      .toBe(9);
  });

  it("a stacked pair marries the HIGHEST count (the 8-step member owns the grid)", () => {
    expect(turbo4, "the 4-step catalog row serves").toBeDefined();
    expect(h3ShiftVideoOf({
      shift_video: 8,
      loras: [{ name: turbo4!.filename }, { name: turbo!.filename }],
    })).toBe(Math.max(turbo4!.shift_video!, turbo!.shift_video!));
  });

  it("a PINNED shift is the user's word — a marrying bag never stomps the pin", () => {
    expect(h3ShiftVideoOf({
      shift_video: 5, __shift_pinned: true, loras: [{ name: turbo!.filename }],
    })).toBe(5);
  });

  it("THE LOOSE-BAG DEFENSES: a row that is null, not an object, name-less, or fictionally named marries NOTHING — the doc's own shift rides", () => {
    expect(h3ShiftVideoOf({ shift_video: 6, loras: [null] })).toBe(6);
    expect(h3ShiftVideoOf({ shift_video: 6, loras: ["garbage"] })).toBe(6);
    expect(h3ShiftVideoOf({ shift_video: 6, loras: [{ strength: 0.8 }] })).toBe(6);
    expect(h3ShiftVideoOf({ shift_video: 6, loras: [{ name: "nope.safetensors" }] })).toBe(6);
  });

  it("the loose-bag defense SKIPS a bad row without disarming the real one beside it", () => {
    expect(h3ShiftVideoOf({
      shift_video: 6,
      loras: [null, { name: turbo!.filename }],
    })).toBe(turbo!.shift_video);
  });
});

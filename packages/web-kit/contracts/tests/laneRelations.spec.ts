// laneRelations.spec.ts — the JUDGE's own laws (2026-10-10, the
// YOU_ARE_A_LIAR fix shape 1: the model becomes the author of what
// it accepts). Pure, zero-dep, at the contracts floor: the blank
// law (unstated ≠ stated), the four relation words judged with
// messages in the FIELD'S voice, the surface judgment (a stated
// field outside a lane's declaration fires nothing), and the
// cascade (family base ∪ variant additions, add-never-subtract).
import { describe, it, expect } from "vitest";
import {
  laneBlank,
  judgeLaneRelations,
  judgeLaneSurface,
  laneSurfaceOf,
} from "../src/laneRelations.ts";
import type { LaneRelations } from "../src/laneRelations.ts";

describe("laneBlank (the unstated law)", () => {
  it("undefined, null, '' and empty containers are UNSTATED; 0 and false are STATED", () => {
    expect(laneBlank(undefined)).toBe(true);
    expect(laneBlank(null)).toBe(true);
    expect(laneBlank("")).toBe(true);
    expect(laneBlank([])).toBe(true);
    expect(laneBlank({})).toBe(true);
    expect(laneBlank(0)).toBe(false);
    expect(laneBlank(false)).toBe(false);
    expect(laneBlank("x")).toBe(false);
    expect(laneBlank(0.0)).toBe(false);
  });
});

describe("together (all or none)", () => {
  const rel: LaneRelations = {
    together: [{
      fields: ["voice_name", "design_prompt"],
      cure: "the persona export needs both halves — name the voice and describe it, or drop both",
    }],
  };
  it("a blank state never fires (authoring-in-progress is not a refusal)", () => {
    expect(judgeLaneRelations([rel], {})).toEqual([]);
  });
  it("both halves ride — no violation", () => {
    expect(judgeLaneRelations([rel], { voice_name: "warm_1", design_prompt: "warm" })).toEqual([]);
  });
  it("one half alone refuses, naming the stated one and carrying the cure", () => {
    const v = judgeLaneRelations([rel], { design_prompt: "warm" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("design_prompt");
    expect(v[0]!.message).toContain("voice_name");
    expect(v[0]!.message).toContain("name the voice and describe it, or drop both");
  });
});

describe("requires (a stated field needs its companions)", () => {
  const rel: LaneRelations = {
    requires: [{
      field: "ref_audio",
      needs: ["ref_text"],
      cure: "the clone needs the transcript too",
    }],
  };
  it("unstated field never fires", () => {
    expect(judgeLaneRelations([rel], { text: "x" })).toEqual([]);
  });
  it("stated field with a missing companion refuses by NAME", () => {
    const v = judgeLaneRelations([rel], { ref_audio: "/a.flac" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("ref_audio");
    expect(v[0]!.message).toContain("ref_text");
    expect(v[0]!.message).toContain("the clone needs the transcript too");
  });
  it("stated field with companions admits", () => {
    expect(judgeLaneRelations([rel], { ref_audio: "/a.flac", ref_text: "t" })).toEqual([]);
  });
});

describe("conflicts (two at once perform nothing)", () => {
  const rel: LaneRelations = {
    conflicts: [{
      a: "voice_name",
      b: "qvoice",
      cure: "a saved persona performs the text — an export fires nothing",
    }],
  };
  it("either alone admits", () => {
    expect(judgeLaneRelations([rel], { voice_name: "warm_1" })).toEqual([]);
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice" })).toEqual([]);
  });
  it("both at once refuses, naming both and the cure", () => {
    const v = judgeLaneRelations([rel], { voice_name: "warm_1", qvoice: "/v.qvoice" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("voice_name");
    expect(v[0]!.message).toContain("qvoice");
    expect(v[0]!.message).toContain("a saved persona performs the text");
  });
});

describe("either_or (one COMPLETE source, armed only when a member is stated)", () => {
  const rel: LaneRelations = {
    either_or: [{
      groups: [["ref_audio", "ref_text"], ["qvoice"]],
      cure: "state one complete source: the reference PAIR or a .qvoice embedding",
    }],
  };
  it("a blank lane admits (nothing stated, nothing to choose)", () => {
    expect(judgeLaneRelations([rel], { text: "x" })).toEqual([]);
  });
  it("a complete group admits; the other group admits", () => {
    expect(judgeLaneRelations([rel], { ref_audio: "/a.flac", ref_text: "t" })).toEqual([]);
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice" })).toEqual([]);
  });
  it("half a pair refuses, naming the halves and the arms", () => {
    const v = judgeLaneRelations([rel], { ref_audio: "/a.flac" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("ref_audio");
    expect(v[0]!.message).toContain("ref_text");
    expect(v[0]!.message).toContain("state one complete source");
  });
  it("a COMPLETE group plus a stray half admits (one complete source is the law — the stray fires nothing)", () => {
    expect(judgeLaneRelations([rel], { qvoice: "/v.qvoice", ref_text: "t" })).toEqual([]);
  });
});

describe("judgeLaneSurface (a stated field outside the lane's declaration)", () => {
  const schemaNames = ["text", "temperature", "voice", "style_instruction"];
  it("a field on the surface admits; a field off it refuses with the field's name and the cure to switch", () => {
    expect(judgeLaneSurface(schemaNames, schemaNames, { text: "x", voice: "vivian" })).toEqual([]);
    const v = judgeLaneSurface(["text", "voice", "temperature"], schemaNames, { text: "x", style_instruction: "warm" });
    expect(v).toHaveLength(1);
    expect(v[0]!.message).toContain("style_instruction");
    expect(v[0]!.message).toMatch(/fires nothing/);
  });
  it("unstated fields never fire (a null stamp rides nothing)", () => {
    expect(judgeLaneSurface(["text"], ["text"], { text: "x", voice: undefined, style_instruction: null })).toEqual([]);
  });
  it("a null surface (a family that declares none) judges nothing — the legacy truth", () => {
    expect(judgeLaneSurface(null, schemaNames, { anything: 1, ghost: "x" })).toEqual([]);
  });
});

describe("laneSurfaceOf (the cascade: family base ∪ variant additions, add-never-subtract)", () => {
  it("family base + variant additions", () => {
    const surface = laneSurfaceOf(["text", "seed"], ["voice"]);
    expect([...surface!].sort()).toEqual(["seed", "text", "voice"]);
  });
  it("a null family surface stays null (the legacy lane judges nothing)", () => {
    expect(laneSurfaceOf(null, ["ref_audio"])).toBeNull();
    expect(laneSurfaceOf(undefined, undefined)).toBeNull();
  });
  it("a family with a surface and a variant with none = the family base", () => {
    const surface = laneSurfaceOf(["text"], undefined);
    expect([...surface!]).toEqual(["text"]);
  });
  it("duplicates collapse (a variant may restate a family base field)", () => {
    const surface = laneSurfaceOf(["text"], ["text", "voice"]);
    expect([...surface!].sort()).toEqual(["text", "voice"]);
  });
});

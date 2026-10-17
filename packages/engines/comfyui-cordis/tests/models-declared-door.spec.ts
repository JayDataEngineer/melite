// models-declared-door.spec.ts — THE DECLARED-PLANE DOOR's refusal
// texts (the atom vocabulary's family door, 2026-10-12): every
// write-plane row (defaults, variant resolver/wire stamps, cell
// resolver stamps) is judged against the union of the family's
// declared action ParamSpec rows. The TEXTS are the contract — the
// door's own words, never reworded by the service.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  validateWriteRowsAgainstActions,
  type DeclaredSurface,
  type WriteRow,
} from "../src/models/validate.ts";

const surface: readonly DeclaredSurface[] = [{
  id: "probe",
  params: [
    { name: "steps", type: "number", bounds: [4, 30] },
    { name: "sampler", type: "enum", options: ["euler", "heun"] },
    { name: "prompt", type: "string" },
    { name: "turbo", type: "boolean" },
    // the LIST-typed lane: h3/qwen-img-edit declare ref_images and
    // friends as image_list (models/h3/src/actions.ts:1359)
    { name: "ref_images", type: "image_list" },
    // the SCALAR media seat (D8, the NO-DROP law's write half):
    // h3's image + last_frame declare "image" — the write plane
    // must judge it the admission media gate's own shape.
    { name: "image", type: "image" },
  ],
}];

const throwsDoor = (rows: readonly WriteRow[], re: RegExp): void =>
  assert.throws(() => validateWriteRowsAgainstActions("probe", rows, surface), re);

describe("validateWriteRowsAgainstActions (the declared-plane door)", () => {
  it("a lawful row passes and reports every checked key", () => {
    const checked = validateWriteRowsAgainstActions("probe", [
      { where: "defaults", values: { steps: 8, sampler: "euler", prompt: "x", turbo: false } },
    ], surface);
    assert.deepEqual(checked, ["defaults:steps", "defaults:sampler", "defaults:prompt", "defaults:turbo"]);
  });

  it("an unknown param refuses, naming the row and the door", () => {
    throwsDoor(
      [{ where: "defaults", values: { nope: 1 } }],
      /probe defaults: 'nope' is refused — no declared action offers it/,
    );
  });

  it("an out-of-bounds number refuses with both bounds", () => {
    throwsDoor(
      [{ where: "variant v1 resolver_defaults", values: { steps: 99 } }],
      /probe variant v1 resolver_defaults: 'steps' carries 99, outside the declared bounds \[4, 30\]/,
    );
  });

  it("a WRONG-TYPED number refuses with the declared type and the carried one", () => {
    // the bounds arm only judges a real number — a string on a number
    // row must refuse on the type mismatch, never reach the bounds
    // comparison and read there as NaN.
    throwsDoor(
      [{ where: "defaults", values: { steps: "8" } }],
      /probe defaults: 'steps' declares number but carries string/,
    );
  });

  it("an optionless enum refuses every value it carries (options is optional on the row)", () => {
    // `options` is an OPTIONAL member of a declared enum row, so an
    // optionless enum is legal TypeScript and nothing can satisfy it.
    const optionless: readonly DeclaredSurface[] = [{
      id: "probe",
      params: [{ name: "flavor", type: "enum" }],
    }];
    for (const value of ["any", 7]) {
      assert.throws(
        () => validateWriteRowsAgainstActions("probe", [{ where: "defaults", values: { flavor: value } }], optionless),
        /probe defaults: 'flavor' carries '.*', off the declared options/,
        `flavor = ${String(value)}`,
      );
    }
  });

  it("an off-enum string refuses", () => {
    throwsDoor(
      [{ where: "cell v1/q8 resolver_defaults", values: { sampler: "dpm" } }],
      /probe cell v1\/q8 resolver_defaults: 'sampler' carries 'dpm', off the declared options/,
    );
  });

  it("a wrong-typed value refuses with both types", () => {
    throwsDoor(
      [{ where: "defaults", values: { turbo: "yes" } }],
      /probe defaults: 'turbo' declares boolean but carries string/,
    );
  });

  // The image_list arm had NO negative test anywhere (audit
  // 2026-10-13, mutation-proven: disabling it left the whole
  // comfyui-cordis suite green while the string and number arms
  // beside it all died). Four live families write ref_images /
  // ref_videos / ref_audios through this door, so a non-array was
  // composing a wrong graph silently.
  it("a non-array on a list-typed param refuses with both types", () => {
    throwsDoor(
      [{ where: "defaults", values: { ref_images: "not-an-array" } }],
      /probe defaults: 'ref_images' declares image_list but carries string/,
    );
  });

  it("an array on a list-typed param passes the door", () => {
    const checked = validateWriteRowsAgainstActions("probe", [
      { where: "defaults", values: { ref_images: ["a.png", "b.png"] } },
    ], surface);
    assert.deepEqual(checked, ["defaults:ref_images"]);
  });

  // THE SCALAR MEDIA SEAT (D8, the NO-DROP law's write half): an
  // image-typed row admits the media path (a string at the wire)
  // and refuses every other tier — the write face agreeing with the
  // admission media gate (the schema walk refuses a non-path at
  // compose; here the door refuses a non-string before the stamp).
  it("a media path on a scalar image param passes the door", () => {
    const checked = validateWriteRowsAgainstActions("probe", [
      { where: "defaults", values: { image: "data/input/shot-a.png" } },
    ], surface);
    assert.deepEqual(checked, ["defaults:image"]);
  });

  it("a non-string on a scalar image param refuses with both types", () => {
    throwsDoor(
      [{ where: "defaults", values: { image: 7 } }],
      /probe defaults: 'image' declares image but carries number/,
    );
  });

  it("reserved row coordinates, mod-plane keys, and null stamps skip", () => {
    const checked = validateWriteRowsAgainstActions("probe", [{
      where: "defaults",
      values: { model: "probe-xl", variant: "v1", voice: "alice", mode: "fast", loras: ["a.safetensors"], turbo: null },
    }], surface);
    assert.deepEqual(checked, [], "row state and unset stamps judge nothing");
  });

  it("an actionless family judges every non-empty row as drift", () => {
    assert.throws(
      () => validateWriteRowsAgainstActions("probe", [{ where: "defaults", values: { steps: 8 } }], []),
      /probe defaults: 'steps' is refused — no declared action offers it/,
    );
  });
});

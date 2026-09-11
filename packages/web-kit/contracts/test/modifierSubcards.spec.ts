// modifierSubcards.spec.ts — the modifiers view + interaction layer over
// the param bag: id normalization, subcard derivation, reorder, add-entry
// templates (bespoke + generic incl. every defaultForType arm), and the
// kind-spec capability accessors.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  NO_CN_SCHEMA,
  applySubcardDrop,
  cnEntriesOf,
  hasModifierCapability,
  kindForId,
  kindSpecOf,
  loraAdaptersOf,
  loraIdOf,
  loraLabel,
  loraStrengthBoundsOf,
  modifiersFeatureOf,
  moveItem,
  newControlnetEntry,
  newGenericEntry,
  newLoraEntry,
  normalizeLoraEntry,
  subcardCount,
  subcardId,
  subcardsFromParams,
} from "../src/modifierSubcards.ts";
import type {
  ControlNetEntry,
  ModifierKindSpec,
} from "../src/modifierSubcards.ts";

function kind(overrides: Record<string, unknown> = {}): ModifierKindSpec {
  return {
    kind: "lora",
    label: "LoRA",
    cardinality: "list",
    param_key: "loras",
    fields: [],
    ...overrides,
  } as unknown as ModifierKindSpec;
}

function loraKind(): ModifierKindSpec {
  return kind({
    fields: [
      { name: "strength", type: "float", min: -2, max: 5, step: 0.05, default: 1 },
    ],
    options: [
      {
        value: "style.safetensors",
        label: "Style",
        model: "style.safetensors",
        installed: true,
        defaults: { strength: 0.7 },
        metadata: { category: "Style", prompt_hint: "in style" },
      },
      {
        value: "bare.pt",
        label: "Bare",
      },
    ],
  });
}

function cnKind(): ModifierKindSpec {
  return kind({
    kind: "controlnet",
    label: "ControlNet",
    param_key: "controlnets",
    max_stack: 2,
    fields: [{ name: "strength", type: "float", default: 0.8 }],
    options: [
      {
        value: "depth",
        label: "Depth",
        tooltip: "depth map",
        model: "depth.safetensors",
        installed: true,
        defaults: { strength: 0.9 },
        metadata: { preprocessor: "depth_midas" },
      },
      {
        value: "pose",
        label: "Pose",
      },
    ],
  });
}

function scalarKind(): ModifierKindSpec {
  return kind({
    kind: "clip_skip",
    label: "Clip Skip",
    cardinality: "scalar",
    param_key: "clip_skip",
    fields: [{ name: "value", type: "integer", default: 2 }],
  });
}

function cnEntry(overrides: Partial<ControlNetEntry> = {}): ControlNetEntry {
  return {
    id: "cn-1",
    type: "depth",
    image_b64: "",
    strength: 0.9,
    enabled: true,
    source: "user",
    ...overrides,
  };
}

describe("subcardId / loraIdOf / normalizeLoraEntry", () => {
  it("keys controlnet rows by id with an empty fallback", () => {
    assert.equal(subcardId("controlnet", { id: "cn-1" }), "cn-1");
    assert.equal(subcardId("controlnet", {}), "");
  });

  it("prefixes lora rows, tolerating fossil name rows", () => {
    assert.equal(subcardId("lora", { id: "a" }), "lora-a");
    assert.equal(subcardId("lora", { name: "old" }), "lora-old");
    assert.equal(subcardId("lora", {}), "lora-");
  });

  it("loraIdOf prefers id, migrates name, trims", () => {
    assert.equal(loraIdOf({ id: "a" }), "a");
    assert.equal(loraIdOf({ name: "old" }), "old");
    assert.equal(loraIdOf({}), "");
    assert.equal(loraIdOf({ id: "  spaced  " }), "spaced");
  });

  it("normalizeLoraEntry emits id-keyed rows with the house default", () => {
    assert.deepEqual(normalizeLoraEntry({ name: "old", strength: 0.5 }), {
      id: "old",
      strength: 0.5,
    });
    assert.deepEqual(normalizeLoraEntry({ id: "a" }), { id: "a", strength: 1 });
    assert.deepEqual(
      normalizeLoraEntry({ id: "a", strength: "x" } as unknown as {
        id: string;
        strength?: number;
      }),
      { id: "a", strength: 1 },
    );
  });
});

describe("subcardsFromParams / loraLabel / subcardCount", () => {
  it("projects an empty bag to no subcards", () => {
    assert.deepEqual(subcardsFromParams({}), []);
  });

  it("projects lora rows with and without strength", () => {
    const cards = subcardsFromParams({
      loras: [{ id: "dir/style.safetensors", strength: 0.7 }, { id: "bare" }],
    });
    assert.equal(cards.length, 2);
    assert.deepEqual(cards[0], {
      id: "lora-dir/style.safetensors",
      kind: "lora",
      label: "style",
      name: "dir/style.safetensors",
      enabled: true,
      strength: 0.7,
      strengthSet: true,
    });
    assert.deepEqual(cards[1], {
      id: "lora-bare",
      kind: "lora",
      label: "bare",
      name: "bare",
      enabled: true,
      strength: 1,
      strengthSet: false,
    });
  });

  it("projects controlnet rows with the full entry shape", () => {
    const cards = subcardsFromParams({
      controlnets: [
        cnEntry({
          model: "m",
          preprocessor: "p",
          start_percent: 0,
          end_percent: 1,
        }),
      ],
    });
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0], {
      id: "cn-1",
      kind: "controlnet",
      label: "depth",
      enabled: true,
      strength: 0.9,
      type: "depth",
      model: "m",
      preprocessor: "p",
      image_b64: "",
      start_percent: 0,
      end_percent: 1,
    });
  });

  it("loraLabel strips dirs and known extensions, keeps the rest", () => {
    assert.equal(loraLabel("dir/style.safetensors"), "style");
    assert.equal(loraLabel("pose.pt"), "pose");
    assert.equal(loraLabel("body.ckpt"), "body");
    assert.equal(loraLabel("plain"), "plain");
    assert.equal(loraLabel("weird.bin"), "weird.bin");
    assert.equal(loraLabel("no-slash"), "no-slash");
  });

  it("subcardCount sums both wire arrays with absent-key zeros", () => {
    assert.equal(subcardCount({}), 0);
    assert.equal(
      subcardCount({ loras: [{ id: "a" }], controlnets: [cnEntry(), cnEntry()] }),
      3,
    );
  });
});

describe("moveItem", () => {
  it("returns the same array on every guard arm", () => {
    const arr = ["a", "b", "c"];
    assert.equal(moveItem(arr, 1, 1), arr);
    assert.equal(moveItem(arr, -1, 1), arr);
    assert.equal(moveItem(arr, 0, -1), arr);
    assert.equal(moveItem(arr, 3, 1), arr);
    assert.equal(moveItem(arr, 0, 3), arr);
  });

  it("moves forward and backward", () => {
    assert.deepEqual(moveItem(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
    assert.deepEqual(moveItem(["a", "b", "c"], 2, 0), ["c", "a", "b"]);
  });
});

describe("kindForId / applySubcardDrop", () => {
  const kinds = [scalarKind(), loraKind(), cnKind()];

  it("skips scalar kinds and matches list rows", () => {
    const params = {
      loras: [{ id: "a" }],
      controlnets: [cnEntry({ id: "cn-9" })],
      clip_skip: { value: 2 },
    };
    assert.equal(kindForId(params, "lora-a", kinds)?.kind, "lora");
    assert.equal(kindForId(params, "cn-9", kinds)?.kind, "controlnet");
    assert.equal(kindForId(params, "stale-handle", kinds), null);
    assert.equal(kindForId({}, "lora-a", kinds), null);
  });

  it("no-ops on unknown drags and cross-kind drops with stable identity", () => {
    const params = { loras: [{ id: "a" }], controlnets: [cnEntry()] };
    assert.equal(applySubcardDrop(params, "ghost", "lora-a", kinds), params);
    assert.equal(
      applySubcardDrop(params, "lora-a", "cn-1", kinds),
      params,
    );
    assert.equal(
      applySubcardDrop(params, "lora-a", "ghost", kinds),
      params,
    );
  });

  it("reorders within one kind, returning a fresh bag", () => {
    const params = { loras: [{ id: "a" }, { id: "b" }] };
    const next = applySubcardDrop(params, "lora-a", "lora-b", kinds);
    assert.notEqual(next, params);
    assert.deepEqual(next, { loras: [{ id: "b" }, { id: "a" }] });
  });

  it("keeps identity when the drop changes nothing", () => {
    const params = { loras: [{ id: "a" }] };
    assert.equal(applySubcardDrop(params, "lora-a", "lora-a", kinds), params);
  });
});

describe("newControlnetEntry / newLoraEntry", () => {
  it("refuses a full stack honoring kind max_stack and the default 3", () => {
    assert.equal(
      newControlnetEntry([cnEntry(), cnEntry()], "depth", cnKind()),
      null,
    );
    assert.equal(
      newControlnetEntry([cnEntry(), cnEntry(), cnEntry()], "depth", null),
      null,
    );
  });

  it("builds from the schema entry with option strength", () => {
    const entry = newControlnetEntry([], "depth", cnKind());
    assert.ok(entry);
    assert.equal(entry.type, "depth");
    assert.equal(entry.model, "depth.safetensors");
    assert.equal(entry.preprocessor, "depth_midas");
    assert.equal(entry.strength, 0.9);
    assert.equal(entry.start_percent, 0);
    assert.equal(entry.end_percent, 1);
    assert.equal(entry.enabled, true);
    assert.equal(entry.source, "user");
    assert.equal(entry.image_b64, "");
    assert.match(entry.id, /^cn-/);
  });

  it("falls back to the declared field default for unknown types", () => {
    const entry = newControlnetEntry([], "mystery", cnKind());
    assert.ok(entry);
    assert.equal(entry.type, "mystery");
    assert.equal(entry.model, undefined);
    assert.equal(entry.strength, 0.8);
  });

  it("falls back to 0.8 without a strength field or with a junk default", () => {
    const noField = kind({
      kind: "controlnet",
      param_key: "controlnets",
      fields: [],
      options: [],
    });
    assert.equal(newControlnetEntry([], "depth", noField)?.strength, 0.8);
    const junkDefault = kind({
      kind: "controlnet",
      param_key: "controlnets",
      fields: [{ name: "strength", type: "float", default: "high" }],
      options: [],
    });
    assert.equal(newControlnetEntry([], "depth", junkDefault)?.strength, 0.8);
    assert.equal(newControlnetEntry([], "depth", null)?.strength, 0.8);
  });

  it("newLoraEntry seeds the house default, overridable", () => {
    assert.deepEqual(newLoraEntry("a"), { id: "a", strength: 1 });
    assert.deepEqual(newLoraEntry("a", 0.5), { id: "a", strength: 0.5 });
  });
});

describe("newGenericEntry", () => {
  const listKind = kind({
    kind: "sampler_override",
    label: "Sampler",
    param_key: "sampler_override",
    max_stack: 1,
    fields: [
      { name: "method", type: "string", default: "ddim" },
      { name: "steps", type: "integer" },
      { name: "ratio", type: "float" },
      { name: "flag", type: "boolean" },
      { name: "preset", type: "select" },
      { name: "mask", type: "image" },
    ],
    options: [
      { value: "fast", label: "Fast", defaults: { steps: 10 } },
      { value: "full", label: "Full" },
    ],
  });

  it("refuses a full list honoring max_stack and the default 5", () => {
    assert.equal(newGenericEntry(listKind, 1, "fast"), null);
    const unbounded = kind({
      kind: "k",
      cardinality: "list",
      param_key: "k",
      fields: [],
    });
    assert.equal(
      newGenericEntry(unbounded, 5),
      null,
    );
  });

  it("prefers option defaults over field defaults over type zeros", () => {
    const entry = newGenericEntry(listKind, 0, "fast");
    assert.ok(entry);
    assert.equal(entry["method"], "ddim");
    assert.equal(entry["steps"], 10);
    assert.equal(entry["ratio"], 0);
    assert.equal(entry["flag"], false);
    assert.equal(entry["preset"], "");
    assert.equal(entry["mask"], "");
    assert.match(String(entry["id"]), /^cn-/);
    assert.equal(entry["value"], "fast");
  });

  it("carries no option value when the caller passes none", () => {
    const entry = newGenericEntry(listKind, 0);
    assert.ok(entry);
    assert.equal("value" in entry, false);
  });

  it("keeps the explicit value field when the kind stores it", () => {
    const withValue = kind({
      kind: "k",
      cardinality: "list",
      param_key: "k",
      fields: [{ name: "value", type: "string" }],
      options: [{ value: "v", label: "V" }],
    });
    const entry = newGenericEntry(withValue, 0, "v");
    assert.ok(entry);
    assert.equal(entry["value"], "");
  });

  it("scalar kinds return a bare dict with no id and no stack check", () => {
    const entry = newGenericEntry(scalarKind(), 99);
    assert.deepEqual(entry, { value: 2 });
  });

  it("null field defaults fall through to the type zero", () => {
    const nullish = kind({
      kind: "k",
      cardinality: "scalar",
      param_key: "k",
      fields: [{ name: "n", type: "integer", default: null }],
    });
    assert.deepEqual(newGenericEntry(nullish, 0), { n: 0 });
  });
});

describe("capability accessors", () => {
  it("loraAdaptersOf maps options, nulls to empty", () => {
    assert.deepEqual(loraAdaptersOf(null), []);
    assert.deepEqual(loraAdaptersOf(kind({ options: undefined })), []);
    const adapters = loraAdaptersOf(loraKind());
    assert.equal(adapters.length, 2);
    assert.deepEqual(adapters[0], {
      name: "style.safetensors",
      filename: "style.safetensors",
      label: "Style",
      category: "Style",
      default_strength: 0.7,
      prompt_hint: "in style",
      installed: true,
    });
    assert.deepEqual(adapters[1], {
      name: "bare.pt",
      filename: "bare.pt",
      label: "Bare",
      category: "LoRA",
      default_strength: 1,
      prompt_hint: null,
      installed: true,
    });
  });

  it("loraAdaptersOf honors explicit model/installed overrides", () => {
    const k = kind({
      options: [
        {
          value: "v",
          label: "V",
          model: "file.safetensors",
          installed: false,
        },
      ],
    });
    assert.deepEqual(loraAdaptersOf(k)[0], {
      name: "v",
      filename: "file.safetensors",
      label: "V",
      category: "LoRA",
      default_strength: 1,
      prompt_hint: null,
      installed: false,
    });
  });

  it("cnEntriesOf maps options with the strength fallback chain", () => {
    assert.deepEqual(cnEntriesOf(null), []);
    const entries = cnEntriesOf(cnKind());
    assert.equal(entries.length, 2);
    assert.deepEqual(entries[0], {
      type: "depth",
      label: "Depth",
      tooltip: "depth map",
      model: "depth.safetensors",
      default_strength: 0.9,
      preprocessor: "depth_midas",
      installed: true,
    });
    assert.deepEqual(entries[1], {
      type: "pose",
      label: "Pose",
      tooltip: undefined,
      model: undefined,
      default_strength: 0.8,
      preprocessor: undefined,
      installed: undefined,
    });
  });

  it("cnEntriesOf falls to 0.8 with no strength anywhere", () => {
    const k = kind({
      kind: "controlnet",
      param_key: "controlnets",
      fields: [],
      options: [{ value: "x", label: "X" }],
    });
    assert.equal(cnEntriesOf(k)[0].default_strength, 0.8);
  });

  it("cnEntriesOf maps absent options to empty", () => {
    assert.deepEqual(
      cnEntriesOf(kind({ kind: "controlnet", param_key: "controlnets" })),
      [],
    );
  });

  it("loraStrengthBoundsOf reads the field or the house bounds", () => {
    assert.deepEqual(loraStrengthBoundsOf(null), { min: -2, max: 5, step: 0.05 });
    assert.deepEqual(loraStrengthBoundsOf(kind({ fields: [] })), {
      min: -2,
      max: 5,
      step: 0.05,
    });
    assert.deepEqual(loraStrengthBoundsOf(loraKind()), {
      min: -2,
      max: 5,
      step: 0.05,
    });
    const custom = kind({
      fields: [{ name: "strength", type: "float", min: 0, max: 2, step: 0.1 }],
    });
    assert.deepEqual(loraStrengthBoundsOf(custom), { min: 0, max: 2, step: 0.1 });
    const nullish = kind({
      fields: [{ name: "strength", type: "float", min: null, max: null, step: null }],
    });
    assert.deepEqual(loraStrengthBoundsOf(nullish), {
      min: -2,
      max: 5,
      step: 0.05,
    });
  });

  it("modifiersFeatureOf reads only the declared list", () => {
    assert.deepEqual(modifiersFeatureOf(null), []);
    assert.deepEqual(modifiersFeatureOf({}), []);
    assert.deepEqual(modifiersFeatureOf({ features: {} }), []);
    assert.deepEqual(modifiersFeatureOf({ features: { modifiers: {} } }), []);
    const kinds = [loraKind()];
    assert.equal(
      modifiersFeatureOf({ features: { modifiers: kinds } }),
      kinds,
    );
  });

  it("hasModifierCapability mirrors list emptiness", () => {
    assert.equal(hasModifierCapability(null), false);
    assert.equal(hasModifierCapability({ features: { modifiers: [] } }), false);
    assert.equal(
      hasModifierCapability({ features: { modifiers: [loraKind()] } }),
      true,
    );
  });

  it("kindSpecOf finds by discriminator or nulls", () => {
    const formSpec = { features: { modifiers: [loraKind(), cnKind()] } };
    assert.equal(kindSpecOf(formSpec, "lora")?.param_key, "loras");
    assert.equal(kindSpecOf(formSpec, "ghost"), null);
    assert.equal(kindSpecOf(null, "lora"), null);
  });

  it("NO_CN_SCHEMA is the empty typed fallback", () => {
    assert.deepEqual(NO_CN_SCHEMA, { type: "", label: "" });
  });
});

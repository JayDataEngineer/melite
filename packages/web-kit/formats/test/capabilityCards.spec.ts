// capabilityCards.spec.ts — capability/family → card derivation:
// prompt/slot seeding, route resolution, drag payloads.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  CAPABILITY_DRAG_MIME,
  capabilityDragPayload,
  capabilityToCard,
  familyEntryToCard,
  parseCapabilityDrop,
  seededParams,
} from "../src/capabilityCards.ts";
import type { PickedCard } from "../src/capabilityCards.ts";
import type {
  CapabilityEntry,
  CapabilityRoute,
  Catalog,
  FamilyEntry,
} from "@melite/catalog";

function catalog(
  models: Record<string, unknown> = {},
  families: Record<string, unknown> = {},
): Catalog {
  return { models, families } as unknown as Catalog;
}

function cap(over: Record<string, unknown> = {}): CapabilityEntry {
  return { label: "Generate", ...over } as unknown as CapabilityEntry;
}

function route(over: Record<string, unknown> = {}): CapabilityRoute {
  return { model: "m", params: {}, ...over } as unknown as CapabilityRoute;
}

function fam(over: Record<string, unknown> = {}): FamilyEntry {
  return { ...over } as unknown as FamilyEntry;
}

describe("seededParams", () => {
  it("null catalog seeds a prompt (unknown → seed, old behavior)", () => {
    assert.deepEqual(seededParams(null, "m"), { prompt: "" });
  });

  it("merges base under seeded keys", () => {
    assert.deepEqual(seededParams(null, "m", { steps: 10 }), { steps: 10, prompt: "" });
  });

  it("skips the prompt when prompt_in_form is false", () => {
    const cat = catalog({ m: { prompt_in_form: false } });
    assert.deepEqual(seededParams(cat, "m"), {});
  });

  it("seeds one null per declared input slot", () => {
    const cat = catalog({ m: { input_slots: ["a", "b"], prompt_in_form: false } });
    assert.deepEqual(seededParams(cat, "m"), { a: null, b: null });
  });

  it("falls back to the singular input slot", () => {
    const cat = catalog({ m: { input: "image", prompt_in_form: false } });
    assert.deepEqual(seededParams(cat, "m"), { image: null });
  });

  it("prefers input_slots over singular input", () => {
    const cat = catalog({ m: { input_slots: ["x"], input: "y", prompt_in_form: false } });
    assert.deepEqual(seededParams(cat, "m"), { x: null });
  });
});

describe("capabilityToCard", () => {
  it("generation capability seeds prompt + slots", () => {
    const cat = catalog(
      { m: { family: "f", input_slots: ["image"], prompt_in_form: true, defaults: { steps: 8 } } },
      { f: { genre: "image" } },
    );
    const card = capabilityToCard(cat, cap({}), route({ model: "m", params: { steps: 8 } }));
    assert.equal(card.service, "m");
    assert.equal(card.title, "Generate");
    assert.equal(card.genre, "image");
    assert.deepEqual(card.params, { steps: 8, prompt: "", image: null });
    assert.equal("kind" in card, false);
  });

  it("explicit generation kind still seeds", () => {
    const card = capabilityToCard(null, cap({ kind: "generation" }), route());
    assert.deepEqual(card.params, { prompt: "" });
  });

  it("model-less (input) capabilities carry params verbatim + kind", () => {
    const card = capabilityToCard(
      catalog({ m: {} }),
      cap({ kind: "input", label: "Media Prep" }),
      route({ model: "m", params: { crop: true } }),
    );
    assert.deepEqual(card.params, { crop: true });
    assert.equal(card.kind, "input");
  });

  it("null catalog yields undefined genre", () => {
    const card = capabilityToCard(null, cap({}), route());
    assert.equal(card.genre, undefined);
  });
});

describe("familyEntryToCard", () => {
  it("uses the declared default_model when it is a member", () => {
    const cat = catalog(
      {
        "mask-studio": { family: "mask_studio", defaults: { a: 1 } },
        other: { family: "mask_studio" },
      },
      { mask_studio: { genre: "image" } },
    );
    const card = familyEntryToCard(cat, "mask_studio", fam({ default_model: "mask-studio", label: "Mask" }));
    assert.equal(card.service, "mask-studio");
    assert.equal(card.title, "Mask");
  });

  it("falls back to the member keyed by family id", () => {
    const cat = catalog({ fam1: { family: "fam1" }, zz: { family: "fam1" } });
    const card = familyEntryToCard(cat, "fam1", fam({ default_model: "nope", label: "F" }));
    assert.equal(card.service, "fam1");
  });

  it("falls back to the first member, then the bare family id", () => {
    const cat = catalog({ aa: { family: "fam1" }, bb: { family: "fam1" } });
    assert.equal(familyEntryToCard(cat, "fam1", fam({})).service, "aa");
    assert.equal(familyEntryToCard(catalog(), "ghost", fam({})).service, "ghost");
  });

  it("uses the family id as title when label is absent", () => {
    assert.equal(familyEntryToCard(catalog(), "ghost", fam({})).title, "ghost");
  });

  it("prefers the family genre, else the route genre, else undefined", () => {
    const cat = catalog({ r: { family: "f" } }, { f: { genre: "video" } });
    assert.equal(familyEntryToCard(cat, "f", fam({ genre: "avatar", label: "L" })).genre, "video");
    const nocat = familyEntryToCard(null, "f", fam({ genre: "image" }));
    assert.equal(nocat.genre, "image");
    assert.equal(familyEntryToCard(null, "f", fam({ genre: "avatar" })).genre, undefined);
  });
});

describe("capability drag payload", () => {
  it("exposes the drag MIME", () => {
    assert.equal(CAPABILITY_DRAG_MIME, "application/tech-noir-capability");
  });

  it("round-trips a picked card with capId", () => {
    const card: PickedCard = { service: "m", title: "T", params: { a: 1 } };
    const raw = capabilityDragPayload("cap1", card);
    assert.deepEqual(parseCapabilityDrop(raw), { service: "m", title: "T", params: { a: 1 }, capId: "cap1" });
  });

  it("rejects empty / malformed / shapeless payloads", () => {
    assert.equal(parseCapabilityDrop(""), null);
    assert.equal(parseCapabilityDrop("not-json{"), null);
    assert.equal(parseCapabilityDrop(JSON.stringify({ title: "T", params: {} })), null);
    assert.equal(parseCapabilityDrop(JSON.stringify({ service: "m", params: {} })), null);
    assert.equal(parseCapabilityDrop(JSON.stringify({ service: "m", title: "T" })), null);
    assert.equal(parseCapabilityDrop(JSON.stringify({ service: "m", title: "T", params: 5 })), null);
    assert.equal(parseCapabilityDrop(JSON.stringify({ service: 7, title: "T", params: {} })), null);
  });
});

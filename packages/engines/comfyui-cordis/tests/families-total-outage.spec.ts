// families-total-outage.spec.ts — zero survivors REFUSES (the plugin
// law's own fence, 2026-11-17): absences are SINGLE families, never
// the estate — an install where every family package fails to load
// is an estate defect, not plugin absence, and the boot must say so.
// The real-door half is the L2 wall's total-outage arm (child
// process, resolve hook); this spec owns the in-pool refusal.
import { describe, it, expect, vi } from "vitest";

vi.mock("@melite/models-anny", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-anny' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-fit", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-fit' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-pixal3d", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-pixal3d' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-skin", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-skin' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-somax", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-somax' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-transfer-rig", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-transfer-rig' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-trellis2-native", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-trellis2-native' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-moss-sfx", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-moss-sfx' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-music3", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-music3' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-yue2", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-yue2' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-seed-vc", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-seed-vc' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-qwen3-tts", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-qwen3-tts' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-anima", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-anima' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-fibo2-edit", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-fibo2-edit' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-florence2", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-florence2' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-flux-klein", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-flux-klein' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-h3-image", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-h3-image' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-h3-image-edit", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-h3-image-edit' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-input", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-input' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-joycaption", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-joycaption' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-joytag", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-joytag' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-krea-2", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-krea-2' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-mask", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-mask' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-moss-image", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-moss-image' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-qwen-img-21", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-qwen-img-21' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-qwen-img-edit-21", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-qwen-img-edit-21' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-seedvr2-ema", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-seedvr2-ema' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-wd14", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-wd14' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-z-image", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-z-image' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-kimodo", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-kimodo' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-gem-soma", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-gem-soma' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-concat", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-concat' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});

vi.mock("@melite/models-h3", () => {
  throw Object.assign(new Error("Cannot find package '@melite/models-h3' (PRUNED by the total-outage spec)"), { code: "ERR_MODULE_NOT_FOUND" });
});
import { loadFamilies } from "../src/models/families/index.ts";

describe("a total family-plane outage refuses the load", () => {
  it("zero survivors reject with the estate-defect voice", async () => {
    await expect(loadFamilies()).rejects.toThrow(
      /total family outage: all 33 family packages failed to load \(the install is broken, not pruned/,
    );
  });
});

// engine-capture-allocator.spec.ts — THE CAPTURE-ALLOCATOR LAW (burn #4,
// 2026-10-22): qwen3-tts CUDA graph capture is incompatible with the
// cudaMallocAsync allocator — the torch-2.0+ default ComfyUI launches
// with unless told otherwise. The live burn: the studio/VoiceDesign
// load passed its VRAM gate with the card 90% free, then the warmup's
// capture-time Triton matmul died with "Pointer argument cannot be
// accessed from Triton (cpu tensor?)" — bisected standalone (async
// allocator burns, native passes). The cure rides two planes: the
// estate's engine unit launches with --disable-cuda-malloc (declared
// in estate-provision capabilities.yaml, proven by that repo's pytest
// tier — the sibling repo owns that plane), and THIS wall judges the
// estate-owned vendored seat: the loader must REFUSE the load naming
// the cure flag BEFORE any weights land, never die opaquely mid-capture.
// A silent eager fallback is banned: refusal with the cure named is
// the contract (misconfiguration fails loud at load).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ENGINE = join(import.meta.dirname,
  "../../../../vendor/comfyui_extensions/melite-audio-nodes/engines/qwen3_tts.py");

function src(): string {
  return readFileSync(ENGINE, "utf-8");
}

function fnBody(text: string, name: string): string {
  const start = text.indexOf(`def ${name}(`);
  assert.ok(start >= 0, `no def ${name} in the vendored engine — the seat moved`);
  const next = text.indexOf("\ndef ", start + 1);
  return text.slice(start, next < 0 ? undefined : next);
}

describe("the capture-allocator law (burn #4: Triton pointer death under cudaMallocAsync)", () => {
  it("the vendored loader refuses cudaMallocAsync before any weights land", () => {
    const body = fnBody(src(), "_load_warmed_handle");
    const refuse = body.indexOf("cudaMallocAsync");
    const load = body.indexOf("from_pretrained(");
    assert.ok(refuse >= 0,
      "the loader never names cudaMallocAsync — the fourth-burn refusal is gone");
    assert.ok(load > refuse,
      "the allocator refusal must fire BEFORE from_pretrained loads weights — " +
      "a post-load refusal is the burn shape (starved capture after the load)");
  });

  it("the refusal names the operator-actionable cure, not a bare error", () => {
    const body = fnBody(src(), "_load_warmed_handle");
    assert.match(body, /--disable-cuda-malloc/u,
      "the refusal must name --disable-cuda-malloc — the cure is one restart away");
    assert.match(body, /get_allocator_backend/u,
      "the refusal must read the live allocator (get_allocator_backend), not a guess");
  });

  it("the refusal raises — no silent eager fallback", () => {
    const body = fnBody(src(), "_load_warmed_handle");
    const refuse = body.indexOf("cudaMallocAsync");
    const clause = body.slice(refuse, refuse + 600);
    assert.match(clause, /raise RuntimeError/u,
      "under cudaMallocAsync the loader must RAISE — a graphs-off fallback " +
      "masks the misconfiguration and silently costs capture");
  });
});

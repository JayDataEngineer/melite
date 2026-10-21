import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  RECORD_PACK,
  parseRequirementPins,
  recordPinnedSet,
  rowSharedDepDeltas,
  sharedDepDeltas,
} from "../scripts/provision-shared-deps.ts";

// THE SHARED-DEP GUARD (ERRORS_2 2026-11-10, the owed SYSTEMIC wall):
// NO extension leg may upgrade a pinned shared dep under a live engine.
// Manager's git-url door runs the pack's requirements.txt pip leg inside
// the install request — this wall judges the guard that refuses a row
// whose pip leg would move a record-pinned dep, BEFORE Manager opens the
// venv. Red-first: every arm below fired on the guard-less tree (the
// toggle receipt).

/** The record's own pinned pair (the vendored truth the guard serves). */
const RECORD_TEXT = [
  "# the record pack — byte-identical across the audio triple",
  "av",
  "huggingface_hub==1.33.0",
  "qwen-tts==0.1.1",
  "transformers==5.1.0",
  "",
].join("\n");

/** A temp vendored tree with the record pack plus one sibling pack.
 * @param siblingText the sibling pack's requirements.txt (undefined
 * seats no sibling).
 * @returns the vendor root path (cleaned on test finish). */
function vendorTree(siblingText?: string): string {
  const root = mkdtempSync(join(tmpdir(), "shared-dep-guard-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, RECORD_PACK), { recursive: true });
  writeFileSync(join(root, RECORD_PACK, "requirements.txt"), RECORD_TEXT);
  if (siblingText !== undefined) {
    mkdirSync(join(root, "melite-stranger-nodes"), { recursive: true });
    writeFileSync(join(root, "melite-stranger-nodes", "requirements.txt"), siblingText);
  }
  return root;
}

describe("THE SHARED-DEP GUARD (ERRORS_2 2026-11-10 — no extension leg may upgrade a pinned shared dep under a live engine)", () => {
  it("ARM 1 — the record parser carries exactly the == pins, never floats or comments", () => {
    const pins = parseRequirementPins(RECORD_TEXT);
    assert.equal(pins.size, 3, "three == pins in the record text");
    assert.equal(pins.get("transformers"), "5.1.0");
    assert.equal(pins.get("huggingface_hub"), "1.33.0");
    assert.equal(pins.get("qwen-tts"), "0.1.1");
    assert.equal(pins.has("av"), false, "a floating row is never a pin");
  });

  it("ARM 2 — an UPGRADE refuses: transformers==6.0.0 against the 5.1.0 record names the delta", () => {
    const deltas = sharedDepDeltas(
      RECORD_TEXT.replace("transformers==5.1.0", "transformers==6.0.0"),
      parseRequirementPins(RECORD_TEXT),
    );
    assert.equal(deltas.length, 1, "exactly the moved dep");
    assert.match(deltas[0]!, /transformers==6\.0\.0 \(record pins ==5\.1\.0\)/,
      "the refusal names the wanted version AND the record pin");
  });

  it("ARM 3 — a DOWNGRADE refuses too: 4.57.3 is the pin the py3.14 re-pin killed — both directions move the live venv", () => {
    const deltas = sharedDepDeltas(
      RECORD_TEXT.replace("transformers==5.1.0", "transformers==4.57.3"),
      parseRequirementPins(RECORD_TEXT),
    );
    assert.equal(deltas.length, 1);
    assert.match(deltas[0]!, /transformers==4\.57\.3/);
  });

  it("ARM 4 — an in-band pack answers EMPTY: agreeing pins never block an install", () => {
    assert.deepEqual(sharedDepDeltas(RECORD_TEXT, parseRequirementPins(RECORD_TEXT)), []);
  });

  it("ARM 5 — a MENTIONED-but-unpinned record dep refuses (pip would float it); a pack that never mentions the dep is clean — it installs nothing for it", () => {
    const floating = sharedDepDeltas(
      RECORD_TEXT.replace("huggingface_hub==1.33.0", "huggingface_hub"),
      parseRequirementPins(RECORD_TEXT),
    );
    assert.equal(floating.length, 1);
    assert.match(floating[0]!, /huggingface_hub unpinned \(record pins ==1\.33\.0/);

    const absent = sharedDepDeltas(
      RECORD_TEXT.replace("huggingface_hub==1.33.0\n", ""),
      parseRequirementPins(RECORD_TEXT),
    );
    assert.deepEqual(absent, [],
      "a pack whose requirements never mention the record dep cannot move it");
  });

  it("ARM 6 — THE DOOR reads the pack's vendored twin: a drifted twin blocks, an agreeing twin passes, no twin passes (the stranger path)", () => {
    const drifted = vendorTree(
      RECORD_TEXT.replace("transformers==5.1.0", "transformers==6.0.0"));
    assert.equal(rowSharedDepDeltas(drifted, "melite-stranger-nodes").length, 1,
      "the drifted twin's row is refused at the door");

    const agreeing = vendorTree(RECORD_TEXT);
    assert.deepEqual(rowSharedDepDeltas(agreeing, "melite-stranger-nodes"), [],
      "the agreeing twin's row passes to Manager");

    const twinless = vendorTree();
    assert.deepEqual(rowSharedDepDeltas(twinless, "melite-never-vendored"), [],
      "a row with no vendored twin carries no readable at-pin truth here — the stranger path");
  });

  it("ARM 7 — a missing RECORD pack is a loud throw, never a vacuous pass (the record IS the pin set)", () => {
    const root = mkdtempSync(join(tmpdir(), "shared-dep-guard-"));
    onTestFinished(() => rmSync(root, { recursive: true, force: true }));
    assert.throws(() => recordPinnedSet(root),
      /ENOENT/,
      "the record pack's absence must refuse, not silently guard nothing");
  });

  it("ARM 8 — the REAL vendored tree guards clean: every vendored pack agrees with the record today (the estate's own packs never move the pins)", () => {
    const realRoot = join(import.meta.dirname, "..", "..", "..", "..",
      "vendor", "comfyui_extensions");
    const record = recordPinnedSet(realRoot);
    assert.ok(record.size >= 3, "the real record carries its pins");
    for (const dir of readdirSync(realRoot)) {
      const deltas = rowSharedDepDeltas(realRoot, dir);
      assert.deepEqual(deltas, [],
        `vendored pack ${dir} would move a pinned shared dep: ${deltas.join("; ")}`);
    }
  });

  it("ARM 9 — THE WIRING: both pending.push sites in the install door carry the guard call (deleting the wiring is the toggle this arm reds on)", () => {
    const doorSource = readFileSync(
      join(import.meta.dirname, "..", "scripts", "provision-extensions-install.ts"), "utf8");
    const pushes = doorSource.match(/pending\.push\(\{ name, url, ref \}\)/g) ?? [];
    assert.equal(pushes.length, 2, "the two push sites (fresh + drift-converge) — recount when the door changes");
    const guardCalls = doorSource.match(/rowSharedDepDeltas\(/g) ?? [];
    assert.equal(guardCalls.length, 2,
      "every push to Manager's pip leg passes the shared-dep guard first");
  });
});

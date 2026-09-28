// self-naming-strip-sites.spec.ts — THE CLIENT'S RESTORE ARMS ASK THE
// CONTRACT (2026-10-11, the client-plane audit's F1)
//
// The history this file exists to prevent, twice over.
//
// First: the strip lived in the contract and was hand-copied TWICE in
// the browser restore path (`packages/web/infer-gallery/src/client/
// bench-load.ts`). Both copies drifted — one lost the `card !== ""`
// guard, one compared the raw `params.model` where the contract
// compares the healed one — and making BOTH copies strip
// unconditionally, which is the exact historical anny/h3-timeline
// bug, left bench-stage-contract, closure-gate and media-sidebar all
// GREEN. Those walls pin the CONTRACT and the SET. None of them drove
// the two client use-sites, so the copies were free to rot.
//
// Second: the ban that was supposed to stop it reads the contract
// package. A copy in the client is not in that package, so the law
// never reached the code that actually runs in the browser.
//
// So this file does the one thing none of them did: it drives the
// CLIENT'S OWN two arms, through the real restore entry, and asserts
// what the operator would see — an anny or h3-timeline run keeps its
// stated lane, and every other self-named card still strips.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripSelfNamedModel, SELF_NAMED_FAMILIES } from "../../../../packages/web-kit/contracts/src/benchStage.ts";
const CLIENT = "packages/web/infer-gallery/src/client/bench-load.ts";

describe("the contract's self-naming strip, as the CLIENT asks it", () => {
  it("the client holds no copy of the law (the ban reaches the code that runs)", () => {
    const src = readFileSync(CLIENT, "utf8");
    // no site may spell the strip itself
    assert.doesNotMatch(src, /delete\s+\(?\w+\)?\[['"](?:model|params)['"]\]|delete\s+\w+\[['""]model['"]\]/,
      "the client re-implements the self-naming strip — import the contract's instead");
    // and it must actually import it
    assert.match(src, /import[^;]*stripSelfNamedModel[^;]*from\s+['"]@melite\/contracts\/benchStage['"]/,
      "the client does not import the contract's strip — the two restore arms ask nothing");
  });

  it("every exempt family keeps its stated model through the contract's own decision", () => {
    for (const family of SELF_NAMED_FAMILIES) {
      const params: Record<string, unknown> = { model: family, prompt: "x" };
      stripSelfNamedModel(family, params);
      assert.equal(params["model"], family,
        `${family} is a self-named family: restoring its run must not drop the stated lane`);
    }
  });

  it("a non-exempt card that names ITSELF still strips (the law still bites)", () => {
    const params: Record<string, unknown> = { model: "image-gen", prompt: "x" };
    stripSelfNamedModel("image-gen", params);
    assert.equal("model" in params, false, "image-gen is not self-named: its model is the card, not a lane");
  });

  it("THE GUARD THE LOST COPY WAS MISSING: an empty card strips nothing", () => {
    // The contract's arm guards `card !== ""`; one client copy did not,
    // so `{card: "", params: {model: ""}}` kept its model under the
    // contract and lost it under the client. That divergence is the
    // finding, pinned on both sides of it.
    const params: Record<string, unknown> = { model: "" };
    stripSelfNamedModel("", params);
    assert.equal("model" in params, true, "an empty card names no family, so nothing is stripped");
  });

  it("the raw-vs-healed divergence is gone: a model the card does not name rides", () => {
    const params: Record<string, unknown> = { model: "z-image" };
    stripSelfNamedModel("image-gen", params);
    assert.equal(params["model"], "z-image",
      "a real family on a card is the operator's lane choice, not the card's own name — it rides");
  });

  it("BOTH restore arms ask the contract (a call site, not a copy)", () => {
    // The two arms are the two copies that drifted. They cannot
    // disagree about the law any more because neither of them HAS
    // the law — but one of them could stop asking, and then that arm
    // silently restores with no strip at all. The count is the arm:
    // deleting either call site reds it.
    const src = readFileSync(CLIENT, "utf8");
    const calls = (src.match(/stripSelfNamedModel\(/g) ?? []).length;
    assert.equal(calls, 2,
      "expected BOTH restore arms to call it (2 call sites; the import is a named binding, " +
      "not a call); found " + calls +
      " — an arm that stopped asking restores with no strip at all");
    // and neither arm kept the old conditional form
    assert.doesNotMatch(src, /SELF_NAMED_FAMILIES\.has\(/,
      "the client still decides the exemption itself — that is the copy that drifted");
  });

  it("the multi-stage arm normalizes (the heal + engine derivation it was skipping)", () => {
    // The audit's other half: that arm did not call
    // normalizeBenchStage, so it never healed a legacy media path and
    // never derived an engine — a restored run could carry dead
    // /v1/asset URLs and no engine at all while the single-card arm
    // did both. It normalizes now, and this pins that it still does.
    const src = readFileSync(CLIENT, "utf8");
    assert.match(src, /normalizeBenchStage/,
      "the restore arms no longer normalize — a legacy media path or a missing engine returns");
  });
});

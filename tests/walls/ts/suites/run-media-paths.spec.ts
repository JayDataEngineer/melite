import "../../../helpers/boot-models.ts";
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mediaPrefixOf, canonicalMediaUrl, MEDIA_PREFIX, LEGACY_MEDIA_PREFIX } from "../../../../packages/estate/media/src/index.ts";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { CHANNEL_EXTS, assertPublishedOutputChannels, publishOutputChannels } from "../../../../packages/engines/comfyui-cordis/src/comfyui-outputs.ts";
import { resolveCardFlowOutputs } from "../../../../packages/engines/comfyui-cordis/src/service.ts";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);

// THE RUN-MEDIA PATH LAW (operator, 2026-10-10: "When the card goes
// into history, and is reloaded, it doesn't preserve the paths for
// the inputs and image inputs, everything breaks on reloading a
// historical flow" and "THERE IS NO FILTER, NO BREAKAGE FROM THIS.
// EVER.").
//
// The paths WERE preserved — they addressed `/v1/assets/runs/`, the
// spelling that died with the gateway app, so a reloaded flow pointed
// every image and audio input at a route that answered nothing. The
// law: BOTH spellings address the same bytes (one route, two names),
// and no writer mints the dead one.
describe("the run-media path law — no stored path ever breaks", () => {
  it("both spellings resolve to one run-relative path", () => {
    const live = "/melite-media/runs/run-abc/generate/img_00001_.png";
    const legacy = "/v1/assets/runs/run-abc/generate/img_00001_.png";
    expect(mediaPrefixOf(live)).toBe(MEDIA_PREFIX);
    expect(mediaPrefixOf(legacy)).toBe(LEGACY_MEDIA_PREFIX);
    // the relative part is identical — the confinement, the loud 404
    // and the realpath containment are ONE handler's
    expect(canonicalMediaUrl(legacy)).toBe(live);
    // a path that is not run media rides verbatim (a local file, an
    // https URL, a $spell — the heal is not a filter)
    for (const keep of [
      "/home/user/data/inputs/a.png",
      "https://example.test/a.png",
      "$input_images",
      "generate/img_00001_.png",
      "/v1/assets/inputs/a.png",
    ]) {
      expect(canonicalMediaUrl(keep), keep).toBe(keep);
      expect(mediaPrefixOf(keep), keep).toBeNull();
    }
  });

  it("the LIVE bench's own paths resolve (the corpus the operator reloads)", (t) => {
    // The operator's benches live in the profile's storage, not the
    // runs tree. This walks the real bench docs and asks the only
    // question code can answer about each: does the path ADDRESS a
    // run artifact under a manifest root? (An artifact deleted by the
    // queue's own sweep is a data fact, not a code law — it is
    // counted and printed, never failed here.)
    const benchRoots = [
      // (single-setup law 2026-10-18: the repo-local fossil home's
      // drafts root sat here first — the home is gone, so the live
      // runs tree is the only corpus)
      "data/runs/drafts",
    ].filter((r) => existsSync(r));
    const runRoots = ["data/runs/output", "data/runs/test-output"].filter((r) => existsSync(r));
    if (benchRoots.length === 0 || runRoots.length === 0) {
      // A bare return here counted as PASS on a fresh clone (the
      // audit's GAP 4) — a sweep that cannot run says SKIPPED.
      t.skip(true, "no bench docs or runs tree on this clone — the live-bench sweep cannot run");
      return;
    }
    const pat = /\/(?:melite-media|v1\/assets)\/runs\/([A-Za-z0-9_-]+)\/([^"\\\s]+)/g;
    let total = 0;
    let live = 0;
    let swept = 0;
    const malformed: string[] = [];
    for (const dir of benchRoots) {
      for (const f of readdirSync(dir)) {
        if (!f.endsWith(".json")) continue;
        const text = readFileSync(join(dir, f), "utf8");
        for (const m of text.matchAll(pat)) {
          total += 1;
          const rel = m[2] ?? "";
          if (rel === "" || rel.includes("..")) { malformed.push(f + " " + m[0]); continue }
          if (runRoots.some((r) => existsSync(join(r, m[1] ?? "", rel)))) live += 1;
          else swept += 1;
        }
      }
    }
    console.log(`live benches: ${String(total)} path(s) — ${String(live)} resolve, ${String(swept)} point at swept artifacts`);
    expect(malformed, malformed.join("\n")).toEqual([]);
    // THE LAW: every path is well-formed and addresses the run-media
    // grammar. Whether the artifact still exists is the queue's
    // retention, reported above — never a code refusal.
    expect(total > 0, "the sweep saw no bench paths at all — is the corpus path right?").toBe(true);
  });
});

// THE PUBLISH-PLANE COVERAGE LAW (the tagger gap, 2026-10-24 — the
// documented twin of the stroke-103 mask/seg debt): the tagger card
// declared flowKinds.outputs { default: 'text' } with no CHANNEL_EXTS
// row and no flowOutputBinding, so publishOutputChannels skipped the
// channel SILENTLY (`if (!exts) continue`), the assert exempted it,
// and the merge path resolved {} — every tagger run published zero
// OUTPUT with no refusal. Two arms: (1) the coverage census — every
// declared output kind is row-covered or a justified semantic kind;
// (2) the merge-path round-trip — the tagger's default channel
// resolves to its SaveText mint and the harvested .txt publishes.
describe("the publish-plane coverage law — every declared output kind publishes", () => {
  it("every flowKinds.outputs kind across live cardDefs is row-covered or a bound semantic kind (an unbound rowless kind skips SILENTLY)", async () => {
    const defs = await loadCardDefs();
    const carriers = new Map<string, string[]>();
    // [card/channel] pairs carrying a rowless kind with NO binding —
    // the silent-skip shape (publish skips, the assert exempts).
    const silent: string[] = [];
    for (const def of defs.values()) {
      const bindings = def.flowOutputBindings ?? [];
      for (const [channel, kind] of Object.entries(def.flowKinds.outputs ?? {})) {
        const k = String(kind);
        const list = carriers.get(k) ?? [];
        list.push(`${def.id}/${channel}`);
        carriers.set(k, list);
        if (CHANNEL_EXTS[k] === undefined && !bindings.some((b) => b.channel === channel)) {
          silent.push(`${def.id}/${channel} carries rowless kind '${k}' with no binding`);
        }
      }
    }
    expect(silent, silent.join("\n")).toEqual([]);
    // THE CLOSED SEMANTIC SET: exactly two output kinds ride without
    // a CHANNEL_EXTS row — the bound semantic producers the bound arm
    // publishes kind-blind (no extension guessing): motion's motion_npz
    // ('data', via its KimodoTextToPose binding) and tts's voices
    // ('voice', via its MeliteQVoiceCopy binding). A third rowless kind
    // is the lesion (text was it); a new semantic kind updates this row
    // WITH its binding justification, never silently.
    const rowless = [...carriers.keys()].filter((k) => CHANNEL_EXTS[k] === undefined).sort();
    expect(rowless).toEqual(["data", "voice"]);
    // ... and every carrier of a semantic kind is bound (an unbound
    // carrier would skip silently — the first expect's shape).
    for (const k of rowless) {
      for (const carrier of carriers.get(k) ?? []) {
        const [cardId, channel] = carrier.split("/") as [string, string];
        const def = defs.get(cardId)!;
        expect(
          def.flowOutputBindings?.some((b) => b.channel === channel) ?? false,
          `${carrier} carries semantic kind '${k}' with no binding`,
        ).toBe(true);
      }
    }
  });

  it("the tagger merge path resolves its default channel to the SaveText mint (unbinding it vacates the merge assert)", async () => {
    const defs = await loadCardDefs();
    const def = defs.get("tagger");
    expect(def, "the composition root serves the tagger card").toBeDefined();
    const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });
    const wd14 = facts.models["wd14"]!;
    const g = new GraphBuilder();
    def!.compose(def!.schema({ input_image: "/m/p.png" }), wd14, g, "wall_tagger_merge");
    const graph = g.toJSON() as Record<string, unknown>;
    const { outputs, outputNodes } = resolveCardFlowOutputs(def!, { input_image: "/m/p.png" }, graph);
    // THE MERGE CONTRACT: the default channel resolves to the text
    // kind AND names its producer node — {} here is the vacuous
    // assert the gap hid behind.
    expect(outputs).toEqual({ default: "text" });
    const nodeId = outputNodes["default"];
    expect(nodeId, "the default channel names its SaveText producer").toBeDefined();
    expect((graph[String(nodeId)] as { class_type?: unknown })?.class_type).toBe("SaveText");
    // ... and the harvested SaveText mint round-trips through publish
    // + assert (no silent zero on the merge path).
    const art = "/wall/tagger/SaveText.0_tags_00001_.txt";
    const published = publishOutputChannels(
      outputs,
      [art],
      { default: String(nodeId) },
      [{ nodeId: String(nodeId), path: art, kind: "files" }] as never,
    );
    expect(published).toEqual({ default: art });
    expect(() =>
      assertPublishedOutputChannels(outputs, published, { default: String(nodeId) }),
    ).not.toThrow();
  });
});

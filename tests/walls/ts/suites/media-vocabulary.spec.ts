// media-vocabulary.spec.ts — THE ONE-CLASSIFIER WALL (the li-ay
// stroke, 2026-10-11). Four seats classified artifact names — the
// estate's disk-row hero (runsRegistry.enrichDiskRow), the run-list
// kind derivation, the gallery client's vocabulary, and the restore
// stamp's media filter (bench-load) — and the two PRIVATE-REGEX
// seats disagreed with the two VOCAB seats on both ends:
//
//   - svg/bmp: in the vocab (image), DROPPED by both hero regexes —
//     an svg-only run got no hero, no gallery, no preview;
//   - avif/m4v/avi: in BOTH hero regexes, in NO vocab — hero'd but
//     unclassifiable (the sidebar could not file them).
//
// The classifier is the contract's mediaKindOf now, every seat
// answers through it, and this wall holds: the absolute vocabulary
// pins (not derived — deleting an ext reds), the derivation (client
// + hero + stamp), the tail grammar (RUN_ID_RE, never a private
// "run-…" guess), and the closure ban on any future private
// extension regex.
import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mediaKindOf,
  mediaVocab,
  isMediaArtifactName,
  isEstateSidecarName,
  mediaKindsDisjoint,
} from "../../../../packages/web-kit/contracts/src/mediaKinds.ts";
import {
  benchSessionOf,
  runTailOf,
} from "../../../../packages/web-kit/contracts/src/benchStage.ts";
import { enrichDiskRow } from "../../../../packages/harness/estate-queue/src/runsRegistry.ts";
import { artifactType } from "../../../../packages/harness/estate-queue/src/runsList.ts";
import { cardPackages } from "../../../../packages/engines/comfyui-cordis/src/cardDefs.ts";
import { MEDIA_KINDS } from "../../../../packages/web/infer-gallery/src/client/media-kinds.ts";
import { loadRunOntoBench } from "../../../../packages/web/infer-gallery/src/client/bench-load.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "..", "..", "..", "..");

// ── 1. the classifier IS the vocabulary ──────────────────────────

describe("mediaKindOf — one classifier, derived from the vocab", () => {
  it("answers every vocabulary extension with its kind", () => {
    const vocab = mediaVocab();
    const kinds = ["image", "audio", "video", "model", "text"] as const;
    for (const kind of kinds) {
      for (const ext of vocab[kind]) {
        expect(mediaKindOf(`shot.${ext}`), `.${ext} must classify as ${kind}`).toBe(kind);
        expect(mediaKindOf(`SHOT.${ext.toUpperCase()}`), `case is no law: .${ext.toUpperCase()}`).toBe(kind);
      }
    }
  });

  it("refuses non-media honestly", () => {
    // notes.txt/run.json left this set with the text-kind stroke
    // (2026-10-24): txt/csv/md/json ARE media now — SaveText's own
    // format set. What stays refused: no extension, a trailing dot,
    // and extensions no engine mints.
    for (const name of ["noext", "trailing.", "notes.yaml", "data.jsonl"]) {
      expect(mediaKindOf(name), `${name} is not media`).toBeUndefined();
      expect(isMediaArtifactName(name), `${name} is not media`).toBe(false);
    }
  });

  it("THE SIDECAR LAW — bookkeeping is refused BY NAME, not by extension", () => {
    // json classifies as text (a real result.json is an artifact);
    // the harness's own `_request.json`/`_flow.json` are sidecars by
    // the underscore-prefix NAME law — the isEstateSidecarName
    // predicate is the one refusal, so a real artifact keeps its
    // extension and the bookkeeping stays invisible whatever it is
    // named after the underscore.
    for (const name of ["_request.json", "_flow.json", "_ledger.jsonl", "_poster.jpg"]) {
      expect(isEstateSidecarName(name), `${name} is a sidecar`).toBe(true);
    }
    expect(isEstateSidecarName("SaveText.0_tags_00001.txt")).toBe(false);
    expect(isEstateSidecarName("result.json")).toBe(false);
  });

  it("the ext sets are disjoint (one name, one kind — precedence never has to choose)", () => {
    expect(mediaKindsDisjoint(), "an ext in two kinds makes the classifier order-dependent").toBe(true);
  });

  // THE ABSOLUTE PINS — not derived from the vocab, so REMOVING an
  // extension from the vocab reds here. These are the exact
  // spellings the four seats used to disagree on.
  it("THE HISTORICAL DISAGREEMENT SET is absolute", () => {
    // the vocab extras the hero regexes DROPPED
    expect(mediaKindOf("a.svg"), "svg — dropped by both private hero regexes").toBe("image");
    expect(mediaKindOf("a.bmp"), "bmp — dropped by both private hero regexes").toBe("image");
    // the hero-regex extras the vocab did not carry
    expect(mediaKindOf("a.avif"), "avif — hero'd but unclassifiable").toBe("image");
    expect(mediaKindOf("a.m4v"), "m4v — hero'd but unclassifiable").toBe("video");
    expect(mediaKindOf("a.avi"), "avi — hero'd but unclassifiable").toBe("video");
    expect(mediaKindOf("a.mkv"), "mkv — in the vocab, never in the heroes' gallery").toBe("video");
    // the estate's own mints
    expect(mediaKindOf("a.png")).toBe("image");
    expect(mediaKindOf("a.flac")).toBe("audio");
    expect(mediaKindOf("a.mp4")).toBe("video");
    expect(mediaKindOf("a.glb")).toBe("model");
    // THE TEXT MINTS (the tagger stroke, 2026-10-24): SaveText's own
    // emitted spellings — the exact name a tagger run lands.
    expect(mediaKindOf("SaveText.0_tags_00001.txt")).toBe("text");
    expect(mediaKindOf("tags.csv")).toBe("text");
    expect(mediaKindOf("README.md")).toBe("text");
    expect(mediaKindOf("result.json")).toBe("text");
  });

  it("gallery extras classify but NEVER list (the listing is what the estate mints)", () => {
    const vocab = mediaVocab();
    const listed = new Set<string>([
      ...vocab.galleryImage, ...vocab.galleryAudio,
      ...vocab.galleryVideo, ...vocab.galleryModel,
      ...vocab.galleryText,
    ]);
    // every classify-only extra stays out of the listing
    for (const ext of ["svg", "bmp", "avif", "mkv", "m4v", "avi", "m4a", "aac"]) {
      expect(mediaKindOf(`a.${ext}`), `.${ext} classifies`).toBeDefined();
      expect(listed.has(ext), `.${ext} never lists`).toBe(false);
    }
    // every gallery ext classifies (a listing the classifier refuses is a dead row)
    for (const ext of listed) expect(mediaKindOf(`a.${ext}`)).toBeDefined();
  });
});

// ── 2. the client DERIVES (no second vocabulary) ─────────────────

describe("the gallery client's vocabulary is derived, never copied", () => {
  it("MEDIA_KINDS equals the contract's vocab (exts + gallery, kind for kind)", () => {
    const vocab = mediaVocab();
    const map = {
      video: { exts: vocab.video, gallery: vocab.galleryVideo },
      image: { exts: vocab.image, gallery: vocab.galleryImage },
      audio: { exts: vocab.audio, gallery: vocab.galleryAudio },
      model: { exts: vocab.model, gallery: vocab.galleryModel },
      text: { exts: vocab.text, gallery: vocab.galleryText },
    } as const;
    for (const kind of ["video", "image", "audio", "model", "text"] as const) {
      expect(MEDIA_KINDS.kinds[kind].exts, `${kind} exts are the vocab's`).toEqual([...map[kind].exts]);
      expect(MEDIA_KINDS.kinds[kind].gallery, `${kind} gallery is the vocab's`).toEqual([...map[kind].gallery]);
    }
    expect(MEDIA_KINDS.policy.maxListedImages).toBe(vocab.maxListedImages);
  });

  it("the presentation floor: labels and precedence are the client's own law", () => {
    expect(MEDIA_KINDS.kinds.video.label).toBe("Video");
    expect(MEDIA_KINDS.kinds.image.label).toBe("Images");
    expect(MEDIA_KINDS.kinds.audio.label).toBe("Audio");
    expect(MEDIA_KINDS.kinds.model.label).toBe("3D");
    expect(MEDIA_KINDS.kinds.text.label).toBe("Text");
    expect(Object.keys(MEDIA_KINDS.kinds)[0], "video classifies first").toBe("video");
  });

  it("the client module spells NO extension of its own", () => {
    const src = readFileSync(
      join(ROOT, "packages/web/infer-gallery/src/client/media-kinds.ts"), "utf8",
    );
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .split("\n")
      .filter((l: string) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
      .join("\n");
    expect(code, "no hand-copied extension list may return").not.toMatch(/'png'|'jpg'|'mp3'|'mp4'|'wav'|'glb'/);
    expect(code, "the derivation reads the contract's vocab").toMatch(/mediaVocab/);
  });
});

// ── 3. the estate's disk-row hero (enrichDiskRow, driven) ─────────

describe("enrichDiskRow — the disk hero answers through the classifier", () => {
  const row = (runId: string, artifacts: string[]): Record<string, unknown> => ({
    run_id: runId,
    stages: [{ id: "s_0", card: "image-gen" }],
    artifacts,
  });
  const RUN = "run-0f1e2d-abc";

  it("an svg-only disk run gets its hero and gallery (the dropped-kind repair)", () => {
    const out = enrichDiskRow(row(RUN, [`/data/output/${RUN}/diagram.svg`]));
    const stages = out["stages"] as Array<Record<string, unknown>>;
    expect(String(stages[0]?.["url"])).toMatch(/diagram\.svg$/);
    expect(stages[0]?.["gallery"]).toEqual([{ name: `diagram.svg` }]);
  });

  it("a bmp-only disk run heroes too; avif heroes AND classifies", () => {
    const bmp = enrichDiskRow(row(RUN, [`/data/output/${RUN}/scan.bmp`]));
    expect(String((bmp["stages"] as Array<Record<string, unknown>>)[0]?.["url"])).toMatch(/scan\.bmp$/);
    const avif = enrichDiskRow(row(RUN, [`/data/output/${RUN}/shot.avif`]));
    expect(String((avif["stages"] as Array<Record<string, unknown>>)[0]?.["url"])).toMatch(/shot\.avif$/);
    expect(mediaKindOf("shot.avif"), "the avif the hero took is classifiable").toBe("image");
  });

  it("a txt-only disk run gets its hero and gallery (the tagger repair, 2026-10-24)", () => {
    const out = enrichDiskRow(row(RUN, [`/data/output/${RUN}/tagger/SaveText.0_tags_00001.txt`]));
    const stages = out["stages"] as Array<Record<string, unknown>>;
    expect(String(stages[0]?.["url"])).toMatch(/SaveText\.0_tags_00001\.txt$/);
    expect(stages[0]?.["gallery"]).toEqual([{ name: "tagger/SaveText.0_tags_00001.txt" }]);
  });

  it("non-media artifacts still never ride the hero — the sidecar NAME law", () => {
    // json classifies as text now; `_request.json` is refused BY
    // NAME (isEstateSidecarName), not by extension — the bookkeeping
    // stays off the hero while a real result.json rides it.
    const out = enrichDiskRow(row(RUN, [
      `/data/output/${RUN}/_request.json`,
      `/data/output/${RUN}/_flow.json`,
    ]));
    expect((out["stages"] as Array<Record<string, unknown>>)[0]?.["url"]).toBeUndefined();
    const withReal = enrichDiskRow(row(RUN, [
      `/data/output/${RUN}/_request.json`,
      `/data/output/${RUN}/result.json`,
    ]));
    expect(String((withReal["stages"] as Array<Record<string, unknown>>)[0]?.["url"])).toMatch(/result\.json$/);
  });
});

// ── 4. the restore stamp (bench-load, driven through the door) ────

describe("the restore stamp — one classifier, one tail grammar", () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  const json = (body: unknown): Response =>
    new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

  function stubRun(flowArtifacts: string[], runId = "run-0f1e2d-rr") {
    const calls: Array<{ url: string; body?: unknown }> = [];
    vi.stubGlobal("fetch", vi.fn(async (input: unknown, init?: RequestInit): Promise<Response> => {
      const url = String(input);
      calls.push({ url, body: init?.body });
      if (url.startsWith("/infer-gallery/flow")) {
        return json({
          run_id: runId,
          flow: {
            artifacts: flowArtifacts,
            card_snapshot: { card: "image-gen", params: {} },
            bench_snapshot: { stages: [{ id: "s_0", card: "image-gen" }], intent: "i" },
          },
        });
      }
      if (url.startsWith("/v1/bench/")) return json({ rev: 1 });
      if (url.startsWith("/v1/bench/ensure")) return json({ ok: true });
      return json({ ok: true });
    }));
    return calls;
  }

  async function restoredPreview(artifacts: string[]): Promise<Record<string, unknown> | undefined> {
    const calls = stubRun(artifacts);
    const errors: string[] = [];
    await loadRunOntoBench("run-0f1e2d-rr", {
      openResource: () => {}, onError: (m: string) => { errors.push(m); }, sessionId: "s1",
    });
    expect(errors, "the restore must succeed").toEqual([]);
    const ensure = calls.find((c) => c.url === "/v1/bench/ensure");
    const body = JSON.parse(String(ensure?.body)) as { stages: Array<Record<string, unknown>> };
    const result = body.stages[0]?.["result"];
    return (result as Record<string, unknown> | undefined);
  }

  it("an svg-only run restores WITH its preview (the client seat answers through the classifier)", async () => {
    const result = await restoredPreview(["/data/run-0f1e2d-rr/diagram.svg"]);
    expect(String(result?.["url"])).toContain(encodeURIComponent("run-0f1e2d-rr/diagram.svg"));
  });

  it("an avif artifact rides the stamp's gallery and classifies", async () => {
    const result = await restoredPreview([
      "/data/run-0f1e2d-rr/film.mp4",
      "/data/run-0f1e2d-rr/poster.avif",
    ]);
    const artifacts = result?.["artifacts"] as Record<string, string>;
    expect(Object.keys(artifacts).some((k) => k.endsWith("poster.avif")), "avif rides the gallery").toBe(true);
    expect(mediaKindOf("poster.avif"), "and the sidebar can file it").toBe("image");
  });

  it("a run segment that is NOT a minted run id mints no artifact address (the tail grammar)", async () => {
    // 'run-ZZZ' is not run-<hex>-<base62>: the OLD private tailOf
    // accepted it and served an address for a directory no run owns.
    const result = await restoredPreview(["/data/run-ZZZ/stolen.png"]);
    expect(result, "no preview under a forged run directory").toBeUndefined();
  });
});

// ── 5. the preview seam (melite-card-view's consult, driven) ─────

describe("previewKindFor — the preview consult answers through the classifier", () => {
  it("classifies what the vocab classifies, under the UI's 'mesh' spelling", async () => {
    const { previewKindFor } = await import(
      join(ROOT, "packages/web/melite-card-view/src/client/preview-kinds.ts")
    );
    expect(previewKindFor("out.png")).toBe("image");
    expect(previewKindFor("diagram.svg"), "svg — the old sniff dropped it").toBe("image");
    expect(previewKindFor("scan.bmp"), "bmp — the old sniff dropped it").toBe("image");
    expect(previewKindFor("clip.mkv"), "mkv — the old sniff dropped it").toBe("video");
    expect(previewKindFor("tone.aac"), "aac — the old sniff dropped it").toBe("audio");
    expect(previewKindFor("body.glb"), "the vocab's 'model' is the UI's 'mesh'").toBe("mesh");
    // THE TEXT CURE (2026-10-24): a sniffed txt/json/csv/md previews
    // as TEXT — this arm pinned the old law (null) while the tagger's
    // output rendered nothing.
    expect(previewKindFor("SaveText.0_tags_00001.txt")).toBe("text");
    expect(previewKindFor("result.json")).toBe("text");
    expect(previewKindFor("tags.csv")).toBe("text");
    expect(previewKindFor("notes.md")).toBe("text");
    expect(previewKindFor("notes.yaml"), "yaml is no mint — still no preview").toBeNull();
    // a served url may carry a query — the classifier sees the NAME
    expect(previewKindFor("/x/out.png?token=3")).toBe("image");
  });
});

// ── 6. the contract's absolutes: tail grammar + session routing ──

describe("runTailOf — the tail grammar is the mint grammar", () => {
  it("takes the tail under a minted run id, last one wins", () => {
    expect(runTailOf("/data/output/run-0f1e2d-a/x.png")).toBe("run-0f1e2d-a/x.png");
    expect(runTailOf("/data/run-0f1e2d-a/tts/line.flac")).toBe("run-0f1e2d-a/tts/line.flac");
    expect(runTailOf("/pre/run-0f1e2d-outer/run-0f1e2d-inner/y.glb"))
      .toBe("run-0f1e2d-inner/y.glb");
  });
  it("refuses everything the mint grammar refuses", () => {
    // the OLD private spelling took all of these:
    expect(runTailOf("/data/run-ZZZ/x.png"), "no hex epoch").toBeUndefined();
    expect(runTailOf("/data/run-abc/x.png"), "epoch must be hex").toBeUndefined();
    expect(runTailOf("/data/xrun-0f1e2d-a/y.png"), "the segment must BE a run id").toBeUndefined();
    expect(runTailOf("/data/run-0f1e2d-a/"), "no leaf under the run dir").toBeUndefined();
    expect(runTailOf("/data/no/run/here.png")).toBeUndefined();
  });
});

describe("benchSessionOf — the sanitize decision, once", () => {
  it("keeps every legal session key verbatim", () => {
    expect(benchSessionOf("s1")).toBe("s1");
    expect(benchSessionOf("MAIN-2026_x")).toBe("MAIN-2026_x");
    expect(benchSessionOf("x".repeat(64))).toBe("x".repeat(64));
  });
  it("falls to 'main' for everything the grammar refuses", () => {
    expect(benchSessionOf(undefined)).toBe("main");
    expect(benchSessionOf("")).toBe("main");
    expect(benchSessionOf("bad id!")).toBe("main");
    expect(benchSessionOf("x".repeat(65))).toBe("main");
    expect(benchSessionOf("café")).toBe("main");
  });
});

// ── 7. THE OUTPUT-VISIBILITY CONTRACT (operator 2026-10-24: "we
// had no contract to test — can the output format be visible in the
// output preview? in the media sidebar?") ─────────────────────────
//
// The tagger's text output was invisible in BOTH planes and NO wall
// fired: this suite judged four kinds against a literal that itself
// lacked 'text'. Coverage's lesson — gaps between walls are the
// first finding class — applies INSIDE a wall too. Three arms, each
// judging one visibility edge through the REAL doors:
//
//   a. EVERY VOCAB KIND PREVIEWS — a card declaring that kind gets
//      a preview face (primaryKindFor answers it). A kind that
//      joins the vocab without a preview face is a dead tile.
//   b. EVERY VOCAB FAMILY EXT LISTS — the runs-list row mint
//      (artifactType) answers a listed kind for every family ext,
//      and classify-only extras answer "file" (never list).
//   c. EVERY REAL CARD'S DECLARED KIND IS VISIBLE — the
//      cardPackages census: a declared outputs.default must be a
//      vocab kind (mesh is the UI spelling of model) or one of the
//      two seated specials (seg falls to the url sniff; report
//      rides ReportView). A card declaring anything else ships
//      invisible output — exactly the tagger's disease.

describe("THE OUTPUT-VISIBILITY CONTRACT — every minted format is seen", () => {
  it("a. every vocab kind PREVIEWS (a declared spec of that kind answers a preview face)", async () => {
    const { primaryKindFor } = await import(
      join(ROOT, "packages/web/melite-card-view/src/client/preview-kinds.ts")
    );
    const FAMILIES = ["image", "audio", "video", "model", "text"] as const;
    for (const kind of FAMILIES) {
      // the DECLARED spelling is the UI's: cards declare 'mesh' for
      // the vocab's 'model' family (the census proves both spellings
      // live — the wall judges both).
      const declared = kind === "model" ? "mesh" : kind;
      const spec = { outputs: { default: declared } };
      expect(
        primaryKindFor(spec, ""),
        `a card declaring ${declared} must preview (${declared}) — a vocab kind with no preview face is a dead tile`,
      ).toBe(declared);
    }
  });

  it("b. every vocab family ext LISTS (the runs-list row mint answers it)", () => {
    const vocab = mediaVocab();
    for (const kind of ["image", "audio", "video", "model", "text"] as const) {
      for (const ext of vocab[kind]) {
        expect(artifactType(`shot.${ext}`), `.${ext} must list as ${kind} in the runs feed`).toBe(kind);
      }
    }
    // classify-only extras still ride the runs feed under their
    // classifying kind (the row door lists anything classifiable);
    // the MINT-ONLY law is the gallery's (§1's gallery arm).
    for (const ext of ["svg", "bmp", "avif", "m4v", "avi"]) {
      expect(artifactType(`a.${ext}`)).toBe(mediaKindOf(`a.${ext}`));
    }
    // the estate's own text mint names, verbatim
    expect(artifactType("SaveText.0_tags_00001.txt")).toBe("text");
    expect(artifactType("result.json")).toBe("text");
    // and what no engine mints classifies nowhere
    expect(artifactType("notes.yaml")).toBe("file");
  });

  it("c. every REAL card's declared kind is visible in both planes (the cardPackages census)", () => {
    const vocab = mediaVocab();
    const vocabKinds = new Set<string>(Object.keys(vocab).filter((k) => k !== "maxListedImages"));
    vocabKinds.add("mesh"); // the UI spelling of the vocab's 'model'
    const SEATED_SPECIALS = new Set(["seg", "report"]); // seg: url-sniff fallback; report: ReportView
    const visible = new Set([...vocabKinds, ...SEATED_SPECIALS]);
    const census = new Map<string, string>(); // card → declared kind
    for (const specifier of cardPackages) {
      const noScope = specifier.replace(/^@melite\//, "").replace(/\/card$/, "");
      const at = noScope.indexOf("-");
      const genre = noScope.slice(0, at);
      const pkg = noScope.slice(at + 1);
      let src = "";
      try {
        src = readFileSync(join(ROOT, `packages/${genre}/${pkg}/src/card.ts`), "utf8");
      } catch {
        continue; // declares outputs outside card.ts — not judged here
      }
      const m = /outputs:\s*\{[^}]*default:\s*['"](\w+)['"]/.exec(src);
      if (m === null) continue;
      census.set(pkg, m[1] as string);
    }
    expect(census.size, "the census read a real estate of cards").toBeGreaterThanOrEqual(10);
    for (const [card, kind] of census) {
      expect(
        visible.has(kind),
        `${card} declares outputs.default '${kind}' — invisible in preview AND media sidebar (add the vocab kind + preview face, or seat it like seg/report)`,
      ).toBe(true);
    }
    // THE TAGGER RECEIPT: the text declaration exists and is visible
    expect(census.get("tagger"), "the tagger's text declaration is the cure's ground truth").toBe("text");
  });
});

// ── 6. closure: no private extension classifier anywhere ──────────

describe("closure — the private extension regex is dead on every plane", () => {
  const TREES = [
    join(ROOT, "packages/web/infer-gallery/src"),
    join(ROOT, "packages/web/melite-card-view/src"),
    join(ROOT, "packages/harness/estate-queue/src"),
  ];
  function walk(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p, acc);
      else if (/\.(ts|tsx)$/.test(name.name)) acc.push(p);
    }
    return acc;
  }
  it("no seat spells its own media-extension regex", () => {
    let judged = 0;
    for (const tree of TREES) {
      for (const file of walk(tree)) {
        const src = readFileSync(file, "utf8");
        const code = src
          .replace(/\/\*[\s\S]*?\*\//g, " ")
          .split("\n")
          .filter((l: string) => !l.trim().startsWith("//") && !l.trim().startsWith("*"))
          .join("\n");
        judged += 1;
        expect(
          code,
          `${file} spells a private media-extension regex — the classifier is the contract's mediaKindOf`,
        ).not.toMatch(/\(\s*png\|jpe\?g/);
      }
    }
    expect(judged, "the census walked a real tree").toBeGreaterThan(30);
  });
});

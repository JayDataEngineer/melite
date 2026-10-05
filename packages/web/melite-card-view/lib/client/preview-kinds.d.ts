/** preview-kinds.ts — the preview seam consult + the params chip +
 * the artifact harvest (pure projections, extracted from CardsTab.tsx
 * hour 15). */
import type { FormSpecDoc } from '@melite/card-base/client';
import type { BenchReport } from '@melite/contracts/benchResult';
/** THE PREVIEW SEAM CONSULT (hour-9 law: "Where the VIDEO PREVIEW
 *  and the IMAGE PREVIEW of other cards go in a SLOT with SHARED DSH
 *  PRIMITIVES"): one consult, keyed by media kind, the card-base
 *  shared previews as the DEFAULTS. Every card's rendered output
 *  previews through this — image cards get the shared image preview,
 *  video cards the shared video one; a studio's own stage view is
 *  its specialization (the claim-over-default law).
 *
 *  ONE CLASSIFIER (the li-ay stroke, 2026-10-11): this private
 *  three-regex sniff was the FIFTH media vocabulary on the estate —
 *  it carried avif but dropped svg/bmp (an .svg artifact got NO
 *  preview) and missed mkv/avi/aac entirely. The contract's
 *  mediaKindOf classifies now; this seat keeps only its own two
 *  concerns — the query string a served url may carry, and the UI's
 *  'mesh' spelling for the vocab's 'model' kind. */
export declare function previewKindFor(url: string): 'video' | 'image' | 'audio' | 'mesh' | null;
export declare function primaryKindFor(spec: FormSpecDoc | null | undefined, url: string): 'video' | 'image' | 'audio' | 'mesh' | null;
/** THE PARAMS CHIP (the output-component stroke — the operator's
 *  law: old generations are tagged by the parameters that differ):
 *  the comma-joined KEYS whose values differ between an archived
 *  generation's params snapshot and the live params. undefined when
 *  the snapshot is absent (an entry archived before the stroke) or
 *  nothing differs — same params, same picture, no noise. */
export declare function paramsDiffKeys(a: unknown, b: unknown): string | undefined;
/** The stage row's preview artifacts, harvested from the estate's
 *  result shape (artifacts name→url map first, the flat assetUrls
 *  list second — the harvest law the h3 adapter states).
 *  ONE FILE, ONE ARTIFACT (2026-09-20, the operator's catch: "two
 *  rowsets under the preview image"): rows written before the
 *  observer's de-stamp carry the same url under two keys (the
 *  legacy 'video' stamp + the gallery name) — the harvest dedupes
 *  BY URL so those rows render ONE artifact, and the legacy
 *  'video' name never paints (retitled 'output'): the word
 *  'video' on an image card is the phantom's face. */
export declare function previewArtifactsFor(row: Record<string, unknown>): Array<{
    name: string;
    url: string;
}>;
/** The stage row's REPORT harvest (ROADMAP 11e): the named
 *  machine-readable verdicts a run writes beside its media — the
 *  same object the agent loop gates on, rendered by the result
 *  row's ONE default atom (card-base's ReportView, claimed by
 *  kind). ONLY kind-'report' entries harvest; a degenerate value
 *  (not an object) never renders — the contract's validator names
 *  it at the writer, the reader just stays silent. */
export declare function previewReportsFor(row: Record<string, unknown>): Array<{
    name: string;
    report: BenchReport;
}>;
//# sourceMappingURL=preview-kinds.d.ts.map

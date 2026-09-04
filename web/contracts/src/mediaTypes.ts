/** Wire shape of a run summary from GET /v1/flows/runs (list_runs).
 *  The contract returns loose Records; the derived module casts. */
export interface MediaRun {
  run_id: string;
  status?: string;
  prompt?: string;
  thumbnail?: string;
  created_at?: number;
  params?: Record<string, unknown>;
  artifacts?: Array<{ url: string; type?: string; size?: number }>;
  /** Distinct brick families that executed (provenance, 2026-08-09).
   *  Absent on pre-provenance runs — consumers treat [] as "no trace". */
  families?: string[];
}

/** Media category bucket for the Library's derived asset cards.
 * (Hoisted here from src/surfaces/library/media.ts — F-DEBT: regions.ts
 *  needs the type at the contracts boundary; the derivation module stays
 *  app-side and re-exports.) */
export type MediaCategory =
  | "image"
  | "video"
  | "mesh"
  | "motion"
  | "audio"
  | "other";

/** One artifact card in the Library's derived media archive — flattened
 *  from the run protocol (GET /v1/flows/runs → artifacts). */
export interface MediaAsset {
  /** Unique key — the artifact url (dedupe happens here). */
  id: string;
  runId: string;
  name: string;
  category: MediaCategory;
  url: string;
  /** Raw server artifact type (image / video / glb / npz / audio / …). */
  type: string;
  size: number;
  prompt: string;
  /** The run's first image artifact ("" when none). */
  thumbnail: string;
  createdAt: number;
  runStatus: string;
  runParams: Record<string, unknown>;
}

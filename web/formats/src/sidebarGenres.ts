// sidebarGenres — the ONE ordered genre list + icon map shared by every
// sidebar surface.
//
// ServicesSidebar and LibrarySidebar were maintaining two different
// GENRE_ORDER constants — different keys (avatar vs ai_generated), different
// orders, different types (Genre vs CardGenre | "unknown"). Two sidebars,
// two genre taxonomies, both called GENRE_ORDER. Drift waiting to happen.
//
// One typed module, one source of truth. The MEDIA GENRES here mirror
// card.ts CardGenre exactly (ONE vocabulary — a value may not exist in one
// and not the other); the remaining entries (avatar/creative/specialized/
// training/external/unknown) are sidebar DISPLAY buckets, not media genres.
// 'ai_generated' was demoted to a CardTag (2026-09-04) — provenance is a
// tag, never a genre. Unknown genres (catalog gap — a family missing
// genre) render under "More" via the catch-all `unknown` bucket at the tail.
import {
  Image as ImageIcon, Film, AudioLines, Wind, Box, PersonStanding,
  Sparkles, FlaskConical, GraduationCap, ExternalLink, MoreHorizontal,
  FileText, Shapes,
  type LucideIcon,
} from "lucide-react"

/** The ordered genre vocabulary for sidebar grouping. Media genres mirror
 *  CardGenre (ONE vocabulary); studio display buckets follow; the
 *  `(string & {})` tail keeps the type open for backend additions without
 *  a TS churn (same trick as serviceForms.Genre). */
export type SidebarGenre =
  | "image"
  | "video"
  | "audio"
  | "text"
  | "motion"
  | "3d"
  | "other"
  | "avatar"
  | "creative"
  | "specialized"
  | "training"
  | "external"
  | "unknown"
  | (string & {})

/** The display order — every sidebar iterates this. Media genres first
 *  (CardGenre order), then the studio display buckets, then the
 *  catch-all tail. `unknown` ("More") is the fallback for catalog gaps
 *  (a family missing genre → renders under "More"). */
export const SIDEBAR_GENRE_ORDER: readonly SidebarGenre[] = [
  "image",
  "video",
  "audio",
  "text",
  "motion",
  "3d",
  "other",
  "avatar",
  "creative",
  "specialized",
  "training",
  "external",
  "unknown",
] as const

/** Genre → lucide icon. One map for every sidebar. `unknown` ("More")
 *  uses MoreHorizontal so a catalog gap is visually distinct from a real
 *  genre; `other` (Shapes) is a REAL genre value — distinct from the
 *  unknown catch-all. */
export const SIDEBAR_GENRE_ICON: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: AudioLines,
  text: FileText,
  motion: Wind,
  "3d": Box,
  other: Shapes,
  avatar: PersonStanding,
  creative: Sparkles,
  specialized: FlaskConical,
  training: GraduationCap,
  external: ExternalLink,
  unknown: MoreHorizontal,
}

/** Human label for a genre header. Capitalized for display; the "unknown"
 *  bucket renders as "More" (the prior LibrarySidebar convention). */
export function genreLabel(genre: string): string {
  if (genre === "unknown") return "More"
  if (genre === "3d") return "3D"
  return genre.charAt(0).toUpperCase() + genre.slice(1)
}

/** Map a granular catalog genre to a sidebar DISPLAY BUCKET. Niche genres
 *  (motion, 3d) collapse into "other" so the Library sidebar stays
 *  scannable — three top-level sections (Image, Video, Audio) cover the
 *  common authoring path; everything else lives under one "Other" roof.
 *  The catalog keeps granular genres (a family IS genre:motion, not
 *  genre:other); this is purely a sidebar navigation concern. Families
 *  whose REAL genre is "other" (input-stage tools) land in the same
 *  bucket by identity, not by collapse.
 *
 *  The ServicesSidebar (advanced family list) does NOT bucket — it shows
 *  the granular genres directly. */
export function sidebarBucket(genre: string): SidebarGenre {
  if (genre === "motion" || genre === "3d") return "other"
  return genre as SidebarGenre
}

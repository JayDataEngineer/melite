// sidebarGenres — the ONE ordered genre list + icon map shared by every
// sidebar surface.
//
// ServicesSidebar and LibrarySidebar were maintaining two different
// GENRE_ORDER constants — different keys (avatar vs ai_generated), different
// orders, different types (Genre vs CardGenre | "unknown"). Two sidebars,
// two genre taxonomies, both called GENRE_ORDER. Drift waiting to happen.
//
// One typed module, one source of truth. The literal union is the
// superset of every sidebar's genre vocabulary; the order is the union of
// both prior orders, reconciled (image first, then time-based media, then
// spatial, then the catalog form genres, then meta). Unknown genres
// (catalog gap — a family missing genre) render under "More" via the
// catch-all `unknown` bucket at the tail.
import {
  Image as ImageIcon, Film, AudioLines, Wind, Box, PersonStanding,
  Sparkles, FlaskConical, GraduationCap, ExternalLink, MoreHorizontal,
  FileText,
  type LucideIcon,
} from "lucide-react"

/** The ordered genre vocabulary for sidebar grouping. Superset of every
 *  sidebar's prior list. A new genre lands here once, in order, and every
 *  sidebar picks it up. The `(string & {})` tail keeps the type open for
 *  backend additions without a TS churn (same trick as serviceForms.Genre). */
export type SidebarGenre =
  | "image"
  | "video"
  | "audio"
  | "motion"
  | "3d"
  | "avatar"
  | "ai_generated"
  | "creative"
  | "specialized"
  | "training"
  | "external"
  | "unknown"
  | "text"
  | (string & {})

/** The display order — every sidebar iterates this. The prior divergence
 *  (ServicesSidebar had avatar+creative+specialized+training+external;
 *  LibrarySidebar had ai_generated+unknown) is reconciled here. Studios and
 *  ai_generated slot in their natural place; "unknown" is the catch-all
 *  tail for catalog gaps (family missing genre → renders under "More"). */
export const SIDEBAR_GENRE_ORDER: readonly SidebarGenre[] = [
  "image",
  "video",
  "audio",
  "text",
  "motion",
  "3d",
  "avatar",
  "ai_generated",
  "creative",
  "specialized",
  "training",
  "external",
  "unknown",
] as const

/** Genre → lucide icon. One map for every sidebar; the prior per-sidebar
 *  GENRE_ICON maps collapsed into this. `unknown` ("More") uses MoreHorizontal
 *  so a catalog gap is visually distinct from a real genre. */
export const SIDEBAR_GENRE_ICON: Record<string, LucideIcon> = {
  image: ImageIcon,
  video: Film,
  audio: AudioLines,
  text: FileText,
  motion: Wind,
  "3d": Box,
  avatar: PersonStanding,
  ai_generated: Sparkles,
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
  if (genre === "ai_generated") return "AI Generated"
  return genre.charAt(0).toUpperCase() + genre.slice(1)
}

/** Map a granular catalog genre to a sidebar DISPLAY BUCKET. Niche genres
 *  (motion, 3d) collapse into "other" so the Library sidebar stays
 *  scannable — three top-level sections (Image, Video, Audio) cover the
 *  common authoring path; everything else lives under one "Other" roof.
 *  The catalog keeps granular genres (a family IS genre:motion, not
 *  genre:other); this is purely a sidebar navigation concern.
 *
 *  "other" capitalizes to "Other" via genreLabel's default branch — no
 *  special case needed. The `(string & {})` tail on SidebarGenre accepts
 *  "other" without a type-system churn. The ServicesSidebar (advanced
 *  family list) does NOT bucket — it shows the granular genres directly. */
export function sidebarBucket(genre: string): SidebarGenre {
  if (genre === "motion" || genre === "3d") return "other"
  return genre as SidebarGenre
}

// pluginShell — PORT SHIM (2026-09-11). SHELL_ICONS verbatim from the
// editor's shell/pluginShell.tsx (the icon map pluginKinds reads; the
// rest of that file is editor-app shell assembly).
import {
  Bot, Blocks, FolderTree, Timeline, PersonStanding, Puzzle,
  Globe, Package, Terminal, Image, Video, Music, Box,
  Cpu, Database, FileText, Gauge, Layers, MessageSquare,
  Play, Radio, Server, Sparkles, Wand2, Webhook, Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export const SHELL_ICONS: Record<string, LucideIcon> = {
  Bot, Blocks, FolderTree, Timeline, PersonStanding, Puzzle,
  Globe, Package, Terminal, Image, Video, Music, Box,
  Cpu, Database, FileText, Gauge, Layers, MessageSquare,
  Play, Radio, Server, Sparkles, Wand2, Webhook, Zap,
}

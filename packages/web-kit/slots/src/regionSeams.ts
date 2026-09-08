/**
 * regionSeams — the app-shell REGION slots (2026-08-19, the overrides
 * doctrine: "every part of the UI, such as chat input, sidebars, are
 * plugins that allow for overrides"). A region is a named hole in the
 * shell chrome — the media sidebar drawer, the chat composer — and it
 * rides the SAME kernel as the card slots: claims at precedence tiers,
 * first-party defaults registered quietest (dogfood law, BOTH
 * directions: the hosts consult the walk; melite-core's own surfaces are
 * claims, not imports).
 *
 * The hosts (WorkspaceLayout, NativeAgentChat) keep the CHROME — drawer
 * animation, positioning, layout — and render the claim inside. A plugin
 * overrides a region by registering louder; it never forks the layout.
 */
import type { ComponentType } from "react"
import { createUiSlot } from "./uiSlotSeam"
import type { AppSidebarProps } from "@melite/contracts"
import type { ChatInputRegionProps, HistorySidebarProps } from "@melite/contracts"

// ── sidebar region ──────────────────────────────────────────────────
/** The media sidebar's claim: the drawer's CONTENT component. */
export interface SidebarRegionElement {
  Sidebar: ComponentType<AppSidebarProps>
}

/** The media sidebar drawer's content — one region, one walk. */
export const sidebarRegionSlot = createUiSlot<SidebarRegionElement, null>("sidebar")

// ── history sidebar region (H-DRAWER, 2026-08-21) ────────────────────
/** The chat-history drawer's claim: the drawer's CONTENT component.
 *  Peer of the media sidebar's region — the layout keeps the chrome
 *  (drawer, animation) and renders the claim inside. Before this seam
 *  the layout HARDCODED <HistorySidebar/> — the one drawer a plugin
 *  could never override; now both left drawers walk claims. */
export interface HistoryRegionElement {
 HistorySidebar: ComponentType<HistorySidebarProps>
}

/** The chat-history drawer's content — one region, one walk. */
export const historyRegionSlot = createUiSlot<HistoryRegionElement, null>("history-sidebar")

// ── chat input region ───────────────────────────────────────────────
/** The chat composer's claim: the input surface component. */
export interface ChatInputRegionElement {
  Composer: ComponentType<ChatInputRegionProps>
}

/** The agent chat's input surface — one region, one walk. */
export const chatInputRegionSlot = createUiSlot<ChatInputRegionElement, null>("chat-input")

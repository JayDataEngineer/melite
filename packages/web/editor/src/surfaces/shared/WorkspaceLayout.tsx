// WorkspaceLayout — top-level editor shell.
//
// Owns the ActivityBar (thin ComfyUI-style icon rail), left drawer (Media),
// header chrome with tab switching (Library / Video / Canvas / …), and the
// global dialogs (LLM chat, asset preview). The Library tab (forms + media
// archive + run stacks — R1, 2026-08-06) lives in LibraryTab.tsx; sidebar
// panels in parts/{AppSidebar,…}.tsx.
//
// The Library canvas owns the center screen (the ONE first-party center
// surface). The conversational agent moved to the DSH plugins 2026-08-21;
// its center tab, chat surfaces, and history drawer were deleted with it.
import { useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
// Sidebar REGION slot (the overrides doctrine): the drawer content is
// a claim; melite-core's quietest claim flows from packages/melite-core/ui/.
import {
 sidebarRegionSlot,
 applyStudioContext,
 setStudioOpenImpl,
} from "@melite/slots";
import { loadPluginUi } from "@/shell/pluginUi";
import { ActivityBar } from "./ActivityBar";
// SIDE-EFFECT IMPORT — the first-party activity registrations (library,
// media, plugins). Module-scope registrations in
// @/shell/activityEntries only run when the module is IMPORTED — the
// browser entry chain is the only production importer (the gate test's
// own import is test-only and proves nothing about the live app). This
// is the render bridge: the layout that renders <ActivityBar/> is also
// the one that populates its seats.
import "@/shell/activityEntries";
import "@/shell/rightPanelEntries";
import { useRightPanelStore } from "./rightPanelStore";
import { PANEL_SLIDE, slideFromLeft } from "./panelSlide";
import {
 useLibraryFlowStore,
 useAgentFlowStore,
} from "../flow/flowStore";
import { STARTUP_TAB, useActiveSurfaceStore } from "./activeSurfaceStore";
import { centerEntry, useCenterEntries } from "@/shell/centerEntries";
import { useRightPanelEntries, rightPanesForMode } from "@/shell/rightPanelEntries";
import { useRailEffectiveWidth } from "./railGeometry";
import { RightPanelHost } from "./RightPanelHost";
import { useDrawerStore } from "./drawerStore";
import { AssetPreviewDialog } from "../assets/AssetPreviewDialog";
import { ComfyStatus } from "./GpuStatus";
import { PluginsPanel } from "./PluginsPanel";
import { loadPluginShell, pluginRailIdToTab } from "@/shell/pluginShell";
import { loadPluginKinds } from "@/surfaces/flow/pluginKinds";
import { useTabBridge } from "./tabBridge";
import { type MediaAsset } from "../library/media";
import { AssetPreviewBusContext } from "./assetPreviewBus";
import { loadCatalog } from "@melite/catalog";
import { familyEntryToCard } from "@melite/formats";
import { urlToDataUrl } from "@melite/catalog";
import { PanelRight } from "lucide-react";
import { HeaderIconButton } from "./HeaderIconButton";
// "library" = the ONE combined surface (R1): the card-authoring canvas.
// Header right-panel toggle. Visible only when the current tab SUPPORTS a
// right panel. Active state (brand accent + glow) reflects the per-tab open
// flag in useRightPanelStore. Clicking flips it. This is the VS Code
// "Secondary Sidebar" pattern — one toggle, per-tab memory. Shares the
// HeaderIconButton shell with ComfyStatus + the key icon so all three
// floating top-right buttons are pixel-identical (2026-08-13).
function RightPanelToggle({ tab }: { tab: string }) {
 const seeded = useRightPanelStore((s) => s.supported[tab]);
 // H-RIGHT: support ALSO derives from the live pane registry — a plugin
 // pane riding this mode makes the toggle appear even when no
 // first-party pane does (the yaml is the whole contract).
 const rightEntries = useRightPanelEntries();
 const paneSupported = rightPanesForMode(rightEntries, tab).length > 0;
 const open = useRightPanelStore((s) => s.open[tab]);
 const toggle = useRightPanelStore((s) => s.toggle);
 if (!seeded && !paneSupported) return null;
 return (
 <HeaderIconButton
 icon={PanelRight}
 label={open ? "Hide right panel" : "Show right panel"}
 active={open}
 onClick={() => toggle(tab)}
 />
 );
}

// The studio-open impl (the seam's app side): plugin capabilities call
// requestStudioOpen("body") from their agent tools; THIS is the chrome
// half — the shell navigates through the SAME copilot bridge a core
// tool used (pendingTab + triggerId; the effect below switches).
// Registered once at module load.
setStudioOpenImpl((target) => {
  useTabBridge.getState().navigateToTab(target as never)
})

// The media drawer's slot-walk, as its OWN COMPONENT: the walk calls a
// hook (sidebarRegionSlot.useVersion), and a hook inside the old
// `activeDrawer === "media" && IIFE` changed the LAYOUT's hook count on
// every drawer open/close — React #310 (a PROD throw that unmounted the
// canvas; caught live 2026-08-22). A component mounts/unmounts cleanly:
// the hook lives and dies with the drawer content, never with a sibling.
function MediaDrawerSidebar(props: {
  onToggle(): void
  onSelectAsset(asset: MediaAsset): void
  onOpenRun(asset: MediaAsset): void
}) {
  // THE walk — melite-core's media sidebar is the quietest claim (10); a
  // plugin override registers louder. Unclaimed → the drawer stays empty
  // (the claim owns the content, the layout owns the chrome).
  //
  // LIVE PROPAGATION (2026-08-21 fix): the claims arrive ASYNC
  // (loadPluginUi → lazy components); a boot-time render walks the slot
  // BEFORE the lane lands and would stay empty forever without a
  // subscription. useVersion(): every register/dispose re-renders here.
  sidebarRegionSlot.useVersion();
  const SidebarContent = sidebarRegionSlot.resolve(null)?.Sidebar;
  if (!SidebarContent) return null;
  return (
    <SidebarContent
      open={true}
      onToggle={props.onToggle}
      onSelectAsset={props.onSelectAsset}
      onOpenRun={props.onOpenRun}
    />
  );
}

export function WorkspaceLayout() {
 // The active tab lives in useActiveSurfaceStore — the SINGLE source of
 // truth (2026-08-10). Previously WorkspaceLayout kept a local `tab`
 // useState and MIRRORED it into the store via setTabSynced, which made the
 // store write-only: deep children calling setActiveTab (e.g. the agent's
 // "Go to Library" landing card) updated the mirror but never the rendered
 // tab — a dead action. Now this component SUBSCRIBES to activeTab for
 // rendering, so any setActiveTab call switches the real tab. The store's
 // default ("flow") matches the prior startup tab.
 const tab = useActiveSurfaceStore((s) => s.activeTab);
 const setActiveTab = useActiveSurfaceStore((s) => s.setActiveTab);
 // Live center registrations (reactive — a runtime plugin-lane entry
 // appears without a layout edit).
 const centerEntries = useCenterEntries();
 // Left drawer state — owned by useDrawerStore (not local useState) so deep
 // children can open a drawer without prop-drilling. The ActivityBar
 // toggles it; the drawer's own close button clears it. Default null
 // (closed at boot).
 const activeDrawer = useDrawerStore((s) => s.activeDrawer);
 const setActiveDrawer = useDrawerStore((s) => s.setActiveDrawer);
 const toggleDrawer = useDrawerStore((s) => s.toggleDrawer);
 const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
 // PluginsPanel (§6.4): local state — opened ONLY from the rail foot
 // entry, one mounted instance below.
 const [pluginsOpen, setPluginsOpen] = useState(false);
 // Shell lane boot (§8.2): mount every ENABLED plugin's shell entries
 // as runtime registrations. The PluginsPanel re-syncs after a flip.
 // Kinds lane boot (the fourth lane): sync the wire's card kinds into
 // cardSeam. Until it lands every kind reads UNKNOWN — fail-safe (no
 // Run affordance, no execution); after it, flips propagate live.
 useEffect(() => {
  void loadPluginShell();
  void loadPluginKinds();
  void loadPluginUi();
 }, []);
 // Sidebar region slot: subscribe so a mid-session claim flip swaps the
 // drawer's content NOW. The walk happens at the use site — melite-core's
 // media sidebar is the quietest claim (10); a plugin shadows louder.

 // ── ActivityBar wiring ────────────────────────────────────────────
 // The ActivityBar is the SOLE navigation surface (2026-08-10: the
 // old-school top nav bar was cut). Three tiers map to three kinds of
 // action: primary surfaces (Library → tab switch), content drawers
 // (Media → drawer toggle; the Flow drawer merged into the Library
 // rail, ONE_SURFACE Phase 4; the Chat History drawer died with the chat).
 // Settings opens a dialog. The Director/Pose/Stretchy studio tabs were
 // ARCHIVED 2026-08-11.
 const activityActive = new Set<string>();
 if (activeDrawer) activityActive.add(activeDrawer);
 // Primary surfaces: show active when their tab is focused.
 if (tab === "library") activityActive.add("library");
 // Plugin shell tabs (§8.2): the rail button is active while its
 // plugin tab is focused.
 if (tab.startsWith("plugin:")) activityActive.add("shell:" + tab.slice(7));

 const handleActivitySelect = useCallback(
 (id: string) => {
 switch (id) {
 case "library":
 setActiveTab("library");
 break;
 case "media":
 // Toggle the drawer: if already active, close it; otherwise open it.
 // ("history" died with the chat — there is no second drawer.)
 toggleDrawer(id);
 break;
 case "plugins":
 // The Plugins inventory (§6.4) — the foot entry's panel.
 setPluginsOpen(true);
 break;
 default: {
 // Shell-lane rail ids (§8.2): route to the plugin's center
 // tab. Unknown ids fall through silently (the seat renders them,
 // the owner ignores them — same vocabulary rule as above).
 const pluginTab = pluginRailIdToTab(id);
 if (pluginTab) setActiveTab(pluginTab);
 break;
 }
 }
 },
 [setActiveTab, toggleDrawer],
 );

 // ── Copilot bridge ────────────────────────────────────────────────
 // The copilot agent calls frontend actions (navigate_to_tab, select_model)
 // that write to the bridge store. Watch for changes and apply them here.
 const bridgeTrigger = useTabBridge((s) => s.triggerId);
 useEffect(() => {
 const { pendingTab, pendingModel, consume } = useTabBridge.getState();
 if (pendingTab) {
 // The bridge's tab ids are the real tabs (the "copilot" panel id was
 // deleted with CopilotPanel) — navigate_to_tab("flow") lands on
 // the Agent center tab. Legacy ids ("assets", "viewer") map to the
 // combined Library tab (R1) — compared as strings since the typed
 // TabId union dropped those members.
 const raw = pendingTab as string;
 const target = raw === "assets" || raw === "viewer" ? "library" : pendingTab;
 setActiveTab(target);
 if (raw === "assets") setActiveDrawer("media");
 }
 if (pendingModel) {
 // select_model: the model's CARD lands on the canvas (the Library tab
 // is the authoring surface — "selecting a model" = adding it as a
 // card). Resolved through the shared derivation path
 // (lib/capabilityCards.ts) so the card is identical to a manual
 // pick: same service, title, and seeded params. Unknown keys no-op —
 // the tool's contract is a catalog model/family key.
 void (async () => {
 try {
 const cat = await loadCatalog();
 const famId =
 cat?.models?.[pendingModel]?.family ??
 (pendingModel && cat?.families?.[pendingModel]
 ? pendingModel
 : undefined);
 if (!famId || !cat) return;
 const e = familyEntryToCard(cat, famId, cat.families[famId]);
 await useLibraryFlowStore.getState().addStage({
 kind: "generation",
 service: e.service,
 title: e.title,
 params: e.params,
 });
 } catch {
 // Catalog fetch failure — nothing to add; the tab switch still
 // happened (same tolerance as the Library rail's tile load).
 }
 })();
 }
 if (pendingTab || pendingModel) consume();
 }, [bridgeTrigger]);

 // ── Agent flow studio-open bridge ─────────────────────────────
 // When a studio-link card is double-clicked (or the agent calls
 // open_studio_card), the flow store emits studioOpenTrigger.
 // We watch it, load the context into the studio store, and switch to
 // that studio's tab. (Director + Pose targets are no-ops — those
 // studios were ARCHIVED 2026-08-11; only Body Studio opens.)
 const studioTrigger = useAgentFlowStore((s) => s.studioOpenTrigger);
 useEffect(() => {
 const { pendingStudio, consumeStudioOpen } =
 useAgentFlowStore.getState();
 if (!pendingStudio) return;
 const { target, context } = pendingStudio;
 // WHAT a studio's context MEANS is card domain — the OWNING plugin
 // loads it through the studio-context seam (melite-3d's body loader
 // registered at boot, capabilities lane 2026-08-21). The shell keeps
 // only the chrome: hand over the payload, switch the tab. Unknown
 // target = no loader = still switches (fail-safe, unchanged).
 if (target === "body") {
 applyStudioContext("body", context);
 setActiveTab("body");
 }
 consumeStudioOpen();
 }, [studioTrigger]);

 // The flow-card lightbox override (2026-08-08): cards deep in the tab
 // surfaces (and inside CardZoomOverlay's portal) open the lightbox over
 // the ORDERED flow card outputs via the AssetPreviewBus. When set, the
 // dialog navigates exactly this list; when null it falls back to the
 // same-category archive. Cleared on close so the sidebar's next open
 // behaves as before.
 const [previewNavList, setPreviewNavList] = useState<MediaAsset[] | null>(
 null,
 );
 const openAssetPreview = useCallback(
 (asset: MediaAsset, navList?: MediaAsset[]) => {
 setSelectedAsset(asset);
 setPreviewNavList(navList ?? null);
 },
 [],
 );

 // ── Floating icon right-panel-aware offset ────────────────────────
 // H-RIGHT (concession): the offset tracks the rail's EFFECTIVE width —
 // the exact number RightPanelHost solves and publishes via railGeometry
 // (ONE resolution site). A conceded/auto-closed rail releases the icons
 // automatically; the CSS transition below stays in step with the host's
 // width transition. The 8px trailing = the old right-2 gap.
 const railWidth = useRailEffectiveWidth();
 const iconRightPx = railWidth + 8;

 return (
 <AssetPreviewBusContext.Provider value={openAssetPreview}>
 <div className="flex h-screen w-full bg-background">
 {/* The ActivityBar rail (hunk 4: the DSH-embed hide lane retired —
 nothing iframes this app; the rail is always the navigator). */}
 <ActivityBar active={activityActive} onSelect={handleActivitySelect} />
 {/* ── Left drawer — the blueprint's "Library & Workspace Hub" ──────
 A single sliding drawer whose CONTENT changes per the ActivityBar
 icon: Media (asset gallery — also surfaces .npz motion clips under
 the 'motion' category). The Chat History drawer is GONE (2026-08-21,
 with the native-agent chat); the Flow drawer merged into the
 Library rail (ONE_SURFACE Phase 4). */}
 {/* ── Left drawer — ONE shell, slides in/out (framer-motion, the
 card system's library). AnimatePresence holds the exiting shell
 mounted while it slides back left, so open/close are real
 animations, not hard cuts. The shell is keyed on OPEN/CLOSED —
 NOT on the drawer id — so switching media→history is a
 HARD CUT: the shell stays mounted and
 React swaps its child instantly. Keying per-drawer made every
 switch play an exit + an enter simultaneously, which pushed the
 content column to double width and back — the glitch. */}
 <AnimatePresence>
 {activeDrawer !== null && (
 <motion.div
 key="left-drawer"
 data-drawer={activeDrawer}
 {...slideFromLeft}
 transition={PANEL_SLIDE}
 // flex h-full overflow-hidden: the motion.div is the flex child
 // of the h-screen parent (stretches to full viewport height via
 // align-items: stretch). Making it ITSELF a flex container passes
 // that height down to the drawer inside. overflow-hidden clips
 // the drawer content during the width-based enter/exit animation
 // (panelSlide.ts collapseWidth) so it reveals progressively
 // instead of squishing. Each drawer component has shrink-0 on its
 // root (AppSidebar) so the flex container can't shrink it during
 // the width animation.
 className="flex h-full shrink-0 overflow-hidden"
 >
{activeDrawer === "media" && (
          <MediaDrawerSidebar
          onToggle={() => setActiveDrawer(null)}
          onSelectAsset={(a) => setSelectedAsset(a)}
          onOpenRun={(a) => {
            // "Open as cards" — the run's stages hydrate the canvas (the SAME
            // action as the Library rail's Flows list; a run IS a flow
            // doc, loading it back is 1:1). Intent = the run's prompt when it
            // carried one (compile-path runs keep their prompt in runParams).
            const raw = a.runParams?.prompt;
            const intent =
              typeof raw === "string" && raw.trim()
                ? raw.trim().slice(0, 80)
                : a.runId;
            setActiveTab("library");
            setActiveDrawer(null);
            void useLibraryFlowStore
              .getState()
              .loadRunById(a.runId, intent);
          }}
          />
          )}
 </motion.div>
 )}
 </AnimatePresence>
 <div className="relative flex flex-1 flex-col min-w-0">
 {/* Floating status cluster — top-right corner. No header bar: the
 icons overlay the workspace content directly (z-30 keeps them
 above cards/chat; the card-zoom overlay covers them when drilling
 into a card — they're not needed mid-drilldown). This is the
 tradeoff for maximum vertical space: the status indicators stay
 in their familiar position without a dedicated chrome bar.
 RIGHT-PANEL-AWARE (2026-08-10): the `right` offset animates so
 the icons slide LEFT when a right panel opens — synchronized
 with the panel's width animation (same 0.22s ease). This keeps
 them in the CENTER content area, not overlapping the panel
 header (which was the "right sidebar not tall enough" symptom). */}
 <div
 className="absolute top-2 z-30 flex items-center gap-0.5"
 style={{
 right: `${iconRightPx}px`,
 transition: "right 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)",
 }}
 >
 {/* Panel toggle + GPU status (hunk 4: the DSH-embed hide lanes
 retired — standalone always owns the LLM, the run door, and the right
 panel; only the dialog hosts stay mount-gated). */}
 <RightPanelToggle tab={tab} />
 <ComfyStatus />
 <PluginsPanel open={pluginsOpen} onClose={() => setPluginsOpen(false)} />
 </div>
 {/* ── Tab content ───────────────────────────────────────────────────
 H-RIGHT (2026-08-21): the right sidebar is a layout-owned TAB HOST
 (RightPanelHost) — panes are `right.panels` registry entries whose
 `modes` derive from the active center tab. Tabs no longer embed their
 own rails; each tab owns its CENTER content only. The right-panel
 toggle (RightPanelToggle, floating top-right) still flips per-tab
 visibility via useRightPanelStore; a mode with no panes renders
 full-width (the host renders null). */}
 {/* data-workspace-content is the card zoom overlay's scope boundary
 (CardZoomOverlay portals here, absolute inset-0). Keeping the
 overlay inside this region means the sidebars + rail stay
 visible + interactive while a card is drilled down — only the
 in-surface content (cards + chat) is covered. relative establishes
 the positioning context for that absolute layer. */}
 <div
 data-workspace-content
 className="relative flex flex-1 min-h-0 overflow-hidden"
 >
 {/* §8.2: the center is a REGISTRY PICK — the entry whose id === the
 active tab renders (one visible, lazy mount preserved: only the picked
 entry's component mounts). Unknown ids (a stale persisted tab, an
 unregistered plugin tab) fall back to STARTUP_TAB's entry — the same
 graceful degrade the old null arm had, minus the blank center. A
 runtime registration re-renders via useCenterEntries' subscription. */}
 {(() => {
 const entry =
 centerEntry(centerEntries, tab) ??
 centerEntry(centerEntries, STARTUP_TAB);
 if (!entry) return null;
 const Surface = entry.component;
 return <Surface />;
 })()}
 {/* The right panel host (hunk 4: the DSH-embed gate retired). */}
 <RightPanelHost tab={tab} />
 </div>
 </div>
 <AssetPreviewDialog
 asset={selectedAsset}
 navList={previewNavList}
 onClose={() => {
 setSelectedAsset(null);
 setPreviewNavList(null);
 }}
 onSelect={(a) => setSelectedAsset(a)}
 // onOpenStretchy REMOVED 2026-08-11 — the Stretchy Studio is ARCHIVED
 // (web/editor/archived/).
 // REMOVED 2026-07-18: onSendToKimodo prop omitted — Auto-Rig 3D +
 // Kimodo FBX services were removed from the assets page sidebar.
 // SOMAX 3D is now the single 3D character path. Motion retarget
 // for SOMAX-rigged GLBs is handled automatically by TextToPoseTab
 // when a motion NPZ is present. See docs/SOMAX-FLOW-POSTMORTEM.md.
 onSendToSomax={async (a) => {
 // ONE-CLICK SOMAX 3D: the clicked TRELLIS output GLB → SOMA weight
 // transfer → rigged GLB, as a CARD on the canvas (the flow
 // protocol runs it: form_3d_somax → somax family → KimodoExportFBX).
 // The slot key is the wire's `input_glb` (compile.py maps it onto
 // the family's glb_artifact param); the value is a data: URL — the
 // SAME shape the card's Attach produces, so the backend's upload
 // routing handles it identically. The model's catalog defaults
 // (file_format/decimate_ratio/preserve_texture/in_place/seed) merge
 // server-side at compile — the card carries only the GLB.
 const dataUrl = await urlToDataUrl(a.url);
 await useLibraryFlowStore.getState().addStage({
 title: "SOMAX 3D",
 kind: "generation",
 service: "somax",
 params: { input_glb: dataUrl },
 });
 setActiveTab("library");
 setActiveDrawer(null);
 }}
 />
 </div>
 </AssetPreviewBusContext.Provider>
 );
}

/**
 * drilldown.tsx — THE MEDIA DRILLDOWN, one component for every surface
 * (the operator's hour-24 order: "clicking the preview component should
 * mirror the media drilldown view 1:1"). Extracted VERBATIM from the
 * gallery's MediaPanel Overlay — the gallery's media tiles and the
 * cards' stage previews ride the SAME face: DSH's Modal (headless —
 * body portal, mask, Escape, aria-modal and focus handling are the
 * primitive's, never ours), the kind-switched full-size artifact, the
 * caption, the esc hint.
 *
 * The gallery's MediaItem EXTENDS MediaDrilldownItem; the cards map
 * their stage artifact onto it (mesh kind → 'model' — the media vocab
 * alignment, one spelling).
 */
import * as React from 'react';
/** The drilldown's own currency — everything the face reads, nothing
 *  it doesn't (the gallery's richer item satisfies it structurally). */
export interface MediaDrilldownItem {
    kind: 'image' | 'video' | 'audio' | 'model';
    url: string;
    file: string;
    head: string;
    time: string;
}
/** THE MEDIA DRILLDOWN (the gallery Overlay, verbatim — one face).
 * THE WALK ARROWS (2026-09-20, the operator's catch: "where are my
 * side arrows when I open an image so scroll through to others"):
 * an OPTIONAL sibling walk — the caller passes the visible list;
 * arrows render only when there is more than one to walk. The
 * arrows paint their OWN chip (explicit bg + label tokens — the
 * white-✕ lesson: never inherit the page's text color on a
 * self-painted surface), walk WRAP-AROUND, and the keyboard
 * ArrowLeft/ArrowRight ride the same verbs. No siblings = exactly
 * the old face (both call sites unchanged until wired). */
export declare function MediaDrilldown({ item, onClose, openArtifact, siblings, onNavigate, onDelete, onRename }: {
    item: MediaDrilldownItem;
    onClose: () => void;
    openArtifact?: (item: MediaDrilldownItem) => void;
    siblings?: MediaDrilldownItem[];
    onNavigate?: (next: MediaDrilldownItem) => void;
    /** THE MODAL MUTATIONS (the mediasidebar's popup modal on media
     *  stuff): OPTIONAL delete + rename verbs — a surface with no
     *  mutating door (the card zoom) simply hides both buttons (the
     *  3D-door pattern: optional prop, absent face). The verbs are
     *  async (the host doors); the drilldown owns the confirm +
     *  inline-rename faces, the busy/error states, and NOTHING else —
     *  the parent owns what happens after (close / re-point / reload). */
    onDelete?: (item: MediaDrilldownItem) => Promise<void>;
    onRename?: (item: MediaDrilldownItem, name: string) => Promise<void>;
}): React.JSX.Element;
//# sourceMappingURL=drilldown.d.ts.map

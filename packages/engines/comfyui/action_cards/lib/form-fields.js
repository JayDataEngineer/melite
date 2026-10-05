import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * form-fields — DSH-pure replacements for the kit form primitives
 * the action_cards viewers used (kit NumberField, scrub-input,
 * label, tabs, collapsible, scroll-area).
 *
 * Mapping (kit → DSH):
 *   Tip         → @melite/card-base/client (the ONE estate Tip, on the
 *                 DSH Tooltip atom).
 *   Label       → native <label> passthrough (same data-slot).
 *   ScrubInput  → native <input type="range"> (the kit WAS a native
 *                 range input owning the invisibility contract — this
 *                 keeps that contract byte-identically: same type,
 *                 same data-slot, same aria-hidden={false}).
 *   NumberField → the full scrub + type-exact + range-fill widget,
 *                 ported logic-byte-identical onto the native input
 *                 (the drag gesture IS load-bearing here — SliderRow
 *                 lives on it — so the pointer-capture math rides
 *                 along verbatim).
 *   Tabs / TabsContent → minimal controlled tabs (the kit's Base-UI
 *                 root/panel with value/onValueChange; inactive panes
 *                 stay mounted but hidden, as before).
 *   Collapsible / Trigger / Content → open/onOpenChange state lift
 *                 (the kit's Base-UI root/trigger/panel; the trigger
 *                 is a <button>, the panel unmounts when closed).
 *   ScrollArea  → native overflow viewport (same className/style
 *                 passthrough onto the root).
 */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Tip } from "@melite/card-base/client";
import styles from "./form-fields.module.css";
// ── Label ───────────────────────────────────────────────────────
export function Label({ className, ...props }) {
    return (_jsx("label", { "data-slot": "label", className: className, ...props }));
}
// ── ScrubInput ──────────────────────────────────────────────────
export function ScrubInput({ className, ...props }) {
    return (_jsx("input", { ...props, type: "range", "data-slot": "scrub-input", "aria-hidden": false, className: className ? `${styles.scrub} ${className}` : styles.scrub }));
}
export function NumberField({ value, onChange, min, max, step, label, tooltip, className, onCommit, }) {
    const inputRef = useRef(null);
    const [editing, setEditing] = useState(false);
    const [text, setText] = useState("");
    const hasRange = typeof min === "number" && typeof max === "number" && min < max;
    const resolvedStep = typeof step === "number" && step > 0
        ? step
        : hasRange
            ? (max - min) / 100
            : 1;
    const decimals = resolvedStep < 1
        ? Math.max(0, -Math.floor(Math.log10(resolvedStep)))
        : 0;
    const clamp = useCallback((v) => {
        if (typeof min === "number" && v < min)
            return min;
        if (typeof max === "number" && v > max)
            return max;
        return v;
    }, [min, max]);
    // ── Scrub (horizontal drag) ────────────────────────────────────
    const dragState = useRef(null);
    const pxDeltaToValue = useCallback((dx, shift) => {
        const sensitivity = hasRange
            ? Math.max(resolvedStep, (max - min) / 200)
            : resolvedStep;
        return dx * sensitivity * (shift ? 0.1 : 1);
    }, [hasRange, resolvedStep, min, max]);
    const onPointerDown = useCallback((e) => {
        if (editing)
            return;
        if (e.button !== 0)
            return;
        dragState.current = {
            startX: e.clientX,
            startVal: Number.isFinite(value) ? value : 0,
            moved: false,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    }, [editing, value]);
    const onPointerMove = useCallback((e) => {
        const st = dragState.current;
        if (!st)
            return;
        const dx = e.clientX - st.startX;
        if (Math.abs(dx) > 3)
            st.moved = true;
        if (!st.moved)
            return;
        const raw = st.startVal + pxDeltaToValue(dx, e.shiftKey);
        const snapped = Math.round(raw / resolvedStep) * resolvedStep;
        onChange(clamp(Number(snapped.toFixed(decimals))));
    }, [pxDeltaToValue, resolvedStep, decimals, onChange, clamp]);
    const onPointerUp = useCallback((e) => {
        const st = dragState.current;
        dragState.current = null;
        try {
            e.currentTarget.releasePointerCapture(e.pointerId);
        }
        catch {
            // pointer already released — safe to ignore
        }
        if (!st)
            return;
        if (!st.moved) {
            setEditing(true);
            return;
        }
        onCommit?.(Number.isFinite(value) ? value : 0);
    }, [onCommit, value]);
    // ── Edit (type exact) ──────────────────────────────────────────
    useEffect(() => {
        if (!editing)
            return;
        setText(Number.isFinite(value) ? String(value) : "");
        const el = inputRef.current;
        if (el) {
            el.focus();
            el.select();
        }
    }, [editing, value]);
    const commitEdit = useCallback(() => {
        setEditing(false);
        const n = Number(text);
        if (text !== "" && Number.isFinite(n)) {
            const v = clamp(Number(n.toFixed(decimals)));
            onChange(v);
            onCommit?.(v);
        }
    }, [text, onChange, onCommit, clamp, decimals]);
    const cancelEdit = useCallback(() => {
        setEditing(false);
    }, []);
    // ── Range fill ─────────────────────────────────────────────────
    const fillPct = hasRange && Number.isFinite(value)
        ? ((clamp(value) - min) / (max - min)) * 100
        : 0;
    const displayValue = Number.isFinite(value) ? String(value) : "";
    return (_jsxs("label", { className: className ? `${styles.numberField} ${className}` : styles.numberField, children: [label && (_jsx(Tip, { tip: tooltip || label, children: _jsx("span", { className: styles.fieldLabel, children: label }) })), _jsxs("div", { "data-numberfield": "", className: editing ? `${styles.numberBox} ${styles.numberBoxEditing}` : styles.numberBox, onPointerDown: onPointerDown, onPointerMove: onPointerMove, onPointerUp: onPointerUp, children: [hasRange && (_jsx("div", { "data-numberfield-fill": "", className: styles.numberFill, style: { width: `${Math.max(0, Math.min(100, fillPct))}%` } })), _jsx("input", { ref: inputRef, type: "text", inputMode: "decimal", value: editing ? text : displayValue, onChange: (e) => setText(e.target.value), onBlur: commitEdit, onKeyDown: (e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                commitEdit();
                            }
                            else if (e.key === "Escape") {
                                e.preventDefault();
                                cancelEdit();
                            }
                        }, style: { pointerEvents: editing ? "auto" : "none" }, className: styles.numberInput })] })] }));
}
const TabsContext = createContext({ value: "", onValueChange: () => { } });
export function Tabs({ value, onValueChange, className, children, }) {
    return (_jsx(TabsContext.Provider, { value: { value, onValueChange }, children: _jsx("div", { "data-slot": "tabs", className: className, children: children }) }));
}
export function TabsContent({ value, className, children, }) {
    const ctx = useContext(TabsContext);
    const active = ctx.value === value;
    return (_jsx("div", { "data-slot": "tabs-content", "data-state": active ? "active" : "inactive", className: className ? `${styles.tabsContent} ${className}` : styles.tabsContent, children: children }));
}
const CollapsibleContext = createContext({ open: false, onOpenChange: () => { } });
export function Collapsible({ open, onOpenChange, children, }) {
    const isOpen = !!open;
    return (_jsx(CollapsibleContext.Provider, { value: { open: isOpen, onOpenChange: onOpenChange ?? (() => { }) }, children: _jsx("div", { "data-slot": "collapsible", "data-state": isOpen ? "open" : "closed", children: children }) }));
}
export function CollapsibleTrigger({ className, onClick, children, ...props }) {
    const ctx = useContext(CollapsibleContext);
    return (_jsx("button", { type: "button", "data-slot": "collapsible-trigger", "aria-expanded": ctx.open, className: className, onClick: (e) => {
            onClick?.(e);
            if (!e.defaultPrevented)
                ctx.onOpenChange(!ctx.open);
        }, ...props, children: children }));
}
export function CollapsibleContent({ className, children, }) {
    const ctx = useContext(CollapsibleContext);
    // Unmounted when closed (the kit Base-UI panel default). Slider
    // values live in the parent's state, so no state is lost.
    if (!ctx.open)
        return null;
    return (_jsx("div", { "data-slot": "collapsible-content", "data-state": "open", className: className, children: children }));
}
// ── ScrollArea ──────────────────────────────────────────────────
export function ScrollArea({ className, style, children, }) {
    return (_jsx("div", { "data-slot": "scroll-area", className: className ? `${styles.scrollRoot} ${className}` : styles.scrollRoot, style: style, children: _jsx("div", { "data-slot": "scroll-area-viewport", className: styles.scrollViewport, children: children }) }));
}
//# sourceMappingURL=form-fields.js.map

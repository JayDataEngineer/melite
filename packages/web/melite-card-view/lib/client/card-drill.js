/**
 * card-drill.tsx — THE CARD DRILLDOWN: the second state of the card
 * system, ONE component every card surface drills through (the chat
 * toolview FlowCards and the sidebar Cards tab — the 2026-09-10 UX
 * reborn 2026-09-11 as shared state + shared tool between the agent
 * and the user).
 *
 * DSH Modal (body portal, Escape/mask close — the operator's split
 * directive 2026-09-10): params LEFT (editable — switch fields ride
 * the Pill toggle, everything else a raw-string Input; editPatch
 * coerces ONCE at patch time so decimal dots survive typing), outputs
 * + Run RIGHT. Run ON THE CARD is a USER GESTURE, and it runs what
 * the user SEES: the caller receives the coerced patch and owns the
 * write-then-run order (the shared-state law — the patch lands in the
 * domain BEFORE the run reads it).
 */
import { createElement as h, useState } from 'react';
import { Button, Modal, Pill, Input } from '@deepseek-ai/dsh-client-ui-primitives';
import css from './card.module.css';
import { editPatch } from "./draft.js";
import { rejectionVoice } from "./rejection-voice.js";
export function CardDrill({ title, fields, thumbUrl, running, onRun, onClose }) {
    const [edits, setEdits] = useState(new Map());
    const [runError, setRunError] = useState(null);
    const patch = editPatch(fields, edits);
    const run = async () => {
        setRunError(null);
        try {
            await onRun(patch);
        }
        catch (e) {
            setRunError(rejectionVoice(e));
        }
    };
    const fieldNode = (f) => {
        if (f.atom === 'switch') {
            const current = typeof f.value === 'boolean' ? (edits.get(f.key) ?? f.value) : false;
            return h(Pill, {
                active: current,
                onClick: () => { setEdits((m) => new Map(m).set(f.key, !current)); },
            }, typeof f.value === 'boolean' ? (current ? 'on' : 'off') : '?');
        }
        return h(Input, {
            value: String(edits.get(f.key) ?? f.value),
            onChange: (e) => {
                // RAW string while typing (decimal dots survive); editPatch
                // coerces once, at patch time.
                const target = e;
                setEdits((m) => new Map(m).set(f.key, target.target.value));
            },
        });
    };
    return h(Modal, { open: true, onClose, title, closeLabel: 'Close card', className: css.drill }, h('div', { className: css.split }, h('div', { className: css.params }, fields.map((f) => h('label', { key: f.key, className: css.field }, h('span', { className: css.fieldKey }, f.key), fieldNode(f)))), h('div', { className: css.outputs }, thumbUrl !== null ? h('img', { className: css.outputImg, src: thumbUrl, alt: title }) : null, h('div', { className: css.runRow }, runError !== null ? h('span', { className: css.runError }, runError) : null, h(Button, { variant: 'primary', disabled: running, onClick: () => { void run(); } }, running ? 'running…' : 'Run')))));
}
//# sourceMappingURL=card-drill.js.map

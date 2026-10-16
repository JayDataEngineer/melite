/** studio.tsx — THE DECLARATIVE STUDIO (primitive ④, 2026-09-21):
 *  the stage view owns ORGANIZATION over the SAME form-spec SSOT —
 *  and organization is now DATA, not a client half. A card declares
 *  its group partition (expose/fold + titles) and its preview kind;
 *  the base renders everything else: spec fetch, value seeding +
 *  resolved layering, the square provider, the patch-first run law,
 *  the bindRun ref dispatch, run polling, the envelope lift,
 *  error/loading faces, StudioShell composition.
 *
 *  A studio client half survives ONLY as a declaration + seam
 *  registration (img-to-mesh is the first: ~30 lines, zero react
 *  machinery, zero three, zero css). A TRUE takeover — content no
 *  renderer can declare (motion's timeline, h3's call-card strip) —
 *  rides beside this renderer as an extra pane, never a fork. */
import { createElement as h, useEffect, useRef, useState } from 'react';
import { DisclosureRow, IconBranchOutlineRegular, IconSlidersTwoOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives';
import { SpecFieldRow } from "./rows.js";
import { coerceFieldEdit, fieldsOf, resolveValue, } from "./spec.js";
import { useFormSpec } from "./use-form-spec.js";
import { useSquareProvider } from "./square-provider.js";
import { ModelAxes } from "./axes.js";
import { Box, Layers } from "./icons.js";
import { pollRunStageUrl } from "./runs-policy.js";
import { GlbStagePreview } from "./glb-stage.js";
import { chromeCopy } from "./locales/chromeCopy.js";
import { StudioShell } from "./shell.js";
import css from './studio.module.css';
/** The fold-glyph palette — the DSH-native fold icon law: the
 *  CALLER supplies the row's OWN semantic glyph (reference
 *  ToolRow.tsx:37 `icon: ReactNode`; details-row.tsx:29-39 maps
 *  every tool to its own glyph), NEVER a blanket fold icon.
 *  Catalog-first: branch = pipeline passes, sliders = knobs
 *  (details-row.tsx:37 maps workflow→Branch the same way); the
 *  residue members (box, layers) name media concepts the catalog
 *  lacks — argued per the icons.tsx residue law. Archive glyphs
 *  are absent BY LAW (reference F9: IconArchive… names the
 *  archive domain, never a fold). */
const FOLD_GLYPHS = {
    branch: h(IconBranchOutlineRegular, { size: 14 }),
    sliders: h(IconSlidersTwoOutlineRegular, { size: 14 }),
    box: h(Box, { style: { width: 14, height: 14 } }),
    layers: h(Layers, { style: { width: 14, height: 14 } }),
};
/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export function defineStudioDeclaration(declaration) {
    return Object.freeze({
        ...declaration,
        expose: Object.freeze([...declaration.expose]),
        folds: Object.freeze({ ...declaration.folds }),
    });
}
function rowsOfGroup(fields, group) {
    return fields.filter((f) => f.group === group);
}
/** THE ONE data-driven studio renderer. Props are the seam's own
 *  currency (StageViewOwnerProps) plus the card's declaration. */
export function DeclarativeStudio(props) {
    const { declaration, row, runStatus, onPatch, onRun, onStop } = props;
    const params = typeof row['params'] === 'object' && row['params'] !== null ? row['params'] : {};
    const [spec, setSpec] = useState(null);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(params);
    const [open, setOpen] = useState({});
    // THE OUTPUT HALF — the ROW is the truth (runs are named by draft
    //  only, so a tab-wide run id binds WRONG studios to other cards'
    //  runs): this row's result carries its own run_id + artifact url
    //  (the outcome observer writes both); the poll runs only while
    //  this row's run is IN FLIGHT (runStatus 'running' with no url
    //  yet — the run-wire package's ONE poll loop; its single-stage
    //  fallback maps the card door's skeleton-named stage onto this
    //  bench row's id).
    const rowResult = typeof row['result'] === 'object' && row['result'] !== null
        ? row['result'] : null;
    const ownRunId = typeof rowResult?.run_id === 'string' && rowResult.run_id !== ''
        ? rowResult.run_id : null;
    const ownUrl = typeof rowResult?.url === 'string' && rowResult.url !== ''
        ? rowResult.url : null;
    const [meshUrl, setMeshUrl] = useState(ownUrl);
    useEffect(() => {
        setMeshUrl(ownUrl);
        if (ownUrl !== null || ownRunId === null)
            return;
        const ctrl = new AbortController();
        void pollRunStageUrl(ownRunId, props.stageId, { onUrl: setMeshUrl }, ctrl.signal);
        return () => { ctrl.abort(); };
    }, [ownRunId, ownUrl, props.stageId]);
    // the served spec rides the shared hook (loud refusal — the client
    // renders the error surface); seeding + the envelope lift react to
    // the doc landing. THE KEY IS THE LIVE MODEL (the family-axis cure,
    // 2026-10-18): a family pick re-keys the hook — the studio
    // refetches the family's own doc exactly as the generic drill
    // does (the pick's refetch law), never a frozen card-id fetch.
    const heldModel = typeof user['model'] === 'string' && user['model'] !== ''
        ? user['model'] : undefined;
    const { spec: liveSpec, error: specError } = useFormSpec(heldModel ?? declaration.model);
    useEffect(() => {
        if (specError !== null) {
            setError(specError);
            return;
        }
        if (liveSpec === null)
            return;
        setSpec(liveSpec);
        // THE USER LAYER IS THE FROZEN BENCH ROW VERBATIM (the settings
        // law): presence IS the override mark; defaults derive per
        // render — never seeded into the explicit map. ONE EXCEPTION:
        // a family switch lands a NEW doc here, and the PICKED model key
        // owns that switch — it survives the re-seed or the face would
        // snap back to the row's old family and lie (every other key
        // re-seeds from the frozen row, the atomic-pick law's clear).
        setUser((prev) => {
            const held = typeof prev['model'] === 'string' && prev['model'] !== '' ? prev['model'] : undefined;
            return held !== undefined ? { ...params, model: held } : { ...params };
        });
        // the envelope lift: report the estate's declared size class
        props.onSurface(liveSpec.size === 'huge' ? 'huge' : '');
    }, [liveSpec, specError]);
    const fieldByName = new Map((spec !== null ? fieldsOf(spec) : []).map((f) => [f.name, f]));
    const onEdit = (name, v) => {
        setUser((prev) => ({ ...prev, [name]: coerceFieldEdit(fieldByName.get(name), v) }));
    };
    // the resolved value — derived per render (what a run composes).
    // THE SERVED BASE (hour-26 stroke 15, the 1:1 run law): the row's
    // `resolved` map layers under the user (same law as the generic
    // drill — one resolver, served to the visual).
    const servedBase = typeof row['resolved'] === 'object' && row['resolved'] !== null && !Array.isArray(row['resolved'])
        ? row['resolved'] : undefined;
    const value = resolveValue(spec ?? { form: '' }, user, servedBase);
    const specRows = spec !== null ? fieldsOf(spec) : [];
    // the SAME shared square provider the generic drill rides — one
    // definition, every surface (the operator's DRY law)
    const { square: squareFor, wireMenu } = useSquareProvider(onEdit, {
        candidates: props.upstream.map((u) => ({ id: u.id, label: u.title, url: u.url })),
    });
    const run = () => {
        if (spec === null)
            return;
        // PATCH FIRST (the generic drill's law, kept): the run reads what
        // the user SEES — the USER layer verbatim, plus nulls for keys
        // the frozen row held that left the map (JSON Merge Patch
        // deletes them; the unset path's domain half).
        const patch = {};
        const userKeys = new Set(Object.keys(user));
        for (const k of userKeys)
            patch[k] = user[k];
        for (const k of Object.keys(params))
            if (!userKeys.has(k))
                patch[k] = null;
        onPatch(patch);
        onRun();
    };
    // THE GESTURE BINDING (hour-26): the frame's top-bar pill calls
    // THIS verb (patch-domain-first). A REF DISPATCHER: the bound fn
    // is stable (bound once), the ref re-points every render — the
    // call always sees the current user/params maps.
    const runRef = useRef(run);
    runRef.current = run;
    useEffect(() => {
        props.bindRun?.(() => { runRef.current(); });
    }, [props.bindRun]);
    return h('div', { className: css.zoomDetail }, wireMenu, error !== null ? h('p', { className: css.runError }, error) : null, spec === null
        ? h('p', { className: css.groupNote }, 'loading the declared knob surface…')
        : h(StudioShell, {
            // LEFT — the params rail (the declared knob surface)
            params: h('div', { className: css.studioRail }, 
            // THE FAMILY AXIS (the schema-contract cure, 2026-10-18):
            // the served spec's families arm is the card's declared
            // model menu — the SAME shared ModelAxes the generic form
            // rides (one definition, every face). A studio without it
            // served a multi-family card with no way to switch family
            // in the drill: the contract held on the wire and died at
            // the face. A pick lands as ONE multi-key write (the atomic
            // pick law) merged onto the user layer; cleared axes stamp
            // '' and ride the patch-first run's merge-patch semantics.
            h(ModelAxes, {
                spec,
                value,
                onSet: onEdit,
                onPick: (patch) => { setUser((prev) => ({ ...prev, ...patch })); },
            }), 
            // CardForm renders each group's title itself — no duplicate.
            declaration.expose.map((g) => h('section', { key: g, className: css.studioGroup }, 
            // the group title the old SpecForm delegation rendered (the
            // view's component is CardForm today) — the
            // studio owns its partition now, so it owns the heading too
            h('h4', { className: css.studioGroupTitle }, g), h(StudioFields, { fields: rowsOfGroup(specRows, g), value, onEdit, square: squareFor }))), Object.entries(declaration.folds).map(([g, fold]) => {
                const fs = rowsOfGroup(specRows, g);
                if (fs.length === 0)
                    return null;
                const isOpen = open[g] === true;
                return h(DisclosureRow, {
                    key: g,
                    // the row's OWN glyph from the declaration (the
                    // ToolRow law: caller-supplied, semantic per row)
                    icon: FOLD_GLYPHS[fold.icon],
                    title: fold.title,
                    open: isOpen,
                    expandable: true,
                    // the reference law (ToolRow/ReasoningRow/GenericCommandCard
                    // all pass it): the whole title row is the toggle target.
                    expandOnRowClick: true,
                    onToggle: () => { setOpen((prev) => ({ ...prev, [g]: !prev[g] })); },
                }, h(StudioFields, { fields: fs, value, onEdit, square: squareFor }));
            })),
            // RIGHT — the mesh stage (the shared viewport, the old Stage law)
            preview: h(GlbStagePreview, {
                assets: meshUrl === null ? [] : [{ id: 'mesh', url: meshUrl, name: 'mesh' }],
                label: declaration.model,
                emptyHint: chromeCopy.emptyMeshHint,
            }),
        }));
}
/** The generic card's OWN atoms (SpecFieldRow renders one group's
 *  rows — the studio owns its group partition; zero atom copies).
 *  `value` is the RESOLVED map (resolveValue at the caller) — the
 *  rows show exactly what a run composes. */
function StudioFields({ fields, value, onEdit, square }) {
    if (fields.length === 0)
        return h('p', { className: css.groupNote }, 'no declared fields');
    return h('div', null, fields.map((f) => h(SpecFieldRow, {
        key: f.name, f, value: value[f.name], values: value, onEdit, square: square(f),
    })));
}
//# sourceMappingURL=studio.js.map
import type { ComponentProps, ReactElement, ReactNode } from "react";
import { StudioRail } from "./studioRail.js";
/** One loud failure row — the tenant derives them; the shell
 *  renders them as DOM text. */
export interface StudioShellError {
    id: string;
    message: string;
}
export interface StudioShellProps {
    /** LEFT slot — parameters (tenant-declared). The uniform shell law
     *  (2026-09-13): every card surface — timeline studio or standard
     *  form — is the same three-slot shape: params LEFT, preview RIGHT,
     *  bottom OPTIONAL (forms leave preview/bottom unclaimed). */
    params: ReactNode;
    /** RIGHT slot — preview (the viewport/output primitive, tenant-declared;
     *  unclaimed on form-only cards). */
    preview: ReactNode;
    /** BOTTOM slot — optional aux bar (timeline scrub; omit for none). */
    bottom?: ReactNode;
    /** Shell-owned chrome: the loud error line (empty = no line). */
    errors?: StudioShellError[];
    /** Root override (tenant gap/min-h). */
    className?: string;
}
/** The loud error line — shell-owned chrome. Same DOM the assembly
 *  body always rendered. */
export declare function StudioShellErrorLine({ errors, }: {
    errors: StudioShellError[];
}): ReactElement | null;
/** The studio body: params column LEFT (projected into the shell rail
 *  slot when one exists), preview RIGHT, optional bottom bar, then the
 *  error line. The uniform three-slot shape — timeline and form cards
 *  are the same grain, forms simply leave the right/bottom slots empty.
 *
 *  THE TOAST LAW (stroke 36): the shell mounts the ONE toast viewport
 *  — toasts are shell-owned chrome exactly like the error line (the
 *  construction law: no studio wires it, no studio can forget it).
 *  Before: motion hand-mounted a copy in a slot the contract never
 *  had (type drift), anny pushed toasts with NO viewport mounted —
 *  silently dropped — and ideogram4 hand-wired its own outside the
 *  shell. The per-studio mount is DEAD; any toast pushed from any
 *  seam renders here, once. */
export declare function StudioShell({ params, preview, bottom, errors, className, }: StudioShellProps): ReactElement;
/** THE shared rail grouping — one section box + the uppercase
 *  title, verbatim look. Props spread onto the <section>. */
export interface RailSectionProps extends Omit<ComponentProps<"section">, "title"> {
    /** Section title (the uppercase heading). */
    title: React.ReactNode;
    /** Optional right-aligned action (button, chip, count). */
    actions?: React.ReactNode;
    /** Override for the title line. */
    titleClassName?: string;
}
export declare function RailSection({ title, actions, children, className, titleClassName, ...props }: RailSectionProps): import("react").JSX.Element;
export interface CenterSeam {
    kind: string;
}
export interface BottomSeam {
    kind: string;
}
export interface RailSeam {
    slots: readonly string[];
}
export interface ShellDeclaration {
    preview: CenterSeam;
    bottom?: BottomSeam;
    params: RailSeam;
}
/** The construction door: one obvious way to build a declaration,
 *  typed at the call site. Runtime-frozen. */
export declare function defineShellDeclaration(declaration: ShellDeclaration): Readonly<ShellDeclaration>;
export { StudioRail };
//# sourceMappingURL=shell.d.ts.map

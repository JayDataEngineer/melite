import type { ReactNode } from "react";
export declare function Label({ className, ...props }: React.ComponentProps<"label">): import("react").JSX.Element;
export declare function ScrubInput({ className, ...props }: React.ComponentProps<"input">): import("react").JSX.Element;
export interface NumberFieldProps {
    value: number;
    onChange: (v: number) => void;
    min?: number;
    max?: number;
    step?: number;
    label?: string;
    tooltip?: string;
    className?: string;
    /** Fires ONCE when an interaction ENDS (drag release / edit commit) with
     * the final value — the persistence hook. */
    onCommit?: (v: number) => void;
}
export declare function NumberField({ value, onChange, min, max, step, label, tooltip, className, onCommit, }: NumberFieldProps): import("react").JSX.Element;
export declare function Tabs({ value, onValueChange, className, children, }: {
    value: string;
    onValueChange: (v: string) => void;
    className?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
export declare function TabsContent({ value, className, children, }: {
    value: string;
    className?: string;
    children?: ReactNode;
}): import("react").JSX.Element;
export declare function ScrollArea({ className, style, children, }: {
    className?: string;
    style?: React.CSSProperties;
    children?: ReactNode;
}): import("react").JSX.Element;
//# sourceMappingURL=form-fields.d.ts.map

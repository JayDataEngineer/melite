export interface RailTabItem<T extends string> {
    id: T;
    label: string;
    /** Active-edit count badge (emerald/amber/fuchsia dots the sliders). */
    badge?: number;
    badgeTone?: "emerald" | "amber" | "fuchsia";
}
export declare function RailTabs<T extends string>({ tabs, value, onChange, ariaLabel, dense }: {
    tabs: RailTabItem<T>[];
    value: T;
    onChange: (id: T) => void;
    ariaLabel: string;
    /** The nested sub-menu level: smaller, indented under its parent. */
    dense?: boolean;
}): import("react").JSX.Element;
//# sourceMappingURL=railTabs.d.ts.map

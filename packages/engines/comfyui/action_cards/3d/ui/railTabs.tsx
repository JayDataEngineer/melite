/**
 * RailTabs — THE reusable tab strip for card-studio rails (operator
 * order, 2026-09-06: Shape's "3 sub menus… should look like the
 * 'CHARACTER' and 'RENDER', just have them under the above bigger
 * menus. Reusing components").
 *
 * TWO levels, ONE component:
 *   top    the rail's big sections (Character / Render / Import)
 *   dense  a nested sub-menu (Shape's Phenotype / Body / Face) —
 *          smaller, indented under its parent, same DNA.
 *
 * This is the STRIP only — a controlled id/value/onChange trio. It
 * deliberately does not own tab state or panes: the rail mounts it on
 * its own useState; BodyShapePanel mounts it INSIDE its kit <Tabs>
 * (value/onValueChange stay the Tabs' — TabsContent keeps working).
 * role=tablist/tab + aria-selected so the semantics are one shape at
 * every level.
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives"
import styles from "./railTabs.module.css"

export interface RailTabItem<T extends string> {
  id: T
  label: string
  /** Active-edit count badge (emerald/amber/fuchsia dots the sliders). */
  badge?: number
  badgeTone?: "emerald" | "amber" | "fuchsia"
}

const TONE: Record<NonNullable<RailTabItem<string>["badgeTone"]>, string> = {
  emerald: styles.badgeEmerald,
  amber: styles.badgeAmber,
  fuchsia: styles.badgeFuchsia,
}

export function RailTabs<T extends string>({ tabs, value, onChange, ariaLabel, dense = false }: {
  tabs: RailTabItem<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel: string
  /** The nested sub-menu level: smaller, indented under its parent. */
  dense?: boolean
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${styles.strip} ${dense ? styles.stripDense : styles.stripTop}`}
    >
      {tabs.map((t) => (
        <Button variant="ghost"
          key={t.id}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={
            dense
              ? `${styles.tabDense} ${value === t.id ? styles.tabActive : styles.tabIdle}`
              : `${styles.tab} ${value === t.id ? styles.tabActive : styles.tabIdle}`
          }
        >
          {t.label}
          {t.badge !== undefined && t.badge > 0 && (
            <span className={`${styles.badge} ${TONE[t.badgeTone ?? "emerald"]}`}>{t.badge}</span>
          )}
        </Button>
      ))}
    </div>
  )
}

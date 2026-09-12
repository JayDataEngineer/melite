/**
 * skeleton — the quiet loading block (DSH-pure replacement for the
 * kit Skeleton: same data-slot, same pulse base; layout rides the
 * caller's classes, exactly as before).
 */
import styles from "./skeleton.module.css"

export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={className ? `${styles.skeleton} ${className}` : styles.skeleton}
      {...props}
    />
  )
}

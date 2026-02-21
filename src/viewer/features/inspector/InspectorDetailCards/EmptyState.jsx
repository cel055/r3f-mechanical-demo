import styles from "./cards.module.css";

/**
 * Empty state placeholder component.
 * Displayed when no part is currently selected in the hierarchy.
 *
 * @component
 * @returns {JSX.Element} Empty state UI with icon and message
 */
export function EmptyState() {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>📦</div>
      <p className={styles.emptyText}>Select a part to view details</p>
    </div>
  );
}

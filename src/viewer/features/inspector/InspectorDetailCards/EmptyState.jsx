import styles from "./cards.module.css";
import { Package } from "lucide-react";

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
      <div className={styles.emptyIcon}><Package size={48} strokeWidth={1.5} /></div>
      <p className={styles.emptyText}>Select a part to view details</p>
    </div>
  );
}

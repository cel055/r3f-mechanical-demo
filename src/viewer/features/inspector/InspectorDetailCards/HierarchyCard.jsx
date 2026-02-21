import styles from "./cards.module.css";

/**
 * Part hierarchy breadcrumb card component.
 * Displays the scene graph path from root to the selected object.
 * Shows the object's position within the 3D model hierarchy.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.partData - Part metadata from useSelectedPartMetadata hook
 * @param {string} props.partData.path - Full hierarchy path (e.g., "Fuselage > Wing > Section")
 * @returns {JSX.Element} Card UI with hierarchy path breadcrumb
 */
export function HierarchyCard({ partData }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>🗂️</span>
        <h4 className={styles.cardTitle}>Hierarchy</h4>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.pathChip}>{partData.path}</div>
      </div>
    </div>
  );
}

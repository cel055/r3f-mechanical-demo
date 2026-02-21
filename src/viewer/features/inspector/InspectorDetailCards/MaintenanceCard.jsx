import styles from "./cards.module.css";

/**
 * Part maintenance history card component.
 * Displays maintenance-related information including last service date and maintenance notes.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.partData - Part metadata from useSelectedPartMetadata hook
 * @param {string} props.partData.lastMaintenanceDate - Date of most recent service
 * @param {string} props.partData.maintenanceNotes - Comments about maintenance history
 * @returns {JSX.Element} Card UI with maintenance information
 */
export function MaintenanceCard({ partData }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>🔧</span>
        <h4 className={styles.cardTitle}>Maintenance</h4>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.row}>
          <span className={styles.label}>Last Service</span>
          <span className={styles.value}>{partData.lastMaintenanceDate}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Notes</span>
          <span className={styles.value}>{partData.maintenanceNotes}</span>
        </div>
      </div>
    </div>
  );
}

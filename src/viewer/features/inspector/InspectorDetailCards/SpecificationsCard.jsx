import styles from "./cards.module.css";

/**
 * Part specifications card component.
 * Displays technical specifications including serial number, material, weight, and production date.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.partData - Part metadata from useSelectedPartMetadata hook
 * @param {string} props.partData.serialNumber - Unique serial identifier
 * @param {string} props.partData.material - Material composition/type
 * @param {number} props.partData.weightKg - Weight in kilograms
 * @param {string} props.partData.productionDate - Manufacturing date
 * @returns {JSX.Element} Card UI with specifications grid
 */
export function SpecificationsCard({ partData }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <span className={styles.cardIcon}>📋</span>
        <h4 className={styles.cardTitle}>Specifications</h4>
      </div>
      <div className={styles.cardBody}>
        <div className={styles.row}>
          <span className={styles.label}>Serial Number</span>
          <span className={styles.value}>{partData.serialNumber}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Material</span>
          <span className={styles.value}>{partData.material}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Weight</span>
          <span className={styles.value}>{partData.weightKg} kg</span>
        </div>
        <div className={styles.row}>
          <span className={styles.label}>Production Date</span>
          <span className={styles.value}>{partData.productionDate}</span>
        </div>
      </div>
    </div>
  );
}

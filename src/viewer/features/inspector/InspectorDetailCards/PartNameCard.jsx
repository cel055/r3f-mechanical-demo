import styles from "./cards.module.css";

/**
 * Part name and identification card component.
 * Displays the primary name and part number of the selected object.
 *
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.partData - Part metadata from useSelectedPartMetadata hook
 * @param {string} props.partData.name - Display name of the part
 * @param {string} props.partData.partNumber - Unique part identifier/number
 * @returns {JSX.Element} Card UI with part name and number
 */
export function PartNameCard({ partData }) {
  return (
    <div className={styles.card}>
      <h3 className={styles.partName}>{partData.name}</h3>
      <p className={styles.partNumber}>{partData.partNumber}</p>
    </div>
  );
}

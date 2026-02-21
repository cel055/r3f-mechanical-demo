import { useState } from "react";
import { useSelectedPartMetadata } from "../../partMetadata/partMetadata";
import { EmptyState } from "../InspectorDetailCards/EmptyState";
import { PartNameCard } from "../InspectorDetailCards/PartNameCard";
import { SpecificationsCard } from "../InspectorDetailCards/SpecificationsCard";
import { MaintenanceCard } from "../InspectorDetailCards/MaintenanceCard";
import { HierarchyCard } from "../InspectorDetailCards/HierarchyCard";
import styles from "./InspectorPanel.module.css";

/**
 * Inspector panel component showing detailed metadata for selected parts.
 *
 * Features:
 * - Collapsible panel (right sidebar)
 * - Shows part name, specifications, maintenance info, hierarchy
 * - Notification badge when part data is available
 * - Empty state when no part is selected
 *
 * Panel can be toggled between expanded and collapsed states.
 * Uses right-arrow/left-arrow icons to indicate state.
 *
 * @component
 * @returns {JSX.Element} Inspector panel or collapsed button
 */
export function InspectorPanel() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const partData = useSelectedPartMetadata();

  /**
   * Toggle between expanded and collapsed panel states.
   */
  const togglePanel = () => setIsCollapsed(!isCollapsed);

  if (isCollapsed) {
    return (
      <div className={styles.panelCollapsed}>
        <button
          className={styles.toggleBtn}
          onClick={togglePanel}
          title="Show Details"
        >
          ◀{partData && <span className={styles.notificationBadge}></span>}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.title}>Part Details</h2>
        <button
          className={styles.toggleBtn}
          onClick={togglePanel}
          title="Hide Details"
        >
          ▶
        </button>
      </div>

      {!partData ? (
        <EmptyState />
      ) : (
        <div className={styles.content}>
          <PartNameCard partData={partData} />
          <SpecificationsCard partData={partData} />
          <MaintenanceCard partData={partData} />
          <HierarchyCard partData={partData} />
        </div>
      )}
    </div>
  );
}

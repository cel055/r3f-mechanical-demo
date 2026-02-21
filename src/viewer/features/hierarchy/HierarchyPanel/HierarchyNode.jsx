import { useEffect, useRef, useCallback, memo } from "react";
import { viewerStateStore } from "../../viewerState/viewerState";
import styles from "./HierarchyNode.module.css";

/**
 * Hierarchical tree node component for scene object representation.
 * Renders expandable/collapsible nodes with selection, visibility toggle, and isolation controls.
 * 
 * @component
 * @param {Object} props - Component props
 * @param {Object} props.node - Scene node object with id, name, and children array
 * @param {number} props.level - Nesting depth (for indentation calculation)
 * @param {string} props.selectedId - Currently selected node ID (from parent)
 * @param {Function} props.onSelect - Callback when node is selected
 * @param {Set<string>} props.matchedIds - Set of node IDs matching search filter
 * @param {Set<string>} props.openNodes - Set of expanded node IDs (controlled by parent)
 * @param {Function} props.onToggle - Callback when expand/collapse button is clicked
 * @returns {JSX.Element} Recursive tree node component with children
 */
export const HierarchyNode = memo(function HierarchyNode({
  node,
  level,
  selectedId,
  onSelect,
  matchedIds,
  // controlled props from parent
  openNodes = new Set(),
  onToggle = () => {},
}) {
  const itemRef = useRef(null);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedId === node.id;
  const isOpen = openNodes && openNodes.has(node.id);

  /** Retrieve visibility and isolation state from global store. */
  const isVisible = viewerStateStore((state) => state.isObjectVisible(node.id));
  const toggleVisibility = viewerStateStore((state) => state.toggleVisibility);
  const isIndividuallyIsolated = viewerStateStore((state) =>
    state.isIndividuallyIsolated(node.id),
  );
  const toggleIndividualIsolation = viewerStateStore(
    (state) => state.toggleIndividualIsolation,
  );

  /**
   * Auto-scroll to selected item for improved user experience.
   * Uses smooth scrolling behavior and 'nearest' block positioning.
   */
  useEffect(() => {
    if (isSelected && itemRef.current) {
      itemRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isSelected]);

  /**
   * Handle expand/collapse button click.
   * Notifies parent component to update the controlled openNodes Set.
   */
  const handleToggle = useCallback(() => {
    try {
      onToggle(node.id, !isOpen);
    } catch (e) {
      /* ignore */
    }
  }, [node.id, isOpen, onToggle]);

  /**
   * Handle node selection by ID.
   * Memoized to prevent unnecessary parent re-renders.
   */
  const handleSelect = useCallback(() => {
    onSelect(node.id);
  }, [onSelect, node.id]);

  /**
   * Manual double-click detection for visibility icon.
   * Timeout-based approach since native dblclick doesn't work well with stopPropagation.
   * 
   * Interaction:
   * - Single-click (within 200ms): toggle object visibility
   * - Double-click (2 clicks within 200ms): toggle individual isolation mode
   */
  const clickTimeoutRef = useRef(null);

  const handleVisibilityIconClick = useCallback(
    (e) => {
      e.stopPropagation();

      /**
       * If a timeout is already pending, this is the second click.
       * Execute double-click action (isolation toggle) and clear the timeout.
       */
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        // Double-click: toggle isolation mode
        toggleIndividualIsolation(node.id);
        return;
      }

      /**
       * First click: start a 200ms timeout waiting for a potential second click.
       * If no second click arrives within this window, execute single-click action.
       */
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
        // Single-click: toggle visibility
        toggleVisibility(node.id);
      }, 200);
    },
    [toggleVisibility, toggleIndividualIsolation, node.id],
  );

  /**
   * Cleanup effect: clear any pending click timeout on component unmount.
   * Prevents memory leaks and ensures clean closure of async operations.
   */
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className={styles.node}>
      <div className={styles.row} style={{ paddingLeft: level * 12 }}>
        {hasChildren ? (
          <button
            className={styles.toggle}
            type="button"
            onClick={handleToggle}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "-" : "+"}
          </button>
        ) : (
          <span className={styles.spacer} />
        )}
        <button
          ref={itemRef}
          className={`${styles.item}${isSelected ? ` ${styles.itemSelected}` : ""}${!isVisible ? ` ${styles.itemHidden}` : ""}${!isSelected && matchedIds && matchedIds.has(node.id) ? ` ${styles.itemMatched}` : ""}`}
          type="button"
          onClick={handleSelect}
          title={node.name}
        >
          <span className={styles.itemName}>{node.name}</span>
          <span
            className={styles.visibilityIcon}
            onClick={handleVisibilityIconClick}
            aria-label={
              isIndividuallyIsolated
                ? "Exit isolation (double-click)"
                : isVisible
                  ? "Hide object or isolate (double-click)"
                  : "Show object"
            }
            title={
              isIndividuallyIsolated
                ? "Exit isolation (double-click)"
                : isVisible
                  ? "Hide object or isolate (double-click)"
                  : "Show object"
            }
          >
            {isIndividuallyIsolated ? "🎯" : isVisible ? "👁️" : "👁️‍🗨️"}
          </span>
        </button>
      </div>
      {hasChildren && isOpen
        ? node.children.map((child) => (
            <HierarchyNode
              key={child.id}
              node={child}
              level={level + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              matchedIds={matchedIds}
              openNodes={openNodes}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
});

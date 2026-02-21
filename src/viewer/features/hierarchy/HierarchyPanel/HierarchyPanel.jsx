import { viewerStateStore } from "../../viewerState/viewerState";
import { HierarchyNode } from "./HierarchyNode";
import styles from "./HierarchyPanel.module.css";
import { useHierarchyFilter } from "../hooks/useHierarchyFilter";
import HierarchyFilterControls from "./HierarchyFilterControls";
import { useState, useEffect, useRef, startTransition } from "react";

/**
 * Main hierarchy panel component for scene object tree.
 *
 * Manages:
 * - Tree expansion/collapse state (auto and manual preferences)
 * - Search and filtering (visibility, search text)
 * - Selection and isolation mode
 * - Automatic expansion logic based on selected items and search matches
 *
 * @component
 * @returns {JSX.Element} Sidebar panel with object hierarchy tree
 */
export function HierarchyPanel() {
  /**
   * Load scene items from store and selection state.
   * Panel reads items and responds to selection by dispatching setSelectedById.
   */
  const items = viewerStateStore((state) => state.items);
  const selectedItem = viewerStateStore((state) => state.selectedItem);
  const selectedId = viewerStateStore((state) => state.selectedId);
  const setSelectedById = viewerStateStore((state) => state.setSelectedById);
  const toggleIsolationMode = viewerStateStore(
    (state) => state.toggleIsolationMode,
  );
  const isolationMode = viewerStateStore((state) => state.isolationMode);

  /**
   * Get search/filter results from custom hook.
   * Includes filtered items, search text, and matched node IDs.
   */
  const {
    filteredItems,
    search,
    setSearch,
    onlyVisible,
    setOnlyVisible,
    matchedIds,
    firstMatchId,
  } = useHierarchyFilter(items);

  /** Track whether user wants to expand all search matches. */
  const [expandAllMatches, setExpandAllMatches] = useState(false);

  /**
   * Get hidden objects set from store.
   * Used to conditionally disable "only visible" filter checkbox.
   */
  const hiddenObjects = viewerStateStore((state) => state.hiddenObjects);
  const hasHiddenObjects = Boolean(hiddenObjects && hiddenObjects.size > 0);

  /**
   * Sync "only visible" filter with actual hidden state.
   * If there are no hidden objects, disable the checkbox to avoid confusion.
   */
  useEffect(() => {
    if (!hasHiddenObjects && onlyVisible) {
      setOnlyVisible(false);
    }
  }, [hasHiddenObjects, onlyVisible, setOnlyVisible]);

  /**
   * Track user's manual expand/collapse preferences.
   * Maps node ID -> boolean (true = user opened, false = user closed).
   * This persists across filter changes.
   */
  const [manualPreference, setManualPreference] = useState(new Map());

  /**
   * Update manual expand/collapse preference for a node.
   * @param {string} id - Node ID to toggle
   * @param {boolean} open - Whether node should be open
   */
  const onManualToggle = (id, open) => {
    setManualPreference((prev) => {
      const next = new Map(prev);
      next.set(id, Boolean(open));
      return next;
    });
  };

  /**
   * Collect all ancestor node IDs for a set of matched node IDs.
   * Used to auto-expand branch paths containing search matches.
   *
   * @param {Array} tree - Root nodes of hierarchy tree
   * @param {Set<string>} matches - Set of matched node IDs
   * @returns {Set<string>} Set of ancestor node IDs (including matches themselves)
   */
  const collectAncestorIds = (tree, matches) => {
    const out = new Set();

    const walk = (node) => {
      let foundInChildren = false;
      // Recursively check all children
      for (const child of node.children || []) {
        if (walk(child)) foundInChildren = true;
      }
      const selfMatch = matches.has(node.id);
      // If this node or any descendant matches, add this node as ancestor
      if (selfMatch || foundInChildren) {
        out.add(node.id);
      }
      return selfMatch || foundInChildren;
    };

    // Process each root node in tree
    for (const n of tree || []) walk(n);
    return out;
  };

  /**
   * Find complete ancestor path (root to node) for a given node ID.
   * Used for auto-expansion of ancestors when selecting or filtering.
   *
   * @param {Array} tree - Root nodes of hierarchy tree
   * @param {string} id - Target node ID to find path to
   * @returns {Array} Array of node objects from root to target (inclusive)
   */
  const findAncestorNodePath = (tree, id) => {
    const path = [];
    const dfs = (nodes, acc) => {
      for (const n of nodes || []) {
        const nextAcc = acc.concat(n);
        if (n.id === id) {
          path.push(...nextAcc);
          return true;
        }
        if (n.children && n.children.length) {
          if (dfs(n.children, nextAcc)) return true;
        }
      }
      return false;
    };
    dfs(tree || [], []);
    return path;
  };

  /**
   * Persist ancestor branches of a target node as manually opened.
   * This keeps those branches open even when auto-open focus changes.
   *
   * @param {string|null} targetId - Node ID whose ancestor branch should stay open
   */
  const commitOpenAncestors = (targetId) => {
    if (!targetId) return;

    const pathNodes = findAncestorNodePath(items, targetId);
    const idsToOpen = pathNodes
      .filter((n) => n.children && n.children.length > 0)
      .map((n) => n.id);

    if (idsToOpen.length === 0) return;

    startTransition(() => {
      setManualPreference((prev) => {
        const next = new Map(prev);
        idsToOpen.forEach((id) => next.set(id, true));
        return next;
      });
    });
  };

  /**
   * Track previous search value to detect when search is cleared.
   * Used to preserve manual open state for selected item.
   */
  const prevSearchRef = useRef(search);
  const prevSelectedIdRef = useRef(selectedId);

  /**
   * Keeps selection branches manually opened in two situations:
   * 1) Search is cleared (preserve current selection branch)
   * 2) Selection changes (including selection from canvas)
   */
  useEffect(() => {
    const prevSearch = prevSearchRef.current;
    const prevSelectedId = prevSelectedIdRef.current;

    const searchWasCleared = Boolean(prevSearch) && !search;
    const selectionChanged =
      Boolean(selectedId) && selectedId !== prevSelectedId;

    if (searchWasCleared || selectionChanged) {
      commitOpenAncestors(selectedId);
    }

    prevSearchRef.current = search;
    prevSelectedIdRef.current = selectedId;
  }, [search, selectedId, items]);

  /**
   * Compute which nodes should be auto-expanded.
   * Combines:
   * 1. Ancestor path of selected item
   * 2. Ancestor paths of search matches (if expandAllMatches enabled)
   * 3. Ancestor path to first match (if expandAllMatches disabled)
   * 4. Removes nodes explicitly closed by user (manualPreference = false)
   *
   * @returns {Set<string>} Set of node IDs that should be auto-opened
   */
  const computeAutoOpenIds = () => {
    const ids = new Set();

    // Auto-expand path to selected node (but not the node itself)
    if (selectedId) {
      const pathNodes = findAncestorNodePath(items, selectedId);
      // Exclude the selected node itself to avoid auto-expanding its children
      const ancestorNodes = pathNodes.slice(0, -1);
      ancestorNodes
        .filter((n) => n.children && n.children.length > 0)
        .forEach((n) => ids.add(n.id));
    }

    // Auto-expand matches
    if (expandAllMatches && matchedIds && matchedIds.size > 0) {
      // Expand all ancestor branches for all matches
      collectAncestorIds(filteredItems, matchedIds).forEach((id) =>
        ids.add(id),
      );
    } else if (!expandAllMatches && firstMatchId) {
      // Expand path to first match only
      const pathNodes = findAncestorNodePath(items, firstMatchId);
      pathNodes
        .filter((n) => n.children && n.children.length > 0)
        .forEach((n) => ids.add(n.id));
    }

    // User's manual preferences override auto expansion
    // If user explicitly closed a node, remove from auto-open set
    for (const [id, open] of manualPreference) {
      if (open === false && ids.has(id)) ids.delete(id);
    }

    return ids;
  };

  const autoOpenIds = computeAutoOpenIds();

  /**
   * Merge auto-open IDs with manual preferences.
   * Manual preferences (true/false) override auto expansion.
   * Final set represents all nodes that should be expanded.
   */
  const openNodes = new Set(autoOpenIds);
  for (const [id, open] of manualPreference) {
    if (open) openNodes.add(id);
    else openNodes.delete(id);
  }

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        {/* Panel title and global isolation toggle */}
        <div className={styles.panelTitleRow}>
          <div className={styles.panelTitle}>Hierarchy</div>
          <button
            className={`${styles.globalBtn} ${isolationMode ? styles.globalBtnActive : ""}`}
            type="button"
            onClick={toggleIsolationMode}
            disabled={!selectedId && !hasHiddenObjects}
            title={
              isolationMode ? "Show all objects" : "Isolate selected object"
            }
            aria-label={
              isolationMode ? "Show all objects" : "Isolate selected object"
            }
          >
            👁️
          </button>
        </div>

        {/* Display currently selected item name */}
        <div className={styles.panelSelected}>
          Selected: <span>{selectedItem || "None"}</span>
        </div>

        {/* Search and filter controls */}
        <div className={styles.headerControls}>
          <HierarchyFilterControls
            search={search}
            setSearch={setSearch}
            onlyVisible={onlyVisible}
            setOnlyVisible={setOnlyVisible}
            isModelLoaded={items.length > 0}
            onlyVisibleDisabled={!hasHiddenObjects}
            matchedCount={matchedIds.size}
            expandAllMatches={expandAllMatches}
            setExpandAllMatches={setExpandAllMatches}
          />
        </div>
      </div>

      {/* Tree content with recursive HierarchyNode components */}
      <div className={styles.panelContent}>
        {items.length === 0 ? (
          <div className={styles.panelEmpty}>Model not loaded.</div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((node) => (
            <HierarchyNode
              key={node.id}
              node={node}
              level={0}
              selectedId={selectedId}
              onSelect={setSelectedById}
              matchedIds={search ? matchedIds : new Set()}
              openNodes={openNodes}
              onToggle={onManualToggle}
            />
          ))
        ) : (
          <div className={styles.panelEmpty}>No matching parts.</div>
        )}
      </div>
    </aside>
  );
}

import { useState, useMemo } from "react";
import { useDebouncedValue } from "./useDebouncedValue";
import { viewerStateStore } from "../../viewerState/viewerState";

/**
 * Custom hook for filtering and searching the scene hierarchy.
 *
 * Provides:
 * - Search by part name (with debouncing for performance)
 * - Filter by visibility status ("show only visible" toggle)
 * - Computes matching objects and first match for auto-focus
 * - Efficient tree traversal with memoization
 *
 * Performance considerations:
 * - Search input is debounced (250ms) to avoid filtering on every keystroke
 * - useMemo caches filtered results even if inputs haven't changed
 * - Tree traversal is O(n) but memoized to prevent recalculation
 *
 * @hook
 * @param {Array<Object>} items - Hierarchy tree root nodes (from state.items)
 * @returns {Object} Filter state and results:
 *   - {string} search - Current search input
 *   - {Function} setSearch - Update search input
 *   - {boolean} onlyVisible - "Show only visible" toggle
 *   - {Function} setOnlyVisible - Update visibility filter
 *   - {Array} filteredItems - Filtered hierarchy tree
 *   - {Set<string>} matchedIds - UUIDs of all matched items
 *   - {string|null} firstMatchId - UUID of first matched item (for auto-focus)
 *
 * @example
 * const filter = useHierarchyFilter(items);
 *
 * // User searches for "engine"
 * filter.setSearch('engine');
 *
 * // Get only visible items matching "engine"
 * filter.setOnlyVisible(true);
 */
export function useHierarchyFilter(items) {
  const [search, setSearch] = useState("");
  const [onlyVisible, setOnlyVisible] = useState(false);

  /**
   * Debounce search input to avoid filtering on every keystroke.
   * User's keystrokes are batched into a single filter operation after 250ms of inactivity.
   */
  const debouncedSearch = useDebouncedValue(search, 250);

  /**
   * Memoized filter computation.
   * Rebuilds only when debouncedSearch, items, or onlyVisible changes.
   *
   * Returns:
   * - filteredItems: Pruned tree showing only matches and their ancestors
   * - matchedIds: Set of all matched UUIDs
   * - firstMatchId: UUID of first match (for auto-focus)
   */
  const { filteredItems, matchedIds, firstMatchId } = useMemo(() => {
    const t0 = performance.now();
    const matches = new Set();
    const searchTerm = (debouncedSearch || "").trim().toLowerCase();

    /**
     * Only apply filtering if search is non-empty OR visible-only filter is active.
     * If no filters, return full tree and empty match set.
     */
    const isFilteringActive = Boolean(searchTerm) || Boolean(onlyVisible);

    let firstMatchId = null;

    /**
     * Check if a single node matches the active filters.
     * Matching is AND logic: must match both name search AND visibility filter.
     */
    const nodeMatches = (node) => {
      if (!isFilteringActive) return false;

      /**
       * Name match: check if part name includes search term (case-insensitive).
       * Empty search term always matches for name.
       */
      const nameMatched =
        !searchTerm || (node.name || "").toLowerCase().includes(searchTerm);
      /**
       * Visibility match: if onlyVisible is true, only show visible objects.
       */
      const visible = viewerStateStore.getState().isObjectVisible(node.id);
      const visibleMatched = !onlyVisible || visible;
      /**
       * Combined match: node must satisfy both filters.
       */
      const matched = nameMatched && visibleMatched;
      if (matched && !firstMatchId) firstMatchId = node.id;
      return nameMatched && visibleMatched;
    };

    /**
     * Recursively filter tree, keeping:
     * - Nodes that match the filter
     * - Parents of nodes that match (to show context)
     * - Children of matching nodes (to show full subtree)
     */
    const filterNode = (node) => {
      const children = (node.children || []).map(filterNode).filter(Boolean);

      const selfMatches = nodeMatches(node);
      if (selfMatches) {
        matches.add(node.id);
      }

      /**
       * Keep this node if:
       * 1. The node itself matches, OR
       * 2. Any of its children were kept by the filter
       * Otherwise, prune this branch from the result.
       */
      if (selfMatches || children.length > 0) {
        return { ...node, children };
      }

      return null;
    };

    /**
     * If no active filter, return original tree unmodified.
     * This preserves the full hierarchy for viewing without filters.
     */
    if (!isFilteringActive) {
      const outItems = items || [];
      return {
        filteredItems: outItems,
        matchedIds: new Set(),
        firstMatchId: null,
      };
    }

    const out = (items || []).map(filterNode).filter(Boolean);
    const duration = Math.round(performance.now() - t0);
    // Timing computation retained

    return { filteredItems: out, matchedIds: matches, firstMatchId };
  }, [items, debouncedSearch, onlyVisible]);

  return {
    search,
    setSearch,
    onlyVisible,
    setOnlyVisible,
    filteredItems,
    matchedIds,
    firstMatchId,
  };
}

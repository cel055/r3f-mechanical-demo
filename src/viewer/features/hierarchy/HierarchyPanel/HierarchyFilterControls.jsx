import styles from "./HierarchyPanel.module.css";

/**
 * Filter controls component for hierarchy search and visibility.
 *
 * Provides:
 * - Search input for filtering scene objects by name
 * - "Only visible" checkbox to filter hidden objects
 * - Match count display
 * - Expand/collapse button for search match branches
 *
 * @component
 * @param {Object} props - Component props
 * @param {string} props.search - Current search query
 * @param {Function} props.setSearch - Callback to update search query
 * @param {boolean} props.onlyVisible - Whether to show only visible objects
 * @param {Function} props.setOnlyVisible - Callback to toggle visibility filter
 * @param {boolean} props.isModelLoaded - Whether model has loaded (enables controls)
 * @param {number} props.matchedCount - Number of objects matching search
 * @param {boolean} props.onlyVisibleDisabled - Disable "only visible" if no hidden objects
 * @param {boolean} props.expandAllMatches - Whether to expand all matched branches
 * @param {Function} props.setExpandAllMatches - Callback to toggle expand all matches
 * @returns {JSX.Element} Filter control UI with search and checkboxes
 */
export function HierarchyFilterControls({
  search,
  setSearch,
  onlyVisible,
  setOnlyVisible,
  isModelLoaded = false,
  matchedCount = 0,
  // When true, disable the "Only visible" checkbox (used when nothing is hidden)
  onlyVisibleDisabled = false,
  expandAllMatches = false,
  setExpandAllMatches = () => {},
}) {
  return (
    <div className={styles.filterControls}>
      {/* Search input for filtering scene objects */}
      <input
        className={styles.filterInput}
        type="search"
        placeholder="Search parts..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
        }}
        aria-label="Search parts"
        disabled={!isModelLoaded}
      />

      <div className={styles.filterMeta} aria-live="polite">
        {/* Display number of matching results */}
        <span className={styles.matchCount}>{matchedCount} results</span>

        {/* Checkbox: Only show visible objects (hide hidden ones) */}
        <label
          className={styles.filterCheckboxLabel}
          style={
            onlyVisibleDisabled
              ? { opacity: 0.65, cursor: "not-allowed", color: "#8a8a8a" }
              : undefined
          }
        >
          <input
            type="checkbox"
            checked={onlyVisible}
            onChange={(e) => {
              setOnlyVisible(e.target.checked);
            }}
            disabled={!isModelLoaded || onlyVisibleDisabled}
          />
          Only visible
        </label>

        {/* Toggle button: Expand all matched branches or collapse them */}
        <button
          type="button"
          className={styles.expandAllBtn}
          onClick={() => setExpandAllMatches(!expandAllMatches)}
          disabled={!isModelLoaded || matchedCount === 0}
          aria-pressed={expandAllMatches}
          aria-label={
            expandAllMatches
              ? "Collapse all matched branches"
              : "Expand all matched branches"
          }
        >
          {expandAllMatches ? "collapse" : "expand"}
        </button>
      </div>
    </div>
  );
}

export default HierarchyFilterControls;

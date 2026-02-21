import { useEffect, useState } from "react";
import { viewerStateStore } from "../../viewerState/viewerState";
import {
  loadParts,
  getPartByName,
} from "../../../../services/partMetadata/partsService";

/**
 * Custom hook to fetch and manage part metadata for the selected object.
 *
 * Handles the full lifecycle:
 * - Loads parts.json once on component mount (with cleanup)
 * - Watches for selection changes
 * - Returns metadata for currently selected part
 * - Manages global loading state
 *
 * NOTE: This hook has a potential memory leak concern (see below).
 *
 * @hook
 * @returns {Object|null} Part metadata object for selected item, or null if:
 *   - Parts are still loading
 *   - No item is currently selected
 *   - Selected item not found in parts data
 *
 * @example
 * const partData = useSelectedPartMetadata();
 * if (partData) {
 *   console.log(partData.name, partData.specifications);
 * }
 *
 * @todo Add cleanup flag to prevent state updates on unmounted component
 *       (see InteractiveModel for reference implementation)
 */
export const useSelectedPartMetadata = () => {
  // Retrieve selection state from global store
  const selectedItem = viewerStateStore((state) => state.selectedItem);
  const setLoading = viewerStateStore((state) => state.setLoading);

  /**
   * Local state to cache parts data after initial load.
   * Prevents refetching on every component render.
   */
  const [partsData, setPartsData] = useState(null);

  /**
   * Load parts metadata once on mount.
   *
   * This fires during initial app startup, fetching parts.json from public folder.
   * Results are cached by loadParts(), so subsequent selections won't refetch.
   */
  useEffect(() => {
    setLoading(true);
    loadParts()
      .then((data) => {
        setPartsData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Error loading parts data:", err);
        setLoading(false);
      });
  }, [setLoading]);

  /**
   * Return part info for the currently selected item.
   * Returns null if still loading or no item selected.
   */
  if (!partsData || !selectedItem) {
    return null;
  }

  return getPartByName(partsData, selectedItem);
};

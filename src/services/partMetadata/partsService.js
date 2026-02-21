/**
 * Parts data service - handles loading and querying part metadata.
 *
 * Provides:
 * - Lazy loading with automatic caching to avoid repeated fetches
 * - Fast lookups of part data by name
 * - Error handling and logging
 *
 * Metadata is stored as JSON in public/parts.json and indexed by part name.
 */

/** Cached parts data to avoid repeated fetches */
let cachedParts = null;

/**
 * Load parts metadata from public/parts.json file.
 *
 * Results are cached after first successful load to minimize network requests.
 * Subsequent calls return cached data immediately.
 *
 * @async
 * @returns {Promise<Object>} Parts data object indexed by part name (partsByName)
 * @throws {Error} If fetch fails or JSON parsing fails
 *
 * @example
 * const parts = await loadParts();
 * const engineData = parts['Engine Block'];
 */
export const loadParts = async () => {
  if (cachedParts) {
    return cachedParts;
  }

  try {
    const res = await fetch("/parts.json");
    const data = await res.json();
    cachedParts = data.partsByName;
    return cachedParts;
  } catch (err) {
    console.error("❌ Error loading parts data:", err);
    throw err;
  }
};

/**
 * Get part information by name from loaded parts data.
 *
 * Safe lookup with fallback to null if part not found.
 * Logs warning to console if part name doesn't exist in data.
 *
 * @param {Object} partsData - The loaded parts data object (from loadParts)
 * @param {string} name - The part name to look up
 * @returns {Object|null} Part information object, or null if not found
 *
 * @example
 * const parts = await loadParts();
 * const partInfo = getPartByName(parts, 'Engine Block');
 */
export const getPartByName = (partsData, name) => {
  if (!partsData || !name) {
    return null;
  }

  const part = partsData[name];
  if (!part) {
    console.warn(`⚠️ No data found for part: ${name}`);
    return null;
  }

  return part;
};

/**
 * Clear the cached parts data.
 *
 * Useful for:
 * - Development/testing (forcing fresh data load)
 * - Implementing refresh functionality in the UI
 * - Resetting application state
 *
 * After calling this, next loadParts() will fetch fresh data from server.
 */
export const clearCache = () => {
  cachedParts = null;
};

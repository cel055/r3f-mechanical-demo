import { create } from "zustand";

// Object references stay outside the store to keep state serializable.
let objectMapRef = {};
let meshDescendantsCacheRef = {};

const buildMeshDescendantsCache = (map) => {
  const cache = {};
  Object.entries(map).forEach(([uuid, obj]) => {
    if (obj.type === "Mesh") {
      cache[uuid] = [uuid];
      return;
    }

    const meshIds = [];
    obj.traverse((child) => {
      if (child.type === "Mesh") {
        meshIds.push(child.uuid);
      }
    });
    cache[uuid] = meshIds;
  });

  return cache;
};

export const viewerStateStore = create((set, get) => ({
  // ============ LOADING STATE ============
  /** Whether the 3D model and metadata are currently loading */
  isLoading: true,
  /** Update the global loading state */
  setLoading: (loading) => set({ isLoading: loading }),

  // ============ SELECTION STATE ============
  /** Display name of the currently selected object (for UI display) */
  selectedItem: null,
  /** UUID of the currently selected object */
  selectedId: null,
  /** Array of mesh UUIDs (expanded to descendants if parent was selected) */
  selectedIds: [],
  /** Hierarchy tree structure built from scene for panel rendering */
  items: [],
  /** Set the selected item name (used by panel) */
  setSelectedItem: (name) => set({ selectedItem: name }),

  // ============ VISIBILITY & ISOLATION STATE ============
  /** Set of hidden object UUIDs (default: all visible) */
  hiddenObjects: new Set(),
  /** Whether in global isolation mode (showing only selected and visible objects) */
  isolationMode: false,
  /** UUID of object in individual isolation (null if no individual isolation active) */
  individualIsolatedId: null,

  // ============ EXPLOSION ANIMATION STATE ============
  /** Explosion animation progress from 0 (none) to 1 (full) */
  explosionFactor: 0,
  /**
   * Set explosion factor with automatic clamping to 0-1 range.
   * Non-finite values default to 0.
   */
  setExplosionFactor: (value) => {
    const parsed = Number(value);
    const safeValue = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 0), 1)
      : 0;
    set({ explosionFactor: safeValue });
  },
  /** Reset explosion animation to 0 */
  resetExplosion: () => set({ explosionFactor: 0 }),

  // ============ VISIBILITY MANAGEMENT ============
  /**
   * Toggle visibility of an object and all its descendants.
   * If object is hidden, shows it and all descendants.
   * If object is visible, hides it and all descendants.
   * Updates visual state in scene via InteractiveModel effect.
   */
  toggleVisibility: (id) => {
    const obj = objectMapRef[id];
    if (!obj) return;

    const hiddenObjects = new Set(get().hiddenObjects);
    const isCurrentlyHidden = hiddenObjects.has(id);

    // Collect all descendant uuids
    const descendants = [];
    obj.traverse((child) => {
      descendants.push(child.uuid);
    });

    if (isCurrentlyHidden) {
      // Show: remove from hidden set
      descendants.forEach((uuid) => hiddenObjects.delete(uuid));
    } else {
      // Hide: add to hidden set
      descendants.forEach((uuid) => hiddenObjects.add(uuid));
    }

    set({ hiddenObjects });
  },

  /**
   * Check if an object is currently visible.
   * Returns false if object is in the hiddenObjects set.
   */
  isObjectVisible: (id) => {
    return !get().hiddenObjects.has(id);
  },

  // ============ ISOLATION MODES ============
  /**
   * Toggle global isolation mode.
   *
   * When entering isolation:
   * - Hides all objects except the selected object and its ancestors
   * - Ancestors are kept visible so selection remains in view
   * - Useful for inspecting a specific part and its context
   *
   * When exiting isolation:
   * - Shows all objects
   * - Clears both global and individual isolation
   */
  toggleIsolationMode: () => {
    const { isolationMode, selectedId } = get();

    if (!isolationMode && selectedId) {
      /**
       * Entering isolation: show only selected object, its descendants, and ancestors.
       * Ancestors are needed to maintain hierarchical visibility.
       */
      const hiddenObjects = new Set();
      const selectedObj = objectMapRef[selectedId];

      if (selectedObj) {
        // Collect selected object and all its descendants (all visible in isolation)
        const visibleUuids = new Set();
        selectedObj.traverse((child) => {
          visibleUuids.add(child.uuid);
        });

        // Also collect all ancestors up to root (keep hierarchy visible)
        let parent = selectedObj.parent;
        while (parent) {
          visibleUuids.add(parent.uuid);
          parent = parent.parent;
        }

        /**
         * Hide all objects not in the visible set.
         * This leaves only the isolation context visible.
         */
        Object.keys(objectMapRef).forEach((uuid) => {
          if (!visibleUuids.has(uuid)) {
            hiddenObjects.add(uuid);
          }
        });
      }

      set({ hiddenObjects, isolationMode: true, individualIsolatedId: null });
    } else {
      // Exiting isolation: show everything and clear all filters
      set({
        hiddenObjects: new Set(),
        isolationMode: false,
        individualIsolatedId: null,
      });
    }
  },

  /**
   * Reset all visibility: show all objects and exit all isolation modes.
   * Called when user clicks "Show All" or similar reset action.
   */
  showAll: () => {
    set({
      hiddenObjects: new Set(),
      isolationMode: false,
      individualIsolatedId: null,
    });
  },

  /**
   * Toggle individual object isolation (double-click on visibility icon).
   *
   * Shows ONLY the specified object and its ancestors (for context).
   * Toggling same object again exits isolation.
   *
   * Differs from toggleIsolationMode in scope:
   * - toggleIsolationMode: uses selected object
   * - toggleIndividualIsolation: uses specific object parameter
   */
  toggleIndividualIsolation: (id) => {
    const { individualIsolatedId } = get();

    if (individualIsolatedId === id) {
      // Already isolated, exit isolation
      set({ hiddenObjects: new Set(), individualIsolatedId: null });
    } else {
      // Enter isolation for this object
      const hiddenObjects = new Set();
      const targetObj = objectMapRef[id];

      if (targetObj) {
        // Collect target object and all its descendants
        const visibleUuids = new Set();
        targetObj.traverse((child) => {
          visibleUuids.add(child.uuid);
        });

        // Also collect all ancestors (keep hierarchy context visible)
        let parent = targetObj.parent;
        while (parent) {
          visibleUuids.add(parent.uuid);
          parent = parent.parent;
        }

        /**
         * Hide all objects not in visible set.
         */
        Object.keys(objectMapRef).forEach((uuid) => {
          if (!visibleUuids.has(uuid)) {
            hiddenObjects.add(uuid);
          }
        });
      }

      set({ hiddenObjects, individualIsolatedId: id });
    }
  },

  /**
   * Check if an object is currently in individual isolation.
   * Returns true if this object's UUID matches individualIsolatedId.
   */
  isIndividuallyIsolated: (id) => {
    return get().individualIsolatedId === id;
  },

  // ============ SELECTION MANAGEMENT ============
  /**
   * Set selected object from a THREE.Object3D instance.
   * Used when user clicks on objects in the 3D canvas.
   *
   * Expands selection to all descendant meshes if parent was clicked.
   * Clears selection if null is passed.
   */
  setSelectedObject: (obj) => {
    if (!obj) {
      set({ selectedItem: null, selectedId: null, selectedIds: [] });
      return;
    }

    const name = obj.name || obj.uuid || "(unnamed)";
    set({ selectedItem: name, selectedId: obj.uuid, selectedIds: [obj.uuid] });
  },

  /**
   * Set selected object by UUID (from hierarchy panel).
   * Used when user clicks on items in the left panel.
   *
   * Expands selection to include all descendant meshes of the selected object.
   * Clears selection if ID not found in object map.
   */
  setSelectedById: (id) => {
    const obj = objectMapRef[id] || null;
    if (!obj) {
      set({ selectedId: null, selectedItem: null, selectedIds: [] });
      return;
    }

    const name = obj.name || obj.uuid || "(unnamed)";

    /**
     * When selecting a parent object, also include all descendant meshes.
     * This allows multi-object selection for operations like camera focus.
     */
    const meshIds = get().getDescendantMeshIds(id);

    set({
      selectedItem: name,
      selectedId: id,
      selectedIds: meshIds,
    });
  },

  // ============ DATA MANAGEMENT ============
  /**
   * Store the hierarchy tree built from the scene.
   * Used by HierarchyPanel to render the navigation tree.
   */
  setItems: (list) => set({ items: list }),

  /**
   * Store the UUID -> THREE.Object3D mapping and rebuild descendant cache.
   * Called once when scene loads in InteractiveModel.
   *
   * Updates both:
   * - objectMapRef: for fast object lookups
   * - meshDescendantsCacheRef: for efficient multi-object selection
   */
  setObjectMap: (map) => {
    objectMapRef = map || {};
    meshDescendantsCacheRef = buildMeshDescendantsCache(objectMapRef);
  },

  // ============ QUERY & HELPER METHODS ============
  /**
   * Get all descendant mesh UUIDs for an object (from cache).
   * If object is a mesh, returns array with just that UUID.
   * If object is a group/parent, returns array of all descendant meshes.
   */
  getDescendantMeshIds: (id) => meshDescendantsCacheRef[id] || [],

  /**
   * Get a single THREE.Object3D by its UUID.
   * Returns null if not found.
   */
  getObjectById: (id) => objectMapRef[id] || null,

  /**
   * Get multiple THREE.Object3D instances by their UUIDs.
   * Filters out any null/undefined results.
   */
  getObjectsByIds: (ids) =>
    (ids || []).map((id) => objectMapRef[id]).filter(Boolean),

  /**
   * Clear all selection state.
   * Used when user deselects an object.
   */
  clearSelection: () =>
    set({ selectedItem: null, selectedId: null, selectedIds: [] }),
}));

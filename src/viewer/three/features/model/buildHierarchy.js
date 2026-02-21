/**
 * Converts a Three.js scene graph into a hierarchical tree structure for UI representation.
 *
 * Processes only renderable objects (Meshes or groups with mesh descendants).
 * Non-renderable leaf nodes (e.g., bones, helper objects) are filtered out.
 *
 * The resulting tree:
 * - Includes each object's UUID (used for state management)
 * - Includes display names (falls back to type or "(unnamed)")
 * - Preserves parent-child relationships
 * - Is suitable for display in the hierarchy panel
 *
 * @param {THREE.Object3D} root - The scene or group root to convert
 * @returns {Array<Object>} Array of tree nodes with structure: { id, name, children }
 *
 * @example
 * const tree = buildHierarchy(scene);
 * // Output: [{ id: "uuid-1", name: "Engine Block", children: [...] }, ...]
 */
export function buildHierarchy(root) {
  /**
   * Recursively convert Three.js object to hierarchy node.
   * Filters out non-renderable objects to keep tree clean.
   */
  const toNode = (obj) => {
    const children = obj.children.map((child) => toNode(child)).filter(Boolean);

    /**
     * An object is renderable if it's a Mesh or if it's a parent with renderable children.
     * This filters out helper objects and empty groups.
     */
    const isRenderable = obj.type === "Mesh" || children.length > 0;
    if (!isRenderable) return null;

    return {
      id: obj.uuid,
      name: obj.name || obj.type || "(unnamed)",
      children,
    };
  };

  return root.children.map((child) => toNode(child)).filter(Boolean);
}

import { EffectComposer, Outline } from "@react-three/postprocessing";

/**
 * Post-processing component that applies selection and hover outlines to 3D objects.
 *
 * Uses @react-three/postprocessing to render outlines around:
 * - Hovered objects (thin white outline)
 * - Selected objects (thicker white outline with priority)
 *
 * Prevents duplicate outlines by excluding selected objects from hover rendering.
 *
 * @component
 * @param {THREE.Object3D|THREE.Object3D[]|null} selected - Object(s) to highlight as selected
 * @param {THREE.Object3D|null} hovered - Object to highlight as hovered
 * @param {React.ReactNode} children - R3F scene content to render with effects
 * @returns {JSX.Element} Scene with outline effects applied
 */
export function SelectionEffect({ children, hovered = null, selected = null }) {
  /**
   * Normalize selected objects to always be an array.
   * Handles both single objects and arrays for flexible prop types.
   */
  const selectedObjects = selected
    ? Array.isArray(selected)
      ? selected
      : [selected]
    : [];

  /**
   * Filter hovered object to prevent duplicate outlines.
   * If an object is both selected and hovered, only show selection outline (higher priority).
   */
  const hoveredObjects =
    hovered && !selectedObjects.includes(hovered) ? [hovered] : [];

  return (
    <>
      {/* Hover outline (thin) - renders first */}
      {hoveredObjects.length > 0 && (
        <EffectComposer autoClear={false} multisampling={8}>
          <Outline
            blur
            visibleEdgeColor={0xffffff}
            edgeStrength={25}
            width={500}
            selection={hoveredObjects}
          />
        </EffectComposer>
      )}
      {/* Selected outline (stronger) - renders last, takes priority */}
      <EffectComposer autoClear={false} multisampling={8}>
        <Outline
          blur
          visibleEdgeColor={0xffffff}
          edgeStrength={25}
          width={500}
          selection={selectedObjects}
        />
      </EffectComposer>

      {children}
    </>
  );
}

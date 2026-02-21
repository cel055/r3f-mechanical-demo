import styles from "./ModelCredits.module.css";

/**
 * ModelCredits component displays attribution information for the 3D model.
 *
 * Shows model name, author, and license information as required by
 * Creative Commons Attribution (CC BY 4.0) license.
 *
 * Positioned at the bottom-center of the viewport with semi-transparent
 * background that becomes fully opaque on hover.
 *
 * @component
 * @returns {JSX.Element} Attribution credits overlay
 */
export function ModelCredits() {
  return (
    <div className={styles.credits}>
      <div className={styles.box}>
        <p className={styles.modelName}>
          <a
            href="https://skfb.ly/6ZxRG"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Oscillating Cylinder Motor for LEGO (3d Print)
          </a>
        </p>
        <p className={styles.author}>
          Model by{" "}
          <a
            href="https://sketchfab.com/slava"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            Slava Z.
          </a>
          {" | "}
          <a
            href="http://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.link}
          >
            CC BY 4.0
          </a>
        </p>
        <p className={styles.optimization}>Optimized for web (GLTF→GLB)</p>
      </div>
    </div>
  );
}

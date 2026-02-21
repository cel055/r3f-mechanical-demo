import styles from "./Loader.module.css";

/**
 * Loading overlay component displayed while 3D model and metadata are loading.
 *
 * Shows:
 * - Animated spinner
 * - "Loading 3D Model..." text
 * - Animated progress bar
 *
 * Displayed globally via App component while isLoading state is true.
 * Disappears once both model and metadata finish loading.
 *
 * @component
 * @returns {JSX.Element} Centered loading UI overlay
 */
export function Loader() {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderContent}>
        {/* Animated spinner icon */}
        <div className={styles.spinner}></div>

        {/* Loading status text with animation */}
        <p className={styles.text}>Loading 3D Model...</p>

        {/* Animated progress bar (visual feedback) */}
        <div className={styles.progressBar}>
          <div className={styles.progressFill}></div>
        </div>
      </div>
    </div>
  );
}

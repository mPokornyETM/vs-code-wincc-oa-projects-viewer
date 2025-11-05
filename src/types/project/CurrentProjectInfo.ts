/**
 * @fileoverview Current Project Information Type
 *
 * This module defines the CurrentProjectInfo interface used for representing
 * information about the currently active WinCC OA project as retrieved
 * from the WinCC OA runtime environment.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

/**
 * Information about the currently active WinCC OA project,
 * typically retrieved from the WinCC OA runtime environment.
 */
export interface CurrentProjectInfo {
    /** Name of the currently active project */
    projectName: string;

    /** WinCC OA version string (e.g., "3.20", "3.19") */
    version: string;

    /** Optional installation directory path */
    installationDir?: string;

    /** Optional path to the last used project directory */
    lastUsedProjectDir?: string;
}

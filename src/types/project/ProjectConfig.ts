/**
 * @fileoverview Project Configuration Type
 *
 * This module defines the ProjectConfig interface used for representing
 * basic WinCC OA project configuration information as stored in PVSS
 * configuration files and Windows registry.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

/**
 * Represents the basic configuration information for a WinCC OA project
 * as stored in the PVSS configuration files and Windows registry.
 */
export interface ProjectConfig {
    /** The display name of the project */
    name: string;

    /** Absolute path to the project installation directory */
    installationDir: string;

    /** ISO 8601 date string when the project was installed/created */
    installationDate: string;

    /** Whether this project is runnable (has proper configuration) */
    notRunnable: boolean;

    /** Optional company/organization that created the project */
    company?: string;

    /** Whether this is the currently active project in WinCC OA */
    currentProject?: boolean;
}

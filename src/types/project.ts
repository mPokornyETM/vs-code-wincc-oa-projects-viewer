/**
 * @fileoverview Project Configuration and Base Types
 *
 * This module defines the core project configuration interfaces and base types
 * used throughout the WinCC OA Projects extension for representing and managing
 * WinCC OA project configurations and metadata.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
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

/**
 * Enumeration of possible project running states as reported by PMON.
 * These states indicate whether a project is currently running and available.
 */
export enum PmonProjectRunningStatus {
    /** Status cannot be determined */
    Unknown = 'unknown',

    /** Project is currently running with active managers */
    Running = 'running',

    /** Project is configured but not currently running */
    NotRunning = 'not-running',

    /** Project exists but cannot be run (configuration issues) */
    NotRunnable = 'not-runnable',

    /** System project (part of WinCC OA installation) */
    SystemProject = 'system-project'
}

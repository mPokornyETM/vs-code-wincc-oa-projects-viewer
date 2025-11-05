/**
 * @fileoverview Version Information Types
 *
 * This module defines types for handling WinCC OA version information,
 * including detailed version parsing, platform detection, and build information
 * extracted from WinCC OA installations and projects.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */

/**
 * Comprehensive version information for a WinCC OA installation or project.
 * Contains detailed build and platform information beyond just the version number.
 */
export interface DetailedVersionInfo {
    /** WinCC OA version string (e.g., "3.20", "3.19") */
    version: string;

    /** Target platform (Windows, Linux, etc.) */
    platform: string;

    /** System architecture (x64, x86, ARM, etc.) */
    architecture: string;

    /** ISO 8601 date string when this version was built */
    buildDate: string;

    /** Git commit hash or build identifier */
    commitHash: string;

    /** Path to the main WinCC OA executable */
    executablePath: string;

    /** Raw output from version detection command */
    rawOutput: string;
}

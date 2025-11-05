/**
 * @fileoverview WinCC OA Manager Type
 *
 * This module defines the WinCCOAManager interface used for representing
 * individual WinCC OA manager instances within a running project.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

/**
 * Represents a single WinCC OA manager instance within a running project.
 * Managers are the core runtime components that handle different aspects
 * of WinCC OA functionality (UI, database, drivers, etc.).
 */
export interface WinCCOAManager {
    /** Numeric index of the manager within the project */
    index: number;

    /** Display name of the manager */
    name: string;

    /** Type/category of the manager (UI, CTRL, DRIVER, etc.) */
    type: string;

    /** Current runtime state of the manager */
    state: string;

    /** Optional operating mode of the manager */
    mode?: string;

    /** Number of times this manager has been restarted */
    restarts: number;

    /** User account under which the manager is running */
    user?: string;

    /** Timestamp when the manager was started */
    startTime?: Date;

    /** Timestamp of the most recent restart */
    lastRestart?: Date;

    /** Severity level of the manager's current status */
    severity?: 'OK' | 'WARNING' | 'ERROR' | 'FATAL';

    /** Whether the manager is blocked or unresponsive */
    isBlocked?: boolean;

    /** Whether this manager is critical for project operation */
    isCritical?: boolean;
}

/**
 * @fileoverview PMON Project Running Status Enumeration
 *
 * This module defines the PmonProjectRunningStatus enum used for representing
 * possible project running states as reported by PMON (Project Monitor).
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

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
    NotRunning = 'not-running'
}

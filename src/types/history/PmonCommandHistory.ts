/**
 * @fileoverview Command History and Tracking Types
 *
 * This module defines types for tracking and logging PMON commands and other
 * operations performed through the extension. Used for debugging, audit trails,
 * and command history functionality.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */

/**
 * Represents a single PMON command execution with its results and metadata.
 * Used for tracking command history and debugging failed operations.
 */
export interface PmonCommandHistory {
    /** Timestamp when the command was executed */
    timestamp: Date;

    /** Name of the project the command was executed against */
    project: string;

    /** The actual PMON command that was executed */
    command: string;

    /** Raw response received from PMON */
    response: string;

    /** Whether the command executed successfully */
    success: boolean;

    /** Optional error reason if the command failed */
    errorReason?: string;
}

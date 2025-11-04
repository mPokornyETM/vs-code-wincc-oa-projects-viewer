/**
 * @fileoverview WinCC OA Manager and Project State Types
 *
 * This module defines types for representing the state and status of WinCC OA managers
 * and projects during runtime. These types are used for monitoring project health,
 * manager performance, and overall project status.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */

import { WinCCOAProject } from './ui';
import { PmonProjectRunningStatus } from './project';

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

/**
 * Represents the overall state of a WinCC OA project at runtime.
 * This includes licensing, system information, and operational mode.
 */
export interface WinCCOAProjectState {
    /** Whether the project is currently running */
    isRunning: boolean;

    /** Current operational mode of the project */
    mode: 'normal' | 'demo' | 'emergency' | 'safe' | 'unknown';

    /** Type of license being used */
    licenseType?: 'full' | 'demo' | 'development' | 'unknown';

    /** System information where the project is running */
    systemInfo?: {
        /** Hostname of the system */
        hostname: string;

        /** Operating system platform */
        platform: string;

        /** System architecture (x64, x86, etc.) */
        architecture: string;
    };
}

/**
 * Comprehensive status information for a WinCC OA project combining
 * configuration, runtime state, managers, and health assessment.
 */
export interface WinCCOAProjectStatus {
    /** The project this status relates to */
    project: WinCCOAProject;

    /** Array of all managers running in this project */
    managers: WinCCOAManager[];

    /** Current runtime state of the project */
    projectState?: WinCCOAProjectState;

    /** Running status as reported by PMON */
    runningStatus: PmonProjectRunningStatus;

    /** Health assessment score and metrics */
    healthScore?: WinCCOAProjectHealth;

    /** Timestamp when this status was last updated */
    lastUpdated: Date;
}

/**
 * Comprehensive health assessment for a WinCC OA project.
 * Provides scoring, grading, and detailed component analysis.
 */
export interface WinCCOAProjectHealth {
    /** Overall health score (0-100) */
    overallScore: number;

    /** Letter grade based on score (A, B, C, D, F) */
    grade: string;

    /** Human-readable status description */
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';

    /** Array of identified issues */
    issues: string[];

    /** Array of recommended actions */
    recommendations: string[];

    /** Individual component scores */
    components: {
        /** Health of individual managers (0-100) */
        managerHealth: number;

        /** Overall project state health (0-100) */
        projectState: number;

        /** Performance metrics score (0-100) */
        performance: number;

        /** Reliability and stability score (0-100) */
        reliability: number;
    };

    /** Weights used in calculating overall score */
    weights: {
        /** Weight for manager health component */
        managerHealth: number;

        /** Weight for project state component */
        projectState: number;

        /** Weight for performance component */
        performance: number;

        /** Weight for reliability component */
        reliability: number;
    };
}

/**
 * @fileoverview WinCC OA Project Status Type
 *
 * This module defines the WinCCOAProjectStatus interface used for representing
 * comprehensive status information for a WinCC OA project, combining
 * configuration, runtime state, managers, and health assessment.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

import { ProjectConfig } from '../project/ProjectConfig';
import { PmonProjectRunningStatus } from '../project/PmonProjectRunningStatus';
import { WinCCOAManager } from './WinCCOAManager';
import { WinCCOAProjectState } from './WinCCOAProjectState';
import { WinCCOAProjectHealth } from './WinCCOAProjectHealth';

/**
 * Comprehensive status information for a WinCC OA project combining
 * configuration, runtime state, managers, and health assessment.
 */
export interface WinCCOAProjectStatus {
    /** The project this status relates to */
    project: ProjectConfig;

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

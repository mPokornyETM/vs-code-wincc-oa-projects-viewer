/**
 * @fileoverview WinCC OA Project Health Type
 *
 * This module defines the WinCCOAProjectHealth interface used for representing
 * comprehensive health assessment for a WinCC OA project, providing scoring,
 * grading, and detailed component analysis.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

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

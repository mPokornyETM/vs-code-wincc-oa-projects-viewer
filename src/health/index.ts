import { WinCCOAManager, WinCCOAProjectState, WinCCOAProjectHealth, WinCCOAProjectStatus } from '../types';

/**
 * Calculates the overall health score for a WinCC OA project
 * @param status - The comprehensive project status
 * @returns Health assessment with score, grade, and recommendations
 */
export function calculateProjectHealth(status: WinCCOAProjectStatus): WinCCOAProjectHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Define weights for different health components
    const weights = {
        managerHealth: 0.4, // 40% - Most critical for operations
        projectState: 0.3, // 30% - Overall project status
        performance: 0.2, // 20% - System performance metrics
        reliability: 0.1 // 10% - Long-term stability indicators
    };

    // Calculate component health scores
    const managerHealth = calculateManagerHealth(status.managers, issues, recommendations);
    const projectStateHealth = calculateProjectStateHealth(status.projectState, issues, recommendations);
    const performanceHealth = calculatePerformanceHealth(status.managers, issues, recommendations);
    const reliabilityHealth = calculateReliabilityHealth(status.managers, status.projectState, issues, recommendations);

    // Calculate weighted overall score
    const overallScore = Math.round(
        managerHealth * weights.managerHealth +
            projectStateHealth * weights.projectState +
            performanceHealth * weights.performance +
            reliabilityHealth * weights.reliability
    );

    // Determine grade and status based on overall score
    const { grade, status: healthStatus } = getHealthGradeAndStatus(overallScore);

    return {
        overallScore,
        grade,
        status: healthStatus,
        issues,
        recommendations,
        components: {
            managerHealth,
            projectState: projectStateHealth,
            performance: performanceHealth,
            reliability: reliabilityHealth
        },
        weights
    };
}

/**
 * Calculates health score based on manager states and conditions
 */
function calculateManagerHealth(managers: WinCCOAManager[], issues: string[], recommendations: string[]): number {
    if (!managers || managers.length === 0) {
        issues.push('No managers configured');
        recommendations.push('Configure and start required managers for your project');
        return 20; // Very low score for no managers
    }

    let score = 100;
    let fatalErrors = 0;
    let severeErrors = 0;
    let blockedManagers = 0;
    let criticalManagersCount = 0;
    let criticalManagersRunning = 0;

    for (const manager of managers) {
        // Check for fatal/severe errors
        if (manager.severity === 'FATAL') {
            fatalErrors++;
            score -= 25; // Heavy penalty for fatal errors
        } else if (manager.severity === 'ERROR') {
            severeErrors++;
            score -= 15; // Moderate penalty for errors
        }

        // Check for blocked managers
        if (manager.isBlocked) {
            blockedManagers++;
            score -= 10;
        }

        // Track critical managers
        if (manager.isCritical) {
            criticalManagersCount++;
            if (manager.state === 'running') {
                criticalManagersRunning++;
            }
        }
    }

    // Apply penalties and add issues
    if (fatalErrors > 0) {
        issues.push(`${fatalErrors} manager(s) in FATAL state`);
        recommendations.push('Investigate and resolve fatal manager errors immediately');
    }

    if (severeErrors > 0) {
        issues.push(`${severeErrors} manager(s) with ERROR severity`);
        recommendations.push('Check manager logs and resolve error conditions');
    }

    if (blockedManagers > 0) {
        issues.push(`${blockedManagers} manager(s) blocked`);
        recommendations.push('Investigate blocking conditions and restart affected managers');
    }

    // Critical manager availability penalty
    if (criticalManagersCount > 0) {
        const criticalAvailability = (criticalManagersRunning / criticalManagersCount) * 100;
        if (criticalAvailability < 100) {
            const missingCritical = criticalManagersCount - criticalManagersRunning;
            score -= missingCritical * 20; // 20 points per missing critical manager
            issues.push(`${missingCritical} critical manager(s) not running`);
            recommendations.push('Start all critical managers for proper system operation');
        }
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculates health score based on overall project state
 */
function calculateProjectStateHealth(
    projectState: WinCCOAProjectState | undefined,
    issues: string[],
    recommendations: string[]
): number {
    if (!projectState) {
        issues.push('Unable to determine project state');
        recommendations.push('Check pmon connectivity and project configuration');
        return 50; // Medium score for unknown state
    }

    let score = 100;

    // Check running state
    if (!projectState.isRunning) {
        score = 30; // Low score for non-running project
        issues.push('Project is not running');
        recommendations.push('Start the project to enable full functionality');
        return score;
    }

    // Check mode
    switch (projectState.mode) {
        case 'emergency':
            score = 25; // Very low score for emergency mode
            issues.push('Project running in emergency mode');
            recommendations.push('Investigate emergency mode cause and restore normal operation');
            break;
        case 'demo':
            score = 70; // Reduced score for demo mode
            issues.push('Project running with demo license');
            recommendations.push('Consider upgrading to full license for production use');
            break;
        case 'safe':
            score = 60; // Moderate reduction for safe mode
            issues.push('Project running in safe mode');
            recommendations.push('Review system configuration and restart in normal mode');
            break;
        case 'normal':
            // No penalty for normal mode
            break;
        default:
            score -= 10; // Small penalty for unknown mode
            issues.push('Unknown project mode detected');
            recommendations.push('Verify project configuration and mode settings');
    }

    // Check license type
    if (projectState.licenseType === 'demo') {
        score -= 10;
        if (!issues.some(issue => issue.includes('demo license'))) {
            issues.push('Demo license in use');
            recommendations.push('Consider full license for production deployment');
        }
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculates health score based on performance metrics
 */
function calculatePerformanceHealth(managers: WinCCOAManager[], issues: string[], recommendations: string[]): number {
    if (!managers || managers.length === 0) {
        return 50; // Neutral score if no managers
    }

    let score = 100;
    let highRestartCount = 0;
    let totalRestarts = 0;

    for (const manager of managers) {
        totalRestarts += manager.restarts;

        // Penalize managers with high restart counts
        if (manager.restarts > 10) {
            highRestartCount++;
            score -= 5; // Small penalty per manager with high restarts
        }
    }

    // Additional penalties for overall restart patterns
    if (highRestartCount > 0) {
        issues.push(`${highRestartCount} manager(s) with high restart counts`);
        recommendations.push('Investigate frequent manager restarts and underlying causes');
    }

    const avgRestarts = totalRestarts / managers.length;
    if (avgRestarts > 5) {
        score -= 10;
        issues.push('High average restart rate detected');
        recommendations.push('Review system stability and manager configuration');
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculates health score based on reliability indicators
 */
function calculateReliabilityHealth(
    managers: WinCCOAManager[],
    projectState: WinCCOAProjectState | undefined,
    issues: string[],
    recommendations: string[]
): number {
    if (!managers || managers.length === 0) {
        return 50; // Neutral score if no managers
    }

    let score = 100;
    const now = new Date();
    let longRunningManagers = 0;
    let recentRestarts = 0;

    for (const manager of managers) {
        // Check for long-running stability (bonus points)
        if (manager.startTime) {
            const runTime = now.getTime() - manager.startTime.getTime();
            const hoursRunning = runTime / (1000 * 60 * 60);

            if (hoursRunning > 24) {
                longRunningManagers++;
            }
        }

        // Check for recent restarts (penalty)
        if (manager.lastRestart) {
            const timeSinceRestart = now.getTime() - manager.lastRestart.getTime();
            const hoursSinceRestart = timeSinceRestart / (1000 * 60 * 60);

            if (hoursSinceRestart < 1) {
                recentRestarts++;
                score -= 5; // Penalty for very recent restarts
            }
        }
    }

    // Stability bonus for long-running managers
    const stabilityRatio = longRunningManagers / managers.length;
    if (stabilityRatio > 0.8) {
        score += 5; // Small bonus for good stability
        recommendations.push('Excellent manager stability - continue current practices');
    }

    // Penalty for mass recent restarts
    if (recentRestarts > managers.length * 0.5) {
        score -= 15;
        issues.push('Recent mass manager restarts detected');
        recommendations.push('Investigate system instability and recent changes');
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Determines grade and status based on overall health score
 */
function getHealthGradeAndStatus(score: number): {
    grade: string;
    status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
} {
    if (score >= 90) {
        return { grade: 'A', status: 'excellent' };
    } else if (score >= 80) {
        return { grade: 'B', status: 'good' };
    } else if (score >= 70) {
        return { grade: 'C', status: 'fair' };
    } else if (score >= 50) {
        return { grade: 'D', status: 'poor' };
    } else {
        return { grade: 'F', status: 'critical' };
    }
}

/**
 * Gets color for health score visualization
 * @param score - Health score (0-100)
 * @returns CSS color string
 */
export function getHealthScoreColor(score: number): string {
    if (score >= 90) {
        return '#28a745'; // Green
    }
    if (score >= 80) {
        return '#6c757d'; // Gray-green
    }
    if (score >= 70) {
        return '#ffc107'; // Yellow
    }
    if (score >= 50) {
        return '#fd7e14'; // Orange
    }
    return '#dc3545'; // Red
}

/**
 * Gets icon for health grade
 * @param grade - Health grade (A, B, C, D, F)
 * @returns Icon string
 */
export function getHealthGradeIcon(grade: string): string {
    switch (grade) {
        case 'A':
            return '🟢';
        case 'B':
            return '🔵';
        case 'C':
            return '🟡';
        case 'D':
            return '🟠';
        case 'F':
            return '🔴';
        default:
            return '⚪';
    }
}

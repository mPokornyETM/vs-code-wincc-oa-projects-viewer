import * as assert from 'assert';
import {
    calculateProjectHealth,
    getHealthScoreColor,
    getHealthGradeIcon,
    WinCCOAManager,
    WinCCOAProjectState,
    WinCCOAProjectHealth
} from '../extension';

suite('WinCC OA Project Health Assessment Tests', () => {
    suite('calculateProjectHealth Function', () => {
        test('should return excellent health for perfect project state', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    secKill: 30,
                    restartCount: 0,
                    startTimeStamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    secKill: 30,
                    restartCount: 0,
                    startTimeStamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
                }
            ];

            const projectState: WinCCOAProjectState = {
                status: 'Monitoring',
                statusCode: 2,
                text: 'MONITORING',
                emergency: false,
                demo: false
            };

            const health = calculateProjectHealth(managers, projectState);

            assert.strictEqual(health.grade, 'A');
            assert.strictEqual(health.status, 'Excellent');
            assert.ok(health.overallScore >= 90, `Expected score >= 90, got ${health.overallScore}`);
            assert.strictEqual(health.issues.length, 0);
        });

        test('should identify fatal manager errors', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    pid: 1234
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'error',
                    runningState: 'stopped',
                    startMode: 'always',
                    pid: -2 // Fatal error
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('fatal startup errors')));
            assert.ok(health.recommendations.some(rec => rec.includes('database connections')));
            assert.ok(health.overallScore < 90, `Expected score < 90, got ${health.overallScore}`);
        });

        test('should handle emergency mode correctly', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                }
            ];

            const projectState: WinCCOAProjectState = {
                status: 'Monitoring',
                statusCode: 2,
                text: 'EMERGENCY_MODE',
                emergency: true,
                demo: false
            };

            const health = calculateProjectHealth(managers, projectState);

            assert.ok(health.issues.some(issue => issue.includes('EMERGENCY mode')));
            assert.ok(health.overallScore < 95, `Expected penalty for emergency mode, got ${health.overallScore}`);
        });

        test('should handle demo license correctly', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                }
            ];

            const projectState: WinCCOAProjectState = {
                status: 'Monitoring',
                statusCode: 2,
                text: 'DEMO_MODE',
                emergency: false,
                demo: true
            };

            const health = calculateProjectHealth(managers, projectState);

            assert.ok(health.issues.some(issue => issue.includes('demo license')));
            assert.ok(health.recommendations.some(rec => rec.includes('proper WinCC OA license')));
        });

        test('should detect blocked managers', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'blocked',
                    runningState: 'blocked',
                    startMode: 'always'
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('blocked')));
            assert.ok(health.recommendations.some(rec => rec.includes('resource conflicts')));
        });

        test('should handle no managers configured', () => {
            const managers: WinCCOAManager[] = [];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('No managers configured')));
            assert.ok(health.recommendations.some(rec => rec.includes('Configure project managers')));
            assert.strictEqual(health.details.managerHealth, 0);
        });

        test('should detect high restart counts', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'UnstableManager',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    restartCount: 10 // High restart count
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('high restart counts')));
            assert.ok(health.recommendations.some(rec => rec.includes('stability issues')));
        });

        test('should detect missing critical managers', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'stopped',
                    runningState: 'stopped',
                    startMode: 'always'
                },
                {
                    index: 2,
                    name: 'WCCILevent',
                    status: 'stopped',
                    runningState: 'stopped',
                    startMode: 'always'
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('Critical system managers')));
            assert.ok(health.recommendations.some(rec => rec.includes('WCCILpmon, WCCILdata, and WCCILevent')));
        });

        test('should detect missing UI managers', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                },
                {
                    index: 1,
                    name: 'WCCOAui',
                    status: 'stopped',
                    runningState: 'stopped',
                    startMode: 'always'
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('No UI managers are running')));
            assert.ok(health.recommendations.some(rec => rec.includes('WCCOAui managers')));
        });

        test('should give stability bonus for long-running managers', () => {
            const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    startTimeStamp: twoWeeksAgo
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    startTimeStamp: twoWeeksAgo
                }
            ];

            const projectState: WinCCOAProjectState = {
                status: 'Monitoring',
                statusCode: 2,
                text: 'MONITORING',
                emergency: false,
                demo: false
            };

            const health = calculateProjectHealth(managers, projectState);

            // Should get stability bonus
            assert.ok(health.overallScore >= 95, `Expected high score for stable system, got ${health.overallScore}`);
        });

        test('should detect recent mass restarts', () => {
            const recentTime = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago

            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'Manager1',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    startTimeStamp: recentTime
                },
                {
                    index: 1,
                    name: 'Manager2',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    startTimeStamp: recentTime
                },
                {
                    index: 2,
                    name: 'Manager3',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always',
                    startTimeStamp: recentTime
                }
            ];

            const health = calculateProjectHealth(managers);

            assert.ok(health.issues.some(issue => issue.includes('started recently')));
            assert.ok(health.recommendations.some(rec => rec.includes('system instability')));
        });

        test('should handle project down state', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'stopped',
                    runningState: 'stopped',
                    startMode: 'always'
                }
            ];

            const projectState: WinCCOAProjectState = {
                status: 'Down',
                statusCode: 0,
                text: 'DOWN',
                emergency: false,
                demo: false
            };

            const health = calculateProjectHealth(managers, projectState);

            assert.ok(health.issues.some(issue => issue.includes('Project is down')));
            assert.ok(health.recommendations.some(rec => rec.includes('Start the project')));
            assert.ok(health.overallScore < 60, `Expected low score for down project, got ${health.overallScore}`);
        });

        test('should validate health score structure', () => {
            const managers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                }
            ];

            const health = calculateProjectHealth(managers);

            // Validate structure
            assert.ok(typeof health.overallScore === 'number');
            assert.ok(health.overallScore >= 0 && health.overallScore <= 100);
            assert.ok(['A', 'B', 'C', 'D', 'F'].includes(health.grade));
            assert.ok(['Excellent', 'Good', 'Fair', 'Poor', 'Critical'].includes(health.status));
            assert.ok(Array.isArray(health.issues));
            assert.ok(Array.isArray(health.recommendations));
            assert.ok(typeof health.details === 'object');
            assert.ok(typeof health.details.managerHealth === 'number');
            assert.ok(typeof health.details.projectStateHealth === 'number');
            assert.ok(typeof health.details.performanceHealth === 'number');
            assert.ok(typeof health.details.reliabilityHealth === 'number');
        });
    });

    suite('getHealthScoreColor Function', () => {
        test('should return correct colors for different scores', () => {
            assert.strictEqual(getHealthScoreColor(95), '#28a745'); // Green - Excellent
            assert.strictEqual(getHealthScoreColor(85), '#20c997'); // Teal - Good
            assert.strictEqual(getHealthScoreColor(75), '#ffc107'); // Yellow - Fair
            assert.strictEqual(getHealthScoreColor(65), '#fd7e14'); // Orange - Poor
            assert.strictEqual(getHealthScoreColor(45), '#dc3545'); // Red - Critical
        });

        test('should handle edge cases', () => {
            assert.strictEqual(getHealthScoreColor(90), '#28a745'); // Boundary - Excellent
            assert.strictEqual(getHealthScoreColor(80), '#20c997'); // Boundary - Good
            assert.strictEqual(getHealthScoreColor(70), '#ffc107'); // Boundary - Fair
            assert.strictEqual(getHealthScoreColor(60), '#fd7e14'); // Boundary - Poor
            assert.strictEqual(getHealthScoreColor(0), '#dc3545'); // Minimum - Critical
            assert.strictEqual(getHealthScoreColor(100), '#28a745'); // Maximum - Excellent
        });
    });

    suite('getHealthGradeIcon Function', () => {
        test('should return correct icons for different grades', () => {
            assert.strictEqual(getHealthGradeIcon('A'), '🟢');
            assert.strictEqual(getHealthGradeIcon('B'), '🔵');
            assert.strictEqual(getHealthGradeIcon('C'), '🟡');
            assert.strictEqual(getHealthGradeIcon('D'), '🟠');
            assert.strictEqual(getHealthGradeIcon('F'), '🔴');
        });

        test('should handle unknown grades', () => {
            assert.strictEqual(getHealthGradeIcon('X'), '⚪');
            assert.strictEqual(getHealthGradeIcon(''), '⚪');
        });
    });

    suite('Health Score Integration Tests', () => {
        test('should correctly calculate weighted scores', () => {
            const perfectManagers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'always'
                }
            ];

            const perfectState: WinCCOAProjectState = {
                status: 'Monitoring',
                statusCode: 2,
                text: 'MONITORING',
                emergency: false,
                demo: false
            };

            const health = calculateProjectHealth(perfectManagers, perfectState);

            // Verify individual component scores
            assert.ok(health.details.managerHealth >= 90, 'Manager health should be high');
            assert.ok(health.details.projectStateHealth >= 90, 'Project state health should be high');
            assert.ok(health.details.performanceHealth >= 90, 'Performance health should be high');
            assert.ok(health.details.reliabilityHealth >= 50, 'Reliability health should be reasonable');

            // Verify weighted calculation makes sense
            const expectedScore = Math.round(
                health.details.managerHealth * 0.4 +
                    health.details.projectStateHealth * 0.3 +
                    health.details.performanceHealth * 0.2 +
                    health.details.reliabilityHealth * 0.1
            );

            assert.strictEqual(health.overallScore, expectedScore, 'Overall score should match weighted calculation');
        });

        test('should handle multiple concurrent issues', () => {
            const problematicManagers: WinCCOAManager[] = [
                {
                    index: 0,
                    name: 'WCCILpmon',
                    status: 'running',
                    runningState: 'running',
                    startMode: 'manual', // Not always
                    restartCount: 8 // High restart count
                },
                {
                    index: 1,
                    name: 'WCCILdata',
                    status: 'error',
                    runningState: 'stopped',
                    startMode: 'always',
                    pid: -2 // Fatal error
                },
                {
                    index: 2,
                    name: 'BlockedManager',
                    status: 'blocked',
                    runningState: 'blocked',
                    startMode: 'always'
                }
            ];

            const problematicState: WinCCOAProjectState = {
                status: 'Starting',
                statusCode: 1,
                text: 'STARTING',
                emergency: true, // Emergency mode
                demo: true // Demo license
            };

            const health = calculateProjectHealth(problematicManagers, problematicState);

            // Should identify multiple issues
            assert.ok(health.issues.length > 3, `Expected multiple issues, got ${health.issues.length}`);
            assert.ok(
                health.recommendations.length > 3,
                `Expected multiple recommendations, got ${health.recommendations.length}`
            );

            // Should result in poor overall score
            assert.ok(
                health.overallScore < 60,
                `Expected poor score for problematic system, got ${health.overallScore}`
            );
            assert.ok(['D', 'F'].includes(health.grade), `Expected poor grade, got ${health.grade}`);
            assert.ok(['Poor', 'Critical'].includes(health.status), `Expected poor status, got ${health.status}`);
        });
    });
});

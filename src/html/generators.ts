import {
    WinCCOAProject,
    WinCCOAManager,
    WinCCOAProjectState,
    WinCCOAProjectStatus,
    PmonProjectRunningStatus
} from '../types';
import { calculateProjectHealth, getHealthScoreColor, getHealthGradeIcon } from '../health';

/**
 * Generate HTML for project status overview
 */
export function generateStatusOverviewHTML(statusList: (WinCCOAProjectStatus & { error?: string })[]): string {
    const runningProjects = statusList.filter(s => s.runningStatus === PmonProjectRunningStatus.Running);
    const stoppedProjects = statusList.filter(s => s.runningStatus === PmonProjectRunningStatus.NotRunning);
    const unknownProjects = statusList.filter(s => s.runningStatus === PmonProjectRunningStatus.Unknown);

    const projectRows = statusList
        .map(status => {
            const statusIcon =
                status.runningStatus === PmonProjectRunningStatus.Running
                    ? '✅'
                    : status.runningStatus === PmonProjectRunningStatus.NotRunning
                      ? '⏹️'
                      : '❓';
            const statusText =
                status.runningStatus === PmonProjectRunningStatus.Running
                    ? 'Running'
                    : status.runningStatus === PmonProjectRunningStatus.NotRunning
                      ? 'Stopped'
                      : 'Unknown';
            const statusColor =
                status.runningStatus === PmonProjectRunningStatus.Running
                    ? '#28a745'
                    : status.runningStatus === PmonProjectRunningStatus.NotRunning
                      ? '#ffc107'
                      : '#dc3545';

            const managerCount = status.managers?.length || 0;
            const runningManagers =
                status.managers?.filter(
                    m => m.state?.toLowerCase().includes('running') || m.state?.toLowerCase().includes('started')
                )?.length || 0;

            return `
			<tr>
				<td><strong>${status.project.config.name}</strong></td>
				<td style="color: ${statusColor};">${statusIcon} ${statusText}</td>
				<td>${managerCount}</td>
				<td>${runningManagers}</td>
				<td>${status.lastUpdated.toLocaleString()}</td>
				${status.error ? `<td style="color: #dc3545;">${status.error}</td>` : '<td>-</td>'}
			</tr>
		`;
        })
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WinCC OA Project Status Overview</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            flex: 1;
            padding: 15px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 5px;
            text-align: center;
        }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .running { color: #28a745; }
        .stopped { color: #ffc107; }
        .unknown { color: #dc3545; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid var(--vscode-panel-border);
        }
        th {
            background-color: var(--vscode-panel-background);
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: var(--vscode-input-background);
        }
        .refresh-button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            margin-bottom: 20px;
        }
        .refresh-button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 WinCC OA Project Status Overview</h1>
        <p>Real-time status of all runnable WinCC OA projects</p>
    </div>

    <button class="refresh-button" onclick="refreshStatus()">🔄 Refresh Status</button>

    <div class="summary">
        <div class="summary-card">
            <div class="summary-number running">${runningProjects.length}</div>
            <div>Running</div>
        </div>
        <div class="summary-card">
            <div class="summary-number stopped">${stoppedProjects.length}</div>
            <div>Stopped</div>
        </div>
        <div class="summary-card">
            <div class="summary-number unknown">${unknownProjects.length}</div>
            <div>Unknown</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${statusList.length}</div>
            <div>Total</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Total Managers</th>
                <th>Running Managers</th>
                <th>Last Update</th>
                <th>Errors</th>
            </tr>
        </thead>
        <tbody>
            ${projectRows}
        </tbody>
    </table>

    <script>
        function refreshStatus() {
            // This would trigger a refresh - implementation depends on webview messaging
            console.log('Refresh requested');
        }
    </script>
</body>
</html>`;
}

/**
 * Generate comprehensive manager overview HTML combining LIST and STATI data
 */
export function generateManagerOverviewHTML(
    project: WinCCOAProject,
    managers: WinCCOAManager[],
    projectState?: WinCCOAProjectState
): string {
    // Calculate health score
    const healthScore = calculateProjectHealth({
        project,
        managers,
        projectState,
        runningStatus: PmonProjectRunningStatus.Unknown,
        lastUpdated: new Date()
    });

    const managerRows = managers
        .map(manager => {
            // Determine status icon and color based on state
            let statusIcon = '❓';
            let statusColor = '#6c757d';

            switch (manager.state?.toLowerCase()) {
                case 'running':
                    statusIcon = '✅';
                    statusColor = '#28a745';
                    break;
                case 'stopped':
                    statusIcon = '⏹️';
                    statusColor = '#ffc107';
                    break;
                case 'init':
                    statusIcon = '🔄';
                    statusColor = '#17a2b8';
                    break;
                case 'blocked':
                    statusIcon = '🚫';
                    statusColor = '#dc3545';
                    break;
            }

            const severityColor =
                manager.severity === 'FATAL'
                    ? '#dc3545'
                    : manager.severity === 'ERROR'
                      ? '#fd7e14'
                      : manager.severity === 'WARNING'
                        ? '#ffc107'
                        : '#28a745';

            return `
		<tr class="${manager.severity === 'FATAL' ? 'fatal-error-row' : ''}">
			<td>${manager.index}</td>
			<td class="${manager.severity === 'FATAL' ? 'fatal-error' : ''}">${manager.severity === 'FATAL' ? '⚠️ ' : ''}<strong>${manager.name}</strong></td>
			<td style="color: ${statusColor};">${statusIcon} ${manager.state || 'unknown'}</td>
			<td>${manager.type || ''}</td>
			<td style="color: ${severityColor};">${manager.severity || 'OK'}</td>
			<td>${manager.mode || ''}</td>
			<td>${manager.restarts || 0}</td>
			<td>${manager.user || ''}</td>
			<td>${manager.startTime ? manager.startTime.toLocaleString() : ''}</td>
			<td>
				<button onclick="startManager(${manager.index})" class="action-btn start-btn" ${manager.state === 'running' ? 'disabled' : ''}>▶️</button>
				<button onclick="stopManager(${manager.index})" class="action-btn stop-btn" ${manager.state === 'stopped' ? 'disabled' : ''}>⏹️</button>
				<button onclick="killManager(${manager.index})" class="action-btn kill-btn" ${manager.state === 'stopped' ? 'disabled' : ''}>❌</button>
			</td>
		</tr>
		`;
        })
        .join('');

    // Calculate summary statistics
    const runningCount = managers.filter(m => m.state?.toLowerCase() === 'running').length;
    const stoppedCount = managers.filter(m => m.state?.toLowerCase() === 'stopped').length;
    const blockedCount = managers.filter(m => m.state?.toLowerCase() === 'blocked').length;
    const totalCount = managers.length;

    // Project state information with health score
    const projectStateHtml = generateHealthScoreSection(healthScore, projectState);

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manager Overview - ${project.config.name}</title>
    <style>
        ${getManagerOverviewCSS()}
    </style>
</head>
<body>
    <div class="header">
        <h1>🎛️ Manager Overview - ${project.config.name}</h1>
        <p>Real-time manager status and project health assessment</p>
    </div>

    ${projectStateHtml}

    <div class="summary">
        <div class="summary-card">
            <div class="summary-number running">${runningCount}</div>
            <div>Running</div>
        </div>
        <div class="summary-card">
            <div class="summary-number stopped">${stoppedCount}</div>
            <div>Stopped</div>
        </div>
        <div class="summary-card">
            <div class="summary-number ${blockedCount > 0 ? 'blocked' : ''}">${blockedCount}</div>
            <div>Blocked</div>
        </div>
        <div class="summary-card">
            <div class="summary-number">${totalCount}</div>
            <div>Total</div>
        </div>
    </div>

    <div class="actions-bar">
        <button class="action-button primary" onclick="refreshManagers()">🔄 Refresh</button>
        <button class="action-button" onclick="startAllManagers()">▶️ Start All</button>
        <button class="action-button" onclick="stopAllManagers()">⏹️ Stop All</button>
        <button class="action-button" onclick="showHistory()">📋 History</button>
    </div>

    <table>
        <thead>
            <tr>
                <th>Index</th>
                <th>Manager Name</th>
                <th>State</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Mode</th>
                <th>Restarts</th>
                <th>User</th>
                <th>Start Time</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${managerRows}
        </tbody>
    </table>

    <script>
        ${getManagerOverviewJavaScript()}
    </script>
</body>
</html>`;
}

/**
 * Generate health score section HTML
 */
function generateHealthScoreSection(healthScore: any, projectState?: WinCCOAProjectState): string {
    return `
		<div class="project-state">
			<div class="health-score-section">
				<h3>📊 Project Health Assessment</h3>
				<div class="health-score-container">
					<div class="health-score-circle" style="background: conic-gradient(${getHealthScoreColor(healthScore.overallScore)} ${healthScore.overallScore}%, #e0e0e0 0%);">
						<div class="health-score-inner">
							<div class="health-score-number">${healthScore.overallScore}</div>
							<div class="health-grade">${getHealthGradeIcon(healthScore.grade)} ${healthScore.grade}</div>
						</div>
					</div>
					<div class="health-details">
						<div class="health-status" style="color: ${getHealthScoreColor(healthScore.overallScore)};">
							<strong>${healthScore.status}</strong>
						</div>
						<div class="health-breakdown">
							<div class="health-metric">
								<span class="metric-label">Managers:</span>
								<span class="metric-value">${healthScore.components.managerHealth}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Project State:</span>
								<span class="metric-value">${healthScore.components.projectState}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Performance:</span>
								<span class="metric-value">${healthScore.components.performance}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Reliability:</span>
								<span class="metric-value">${healthScore.components.reliability}%</span>
							</div>
						</div>
					</div>
				</div>
			</div>
			
			${
                projectState
                    ? `
			<div class="project-state-info">
				<h3>🎯 Project State</h3>
				<div class="state-info">
					<span class="state-badge state-${projectState.mode}">${projectState.mode}</span>
					${projectState.mode === 'emergency' ? '<span class="emergency-badge">🚨 EMERGENCY</span>' : ''}
					${projectState.licenseType === 'demo' ? '<span class="demo-badge">🧪 DEMO</span>' : ''}
				</div>
			</div>
			`
                    : ''
            }

			${
                healthScore.issues.length > 0
                    ? `
			<div class="health-issues">
				<h4>⚠️ Issues Identified</h4>
				<ul class="issue-list">
					${healthScore.issues.map((issue: string) => `<li>${issue}</li>`).join('')}
				</ul>
			</div>
			`
                    : ''
            }

			${
                healthScore.recommendations.length > 0
                    ? `
			<div class="health-recommendations">
				<h4>💡 Recommendations</h4>
				<ul class="recommendation-list">
					${healthScore.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
				</ul>
			</div>
			`
                    : ''
            }
		</div>
	`;
}

/**
 * Generate CSS styles for manager overview
 */
function getManagerOverviewCSS(): string {
    return `
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        .project-state {
            background-color: var(--vscode-input-background);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 1px solid var(--vscode-input-border);
        }
        
        /* Health Score Styles */
        .health-score-section h3 {
            margin-top: 0;
            margin-bottom: 20px;
            color: var(--vscode-textLink-foreground);
        }
        .health-score-container {
            display: flex;
            align-items: center;
            gap: 30px;
            margin-bottom: 20px;
        }
        .health-score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
            flex-shrink: 0;
        }
        .health-score-inner {
            background-color: var(--vscode-editor-background);
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .health-score-number {
            font-size: 24px;
            font-weight: bold;
            line-height: 1;
        }
        .health-grade {
            font-size: 14px;
            opacity: 0.8;
        }
        .health-details {
            flex: 1;
        }
        .health-status {
            font-size: 18px;
            margin-bottom: 15px;
        }
        .health-breakdown {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
        .health-metric {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background-color: var(--vscode-editor-background);
            border-radius: 4px;
        }
        .metric-label {
            color: var(--vscode-descriptionForeground);
        }
        .metric-value {
            font-weight: bold;
        }

        /* Summary Cards */
        .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .summary-card {
            flex: 1;
            padding: 15px;
            background-color: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 5px;
            text-align: center;
        }
        .summary-number {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .running { color: #28a745; }
        .stopped { color: #ffc107; }
        .blocked { color: #dc3545; }

        /* Actions Bar */
        .actions-bar {
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
        }
        .action-button {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 14px;
        }
        .action-button.primary {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .action-button:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .action-button.primary:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        /* Table Styles */
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px 8px;
            text-align: left;
            border: 1px solid var(--vscode-panel-border);
        }
        th {
            background-color: var(--vscode-panel-background);
            font-weight: bold;
            position: sticky;
            top: 0;
        }
        tr:nth-child(even) {
            background-color: var(--vscode-input-background);
        }
        .fatal-error-row {
            background-color: rgba(220, 53, 69, 0.1) !important;
        }
        .fatal-error {
            color: #dc3545;
            font-weight: bold;
        }

        /* Action Buttons in Table */
        .action-btn {
            background: none;
            border: none;
            cursor: pointer;
            padding: 4px;
            margin: 0 2px;
            border-radius: 3px;
            opacity: 0.7;
        }
        .action-btn:hover {
            opacity: 1;
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        .action-btn:disabled {
            opacity: 0.3;
            cursor: not-allowed;
        }

        /* State Badges */
        .state-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
        }
        .state-normal {
            background-color: #28a745;
            color: white;
        }
        .state-emergency {
            background-color: #dc3545;
            color: white;
        }
        .state-demo {
            background-color: #ffc107;
            color: black;
        }
        .emergency-badge, .demo-badge {
            margin-left: 8px;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 10px;
        }
        .emergency-badge {
            background-color: #dc3545;
            color: white;
        }
        .demo-badge {
            background-color: #ffc107;
            color: black;
        }

        /* Issues and Recommendations */
        .health-issues, .health-recommendations {
            margin-top: 20px;
        }
        .health-issues h4, .health-recommendations h4 {
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .issue-list, .recommendation-list {
            margin: 0;
            padding-left: 20px;
        }
        .issue-list li {
            color: #fd7e14;
            margin-bottom: 5px;
        }
        .recommendation-list li {
            color: var(--vscode-textLink-foreground);
            margin-bottom: 5px;
        }
	`;
}

/**
 * Generate JavaScript for manager overview
 */
function getManagerOverviewJavaScript(): string {
    return `
        const vscode = acquireVsCodeApi();

        function startManager(index) {
            vscode.postMessage({
                command: 'startManager',
                index: index
            });
        }

        function stopManager(index) {
            vscode.postMessage({
                command: 'stopManager',
                index: index
            });
        }

        function killManager(index) {
            vscode.postMessage({
                command: 'killManager',
                index: index
            });
        }

        function refreshManagers() {
            vscode.postMessage({
                command: 'refreshManagers'
            });
        }

        function startAllManagers() {
            vscode.postMessage({
                command: 'startAllManagers'
            });
        }

        function stopAllManagers() {
            vscode.postMessage({
                command: 'stopAllManagers'
            });
        }

        function showHistory() {
            vscode.postMessage({
                command: 'showHistory'
            });
        }
	`;
}

/**
 * Generate simple manager list HTML
 */
export function generateManagerListHTML(project: WinCCOAProject, managers: WinCCOAManager[]): string {
    const managerRows = managers
        .map(
            (manager, index) => `
		<tr>
			<td>${index + 1}</td>
			<td><strong>${manager.name}</strong></td>
			<td>${manager.type || 'Unknown'}</td>
			<td>${manager.mode || ''}</td>
			<td>${manager.restarts || 0}</td>
		</tr>
	`
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manager List - ${project.config.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid var(--vscode-panel-border);
        }
        th {
            background-color: var(--vscode-panel-background);
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: var(--vscode-input-background);
        }
    </style>
</head>
<body>
    <h1>📋 Manager List - ${project.config.name}</h1>
    
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Manager Name</th>
                <th>Type</th>
                <th>Mode</th>
                <th>Restarts</th>
            </tr>
        </thead>
        <tbody>
            ${managerRows}
        </tbody>
    </table>
</body>
</html>`;
}

/**
 * Generate manager status HTML
 */
export function generateManagerStatusHTML(project: WinCCOAProject, managers: WinCCOAManager[]): string {
    const statusRows = managers
        .map(manager => {
            const statusColor =
                manager.state === 'running' ? '#28a745' : manager.state === 'stopped' ? '#ffc107' : '#dc3545';
            const statusIcon = manager.state === 'running' ? '✅' : manager.state === 'stopped' ? '⏹️' : '❓';

            return `
			<tr>
				<td>${manager.index}</td>
				<td><strong>${manager.name}</strong></td>
				<td style="color: ${statusColor};">${statusIcon} ${manager.state || 'Unknown'}</td>
				<td>${manager.type || ''}</td>
				<td>${manager.user || ''}</td>
				<td>${manager.startTime ? manager.startTime.toLocaleString() : ''}</td>
			</tr>
		`;
        })
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manager Status - ${project.config.name}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border: 1px solid var(--vscode-panel-border);
        }
        th {
            background-color: var(--vscode-panel-background);
            font-weight: bold;
        }
        tr:nth-child(even) {
            background-color: var(--vscode-input-background);
        }
    </style>
</head>
<body>
    <h1>🎛️ Manager Status - ${project.config.name}</h1>
    
    <table>
        <thead>
            <tr>
                <th>Index</th>
                <th>Manager Name</th>
                <th>Status</th>
                <th>Type</th>
                <th>User</th>
                <th>Start Time</th>
            </tr>
        </thead>
        <tbody>
            ${statusRows}
        </tbody>
    </table>
</body>
</html>`;
}

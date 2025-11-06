import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';
import * as formatting from './formatting';
// import { JSDOM } from 'jsdom';
// import * as DOMPurify from 'dompurify';

// Global output channel for WCCILpmon command outputs
let outputChannel: vscode.OutputChannel;

// Pmon command history tracking
interface PmonCommandHistory {
    timestamp: Date;
    project: string;
    command: string;
    response: string;
    success: boolean;
    errorReason?: string;
}

// Global command history storage
let pmonCommandHistory: PmonCommandHistory[] = [];

/**
 * Gets the platform-specific path to the pvssInst.conf file
 * @returns The full path to the pvssInst.conf file
 */
function getPvssInstConfPath(): string {
    if (os.platform() === 'win32') {
        // Windows path
        return 'C:\\ProgramData\\Siemens\\WinCC_OA\\pvssInst.conf';
    } else {
        // Unix/Linux path
        return '/etc/opt/pvss/pvssInst.conf';
    }
}

/**
 * Analyzes pmon command response to determine success/failure
 * @param response - The raw response from pmon command
 * @returns Object with success status and error reason if failed
 */
function analyzePmonResponse(response: string): { success: boolean; errorReason?: string } {
    const trimmedResponse = response.trim();

    if (trimmedResponse === 'OK') {
        return { success: true };
    }

    if (trimmedResponse.startsWith('ERROR')) {
        const errorReason = trimmedResponse.substring(5).trim(); // Remove 'ERROR' prefix
        return { success: false, errorReason };
    }

    // Consider empty or other responses as successful if they don't start with ERROR
    return { success: true };
}

/**
 * Adds a command to the pmon command history
 * @param project - Project name
 * @param command - Command that was executed
 * @param response - Response received from pmon
 */
function addToCommandHistory(project: string, command: string, response: string): void {
    const analysis = analyzePmonResponse(response);

    const historyEntry: PmonCommandHistory = {
        timestamp: new Date(),
        project,
        command,
        response: response.trim(),
        success: analysis.success,
        errorReason: analysis.errorReason
    };

    pmonCommandHistory.unshift(historyEntry); // Add to beginning

    // Keep only last 100 entries to prevent memory bloat
    if (pmonCommandHistory.length > 100) {
        pmonCommandHistory = pmonCommandHistory.slice(0, 100);
    }

    // Log to output channel
    const status = analysis.success ? '✅' : '❌';
    const errorInfo = analysis.errorReason ? ` (${analysis.errorReason})` : '';
    outputChannel.appendLine(
        `${status} [${historyEntry.timestamp.toLocaleString()}] ${project}: ${command}${errorInfo}`
    );

    // Show warning for errors
    if (!analysis.success) {
        vscode.window
            .showWarningMessage(
                `WinCC OA Command Failed: ${command}\nReason: ${analysis.errorReason || 'Unknown error'}`,
                'Show History'
            )
            .then(selection => {
                if (selection === 'Show History') {
                    showCommandHistory();
                }
            });
    }
}

/**
 * Shows the command history in a webview panel
 */
function showCommandHistory(): void {
    const panel = vscode.window.createWebviewPanel(
        'winccOACommandHistory',
        'WinCC OA Pmon Command History',
        vscode.ViewColumn.One,
        { enableScripts: true }
    );

    panel.webview.html = generateCommandHistoryHTML();

    // Handle webview messages
    panel.webview.onDidReceiveMessage(message => {
        switch (message.command) {
            case 'refreshHistory':
                // Refresh the command history display
                panel.webview.html = generateCommandHistoryHTML();
                break;
        }
    });
}

/**
 * Generates HTML for command history display
 */
function generateCommandHistoryHTML(): string {
    const historyRows = pmonCommandHistory
        .map(
            entry => `
		<tr class="${entry.success ? '' : 'error-row'}">
			<td>${entry.timestamp.toLocaleString()}</td>
			<td>${entry.project}</td>
			<td><code>${entry.command}</code></td>
			<td class="${entry.success ? 'success' : 'error'}">${entry.success ? '✅ OK' : '❌ ERROR'}</td>
			<td title="${entry.response}">${entry.success ? 'OK' : entry.errorReason || 'Unknown error'}</td>
		</tr>
	`
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WinCC OA Pmon Command History</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 0.9em;
        }
        th, td {
            padding: 8px;
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
        .error-row {
            background-color: rgba(220, 53, 69, 0.05) !important;
        }
        .success {
            color: #28a745;
            font-weight: bold;
        }
        .error {
            color: #dc3545;
            font-weight: bold;
        }
        .no-history {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .header-info {
            flex: 1;
        }
        .header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .refresh-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
        }
        .refresh-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .refresh-icon {
            transition: transform 0.5s;
        }
        .refresh-btn.refreshing .refresh-icon {
            transform: rotate(360deg);
        }
        .history-count {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-info">
                <h1>📋 WinCC OA Pmon Command History</h1>
                <p>Recent pmon command executions with responses and status</p>
                <div class="history-count">Total commands: ${pmonCommandHistory.length}</div>
            </div>
            <div class="header-actions">
                <button id="refreshBtn" class="refresh-btn" onclick="refreshHistory()" title="Refresh Command History">
                    <span class="refresh-icon">🔄</span> Refresh
                </button>
            </div>
        </div>
    </div>

    ${
        pmonCommandHistory.length > 0
            ? `
    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Project</th>
                <th>Command</th>
                <th>Status</th>
                <th>Response/Error</th>
            </tr>
        </thead>
        <tbody>
            ${historyRows}
        </tbody>
    </table>
    `
            : `
    <div class="no-history">
        <h3>No command history available</h3>
        <p>Execute some pmon commands to see the history here.</p>
    </div>
    `
    }

    <script>
        const vscode = acquireVsCodeApi();

        function refreshHistory() {
            const refreshBtn = document.getElementById('refreshBtn');
            const refreshIcon = refreshBtn.querySelector('.refresh-icon');

            // Show loading state
            refreshBtn.disabled = true;
            refreshBtn.classList.add('refreshing');

            // Send refresh command to extension
            vscode.postMessage({
                command: 'refreshHistory'
            });

            // Reset button after animation
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('refreshing');
            }, 500);
        }
    </script>
</body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
    console.log('WinCC OA Projects extension is now active!');

    // Create output channel for WCCILpmon command outputs
    outputChannel = vscode.window.createOutputChannel('WinCC OA Projects');
    context.subscriptions.push(outputChannel);

    const provider = new WinCCOAProjectProvider();
    projectProvider = provider;
    const treeView = vscode.window.createTreeView('winccOAProjects', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    // Handle tree view selection - show project details when clicked
    treeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<TreeItem>) => {
        if (e.selection.length > 0) {
            const selected = e.selection[0];
            // Only show project details for WinCCOAProject items, not categories
            if (selected instanceof WinCCOAProject) {
                ProjectViewPanel.createOrShow(context.extensionUri, selected);
            }
        }
    });

    // Watch for changes to pvssInst.conf file
    const configPath = getPvssInstConfPath();
    const watcher = vscode.workspace.createFileSystemWatcher(configPath);

    watcher.onDidChange(() => {
        console.log('WinCC OA config file changed, refreshing projects...');
        provider.refresh();
    });

    // Register commands
    const refreshCommand = vscode.commands.registerCommand('winccOAProjects.refresh', () => {
        provider.refresh();
    });

    const filterProjectsCommand = vscode.commands.registerCommand('winccOAProjects.filterProjects', async () => {
        const searchTerm = await vscode.window.showInputBox({
            placeHolder: 'Type to filter projects... (leave empty to clear filter)',
            prompt: 'Filter WinCC OA projects by name, path, version, or company',
            value: provider.currentFilter || ''
        });

        if (searchTerm !== undefined) {
            // User didn't cancel
            provider.setFilter(searchTerm.trim());
        }
    });

    const clearFilterCommand = vscode.commands.registerCommand('winccOAProjects.clearFilter', () => {
        provider.setFilter('');
    });

    const registerProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.registerProject',
        async (project?: WinCCOAProject) => {
            if (project) {
                // Called from context menu or with specific project
                try {
                    await registerProject(project);
                    vscode.window.showInformationMessage(
                        `✅ Project '${project.config.name}' has been registered successfully.`
                    );
                    provider.refresh(); // Refresh to show the project in registered category
                } catch (error) {
                    vscode.window.showErrorMessage(`❌ Failed to register project '${project.config.name}': ${error}`);
                }
            } else {
                // Called from command palette - show directory selection dialog
                const selectedFolder = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select WinCC OA Project Directory',
                    title: 'Select WinCC OA Project Directory to Register'
                });

                if (!selectedFolder || selectedFolder.length === 0) {
                    return; // User cancelled
                }

                const directoryPath = selectedFolder[0].fsPath;
                await registerRunnableProjectFromDirectory(directoryPath, provider);
            }
        }
    );

    const registerSubProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.registerSubProject',
        async (uri?: vscode.Uri) => {
            let directoryPath: string;
            let projectName: string;

            if (uri && fs.existsSync(uri.fsPath)) {
                // Called from context menu with specific directory
                directoryPath = uri.fsPath;
                projectName = path.basename(directoryPath);

                // Check if it's a directory
                const stats = fs.statSync(directoryPath);
                if (!stats.isDirectory()) {
                    vscode.window.showErrorMessage('WinCC OA sub-projects can only be registered from directories.');
                    return;
                }
            } else {
                // Called from command palette - show directory selection dialog
                const selectedFolder = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select WinCC OA Sub-Project Directory',
                    title: 'Select WinCC OA Sub-Project Directory to Register'
                });

                if (!selectedFolder || selectedFolder.length === 0) {
                    return; // User cancelled
                }

                directoryPath = selectedFolder[0].fsPath;
                projectName = path.basename(directoryPath);
            }

            // Check if this project is already registered
            const existingProject = provider
                .getProjects()
                .find(
                    p =>
                        path.normalize(p.config.installationDir).toLowerCase() ===
                        path.normalize(directoryPath).toLowerCase()
                );

            if (existingProject && !provider.isUnregistered(existingProject)) {
                vscode.window.showWarningMessage(`Project '${projectName}' is already registered in WinCC OA.`);
                return;
            }

            // Check if directory contains WinCC OA project structure
            const configPath = path.join(directoryPath, 'config', 'config');
            const hasConfig = fs.existsSync(configPath);

            if (hasConfig) {
                vscode.window.showErrorMessage(
                    `❌ Failed to register sub-project '${projectName}': \n\nThe directory appears to be a runnable WinCC OA project (config/config found). Please use 'Register Project' command instead.`
                );
                return;
            }

            try {
                // Use the dedicated sub-project registration function
                await registerSubProjectFromDirectory(directoryPath, provider);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Failed to register sub-project '${projectName}': ${error}`);
            }
        }
    );

    const registerRunnableProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.registerRunnableProject',
        async (uri?: vscode.Uri) => {
            let directoryPath: string;
            let projectName: string;

            if (uri && fs.existsSync(uri.fsPath)) {
                // Called from context menu with specific directory
                directoryPath = uri.fsPath;
                projectName = path.basename(directoryPath);

                // Check if it's a directory
                const stats = fs.statSync(directoryPath);
                if (!stats.isDirectory()) {
                    vscode.window.showErrorMessage(
                        'WinCC OA runnable projects can only be registered from directories.'
                    );
                    return;
                }
            } else {
                // Called from command palette - show directory selection dialog
                const selectedFolder = await vscode.window.showOpenDialog({
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select WinCC OA Runnable Project Directory',
                    title: 'Select WinCC OA Runnable Project Directory to Register'
                });

                if (!selectedFolder || selectedFolder.length === 0) {
                    return; // User cancelled
                }

                directoryPath = selectedFolder[0].fsPath;
                projectName = path.basename(directoryPath);
            }

            // Check if this project is already registered
            const existingProject = provider
                .getProjects()
                .find(
                    p =>
                        path.normalize(p.config.installationDir).toLowerCase() ===
                        path.normalize(directoryPath).toLowerCase()
                );

            if (existingProject && !provider.isUnregistered(existingProject)) {
                vscode.window.showWarningMessage(`Project '${projectName}' is already registered in WinCC OA.`);
                return;
            }

            // Check if directory contains WinCC OA project structure
            const configPath = path.join(directoryPath, 'config', 'config');
            const hasConfig = fs.existsSync(configPath);

            if (!hasConfig) {
                vscode.window.showErrorMessage(
                    `❌ Failed to register runnable project '${projectName}': \n\nThe directory does not appear to be a runnable WinCC OA project (no config/config found). Please use 'Register Sub Project' command instead.`
                );
                return;
            }

            try {
                // Use the dedicated runnable project registration function
                await registerRunnableProjectFromDirectory(directoryPath, provider);
            } catch (error) {
                vscode.window.showErrorMessage(`❌ Failed to register runnable project '${projectName}': ${error}`);
            }
        }
    );

    const unregisterProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.unregisterProject',
        async (project?: WinCCOAProject) => {
            let targetProject: WinCCOAProject;

            if (project) {
                // Called from context menu or with specific project
                targetProject = project;
            } else {
                // Called from command palette or without specific project - show selection dialog
                const allRegisteredProjects = provider.getProjects().filter(p => !provider.isUnregistered(p));

                if (allRegisteredProjects.length === 0) {
                    vscode.window.showInformationMessage('No registered projects found to unregister.');
                    return;
                }

                // Filter out projects that cannot be unregistered and prepare items
                const projectItems: Array<{
                    label: string;
                    description: string;
                    detail: string;
                    project: WinCCOAProject;
                    disabled?: boolean;
                }> = [];

                let protectedCount = 0;

                for (const proj of allRegisteredProjects) {
                    const canUnregister = canUnregisterProject(proj);
                    const item = {
                        label: proj.config.name,
                        description: proj.config.installationDir,
                        detail: `${proj.isWinCCOASystem ? '⚙️ System' : proj.isRunnable ? '🚀 Project' : '🧩 Sub-Project'}${proj.version ? ` • v${proj.version}` : ''}${!canUnregister.canUnregister ? ' • 🚫 Protected' : ''}`,
                        project: proj,
                        disabled: !canUnregister.canUnregister
                    };
                    projectItems.push(item);

                    if (!canUnregister.canUnregister) {
                        protectedCount++;
                    }
                }

                // Show info about protected projects if any
                if (protectedCount > 0) {
                    const unregisterableCount = allRegisteredProjects.length - protectedCount;
                    if (unregisterableCount === 0) {
                        vscode.window.showInformationMessage(
                            `All ${protectedCount} registered projects are protected from unregistration (WinCC OA system versions and delivered sub-projects cannot be unregistered).`
                        );
                        return;
                    }
                }

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: `Select a WinCC OA project to unregister... ${protectedCount > 0 ? `(${protectedCount} protected projects shown with 🚫)` : ''}`,
                    matchOnDescription: true,
                    matchOnDetail: true,
                    title: 'Unregister WinCC OA Project'
                });

                if (!selected) {
                    return; // User cancelled
                }

                targetProject = selected.project;
            }

            // Check if project can be unregistered
            const canUnregisterCheck = canUnregisterProject(targetProject);
            if (!canUnregisterCheck.canUnregister) {
                vscode.window.showErrorMessage(
                    `❌ Cannot unregister '${targetProject.config.name}': ${canUnregisterCheck.reason}`
                );
                return;
            }

            const confirmResult = await vscode.window.showWarningMessage(
                `Are you sure you want to unregister project '${targetProject.config.name}'?`,
                { modal: true },
                'Yes, Unregister',
                'Cancel'
            );

            if (confirmResult !== 'Yes, Unregister') {
                return;
            }

            try {
                await unregisterProject(targetProject.config.name);
                vscode.window.showInformationMessage(
                    `✅ Project '${targetProject.config.name}' has been unregistered successfully.`
                );
                provider.refresh();
            } catch (error) {
                vscode.window.showErrorMessage(
                    `❌ Failed to unregister project '${targetProject.config.name}': ${error}`
                );
            }
        }
    );

    const openProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.openProject',
        async (project?: WinCCOAProject) => {
            if (!project) {
                // If no project provided, show selection dialog
                const projects = provider.getProjects();
                const projectItems = projects.map((p: WinCCOAProject) => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `${p.isCurrent ? '⭐ Current • ' : ''}${p.isWinCCOASystem ? '⚙️ System' : p.isRunnable ? '🚀 Project' : '🧩 Extension'}${p.version ? ` • v${p.version}` : ''}`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a WinCC OA project to open...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    project = selected.project;
                } else {
                    return; // User cancelled
                }
            }

            if (project && project.installationDir && fs.existsSync(project.installationDir)) {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.installationDir));
            }
        }
    );

    const openProjectNewWindowCommand = vscode.commands.registerCommand(
        'winccOAProjects.openProjectNewWindow',
        async (project?: WinCCOAProject) => {
            if (!project) {
                // If no project provided, show selection dialog
                const projects = provider.getProjects();
                const projectItems = projects.map((p: WinCCOAProject) => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `${p.isCurrent ? '⭐ Current • ' : ''}${p.isWinCCOASystem ? '⚙️ System' : p.isRunnable ? '🚀 Project' : '🧩 Extension'}${p.version ? ` • v${p.version}` : ''}`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a WinCC OA project to open in new window...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    project = selected.project;
                } else {
                    return; // User cancelled
                }
            }

            if (project && project.installationDir && fs.existsSync(project.installationDir)) {
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(project.installationDir), true);
            }
        }
    );

    const openInExplorerCommand = vscode.commands.registerCommand(
        'winccOAProjects.openInExplorer',
        async (project?: WinCCOAProject) => {
            if (!project) {
                // If no project provided, show selection dialog
                const projects = provider.getProjects();
                const projectItems = projects.map((p: WinCCOAProject) => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `${p.isCurrent ? '⭐ Current • ' : ''}${p.isWinCCOASystem ? '⚙️ System' : p.isRunnable ? '🚀 Project' : '🧩 Extension'}${p.version ? ` • v${p.version}` : ''}`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a WinCC OA project to open in explorer...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    project = selected.project;
                } else {
                    return; // User cancelled
                }
            }

            if (project && project.installationDir && fs.existsSync(project.installationDir)) {
                vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(project.installationDir));
            }
        }
    );

    const showProjectViewCommand = vscode.commands.registerCommand(
        'winccOAProjects.showProjectView',
        async (project?: WinCCOAProject) => {
            if (!project) {
                // If no project provided, show selection dialog
                const projects = provider.getProjects();
                const projectItems = projects.map((p: WinCCOAProject) => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `${p.isCurrent ? '⭐ Current • ' : ''}${p.isWinCCOASystem ? '⚙️ System' : p.isRunnable ? '🚀 Project' : '🧩 Extension'}${p.version ? ` • v${p.version}` : ''}`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a WinCC OA project to view details...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (selected) {
                    project = selected.project;
                } else {
                    return; // User cancelled
                }
            }

            if (project) {
                ProjectViewPanel.createOrShow(context.extensionUri, project);
            }
        }
    );

    const scanForProjectsCommand = vscode.commands.registerCommand('winccOAProjects.scanForProjects', async () => {
        vscode.window.showInformationMessage('Scanning for unregistered WinCC OA projects...');
        provider.refresh(); // This will trigger the scan for unregistered projects
        vscode.window.showInformationMessage('Project scan completed. Check the "Unregistered Projects" section.');
    });

    const registerAllUnregisteredCommand = vscode.commands.registerCommand(
        'winccOAProjects.registerAllUnregistered',
        async () => {
            const unregisteredProjects = provider.getProjects().filter(p => provider.isUnregistered(p));

            if (unregisteredProjects.length === 0) {
                vscode.window.showInformationMessage('No unregistered projects found.');
                return;
            }

            const confirmResult = await vscode.window.showQuickPick(['Yes', 'No'], {
                placeHolder: `Register all ${unregisteredProjects.length} unregistered projects?`
            });

            if (confirmResult !== 'Yes') {
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const project of unregisteredProjects) {
                try {
                    await registerProject(project);
                    successCount++;
                } catch (error) {
                    console.error(`Failed to register project ${project.config.name}:`, error);
                    errorCount++;
                }
            }

            if (errorCount === 0) {
                vscode.window.showInformationMessage(`Successfully registered ${successCount} projects.`);
            } else {
                vscode.window.showWarningMessage(`Registered ${successCount} projects. ${errorCount} failed.`);
            }

            provider.refresh();
        }
    );

    const getVersionInfoCommand = vscode.commands.registerCommand(
        'winccOAProjects.getVersionInfo',
        async (project?: WinCCOAProject) => {
            let targetProject: WinCCOAProject | undefined = project;

            if (!targetProject) {
                // Show selection dialog for WinCC OA system projects
                const systemProjects = provider.getProjects().filter(p => p.isWinCCOASystem);

                if (systemProjects.length === 0) {
                    vscode.window.showErrorMessage('No WinCC OA system installations found.');
                    return;
                }

                const projectItems = systemProjects.map((p: WinCCOAProject) => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `WinCC OA v${p.version} System Installation`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select WinCC OA version to get detailed information...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (!selected) {
                    return; // User cancelled
                }

                targetProject = selected.project;
            }

            if (targetProject) {
                try {
                    const versionInfo = await getDetailedVersionInfo(targetProject);
                    await showVersionInfoDialog(versionInfo);
                } catch (error) {
                    vscode.window.showErrorMessage(`Failed to get version information: ${error}`);
                }
            }
        }
    );

    const checkPmonProjectStatusCommand = vscode.commands.registerCommand(
        'winccOAProjects.checkPmonProjectStatus',
        async (project?: WinCCOAProject) => {
            if (!project) {
                // Show quick pick for runnable projects only
                const runnableProjects = provider.getProjects().filter(p => p.isRunnable && !p.isWinCCOASystem);

                if (runnableProjects.length === 0) {
                    vscode.window.showWarningMessage('No runnable WinCC OA projects found.');
                    return;
                }

                const projectItems = runnableProjects.map(p => ({
                    label: p.config.name,
                    description: p.config.installationDir,
                    detail: `Version: ${p.version || 'Unknown'}`,
                    project: p
                }));

                const selected = await vscode.window.showQuickPick(projectItems, {
                    placeHolder: 'Select a runnable WinCC OA project to check status...',
                    matchOnDescription: true,
                    matchOnDetail: true
                });

                if (!selected) {
                    return;
                }
                project = selected.project;
            }

            // Validate that the project is runnable
            if (!project.isRunnable) {
                vscode.window.showErrorMessage(
                    `Project '${project.config.name}' is not runnable. Only runnable projects can have their status checked.`
                );
                return;
            }

            // Validate that it's not a system installation
            if (project.isWinCCOASystem) {
                vscode.window.showErrorMessage(
                    `Cannot check status for WinCC OA system installation '${project.config.name}'. Use this command only for user projects.`
                );
                return;
            }

            try {
                outputChannel.show(true);
                const status = await checkProjectRunningStatus(project);

                // Update the project's pmon status and refresh tree view
                await provider.updateProjectPmonStatus(project);

                let message: string;
                let icon: string;

                switch (status) {
                    case PmonProjectRunningStatus.RUNNING:
                        icon = '✅';
                        message = `Project '${project.config.name}' is currently RUNNING.`;
                        break;
                    case PmonProjectRunningStatus.STOPPED:
                        icon = '⏹️';
                        message = `Project '${project.config.name}' is currently STOPPED.`;
                        break;
                    case PmonProjectRunningStatus.UNKNOWN:
                        icon = '❓';
                        message = `Project '${project.config.name}' status is UNKNOWN.`;
                        break;
                    default:
                        icon = '❌';
                        message = `Project '${project.config.name}' has unexpected status: ${status}`;
                        break;
                }

                outputChannel.appendLine(`${icon} ${message}`);
                vscode.window.showInformationMessage(`${icon} ${message}`, 'Show Output').then(selection => {
                    if (selection === 'Show Output') {
                        outputChannel.show();
                    }
                });
            } catch (error) {
                const errorMsg = `Failed to check project status: ${error}`;
                outputChannel.appendLine(`❌ ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
            }
        }
    );

    // Pmon management commands
    const refreshAllStatusCommand = vscode.commands.registerCommand('winccOAProjects.refreshAllStatus', async () => {
        try {
            const allProjects = provider.getProjects();
            if (!allProjects || allProjects.length === 0) {
                vscode.window.showInformationMessage('No projects to refresh status for.');
                return;
            }

            outputChannel.appendLine('🔄 Refreshing status for all projects...');
            outputChannel.show(true);

            const runnableProjects = allProjects.filter((p: WinCCOAProject) => p.isRunnable && !p.isWinCCOASystem);
            if (runnableProjects.length === 0) {
                vscode.window.showInformationMessage('No runnable projects found.');
                return;
            }

            const statusResults = await Promise.allSettled(
                runnableProjects.map(async (project: WinCCOAProject) => {
                    try {
                        const status = await checkProjectRunningStatus(project);
                        return { project: project.config.name, status };
                    } catch (error) {
                        return { project: project.config.name, status: PmonProjectRunningStatus.UNKNOWN, error };
                    }
                })
            );

            const results = statusResults.map((result: any, index: number) => {
                if (result.status === 'fulfilled') {
                    return result.value;
                } else {
                    return {
                        project: runnableProjects[index].config.name,
                        status: PmonProjectRunningStatus.UNKNOWN,
                        error: result.reason
                    };
                }
            });

            // Display results
            const runningProjects = results.filter((r: any) => r.status === PmonProjectRunningStatus.RUNNING);
            const stoppedProjects = results.filter((r: any) => r.status === PmonProjectRunningStatus.STOPPED);
            const unknownProjects = results.filter((r: any) => r.status === PmonProjectRunningStatus.UNKNOWN);

            let message = `Status refresh complete:\n`;
            message += `✅ Running: ${runningProjects.length}\n`;
            message += `⏹️ Stopped: ${stoppedProjects.length}\n`;
            message += `❓ Unknown: ${unknownProjects.length}`;

            outputChannel.appendLine(message);
            vscode.window.showInformationMessage(
                `Project status refreshed: ${runningProjects.length} running, ${stoppedProjects.length} stopped, ${unknownProjects.length} unknown`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            outputChannel.appendLine(`❌ Error refreshing all status: ${errorMessage}`);
            vscode.window.showErrorMessage(`Error refreshing project status: ${errorMessage}`);
        }
    });

    const showAllRunnableStatusCommand = vscode.commands.registerCommand(
        'winccOAProjects.showAllRunnableStatus',
        async () => {
            try {
                const allProjects = provider.getProjects();
                if (!allProjects || allProjects.length === 0) {
                    vscode.window.showInformationMessage('No projects found.');
                    return;
                }

                const runnableProjects = allProjects.filter((p: WinCCOAProject) => p.isRunnable && !p.isWinCCOASystem);
                if (runnableProjects.length === 0) {
                    vscode.window.showInformationMessage('No runnable projects found.');
                    return;
                }

                outputChannel.appendLine('📊 Retrieving status for all runnable projects...');
                outputChannel.show(true);

                const statusPromises = runnableProjects.map(async (project: WinCCOAProject) => {
                    try {
                        const status = await getComprehensiveProjectStatus(project);
                        return status;
                    } catch (error) {
                        return {
                            projectName: project.config.name,
                            isRunning: false,
                            managers: [],
                            pmonStatus: PmonProjectRunningStatus.UNKNOWN,
                            lastUpdate: new Date(),
                            error: error instanceof Error ? error.message : String(error)
                        } as WinCCOAProjectStatus & { error: string };
                    }
                });

                const statusResults = await Promise.allSettled(statusPromises);
                const allStatus = statusResults.map((result: any, index: number) => {
                    if (result.status === 'fulfilled') {
                        return result.value;
                    } else {
                        return {
                            projectName: runnableProjects[index].config.name,
                            isRunning: false,
                            managers: [],
                            pmonStatus: PmonProjectRunningStatus.UNKNOWN,
                            lastUpdate: new Date(),
                            error: result.reason instanceof Error ? result.reason.message : String(result.reason)
                        } as WinCCOAProjectStatus & { error: string };
                    }
                });

                // Create and show webview panel with status overview
                const panel = vscode.window.createWebviewPanel(
                    'winccOAProjectStatus',
                    'WinCC OA Project Status Overview',
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = generateStatusOverviewHTML(allStatus);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error showing project status: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error showing project status: ${errorMessage}`);
            }
        }
    );

    const startPmonOnlyCommand = vscode.commands.registerCommand(
        'winccOAProjects.startPmonOnly',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await startPmonOnly(project);
                // Update pmon status after operation
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error starting pmon: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error starting pmon: ${errorMessage}`);
            }
        }
    );

    const startProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.startProject',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await startProject(project);
                // Update pmon status after operation
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error starting project: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error starting project: ${errorMessage}`);
            }
        }
    );

    const stopProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.stopProject',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await stopProject(project);
                // Update pmon status after operation
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error stopping project: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error stopping project: ${errorMessage}`);
            }
        }
    );

    const stopProjectAndPmonCommand = vscode.commands.registerCommand(
        'winccOAProjects.stopProjectAndPmon',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await stopProjectAndPmon(project);
                // Update pmon status after operation
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error stopping project and pmon: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error stopping project and pmon: ${errorMessage}`);
            }
        }
    );

    const restartProjectCommand = vscode.commands.registerCommand(
        'winccOAProjects.restartProject',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await restartProject(project);
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error restarting project: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error restarting project: ${errorMessage}`);
            }
        }
    );

    const setPmonWaitModeCommand = vscode.commands.registerCommand(
        'winccOAProjects.setPmonWaitMode',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }
                await setPmonWaitMode(project);
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error setting pmon wait mode: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error setting pmon wait mode: ${errorMessage}`);
            }
        }
    );

    const showManagerOverviewCommand = vscode.commands.registerCommand(
        'winccOAProjects.showManagerOverview',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }

                outputChannel.appendLine(`📋 Getting manager overview for project: ${project.config.name}`);
                outputChannel.show(true);

                // Get both configuration (LIST) and runtime status (STATI)
                const [configManagers, statusResult] = await Promise.all([
                    getManagerList(project),
                    getDetailedManagerStatus(project)
                ]);

                const panel = vscode.window.createWebviewPanel(
                    'winccOAManagerOverview',
                    `Manager Overview - ${project.config.name}`,
                    vscode.ViewColumn.One,
                    { enableScripts: true }
                );

                panel.webview.html = generateManagerOverviewHTML(
                    project,
                    configManagers,
                    statusResult.managers,
                    statusResult.projectState
                );

                // Handle webview messages
                panel.webview.onDidReceiveMessage(
                    async message => {
                        try {
                            switch (message.command) {
                                case 'refreshManagerOverview':
                                    // Refresh the manager overview data
                                    const [newConfigManagers, newStatusResult] = await Promise.all([
                                        getManagerList(project),
                                        getDetailedManagerStatus(project)
                                    ]);
                                    panel.webview.html = generateManagerOverviewHTML(
                                        project,
                                        newConfigManagers,
                                        newStatusResult.managers,
                                        newStatusResult.projectState
                                    );
                                    break;
                                case 'startManager':
                                    await startManager(project, message.index);
                                    // Refresh data after action
                                    const [refreshedConfigManagers1, refreshedStatusResult1] = await Promise.all([
                                        getManagerList(project),
                                        getDetailedManagerStatus(project)
                                    ]);
                                    panel.webview.html = generateManagerOverviewHTML(
                                        project,
                                        refreshedConfigManagers1,
                                        refreshedStatusResult1.managers,
                                        refreshedStatusResult1.projectState
                                    );
                                    break;
                                case 'stopManager':
                                    await stopManager(project, message.index);
                                    // Refresh data after action
                                    const [refreshedConfigManagers2, refreshedStatusResult2] = await Promise.all([
                                        getManagerList(project),
                                        getDetailedManagerStatus(project)
                                    ]);
                                    panel.webview.html = generateManagerOverviewHTML(
                                        project,
                                        refreshedConfigManagers2,
                                        refreshedStatusResult2.managers,
                                        refreshedStatusResult2.projectState
                                    );
                                    break;
                                case 'killManager':
                                    await killManager(project, message.index);
                                    // Refresh data after action
                                    const [refreshedConfigManagers3, refreshedStatusResult3] = await Promise.all([
                                        getManagerList(project),
                                        getDetailedManagerStatus(project)
                                    ]);
                                    panel.webview.html = generateManagerOverviewHTML(
                                        project,
                                        refreshedConfigManagers3,
                                        refreshedStatusResult3.managers,
                                        refreshedStatusResult3.projectState
                                    );
                                    break;
                                case 'getAutoRefreshSettings':
                                    // Send current auto-refresh settings to webview
                                    const config = vscode.workspace.getConfiguration('winccOAProjects.managerOverview');
                                    const interval = config.get<number>('autoRefreshInterval', 5);
                                    const enabled = config.get<boolean>('enableAutoRefresh', true);

                                    panel.webview.postMessage({
                                        command: 'setRefreshInterval',
                                        interval: interval
                                    });
                                    panel.webview.postMessage({
                                        command: 'setAutoRefreshEnabled',
                                        enabled: enabled
                                    });
                                    break;
                                case 'setAutoRefresh':
                                    // Update auto-refresh setting
                                    const autoRefreshConfig = vscode.workspace.getConfiguration(
                                        'winccOAProjects.managerOverview'
                                    );
                                    await autoRefreshConfig.update(
                                        'enableAutoRefresh',
                                        message.enabled,
                                        vscode.ConfigurationTarget.Global
                                    );
                                    break;
                            }
                        } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : String(error);
                            outputChannel.appendLine(`❌ Error handling webview message: ${errorMessage}`);
                            vscode.window.showErrorMessage(`Error: ${errorMessage}`);
                        }
                    },
                    undefined,
                    context.subscriptions
                );
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error getting manager overview: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error getting manager overview: ${errorMessage}`);
            }
        }
    );

    const startManagerCommand = vscode.commands.registerCommand(
        'winccOAProjects.startManager',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }

                const indexInput = await vscode.window.showInputBox({
                    prompt: 'Enter manager index to start',
                    placeHolder: '0, 1, 2, ...',
                    validateInput: value => {
                        const index = parseInt(value, 10);
                        if (isNaN(index) || index < 0) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });

                if (indexInput === undefined) {
                    return; // User cancelled
                }

                const index = parseInt(indexInput, 10);
                await startManager(project, index);
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error starting manager: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error starting manager: ${errorMessage}`);
            }
        }
    );

    const stopManagerCommand = vscode.commands.registerCommand(
        'winccOAProjects.stopManager',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }

                const indexInput = await vscode.window.showInputBox({
                    prompt: 'Enter manager index to stop',
                    placeHolder: '0, 1, 2, ...',
                    validateInput: value => {
                        const index = parseInt(value, 10);
                        if (isNaN(index) || index < 0) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });

                if (indexInput === undefined) {
                    return; // User cancelled
                }

                const index = parseInt(indexInput, 10);
                await stopManager(project, index);
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error stopping manager: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error stopping manager: ${errorMessage}`);
            }
        }
    );

    const killManagerCommand = vscode.commands.registerCommand(
        'winccOAProjects.killManager',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }

                const indexInput = await vscode.window.showInputBox({
                    prompt: 'Enter manager index to kill',
                    placeHolder: '0, 1, 2, ...',
                    validateInput: value => {
                        const index = parseInt(value, 10);
                        if (isNaN(index) || index < 0) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });

                if (indexInput === undefined) {
                    return; // User cancelled
                }

                const index = parseInt(indexInput, 10);
                await killManager(project, index);
                await provider.updateProjectPmonStatus(project);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error killing manager: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error killing manager: ${errorMessage}`);
            }
        }
    );

    const removeManagerCommand = vscode.commands.registerCommand(
        'winccOAProjects.removeManager',
        async (project?: WinCCOAProject) => {
            try {
                if (!project) {
                    vscode.window.showErrorMessage('No project selected');
                    return;
                }

                const indexInput = await vscode.window.showInputBox({
                    prompt: 'Enter manager index to remove',
                    placeHolder: '0, 1, 2, ...',
                    validateInput: value => {
                        const index = parseInt(value, 10);
                        if (isNaN(index) || index < 0) {
                            return 'Please enter a valid positive number';
                        }
                        return null;
                    }
                });

                if (indexInput === undefined) {
                    return; // User cancelled
                }

                const index = parseInt(indexInput, 10);

                // Confirm removal
                const confirmation = await vscode.window.showWarningMessage(
                    `Are you sure you want to remove manager ${index} from project '${project.config.name}'?`,
                    { modal: true },
                    'Yes, Remove'
                );

                if (confirmation === 'Yes, Remove') {
                    await removeManager(project, index);
                    await provider.updateProjectPmonStatus(project);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                outputChannel.appendLine(`❌ Error removing manager: ${errorMessage}`);
                vscode.window.showErrorMessage(`Error removing manager: ${errorMessage}`);
            }
        }
    );

    const showCommandHistoryCommand = vscode.commands.registerCommand('winccOAProjects.showCommandHistory', () => {
        showCommandHistory();
    });

    // Code Formatting Commands
    const formatCtrlFileCommand = vscode.commands.registerCommand('winccOAProjects.formatCtrlFile', async () => {
        await formatting.formatActiveCtrlFile();
    });

    const formatAllCtrlFilesCommand = vscode.commands.registerCommand(
        'winccOAProjects.formatAllCtrlFiles',
        async () => {
            await formatting.formatAllCtrlFiles();
        }
    );

    context.subscriptions.push(
        treeView,
        watcher,
        refreshCommand,
        openProjectCommand,
        openProjectNewWindowCommand,
        openInExplorerCommand,
        showProjectViewCommand,
        registerProjectCommand,
        scanForProjectsCommand,
        registerAllUnregisteredCommand,
        unregisterProjectCommand,
        filterProjectsCommand,
        clearFilterCommand,
        registerSubProjectCommand,
        registerRunnableProjectCommand,
        getVersionInfoCommand,
        checkPmonProjectStatusCommand,
        refreshAllStatusCommand,
        showAllRunnableStatusCommand,
        startPmonOnlyCommand,
        startProjectCommand,
        stopProjectCommand,
        stopProjectAndPmonCommand,
        restartProjectCommand,
        setPmonWaitModeCommand,
        showManagerOverviewCommand,
        showCommandHistoryCommand,
        startManagerCommand,
        stopManagerCommand,
        killManagerCommand,
        removeManagerCommand,
        formatCtrlFileCommand,
        formatAllCtrlFilesCommand
    );

    // Auto-refresh when extension starts
    provider.refresh();

    // Return the extension API for use by other extensions
    return {
        getAPI: getAPI,
        ...getAPI()
    };
}

interface ProjectConfig {
    name: string;
    installationDir: string;
    installationDate: string;
    notRunnable: boolean;
    company?: string;
    currentProject?: boolean;
}

interface CurrentProjectInfo {
    projectName: string;
    version: string;
    installationDir?: string;
    lastUsedProjectDir?: string;
}

// Standalone utility functions for testing
export function extractVersionFromProject(project: WinCCOAProject): string | null {
    // Check for null or undefined project
    if (!project || !project.config) {
        return null;
    }

    // Try to extract version from project version field first
    if (project.version) {
        return project.version;
    }

    // Try to find version from system projects (performance-oriented approach)
    const systemProjects = projectProvider?.getProjects().filter(p => p.isWinCCOASystem) || [];
    const systemProject = systemProjects.find(p => project.config.installationDir.startsWith(p.config.installationDir));
    if (systemProject) {
        return systemProject.version || null;
    }

    // Fallback: Try to extract version from project name (look for patterns like 3.20, 3_20, 3.21.1, etc.)
    if (project.config.name) {
        const versionMatch = project.config.name.match(/(\d{1,2}[._]\d{1,2}(?:[._]\d{1,2})?)/);
        if (versionMatch) {
            // Convert underscores to dots for consistency
            return versionMatch[1].replace(/_/g, '.');
        }
    }

    // Fallback: Try to extract from installation directory path
    if (project.config.installationDir) {
        const pathVersionMatch = project.config.installationDir.match(/(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/);
        if (pathVersionMatch) {
            return pathVersionMatch[1];
        }
    }

    return null;
}

export function isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
    // Check for null or undefined project
    if (!project || !project.config || !project.config.installationDir) {
        return false;
    }

    // Try to find if project is under a system project (performance-oriented approach)
    const systemProjects = projectProvider?.getProjects().filter(p => p.isWinCCOASystem) || [];
    const systemProject = systemProjects.find(p => project.config.installationDir.startsWith(p.config.installationDir));
    if (systemProject) {
        return true;
    }

    // Fallback: Check if the project is installed in common WinCC OA installation directories
    const installDir = project.config.installationDir.toLowerCase().replace(/\\/g, '/');
    const commonWinCCOAPaths = [
        'c:/siemens/automation/wincc_oa/',
        'c:/program files/siemens/wincc_oa/',
        'c:/program files (x86)/siemens/wincc_oa/',
        'c:/programdata/siemens/wincc_oa/',
        '/opt/wincc_oa/'
    ];

    return commonWinCCOAPaths.some(path => installDir.startsWith(path));
}

/**
 * Checks if a project can be safely unregistered
 * @param project The project to check
 * @returns Object with canUnregister flag and reason if not allowed
 */
export function canUnregisterProject(project: WinCCOAProject): { canUnregister: boolean; reason?: string } {
    // WinCC OA System versions cannot be unregistered
    if (project.isWinCCOASystem) {
        return {
            canUnregister: false,
            reason: 'WinCC OA system versions cannot be unregistered as they are part of the core installation.'
        };
    }

    // WinCC OA delivered sub-projects cannot be unregistered
    if (isWinCCOADeliveredSubProject(project)) {
        return {
            canUnregister: false,
            reason: 'WinCC OA delivered sub-projects cannot be unregistered as they are part of the standard installation.'
        };
    }

    // Project can be unregistered
    return { canUnregister: true };
}

/**
 * Generate HTML for project status overview
 */
function generateStatusOverviewHTML(statusList: (WinCCOAProjectStatus & { error?: string })[]): string {
    const runningProjects = statusList.filter(s => s.pmonStatus === PmonProjectRunningStatus.RUNNING);
    const stoppedProjects = statusList.filter(s => s.pmonStatus === PmonProjectRunningStatus.STOPPED);
    const unknownProjects = statusList.filter(s => s.pmonStatus === PmonProjectRunningStatus.UNKNOWN);

    const projectRows = statusList
        .map(status => {
            const statusIcon =
                status.pmonStatus === PmonProjectRunningStatus.RUNNING
                    ? '✅'
                    : status.pmonStatus === PmonProjectRunningStatus.STOPPED
                      ? '⏹️'
                      : '❓';
            const statusText =
                status.pmonStatus === PmonProjectRunningStatus.RUNNING
                    ? 'Running'
                    : status.pmonStatus === PmonProjectRunningStatus.STOPPED
                      ? 'Stopped'
                      : 'Unknown';
            const statusColor =
                status.pmonStatus === PmonProjectRunningStatus.RUNNING
                    ? '#28a745'
                    : status.pmonStatus === PmonProjectRunningStatus.STOPPED
                      ? '#ffc107'
                      : '#dc3545';

            const managerCount = status.managers?.length || 0;
            const runningManagers =
                status.managers?.filter(
                    m => m.status?.toLowerCase().includes('running') || m.status?.toLowerCase().includes('started')
                )?.length || 0;

            return `
			<tr>
				<td><strong>${status.projectName}</strong></td>
				<td style="color: ${statusColor};">${statusIcon} ${statusText}</td>
				<td>${managerCount}</td>
				<td>${runningManagers}</td>
				<td>${status.lastUpdate.toLocaleString()}</td>
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
        <h1>🖥️ WinCC OA Project Status Overview</h1>
        <p>Comprehensive status of all runnable projects</p>
        <button class="refresh-button" onclick="refreshStatus()">🔄 Refresh All Status</button>
    </div>

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
            <div>Total Projects</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Project Name</th>
                <th>Status</th>
                <th>Total Managers</th>
                <th>Running Managers</th>
                <th>Last Updated</th>
                <th>Error</th>
            </tr>
        </thead>
        <tbody>
            ${projectRows}
        </tbody>
    </table>

    <script>
        function refreshStatus() {
            // This would trigger VS Code command
            console.log('Refresh status requested');
        }
    </script>
</body>
</html>`;
}

/**
 * Generate HTML for manager list
 */
/**
 * Generate comprehensive manager overview HTML combining LIST and STATI data
 */
function generateManagerOverviewHTML(
    project: WinCCOAProject,
    configManagers: WinCCOAManager[],
    statusManagers: WinCCOAManager[],
    projectState?: WinCCOAProjectState
): string {
    // Merge configuration and status data
    const mergedManagers: WinCCOAManager[] = configManagers.map((configMgr, index) => {
        // Find corresponding status manager by index
        const statusMgr = statusManagers.find(sm => sm.index === configMgr.index);

        return {
            ...configMgr,
            // Override with runtime status if available
            runningState: (statusMgr?.runningState as 'stopped' | 'init' | 'running' | 'blocked') || undefined,
            pid: statusMgr?.pid,
            startTimeStamp: statusMgr?.startTimeStamp,
            managerNumber: statusMgr?.managerNumber
        };
    });

    // Calculate health score
    const healthScore = calculateProjectHealth(mergedManagers, projectState);

    const managerRows = mergedManagers
        .map(manager => {
            // Determine status icon and color based on running state
            let statusIcon = '❓';
            let statusColor = '#6c757d';

            switch (manager.runningState) {
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

            const startModeIcon = manager.startMode === 'always' ? '🔄' : manager.startMode === 'once' ? '1️⃣' : '🖐️';

            return `
		<tr class="${manager.pid === -2 ? 'fatal-error-row' : ''}">
			<td>${manager.index}</td>
			<td class="${manager.pid === -2 ? 'fatal-error' : ''}">${manager.pid === -2 ? '⚠️ ' : ''}<strong>${manager.name}</strong></td>
			<td style="color: ${statusColor};">${statusIcon} ${manager.runningState || 'unknown'}</td>
			<td title="${manager.pid === -2 ? 'FATAL ERROR: Manager cannot start - check WinCC OA logs for DB connection, configuration errors, etc.' : 'Process ID'}" class="${manager.pid === -2 ? 'fatal-error' : ''}">${manager.pid === -2 ? '⚠️ FATAL' : manager.pid || ''}</td>
			<td>${startModeIcon} ${manager.startMode || ''}</td>
			<td title="${manager.secKill && manager.secKill < 0 ? 'Manager will NOT be stopped on project restart' : 'Seconds to kill manager on restart'}">${manager.secKill ? (manager.secKill < 0 ? `🔒 ${manager.secKill}` : manager.secKill) : ''}</td>
			<td>${manager.restartCount || ''}</td>
			<td>${manager.resetMin || ''}</td>
			<td title="${manager.args || ''}" class="args-cell">${manager.args ? (manager.args.length > 30 ? manager.args.substring(0, 30) + '...' : manager.args) : ''}</td>
			<td>${manager.startTimeStamp ? manager.startTimeStamp.toLocaleString() : ''}</td>
			<td>
				<button onclick="startManager(${manager.index})" class="action-btn start-btn" ${manager.runningState === 'running' ? 'disabled' : ''}>▶️</button>
				<button onclick="stopManager(${manager.index})" class="action-btn stop-btn" ${manager.runningState === 'stopped' ? 'disabled' : ''}>⏹️</button>
				<button onclick="killManager(${manager.index})" class="action-btn kill-btn" ${manager.runningState === 'stopped' ? 'disabled' : ''}>❌</button>
			</td>
		</tr>
		`;
        })
        .join('');

    // Calculate summary statistics
    const runningCount = mergedManagers.filter(m => m.runningState === 'running').length;
    const stoppedCount = mergedManagers.filter(m => m.runningState === 'stopped').length;
    const initCount = mergedManagers.filter(m => m.runningState === 'init').length;
    const blockedCount = mergedManagers.filter(m => m.runningState === 'blocked').length;
    const totalCount = mergedManagers.length;

    // Project state information with health score
    const projectStateHtml = `
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
								<span class="metric-value">${healthScore.details.managerHealth}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Project State:</span>
								<span class="metric-value">${healthScore.details.projectStateHealth}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Performance:</span>
								<span class="metric-value">${healthScore.details.performanceHealth}%</span>
							</div>
							<div class="health-metric">
								<span class="metric-label">Reliability:</span>
								<span class="metric-value">${healthScore.details.reliabilityHealth}%</span>
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
					<span class="state-badge state-${projectState.status.toLowerCase()}">${projectState.status}</span>
					<span class="state-text">${projectState.text}</span>
					${projectState.emergency ? '<span class="emergency-badge">🚨 EMERGENCY</span>' : ''}
					${projectState.demo ? '<span class="demo-badge">🧪 DEMO</span>' : ''}
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
					${healthScore.issues.map(issue => `<li>${issue}</li>`).join('')}
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
					${healthScore.recommendations.map(rec => `<li>${rec}</li>`).join('')}
				</ul>
			</div>
			`
                    : ''
            }
		</div>
	`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Manager Overview - ${project.config.name}</title>
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
        .project-state {
            background-color: var(--vscode-input-background);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
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
            width: 90px;
            height: 90px;
            background-color: var(--vscode-editor-background);
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }
        .health-score-number {
            font-size: 28px;
            font-weight: bold;
            line-height: 1;
        }
        .health-grade {
            font-size: 14px;
            margin-top: 4px;
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
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 8px;
        }
        .health-metric {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
        }
        .metric-label {
            opacity: 0.8;
        }
        .metric-value {
            font-weight: bold;
        }

        .project-state-info {
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .state-info {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .health-issues, .health-recommendations {
            margin-top: 15px;
        }
        .health-issues h4, .health-recommendations h4 {
            margin: 0 0 10px 0;
            font-size: 14px;
        }
        .health-issues h4 {
            color: #ffc107;
        }
        .health-recommendations h4 {
            color: #17a2b8;
        }
        .issue-list, .recommendation-list {
            margin: 0;
            padding-left: 20px;
        }
        .issue-list li, .recommendation-list li {
            margin: 4px 0;
            font-size: 13px;
            line-height: 1.4;
        }
        .issue-list li {
            color: #ffc107;
        }
        .recommendation-list li {
            color: #17a2b8;
        }
        .state-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 0.9em;
            font-weight: bold;
        }
        .state-down { background-color: #ffc107; color: #000; }
        .state-starting { background-color: #17a2b8; color: #fff; }
        .state-monitoring { background-color: #28a745; color: #fff; }
        .state-stopping { background-color: #fd7e14; color: #fff; }
        .state-restarting { background-color: #6f42c1; color: #fff; }
        .state-unknown { background-color: #6c757d; color: #fff; }
        .emergency-badge, .demo-badge {
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            font-weight: bold;
        }
        .emergency-badge { background-color: #dc3545; color: #fff; }
        .demo-badge { background-color: #fd7e14; color: #fff; }
        .summary {
            display: flex;
            gap: 20px;
            margin-bottom: 30px;
        }
        .summary-card {
            flex: 1;
            background-color: var(--vscode-input-background);
            padding: 15px;
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
        .init { color: #17a2b8; }
        .blocked { color: #dc3545; }
        .total { color: var(--vscode-editor-foreground); }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 0.9em;
        }
        th, td {
            padding: 8px;
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
        .args-cell {
            max-width: 200px;
            word-wrap: break-word;
        }
        .action-btn {
            margin: 0 2px;
            padding: 4px 8px;
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.8em;
        }
        .action-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .start-btn { background-color: #28a745; color: white; }
        .stop-btn { background-color: #ffc107; color: black; }
        .kill-btn { background-color: #dc3545; color: white; }
        .fatal-error {
            color: #dc3545 !important;
            font-weight: bold;
            background-color: rgba(220, 53, 69, 0.1);
            border-left: 4px solid #dc3545;
            padding-left: 8px;
        }
        .fatal-error-row {
            background-color: rgba(220, 53, 69, 0.05) !important;
        }
        .no-managers {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .header-info {
            flex: 1;
        }
        .header-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 10px;
        }
        .refresh-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: background-color 0.2s;
        }
        .refresh-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .refresh-btn:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .refresh-icon {
            transition: transform 0.5s;
        }
        .refresh-btn.refreshing .refresh-icon {
            transform: rotate(360deg);
        }
        .auto-refresh-controls {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .next-refresh {
            font-style: italic;
        }
        .last-update {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            text-align: right;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="header-info">
                <h1>🛠️ Manager Overview</h1>
                <p><strong>Project:</strong> ${project.config.name}</p>
                <p><strong>Installation:</strong> ${project.config.installationDir}</p>
                <p><strong>Version:</strong> ${project.version || 'Unknown'}</p>
            </div>
            <div class="header-actions">
                <button id="refreshBtn" class="refresh-btn" onclick="refreshData()" title="Refresh Manager Data">
                    <span class="refresh-icon">🔄</span> Refresh
                </button>
                <div class="auto-refresh-controls">
                    <input type="checkbox" id="autoRefreshToggle" onchange="toggleAutoRefresh()">
                    <label for="autoRefreshToggle">Auto-refresh</label>
                    <span id="nextRefresh" class="next-refresh"></span>
                </div>
            </div>
        </div>
        <div id="lastUpdate" class="last-update">Last updated: ${new Date().toLocaleString()}</div>
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
            <div class="summary-number init">${initCount}</div>
            <div>Initializing</div>
        </div>
        <div class="summary-card">
            <div class="summary-number blocked">${blockedCount}</div>
            <div>Blocked</div>
        </div>
        <div class="summary-card">
            <div class="summary-number total">${totalCount}</div>
            <div>Total</div>
        </div>
    </div>

    ${
        totalCount > 0
            ? `
    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>Manager</th>
                <th>Status</th>
                <th title="Process ID. ⚠️ FATAL = Manager cannot start due to critical errors (check logs)">PID</th>
                <th>Start Mode</th>
                <th title="Seconds to kill manager on restart. Negative values (🔒) = won't be stopped on project restart">Sec Kill</th>
                <th>Restart Count</th>
                <th>Reset Min</th>
                <th>Arguments</th>
                <th>Start Time</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${managerRows}
        </tbody>
    </table>
    `
            : `
    <div class="no-managers">
        <h3>No managers found</h3>
        <p>This project doesn't have any configured managers.</p>
    </div>
    `
    }

    <script>
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

        // Auto-refresh functionality
        let autoRefreshTimer = null;
        let countdownTimer = null;
        let refreshInterval = 5000; // Default 5 seconds
        let nextRefreshTime = 0;

        function refreshData() {
            const refreshBtn = document.getElementById('refreshBtn');
            const refreshIcon = refreshBtn.querySelector('.refresh-icon');

            // Show loading state
            refreshBtn.disabled = true;
            refreshBtn.classList.add('refreshing');

            // Send refresh command to extension
            vscode.postMessage({
                command: 'refreshManagerOverview'
            });

            // Update last update time
            document.getElementById('lastUpdate').textContent = 'Last updated: ' + new Date().toLocaleString();

            // Reset refresh button after animation
            setTimeout(() => {
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('refreshing');
            }, 500);
        }

        function toggleAutoRefresh() {
            const toggle = document.getElementById('autoRefreshToggle');
            const nextRefreshSpan = document.getElementById('nextRefresh');

            if (toggle.checked) {
                startAutoRefresh();
            } else {
                stopAutoRefresh();
                nextRefreshSpan.textContent = '';
            }

            // Save preference to extension
            vscode.postMessage({
                command: 'setAutoRefresh',
                enabled: toggle.checked
            });
        }

        function startAutoRefresh() {
            stopAutoRefresh(); // Clear any existing timers

            nextRefreshTime = Date.now() + refreshInterval;
            updateCountdown();

            autoRefreshTimer = setInterval(() => {
                refreshData();
                nextRefreshTime = Date.now() + refreshInterval;
            }, refreshInterval);

            countdownTimer = setInterval(updateCountdown, 1000);
        }

        function stopAutoRefresh() {
            if (autoRefreshTimer) {
                clearInterval(autoRefreshTimer);
                autoRefreshTimer = null;
            }
            if (countdownTimer) {
                clearInterval(countdownTimer);
                countdownTimer = null;
            }
        }

        function updateCountdown() {
            const nextRefreshSpan = document.getElementById('nextRefresh');
            const remaining = Math.max(0, Math.ceil((nextRefreshTime - Date.now()) / 1000));

            if (remaining > 0) {
                nextRefreshSpan.textContent = '(next in ' + remaining + 's)';
            } else {
                nextRefreshSpan.textContent = '(refreshing...)';
            }
        }

        // Initialize auto-refresh settings from extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'setRefreshInterval':
                    refreshInterval = message.interval * 1000; // Convert to milliseconds
                    if (document.getElementById('autoRefreshToggle').checked) {
                        startAutoRefresh(); // Restart with new interval
                    }
                    break;
                case 'setAutoRefreshEnabled':
                    document.getElementById('autoRefreshToggle').checked = message.enabled;
                    if (message.enabled) {
                        startAutoRefresh();
                    } else {
                        stopAutoRefresh();
                    }
                    break;
            }
        });

        // Request initial settings from extension
        vscode.postMessage({
            command: 'getAutoRefreshSettings'
        });
    </script>
</body>
</html>`;
}

function generateManagerListHTML(project: WinCCOAProject, managers: WinCCOAManager[]): string {
    const managerRows = managers
        .map(
            (manager, index) => `
		<tr>
			<td>${manager.index}</td>
			<td>${manager.name}</td>
			<td>${manager.status || 'Unknown'}</td>
			<td>${manager.startMode || ''}</td>
			<td title="${manager.secKill && manager.secKill < 0 ? 'Manager will NOT be stopped on project restart' : 'Seconds to kill manager on restart'}">${manager.secKill ? (manager.secKill < 0 ? `🔒 ${manager.secKill}` : manager.secKill) : ''}</td>
			<td>${manager.restartCount || ''}</td>
			<td>${manager.resetMin || ''}</td>
			<td>${manager.args || ''}</td>
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
        .header {
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 2px solid var(--vscode-panel-border);
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 10px;
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
        .no-managers {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📋 Manager List</h1>
        <p>Project: <strong>${project.config.name}</strong></p>
        <p>Total Managers: <strong>${managers.length}</strong></p>
    </div>

    ${
        managers.length > 0
            ? `
    <table>
        <thead>
            <tr>
                <th>Index</th>
                <th>Manager Name</th>
                <th>Status</th>
                <th>Start Mode</th>
                <th title="Seconds to kill manager on restart. Negative values (🔒) = won't be stopped on project restart">Sec Kill</th>
                <th>Restart Count</th>
                <th>Reset Min</th>
                <th>Arguments</th>
            </tr>
        </thead>
        <tbody>
            ${managerRows}
        </tbody>
    </table>
    `
            : `
    <div class="no-managers">
        <h3>No managers configured</h3>
        <p>This project does not have any managers configured yet.</p>
    </div>
    `
    }
</body>
</html>`;
}

/**
 * Generate HTML for manager status
 */
function generateManagerStatusHTML(project: WinCCOAProject, managers: WinCCOAManager[]): string {
    const managerRows = managers
        .map((manager, index) => {
            const statusIcon =
                manager.status?.toLowerCase().includes('running') || manager.status?.toLowerCase().includes('started')
                    ? '✅'
                    : manager.status?.toLowerCase().includes('stopped')
                      ? '⏹️'
                      : '❓';
            const statusColor =
                manager.status?.toLowerCase().includes('running') || manager.status?.toLowerCase().includes('started')
                    ? '#28a745'
                    : manager.status?.toLowerCase().includes('stopped')
                      ? '#ffc107'
                      : '#dc3545';

            return `
		<tr class="${manager.pid === -2 ? 'fatal-error-row' : ''}">
			<td>${manager.index}</td>
			<td class="${manager.pid === -2 ? 'fatal-error' : ''}">${manager.pid === -2 ? '⚠️ ' : ''}<strong>${manager.name}</strong></td>
			<td style="color: ${statusColor};">${statusIcon} ${manager.status || 'Unknown'}</td>
			<td title="${manager.pid === -2 ? 'FATAL ERROR: Manager cannot start - check WinCC OA logs for DB connection, configuration errors, etc.' : 'Process ID'}" class="${manager.pid === -2 ? 'fatal-error' : ''}">${manager.pid === -2 ? '⚠️ FATAL' : manager.pid || ''}</td>
			<td>${manager.startMode || ''}</td>
			<td>
				<button onclick="startManager(${manager.index})" class="action-btn start-btn">▶️ Start</button>
				<button onclick="stopManager(${manager.index})" class="action-btn stop-btn">⏹️ Stop</button>
				<button onclick="killManager(${manager.index})" class="action-btn kill-btn">❌ Kill</button>
			</td>
		</tr>
		`;
        })
        .join('');

    const runningCount = managers.filter(
        m => m.status?.toLowerCase().includes('running') || m.status?.toLowerCase().includes('started')
    ).length;
    const stoppedCount = managers.filter(m => m.status?.toLowerCase().includes('stopped')).length;

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
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            padding: 10px;
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
        .action-btn {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 5px 10px;
            border-radius: 3px;
            cursor: pointer;
            margin: 2px;
            font-size: 12px;
        }
        .action-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .start-btn { background-color: #28a745; }
        .stop-btn { background-color: #ffc107; }
        .kill-btn { background-color: #dc3545; }
        .fatal-error {
            color: #dc3545 !important;
            font-weight: bold;
            background-color: rgba(220, 53, 69, 0.1);
            border-left: 4px solid #dc3545;
            padding-left: 8px;
        }
        .fatal-error-row {
            background-color: rgba(220, 53, 69, 0.05) !important;
        }
        .no-managers {
            text-align: center;
            padding: 40px;
            color: var(--vscode-descriptionForeground);
        }
        .running { color: #28a745; }
        .stopped { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Manager Status</h1>
        <p>Project: <strong>${project.config.name}</strong></p>
    </div>

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
            <div class="summary-number">${managers.length}</div>
            <div>Total Managers</div>
        </div>
    </div>

    ${
        managers.length > 0
            ? `
    <table>
        <thead>
            <tr>
                <th>Index</th>
                <th>Manager Name</th>
                <th>Status</th>
                <th title="Process ID. ⚠️ FATAL = Manager cannot start due to critical errors (check logs)">PID</th>
                <th>Start Mode</th>
                <th>Actions</th>
            </tr>
        </thead>
        <tbody>
            ${managerRows}
        </tbody>
    </table>
    `
            : `
    <div class="no-managers">
        <h3>No manager status available</h3>
        <p>Unable to retrieve manager status for this project.</p>
    </div>
    `
    }

    <script>
        function startManager(index) {
            console.log('Start manager:', index);
            // This would trigger VS Code command
        }

        function stopManager(index) {
            console.log('Stop manager:', index);
            // This would trigger VS Code command
        }

        function killManager(index) {
            console.log('Kill manager:', index);
            // This would trigger VS Code command
        }
    </script>
</body>
</html>`;
}

class ProjectCategory extends vscode.TreeItem {
    public subCategories: ProjectCategory[] = [];

    constructor(
        public readonly label: string,
        public readonly projects: WinCCOAProject[],
        public readonly categoryType: 'current' | 'runnable' | 'system' | 'subprojects' | 'notregistered' | 'version',
        public readonly version?: string,
        public readonly categoryDescription?: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);

        this.tooltip = this.createTooltip();
        this.description = this.createDescription();
        this.contextValue = this.version ? 'projectVersionCategory' : 'projectCategory';
        this.iconPath = this.getCategoryIcon();
    }

    private createTooltip(): string {
        if (this.version) {
            return `WinCC OA ${this.version}: ${this.projects.length} sub-project(s)`;
        }
        if (this.categoryDescription) {
            return `${this.categoryDescription}\n${this.projects.length} project(s)`;
        }
        return `${this.projects.length} project(s)`;
    }

    private createDescription(): string {
        if (this.subCategories.length > 0) {
            const totalProjects = this.subCategories.reduce((sum, cat) => sum + cat.projects.length, 0);
            return `(${this.subCategories.length} versions, ${totalProjects} projects)`;
        }
        return `(${this.projects.length})`;
    }

    private getCategoryIcon(): vscode.ThemeIcon {
        switch (this.categoryType) {
            case 'current':
                return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.red'));
            case 'runnable':
                return new vscode.ThemeIcon('rocket', new vscode.ThemeColor('charts.green'));
            case 'system':
                return new vscode.ThemeIcon('gear', new vscode.ThemeColor('charts.purple'));
            case 'subprojects':
                return new vscode.ThemeIcon('library', new vscode.ThemeColor('charts.blue'));
            case 'version':
                return new vscode.ThemeIcon('tag', new vscode.ThemeColor('charts.orange'));
            case 'notregistered':
                return new vscode.ThemeIcon('warning', new vscode.ThemeColor('charts.yellow'));
            default:
                return new vscode.ThemeIcon('folder');
        }
    }
}

class WinCCOAProject extends vscode.TreeItem {
    private _pmonStatus: PmonProjectRunningStatus = PmonProjectRunningStatus.UNKNOWN;

    constructor(
        public readonly config: ProjectConfig,
        public readonly installationDir: string,
        public readonly isRunnable: boolean = true,
        public readonly isCurrent: boolean = false,
        public readonly version?: string
    ) {
        super(config.name, vscode.TreeItemCollapsibleState.None);

        this.tooltip = this.createTooltip();
        this.description = this.createDescription();
        this.contextValue = this.getContextValue();
        this.iconPath = this.getIcon();
    }

    public get pmonStatus(): PmonProjectRunningStatus {
        return this._pmonStatus;
    }

    public set pmonStatus(status: PmonProjectRunningStatus) {
        this._pmonStatus = status;
        this.contextValue = this.getContextValue();
        this.iconPath = this.getIcon();
    }

    public get isWinCCOASystem(): boolean {
        // Check if this is a WinCC OA system installation (name matches version)
        return this.version !== undefined && this.config.name === this.version;
    }

    private getContextValue(): string {
        // Check if project can be unregistered to determine context value
        const canUnregisterResult = canUnregisterProject(this);

        // Special context for WinCC OA system installations (to show version info)
        if (this.isWinCCOASystem) {
            return 'winccOASystemProject';
        }

        if (!canUnregisterResult.canUnregister) {
            // Protected projects (delivered sub-projects) get a special context
            return 'winccOAProjectProtected';
        }

        // Differentiate between runnable and non-runnable projects with pmon status
        if (this.isRunnable) {
            // Add pmon status to context for runnable projects to enable/disable commands
            switch (this._pmonStatus) {
                case PmonProjectRunningStatus.RUNNING:
                    return 'winccOAProjectRunnableRunning';
                case PmonProjectRunningStatus.STOPPED:
                    return 'winccOAProjectRunnableStopped';
                case PmonProjectRunningStatus.UNKNOWN:
                default:
                    return 'winccOAProjectRunnable';
            }
        }

        // Regular projects that can be unregistered but are not runnable (sub-projects)
        return 'winccOAProject';
    }

    private createTooltip(): string {
        let projectType: string;
        if (this.contextValue === 'winccOAProjectUnregistered') {
            projectType = 'Unregistered WinCC OA Project';
        } else if (this.isWinCCOASystem) {
            projectType = 'WinCC OA System Installation';
        } else if (this.isRunnable) {
            projectType = 'WinCC OA Project';
        } else {
            projectType = 'WinCC OA Extension/Plugin';
        }

        const lines = [
            `Name: ${this.config.name}`,
            `Location: ${this.config.installationDir}`,
            `Created: ${this.config.installationDate}`,
            `Type: ${projectType}`
        ];

        if (this.version) {
            lines.push(`Version: ${this.version}`);
        }

        if (this.config.company) {
            lines.push(`Company: ${this.config.company}`);
        }

        if (this.contextValue === 'winccOAProjectUnregistered') {
            lines.unshift('⚠️ NOT REGISTERED IN PVSS CONFIGURATION');
            lines.push('Right-click to register this project.');
        } else if (this.contextValue === 'winccOAProjectProtected') {
            lines.unshift('🚫 PROTECTED FROM UNREGISTRATION');
            if (this.isWinCCOASystem) {
                lines.push('This is a WinCC OA system installation and cannot be unregistered.');
            } else {
                lines.push('This is a WinCC OA delivered sub-project and cannot be unregistered.');
            }
        } else if (this.isCurrent) {
            lines.unshift('*** CURRENT PROJECT ***');
        }

        return lines.join('\n');
    }

    private createDescription(): string {
        const labels: string[] = [];

        // Add status indicators
        if (this.contextValue === 'winccOAProjectUnregistered') {
            labels.push('❗ Unregistered');
        } else if (this.contextValue === 'winccOAProjectProtected') {
            labels.push('🚫 Protected');
        } else if (this.isCurrent) {
            labels.push('⭐ Current');
        }

        if (this.version) {
            labels.push(`📝 v${this.version}`);
        }

        // Add project type
        if (this.isWinCCOASystem) {
            labels.push('⚙️ System');
        } else if (this.isRunnable) {
            labels.push('🚀 Project');
        } else {
            labels.push('🧩 Extension');
        }

        return labels.join(' • ');
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.contextValue === 'winccOAProjectUnregistered') {
            // Unregistered projects get a warning icon
            return new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
        } else if (this.isCurrent) {
            return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('list.highlightForeground'));
        } else if (this.isWinCCOASystem) {
            // WinCC OA system installations (name equals version)
            return new vscode.ThemeIcon('gear');
        } else if (this.isRunnable) {
            // Runnable projects - use different icons based on pmon status
            switch (this._pmonStatus) {
                case PmonProjectRunningStatus.RUNNING:
                    return new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('testing.iconPassed'));
                case PmonProjectRunningStatus.STOPPED:
                    return new vscode.ThemeIcon('stop-circle', new vscode.ThemeColor('testing.iconFailed'));
                case PmonProjectRunningStatus.UNKNOWN:
                default:
                    return new vscode.ThemeIcon('server-process');
            }
        } else {
            // Non-runnable are extensions/plugins/add-ons
            return new vscode.ThemeIcon('extensions');
        }
    }
}

type TreeItem = ProjectCategory | WinCCOAProject;

class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<
        TreeItem | undefined | void
    >();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private projects: WinCCOAProject[] = [];
    public categories: ProjectCategory[] = [];
    public currentFilter: string = '';
    private filteredCategories: ProjectCategory[] = [];

    refresh(): void {
        this.loadProjects()
            .then(() => {
                this._onDidChangeTreeData.fire();
            })
            .catch(error => {
                console.error('Error refreshing projects:', error);
                this._onDidChangeTreeData.fire();
            });
    }

    /**
     * Updates pmon status for all runnable projects and refreshes the tree view
     */
    async updatePmonStatuses(): Promise<void> {
        const runnableProjects = this.projects.filter(p => p.isRunnable && !p.isWinCCOASystem);

        for (const project of runnableProjects) {
            try {
                const status = await checkProjectRunningStatus(project);
                project.pmonStatus = status;
            } catch (error) {
                // If we can't determine status, set to unknown
                project.pmonStatus = PmonProjectRunningStatus.UNKNOWN;
            }
        }

        // Refresh tree view to show updated icons and context
        this._onDidChangeTreeData.fire();
    }

    /**
     * Updates pmon status for a specific project and refreshes the tree view
     */
    async updateProjectPmonStatus(project: WinCCOAProject): Promise<void> {
        if (!project.isRunnable || project.isWinCCOASystem) {
            return;
        }

        try {
            const status = await checkProjectRunningStatus(project);
            project.pmonStatus = status;
        } catch (error) {
            // If we can't determine status, set to unknown
            project.pmonStatus = PmonProjectRunningStatus.UNKNOWN;
        }

        // Refresh tree view to show updated icons and context
        this._onDidChangeTreeData.fire();
    }

    getProjects(): WinCCOAProject[] {
        return this.projects;
    }

    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TreeItem): Promise<TreeItem[]> {
        if (!element) {
            // Return top-level categories (filtered or all)
            const categoriesToShow = this.currentFilter ? this.filteredCategories : this.categories;
            return Promise.resolve(categoriesToShow);
        } else if (element instanceof ProjectCategory) {
            // If category has sub-categories, return those first, then projects
            if (element.subCategories.length > 0) {
                return Promise.resolve([...element.subCategories, ...element.projects]);
            }
            // Return projects within this category
            return Promise.resolve(element.projects);
        }
        return Promise.resolve([]);
    }

    /**
     * Sets the filter for projects and updates the tree view
     * @param filter The search term to filter by
     */
    setFilter(filter: string): void {
        this.currentFilter = filter;

        if (!filter) {
            // No filter - show all categories
            this.filteredCategories = [];
        } else {
            // Apply filter
            this.filteredCategories = this.createFilteredCategories(filter.toLowerCase());
        }

        // Update tree view
        this._onDidChangeTreeData.fire();

        // Show status message with filter statistics
        if (filter) {
            const totalProjects = this.projects.length;
            const filteredProjects = this.getFilteredProjectsCount();
            vscode.window.showInformationMessage(
                `🔍 Filter: "${filter}" - Showing ${filteredProjects} of ${totalProjects} projects`
            );
        } else {
            vscode.window.showInformationMessage('✨ Filter cleared - Showing all projects');
        }
    }

    /**
     * Creates filtered categories based on search term
     * @param searchTerm The search term in lowercase
     * @returns Array of categories containing matching projects
     */
    private createFilteredCategories(searchTerm: string): ProjectCategory[] {
        const filteredCategories: ProjectCategory[] = [];

        for (const category of this.categories) {
            const filteredCategory = this.filterCategory(category, searchTerm);
            if (
                filteredCategory &&
                (filteredCategory.projects.length > 0 || filteredCategory.subCategories.length > 0)
            ) {
                filteredCategories.push(filteredCategory);
            }
        }

        return filteredCategories;
    }

    /**
     * Filters a category and its projects/sub-categories based on search term
     * @param category The category to filter
     * @param searchTerm The search term in lowercase
     * @returns Filtered category or null if no matches
     */
    private filterCategory(category: ProjectCategory, searchTerm: string): ProjectCategory | null {
        // Filter projects in this category
        const filteredProjects = category.projects.filter(project => this.projectMatchesFilter(project, searchTerm));

        // Filter sub-categories recursively
        const filteredSubCategories: ProjectCategory[] = [];
        for (const subCategory of category.subCategories) {
            const filteredSubCategory = this.filterCategory(subCategory, searchTerm);
            if (
                filteredSubCategory &&
                (filteredSubCategory.projects.length > 0 || filteredSubCategory.subCategories.length > 0)
            ) {
                filteredSubCategories.push(filteredSubCategory);
            }
        }

        // Return filtered category if it has any matching content
        if (filteredProjects.length > 0 || filteredSubCategories.length > 0) {
            const newCategory = new ProjectCategory(
                category.label,
                filteredProjects,
                category.categoryType,
                category.version,
                category.categoryDescription
            );
            newCategory.subCategories = filteredSubCategories;
            return newCategory;
        }

        return null;
    }

    /**
     * Checks if a project matches the search filter
     * @param project The project to check
     * @param searchTerm The search term in lowercase
     * @returns True if project matches the filter
     */
    private projectMatchesFilter(project: WinCCOAProject, searchTerm: string): boolean {
        const projectName = project.config.name.toLowerCase();
        const projectPath = project.config.installationDir.toLowerCase();
        const projectVersion = (project.version || '').toLowerCase();
        const projectCompany = (project.config.company || '').toLowerCase();

        return (
            projectName.includes(searchTerm) ||
            projectPath.includes(searchTerm) ||
            projectVersion.includes(searchTerm) ||
            projectCompany.includes(searchTerm)
        );
    }

    /**
     * Counts the total number of filtered projects
     * @returns Number of projects visible after filtering
     */
    private getFilteredProjectsCount(): number {
        let count = 0;

        const countProjectsInCategories = (categories: ProjectCategory[]): void => {
            for (const category of categories) {
                count += category.projects.length;
                countProjectsInCategories(category.subCategories);
            }
        };

        countProjectsInCategories(this.filteredCategories);
        return count;
    }

    private async loadProjects(): Promise<void> {
        const configPath = getPvssInstConfPath();

        if (!fs.existsSync(configPath)) {
            vscode.window.showWarningMessage(`WinCC OA configuration file not found: ${configPath}`);
            this.projects = [];
            // Still try to find unregistered projects even if config file is missing
            try {
                const unregisteredProjects = await this.findUnregisteredProjects();
                this.projects = unregisteredProjects;
                this.createCategories();
            } catch (error) {
                console.error('Error loading unregistered projects:', error);
                this.categories = [];
            }
            return;
        }

        try {
            const projectConfigs = this.parseConfigFile(configPath);
            const currentProjects = this.parseCurrentProjects(configPath);
            const projects: WinCCOAProject[] = [];

            // Create a map of current project names by version for easy lookup
            const currentProjectMap = new Map<string, string>();
            currentProjects.forEach(cp => {
                currentProjectMap.set(`${cp.projectName}_${cp.version}`, cp.version);
            });

            for (const config of projectConfigs) {
                const isRunnable = !config.notRunnable && this.checkProjectRunnable(config.installationDir);
                const version = isRunnable ? this.getProjectVersion(config.installationDir) : undefined;

                // Check if this project is marked as current for its version
                const projectKey = `${config.name}_${version || 'unknown'}`;
                const isCurrent = config.currentProject || currentProjectMap.has(projectKey);

                projects.push(new WinCCOAProject(config, config.installationDir, isRunnable, isCurrent, version));
            }

            // Add current projects that might not be in the regular project list
            for (const currentProject of currentProjects) {
                // Check if we already have this project
                const existingProject = projects.find(
                    p => p.config.name === currentProject.projectName && p.version === currentProject.version
                );

                if (
                    !existingProject &&
                    currentProject.installationDir &&
                    fs.existsSync(currentProject.installationDir)
                ) {
                    // Create a config for the current project
                    const currentConfig: ProjectConfig = {
                        name: currentProject.projectName,
                        installationDir: currentProject.installationDir,
                        installationDate: 'Unknown',
                        notRunnable: false,
                        currentProject: true
                    };

                    const isRunnable = this.checkProjectRunnable(currentProject.installationDir);
                    const version = isRunnable
                        ? this.getProjectVersion(currentProject.installationDir)
                        : currentProject.version;

                    projects.push(
                        new WinCCOAProject(currentConfig, currentProject.installationDir, isRunnable, true, version)
                    );
                }
            }

            // Add unregistered projects to the list
            const unregisteredProjects = await this.findUnregisteredProjects();
            projects.push(...unregisteredProjects);

            // Sort projects: current first, then runnable projects, then WinCC OA systems, then extensions/plugins
            projects.sort((a, b) => {
                if (a.isCurrent && !b.isCurrent) {
                    return -1;
                }
                if (!a.isCurrent && b.isCurrent) {
                    return 1;
                }
                if (a.isRunnable && !b.isRunnable && !b.isWinCCOASystem) {
                    return -1;
                }
                if (!a.isRunnable && !a.isWinCCOASystem && b.isRunnable) {
                    return 1;
                }
                if (a.isWinCCOASystem && !b.isWinCCOASystem) {
                    return -1;
                }
                if (!a.isWinCCOASystem && b.isWinCCOASystem) {
                    return 1;
                }
                return a.config.name.localeCompare(b.config.name);
            });

            this.projects = projects;
            this.createCategories();
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading WinCC OA projects: ${error}`);
            this.projects = [];
            this.categories = [];
        }
    }

    private createCategories(): void {
        // Filter projects into categories
        const currentProjects = this.projects.filter(p => p.isCurrent && !this.isUnregistered(p));
        const runnableProjects = this.projects.filter(
            p => p.isRunnable && !p.isWinCCOASystem && !p.isCurrent && !this.isUnregistered(p)
        );
        const winccOASystemVersions = this.projects.filter(p => p.isWinCCOASystem && !this.isUnregistered(p));

        // Separate WinCC OA delivered sub-projects from user sub-projects
        const allSubProjects = this.projects.filter(
            p => !p.isRunnable && !p.isWinCCOASystem && !this.isUnregistered(p)
        );
        const winccOADeliveredSubProjects = allSubProjects.filter(p => this.isWinCCOADeliveredSubProject(p));
        const userSubProjects = allSubProjects.filter(p => !this.isWinCCOADeliveredSubProject(p));

        // Get unregistered projects
        const unregisteredProjects = this.projects.filter(p => this.isUnregistered(p));

        // Create categories
        this.categories = [];

        // Add Current Projects category if there are any current projects
        if (currentProjects.length > 0) {
            this.categories.push(new ProjectCategory('Current Project(s)', currentProjects, 'current'));
        }

        // Always create categories, even if empty, to show the structure
        this.categories.push(new ProjectCategory('Runnable Projects', runnableProjects, 'runnable'));

        if (winccOASystemVersions.length > 0) {
            this.categories.push(new ProjectCategory('WinCC OA Versions', winccOASystemVersions, 'system'));
        }

        if (winccOADeliveredSubProjects.length > 0) {
            const winccOASubProjectsCategory = this.createSubProjectsWithVersions(
                winccOADeliveredSubProjects,
                'WinCC OA Version Sub-Projects',
                'Delivered by WinCC OA installation'
            );
            this.categories.push(winccOASubProjectsCategory);
        }

        if (userSubProjects.length > 0) {
            const userSubProjectsCategory = this.createSubProjectsWithVersions(
                userSubProjects,
                'User Sub-Projects',
                'Manually registered sub-projects'
            );
            this.categories.push(userSubProjectsCategory);
        }

        if (unregisteredProjects.length > 0) {
            this.categories.push(
                new ProjectCategory(
                    'Unregistered Projects',
                    unregisteredProjects,
                    'notregistered',
                    undefined,
                    'Found projects that are not registered in pvssInst.conf'
                )
            );
        }

        // Log category summary
        console.log(
            `WinCC OA Projects loaded: ${this.projects.length} total, ${this.categories.length} categories, ${currentProjects.length} current`
        );
    }

    private createSubProjectsWithVersions(
        subProjects: WinCCOAProject[],
        categoryName: string = 'WinCC OA Sub-Projects',
        categoryDescription: string = 'Sub-projects organized by version'
    ): ProjectCategory {
        // Group sub-projects by version
        const versionGroups = new Map<string, WinCCOAProject[]>();

        subProjects.forEach(project => {
            // Try to extract version from project name or use 'Unknown' if not found
            const version = extractVersionFromProject(project) || 'Unknown';

            if (!versionGroups.has(version)) {
                versionGroups.set(version, []);
            }
            versionGroups.get(version)!.push(project);
        });

        // Create the main sub-projects category
        const subProjectsCategory = new ProjectCategory(
            categoryName,
            [],
            'subprojects',
            undefined,
            categoryDescription
        );

        // Create version sub-categories
        const sortedVersions = Array.from(versionGroups.keys()).sort();

        for (const version of sortedVersions) {
            const versionProjects = versionGroups.get(version)!;
            const versionCategory = new ProjectCategory(`Version ${version}`, versionProjects, 'version', version);
            subProjectsCategory.subCategories.push(versionCategory);
        }

        return subProjectsCategory;
    }

    public isUnregistered(project: WinCCOAProject): boolean {
        // Check if the project has the unregistered context value
        return project.contextValue === 'winccOAProjectUnregistered';
    }

    private isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
        // Use the global utility function to check for WinCC OA delivered sub-projects
        return isWinCCOADeliveredSubProject(project);
    }

    private async findUnregisteredProjects(): Promise<WinCCOAProject[]> {
        const unregisteredProjects: WinCCOAProject[] = [];
        const registeredPaths = new Set(this.projects.map(p => path.normalize(p.config.installationDir).toLowerCase()));

        // Get common search locations for WinCC OA projects
        const searchPaths = this.getProjectSearchPaths();

        console.log(`Scanning ${searchPaths.length} locations for unregistered WinCC OA projects...`);

        for (const searchPath of searchPaths) {
            try {
                if (fs.existsSync(searchPath)) {
                    const foundProjects = await this.scanDirectoryForProjects(searchPath, registeredPaths);
                    unregisteredProjects.push(...foundProjects);
                }
            } catch (error) {
                console.error(`Error scanning ${searchPath}:`, error);
            }
        }

        console.log(`Found ${unregisteredProjects.length} unregistered WinCC OA projects`);
        return unregisteredProjects;
    }

    private getProjectSearchPaths(): string[] {
        const searchPaths: string[] = [];

        // Only search in currently opened workspace folders
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders) {
            workspaceFolders.forEach(folder => {
                searchPaths.push(folder.uri.fsPath);
            });
        }

        // If no workspace is open, return empty array
        if (searchPaths.length === 0) {
            console.log('No workspace folders open - cannot scan for unregistered projects');
            return [];
        }

        console.log(`Will scan workspace folders: ${searchPaths.join(', ')}`);
        return searchPaths;
    }

    private async scanDirectoryForProjects(
        searchPath: string,
        registeredPaths: Set<string>,
        depth: number = 0
    ): Promise<WinCCOAProject[]> {
        const maxDepth = 3; // Limit recursion depth to avoid performance issues
        const unregisteredProjects: WinCCOAProject[] = [];

        if (depth > maxDepth) {
            return unregisteredProjects;
        }

        try {
            // Check if current directory is a WinCC OA project
            const isProject = this.isWinCCOAProject(searchPath);
            if (isProject) {
                const normalizedPath = path.normalize(searchPath).toLowerCase();
                if (!registeredPaths.has(normalizedPath)) {
                    // This is an unregistered WinCC OA project
                    const projectConfig = this.createConfigFromDirectory(searchPath);
                    const version = this.getProjectVersion(searchPath);
                    const unregisteredProject = new WinCCOAProject(
                        projectConfig,
                        searchPath,
                        true, // Assume runnable since it has config/config
                        false, // Not current
                        version
                    );

                    // Mark as unregistered with special context
                    unregisteredProject.contextValue = 'winccOAProjectUnregistered';
                    unregisteredProjects.push(unregisteredProject);

                    console.log(`Found unregistered project: ${projectConfig.name} at ${searchPath}`);
                }

                // Don't scan subdirectories of WinCC OA projects
                return unregisteredProjects;
            }

            // Scan subdirectories
            const entries = fs.readdirSync(searchPath, { withFileTypes: true });
            const directories = entries.filter(entry => entry.isDirectory() && !this.shouldSkipDirectory(entry.name));

            for (const dir of directories) {
                const dirPath = path.join(searchPath, dir.name);
                try {
                    const subProjects = await this.scanDirectoryForProjects(dirPath, registeredPaths, depth + 1);
                    unregisteredProjects.push(...subProjects);
                } catch (error) {
                    // Continue scanning other directories even if one fails
                    console.debug(`Skipping directory ${dirPath}: ${error}`);
                }
            }
        } catch (error) {
            console.debug(`Error scanning directory ${searchPath}: ${error}`);
        }

        return unregisteredProjects;
    }

    private isWinCCOAProject(directoryPath: string): boolean {
        // Check if directory contains the essential WinCC OA project structure
        const configPath = path.join(directoryPath, 'config', 'config');
        return fs.existsSync(configPath);
    }

    private shouldSkipDirectory(dirName: string): boolean {
        // Skip common directories that are unlikely to contain WinCC OA projects
        const skipDirs = new Set([
            '.git',
            '.svn',
            '.hg', // Version control
            'node_modules',
            '.npm', // Node.js
            'bin',
            'obj',
            'build',
            'dist',
            'out', // Build outputs
            'temp',
            'tmp',
            '.tmp', // Temporary directories
            'cache',
            '.cache', // Cache directories
            'logs',
            'log', // Log directories
            '__pycache__',
            '.pytest_cache', // Python
            '.vs',
            '.vscode',
            '.idea', // IDE directories
            '$Recycle.Bin',
            'System Volume Information', // Windows system
            '.Trash',
            '.Trashes' // macOS system
        ]);

        return skipDirs.has(dirName) || dirName.startsWith('.');
    }

    private createConfigFromDirectory(directoryPath: string): ProjectConfig {
        const projectName = path.basename(directoryPath);
        let installationDate = 'Unknown';

        try {
            // Try to get creation date from directory stats
            const stats = fs.statSync(directoryPath);
            installationDate = stats.birthtime.toISOString().split('T')[0];
        } catch (error) {
            // Use current date if we can't get directory stats
            installationDate = new Date().toISOString().split('T')[0];
        }

        return {
            name: projectName,
            installationDir: directoryPath,
            installationDate: installationDate,
            notRunnable: false,
            currentProject: false
        };
    }

    public parseConfigFile(configPath: string): ProjectConfig[] {
        const content = fs.readFileSync(configPath, 'utf-8');
        const lines = content.split('\n');
        const projects: ProjectConfig[] = [];

        let currentProject: Partial<ProjectConfig> = {};
        let inProjectSection = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                // Save previous project if complete
                if (inProjectSection && currentProject.installationDir) {
                    projects.push({
                        name: path.basename(currentProject.installationDir!) || 'Unknown',
                        installationDir: currentProject.installationDir!,
                        installationDate: currentProject.installationDate || 'Unknown',
                        notRunnable: currentProject.notRunnable || false,
                        company: currentProject.company,
                        currentProject: currentProject.currentProject || false
                    });
                }

                // Start new project section
                inProjectSection = true;
                currentProject = {};
            } else if (inProjectSection && trimmedLine.includes('=')) {
                const [key, value] = trimmedLine.split('=', 2).map((s: string) => s.trim());

                switch (key.toLowerCase()) {
                    case 'installationdir':
                        currentProject.installationDir = value.replace(/['"]/g, '');
                        break;
                    case 'installationdate':
                        currentProject.installationDate = value.replace(/['"]/g, '');
                        break;
                    case 'notrunnable':
                        currentProject.notRunnable = value.toLowerCase() === 'true' || value === '1';
                        break;
                    case 'company':
                        currentProject.company = value.replace(/['"]/g, '');
                        break;
                    case 'currentproject':
                        currentProject.currentProject = value.toLowerCase() === 'true' || value === '1';
                        break;
                }
            }
        }

        // Don't forget the last project
        if (inProjectSection && currentProject.installationDir) {
            projects.push({
                name: path.basename(currentProject.installationDir!) || 'Unknown',
                installationDir: currentProject.installationDir!,
                installationDate: currentProject.installationDate || 'Unknown',
                notRunnable: currentProject.notRunnable || false,
                company: currentProject.company,
                currentProject: currentProject.currentProject || false
            });
        }

        return projects;
    }

    /**
     * Parses the pvssInst.conf file to extract current projects for each WinCC OA version
     * @param configPath Path to the pvssInst.conf file
     * @returns Array of current project information
     */
    public parseCurrentProjects(configPath: string): CurrentProjectInfo[] {
        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            const sections = this.parseConfigSections(content);
            const currentProjects: CurrentProjectInfo[] = [];

            // Look for WinCC OA version sections (e.g., "Software\ETM\PVSS II\3.21")
            for (const [sectionName, sectionData] of Object.entries(sections)) {
                // Match WinCC OA version sections
                const versionMatch =
                    sectionName.match(/Software\\[^\\]*\\PVSS II\\(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/i) ||
                    sectionName.match(/PVSS[^I]*II[^0-9]*(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/i);

                if (versionMatch && sectionData.currentProject) {
                    const version = versionMatch[1];
                    const currentProject: CurrentProjectInfo = {
                        projectName: sectionData.currentProject,
                        version: version,
                        lastUsedProjectDir: sectionData.LastUsedProjectDir || sectionData.lastUsedProjectDir
                    };

                    // Try to find the installation directory from existing projects
                    if (currentProject.lastUsedProjectDir) {
                        // Look for a project with this name in the last used directory
                        const potentialPath = path.join(currentProject.lastUsedProjectDir, currentProject.projectName);
                        if (fs.existsSync(potentialPath)) {
                            currentProject.installationDir = potentialPath;
                        }
                    }

                    currentProjects.push(currentProject);
                }
            }

            return currentProjects;
        } catch (error) {
            console.error(`Error parsing current projects from ${configPath}:`, error);
            return [];
        }
    }

    /**
     * Parses a configuration file into sections
     * @param content File content to parse
     * @returns Sections with key-value pairs
     */
    public parseConfigSections(content: string): Record<string, Record<string, string>> {
        const lines = content.split('\n');
        const sections: Record<string, Record<string, string>> = Object.create(null);
        let currentSection = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                currentSection = trimmedLine.slice(1, -1);
                sections[currentSection] = Object.create(null);
            } else if (currentSection && trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim().replace(/['"]/g, '');
                sections[currentSection][key.trim()] = value;
            }
        }

        return sections;
    }

    private checkProjectRunnable(installationDir: string): boolean {
        const configPath = path.join(installationDir, 'config', 'config');
        return fs.existsSync(configPath);
    }

    public getProjectVersion(installationDir: string): string | undefined {
        const configPath = path.join(installationDir, 'config', 'config');

        if (!fs.existsSync(configPath)) {
            return undefined;
        }

        try {
            const content = fs.readFileSync(configPath, 'utf-8');
            const lines = content.split('\n');
            let inGeneralSection = false;

            for (const line of lines) {
                const trimmedLine = line.trim();

                if (trimmedLine === '[general]') {
                    inGeneralSection = true;
                } else if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                    inGeneralSection = false;
                } else if (inGeneralSection && trimmedLine.startsWith('proj_version')) {
                    const match = trimmedLine.match(/proj_version\s*=\s*['"](.*?)['"]/);
                    if (match) {
                        return match[1];
                    }
                }
            }
        } catch (error) {
            console.error(`Error reading config file ${configPath}:`, error);
        }

        return undefined;
    }

    private getCurrentProjectPaths(): string[] {
        // This is a placeholder - you might need to implement logic to determine current projects
        // For example, check if VS Code has opened folders that match WinCC OA projects
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return [];
        }

        return workspaceFolders.map((folder: vscode.WorkspaceFolder) => folder.uri.fsPath);
    }
}

class ProjectViewPanel {
    public static currentPanel: ProjectViewPanel | undefined;
    public static readonly viewType = 'winccOAProjectView';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, project: WinCCOAProject) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (ProjectViewPanel.currentPanel) {
            ProjectViewPanel.currentPanel._panel.reveal(column);
            ProjectViewPanel.currentPanel._update(project).catch(console.error);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ProjectViewPanel.viewType,
            `WinCC OA Project: ${project.config.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ProjectViewPanel.currentPanel = new ProjectViewPanel(panel, extensionUri, project);
    }

    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, project: WinCCOAProject) {
        ProjectViewPanel.currentPanel = new ProjectViewPanel(panel, extensionUri, project);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private project: WinCCOAProject
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(project).catch(console.error);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'copyToClipboard':
                        if (message.text) {
                            await vscode.env.clipboard.writeText(message.text);
                            vscode.window.showInformationMessage('Version information copied to clipboard');
                        }
                        break;
                    case 'showInOutput':
                        if (message.versionInfo) {
                            this._showVersionInOutput(message.versionInfo);
                        }
                        break;
                    case 'retryVersionInfo':
                        // Refresh the panel to retry getting version info
                        this._update(this.project).catch(console.error);
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    public dispose() {
        ProjectViewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private async _update(project: WinCCOAProject) {
        this.project = project;
        this._panel.title = `WinCC OA Project: ${project.config.name}`;
        this._panel.webview.html = await this._getHtmlForWebview(project);
    }

    private async _getHtmlForWebview(project: WinCCOAProject): Promise<string> {
        const configDetails = this._getConfigDetails(project);
        const projectDetails = await this._getProjectDetails(project);
        const versionInfoSection = project.isWinCCOASystem ? await this._getVersionInfoSection(project) : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WinCC OA Project: ${project.config.name}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .project-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status {
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .status.runnable {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        .status.not-runnable {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        .status.system {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
        }
        .info-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        .info-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
        }
        .info-value {
            word-break: break-all;
        }
        .config-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        .config-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .comment {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            opacity: 0.8;
        }
        .documentation-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            line-height: 1.6;
            max-height: 400px;
            overflow-y: auto;
        }
        .documentation-section h1, .documentation-section h2, .documentation-section h3 {
            color: var(--vscode-textLink-foreground);
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .documentation-section h1 {
            font-size: 1.8em;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
        }
        .documentation-section h2 {
            font-size: 1.5em;
        }
        .documentation-section h3 {
            font-size: 1.3em;
        }
        .documentation-section code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }
        .documentation-section pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .documentation-section pre code {
            background: none;
            padding: 0;
        }
        .documentation-section a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .documentation-section a:hover {
            text-decoration: underline;
        }
        .documentation-section ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .documentation-section li {
            margin: 5px 0;
        }
        .plain-text-content {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        /* Tab Navigation */
        .tab-container {
            margin-top: 20px;
        }
        .tab-nav {
            display: flex;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 0;
            gap: 2px;
        }
        .tab-button {
            background: transparent;
            border: none;
            color: var(--vscode-foreground);
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 14px;
            transition: all 0.2s ease;
            opacity: 0.7;
            white-space: nowrap;
            border-radius: 4px 4px 0 0;
        }
        .tab-button:hover {
            opacity: 1;
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .tab-button.active {
            opacity: 1;
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-editor-background);
        }
        .tab-content {
            display: none;
            padding: 20px 0;
            animation: fadeIn 0.2s ease-in;
        }
        .tab-content.active {
            display: block;
        }
        .tab-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            margin-left: 6px;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        /* Config-specific styling */
        .config-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .config-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="project-name">${project.config.name}</div>
        <span class="status ${project.isWinCCOASystem ? 'system' : project.isRunnable ? 'runnable' : 'not-runnable'}">
            ${project.isWinCCOASystem ? '⚙️ System Installation' : project.isRunnable ? '✓ Runnable' : '✗ Not Runnable'}
        </span>
        ${project.isCurrent ? '<span class="status runnable">⭐ Current</span>' : ''}
    </div>

    <div class="section">
        <div class="section-title">Project Information</div>
        <div class="info-grid">
            <div class="info-label">Name:</div>
            <div class="info-value">${project.config.name}</div>
            <div class="info-label">Location:</div>
            <div class="info-value">${project.config.installationDir}</div>
            <div class="info-label">Created:</div>
            <div class="info-value">${project.config.installationDate}</div>
            ${
                project.version
                    ? `
            <div class="info-label">WinCC OA Version:</div>
            <div class="info-value">${project.version}</div>
            `
                    : ''
            }
            ${
                project.config.company
                    ? `
            <div class="info-label">Company:</div>
            <div class="info-value">${project.config.company}</div>
            `
                    : ''
            }
        </div>
    </div>

    ${versionInfoSection}
    ${projectDetails}
    ${configDetails}
</body>
</html>`;
    }

    private async _getProjectDetails(project: WinCCOAProject): Promise<string> {
        // Read documentation files if they exist
        const documentationSection = await this._getDocumentationSection(project);

        // Read additional project details from pvssInst.conf
        const configPath = getPvssInstConfPath();
        let projectSection = '';

        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                const lines = content.split('\n');
                let inProjectSection = false;
                let currentProjectLines: string[] = [];

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                        if (inProjectSection) {
                            break; // End of our project section
                        }
                        inProjectSection = false;
                        currentProjectLines = [];
                    }

                    if (inProjectSection) {
                        currentProjectLines.push(trimmedLine);
                    }

                    if (
                        trimmedLine.includes('InstallationDir') &&
                        trimmedLine.includes(project.config.installationDir)
                    ) {
                        inProjectSection = true;
                    }
                }

                if (currentProjectLines.length > 0) {
                    projectSection = `
					<div class="section">
						<div class="section-title">Project Configuration (pvssInst.conf)</div>
						<div class="config-section">
							${currentProjectLines
                                .filter(line => line.includes('='))
                                .map(line => {
                                    const [key, value] = line.split('=', 2).map(s => s.trim());
                                    return `
								<div class="info-grid">
									<div class="info-label">${key}:</div>
									<div class="info-value">${value.replace(/['"]/g, '')}</div>
								</div>`;
                                })
                                .join('')}
						</div>
					</div>`;
                }
            }
        } catch (error) {
            console.error('Error reading project details:', error);
        }

        return documentationSection + projectSection;
    }

    private async _getVersionInfoSection(project: WinCCOAProject): Promise<string> {
        if (!project.isWinCCOASystem) {
            return '';
        }

        try {
            const versionInfo = await getDetailedVersionInfo(project);

            return `
			<div class="section">
				<div class="section-title">🔧 Detailed Version Information</div>
				<div class="config-section">
					<div class="info-grid">
						<div class="info-label">Version:</div>
						<div class="info-value">${versionInfo.version}</div>
						<div class="info-label">Platform:</div>
						<div class="info-value">${versionInfo.platform} ${versionInfo.architecture}</div>
						<div class="info-label">Build Date:</div>
						<div class="info-value">${versionInfo.buildDate}</div>
						<div class="info-label">Commit Hash:</div>
						<div class="info-value"><code>${versionInfo.commitHash}</code></div>
						<div class="info-label">Executable:</div>
						<div class="info-value">${versionInfo.executablePath}</div>
					</div>
					<div style="margin-top: 15px;">
						<div class="config-title">Raw Output</div>
						<pre style="background-color: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; font-size: 0.9em; overflow-x: auto; margin: 5px 0;">${versionInfo.rawOutput.trim()}</pre>
						<div style="margin-top: 10px;">
							<button onclick="copyVersionInfo()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin-right: 8px;">📋 Copy to Clipboard</button>
							<button onclick="showInOutput()" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">📄 Show in Output</button>
						</div>
					</div>
				</div>

				<script>
					const vscodeApi = acquireVsCodeApi();

					function copyVersionInfo() {
						const versionText = \`${versionInfo.rawOutput.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
						vscodeApi.postMessage({
							command: 'copyToClipboard',
							text: versionText
						});
					}

					function showInOutput() {
						vscodeApi.postMessage({
							command: 'showInOutput',
							versionInfo: ${JSON.stringify(versionInfo)}
						});
					}
				</script>
			</div>`;
        } catch (error) {
            return `
			<div class="section">
				<div class="section-title">🔧 Detailed Version Information</div>
				<div class="config-section" style="background-color: var(--vscode-inputValidation-errorBackground); border-left: 3px solid var(--vscode-inputValidation-errorBorder);">
					<div style="color: var(--vscode-inputValidation-errorForeground);">
						<strong>⚠️ Unable to retrieve version information</strong><br>
						Error: ${error}<br><br>
						<em>This feature requires WCCILpmon.exe to be accessible for this WinCC OA installation.</em>
					</div>
					<div style="margin-top: 10px;">
						<button onclick="retryVersionInfo()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">🔄 Retry</button>
					</div>
				</div>

				<script>
					const vscodeApi = acquireVsCodeApi();

					function retryVersionInfo() {
						vscodeApi.postMessage({
							command: 'retryVersionInfo'
						});
					}
				</script>
			</div>`;
        }
    }

    private async _getDocumentationSection(project: WinCCOAProject): Promise<string> {
        const documentationFiles = [
            {
                filenames: ['README.md', 'readme.md', 'Readme.md'],
                title: '📖 Project README',
                icon: '📖',
                mandatory: true,
                tabId: 'readme'
            },
            {
                filenames: ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'],
                title: '📄 License',
                icon: '📄',
                mandatory: true,
                tabId: 'license'
            },
            {
                filenames: ['SECURITY.md', 'security.md', 'Security.md'],
                title: '🔒 Security Policy',
                icon: '🔒',
                mandatory: true,
                tabId: 'security'
            },
            {
                filenames: ['CONTRIBUTING.md', 'contributing.md', 'Contributing.md'],
                title: '🤝 Contributing Guidelines',
                icon: '🤝',
                mandatory: false,
                tabId: 'contributing'
            },
            {
                filenames: ['CHANGELOG.md', 'changelog.md', 'Changelog.md', 'HISTORY.md', 'RELEASES.md'],
                title: '📝 Changelog',
                icon: '📝',
                mandatory: false,
                tabId: 'changelog'
            },
            {
                filenames: [
                    'RELEASENOTES.md',
                    'ReleaseNotes.md',
                    'releasenotes.md',
                    'RELEASE-NOTES.md',
                    'release-notes.md'
                ],
                title: '📋 Release Notes',
                icon: '📋',
                mandatory: false,
                tabId: 'releasenotes'
            }
        ];

        // Build tab navigation and content
        let tabNavigation = '<div class="tab-nav">';
        let tabContent = '';
        let activeTabSet = false;

        for (const docType of documentationFiles) {
            const section = await this._getDocumentFileSection(project, docType);
            const hasContent = section !== '';

            // Show tab even if content is missing for mandatory documents
            if (hasContent || docType.mandatory) {
                const activeClass = !activeTabSet ? ' active' : '';
                const badge = docType.mandatory && !hasContent ? '<span class="tab-badge">Missing</span>' : '';

                tabNavigation += `
					<button class="tab-button${activeClass}" data-tab="${docType.tabId}">
						${docType.icon} ${docType.title.replace(/📖|📄|🔒|🤝|📝|📋/, '').trim()}${badge}
					</button>`;

                const contentActiveClass = !activeTabSet ? ' active' : '';
                const contentHtml = hasContent ? section : this._getMissingDocumentationMessage(docType.title);

                tabContent += `
					<div id="${docType.tabId}" class="tab-content${contentActiveClass}">
						${contentHtml}
					</div>`;

                if (!activeTabSet) {
                    activeTabSet = true;
                }
            }
        }

        tabNavigation += '</div>';

        if (tabNavigation === '<div class="tab-nav"></div>') {
            return ''; // No documentation at all
        }

        return `
		<div class="section">
			<div class="section-title">📚 Project Documentation</div>
			<div class="tab-container">
				${tabNavigation}
				${tabContent}
			</div>
		</div>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				// Add click event listeners to tab buttons
				const buttons = document.querySelectorAll('.tab-button');
				buttons.forEach(button => {
					button.addEventListener('click', function() {
						const tabId = this.getAttribute('data-tab');
						showTab(tabId);
					});
				});
			});

			function showTab(tabId) {
				// Hide all tab contents
				const contents = document.querySelectorAll('.tab-content');
				contents.forEach(content => content.classList.remove('active'));

				// Remove active class from all buttons
				const buttons = document.querySelectorAll('.tab-button');
				buttons.forEach(button => button.classList.remove('active'));

				// Show selected tab content
				const selectedContent = document.getElementById(tabId);
				if (selectedContent) {
					selectedContent.classList.add('active');
				}

				// Activate selected button
				const selectedButton = document.querySelector(\`[data-tab="\${tabId}"]\`);
				if (selectedButton) {
					selectedButton.classList.add('active');
				}
			}
		</script>`;
    }

    private _getMissingDocumentationMessage(title: string): string {
        return `
		<div class="documentation-section">
			<div style="text-align: center; padding: 40px 20px; color: var(--vscode-descriptionForeground);">
				<div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📝</div>
				<h3 style="color: var(--vscode-descriptionForeground); margin-bottom: 10px;">Sorry, the information is missing</h3>
				<p style="margin: 0; opacity: 0.8;">The ${title.replace(/📖|📄|🔒|🤝|📝|📋/, '').trim()} file could not be found in this project.</p>
				<p style="margin: 10px 0 0 0; font-size: 0.9em; opacity: 0.6;">
					This document is required for proper project documentation.
				</p>
			</div>
		</div>`;
    }

    private async _getDocumentFileSection(
        project: WinCCOAProject,
        docType: { filenames: string[]; title: string; icon: string; mandatory?: boolean; tabId?: string }
    ): Promise<string> {
        for (const filename of docType.filenames) {
            const filePath = path.join(project.config.installationDir, filename);

            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const htmlContent = await this._convertDocumentToHtml(content, filename);

                    return `
					<div class="section">
						<div class="section-title">${docType.title}</div>
						<div class="documentation-section">
							${htmlContent}
						</div>
					</div>`;
                } catch (error) {
                    console.error(`Error reading documentation file ${filePath}:`, error);
                }
            }
        }

        return ''; // No file found for this document type
    }

    private async _convertDocumentToHtml(content: string, filename: string): Promise<string> {
        const isMarkdown = filename.toLowerCase().endsWith('.md');

        if (isMarkdown) {
            return await this._convertMarkdownToHtml(content);
        } else {
            // For plain text files (LICENSE, etc.), preserve formatting
            return this._convertPlainTextToHtml(content);
        }
    }

    private async _convertMarkdownToHtml(markdown: string): Promise<string> {
        try {
            // Simple markdown-to-HTML conversion without external dependencies
            let html = markdown;

            // Escape HTML characters first
            html = html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            // Convert markdown syntax to HTML
            // Headers
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

            // Bold and italic
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Code blocks
            html = html.replace(/```[\s\S]*?```/g, match => {
                const code = match.slice(3, -3).trim();
                return `<pre><code>${code}</code></pre>`;
            });

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

            // Line breaks
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');

            // Wrap in paragraphs
            if (!html.startsWith('<')) {
                html = '<p>' + html + '</p>';
            }

            return html;
        } catch (error) {
            console.error('Error converting markdown to HTML:', error);
            // Fall back to simple text conversion
            return this._convertPlainTextToHtml(markdown);
        }
    }

    private _convertPlainTextToHtml(text: string): string {
        // For plain text files like LICENSE, preserve formatting and make it readable
        let html = text;

        // Escape HTML characters
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // Preserve line breaks and spacing
        html = html.replace(/\n/g, '<br>');

        // Handle multiple spaces
        html = html.replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));

        return `<div class="plain-text-content">${html}</div>`;
    }

    private _getConfigDetails(project: WinCCOAProject): string {
        if (!project.isRunnable || project.isWinCCOASystem) {
            return '';
        }

        const configFiles = [
            {
                filename: 'config',
                title: 'Project Config File',
                description: 'The settings for WinCC OA are defined in different sections in the config file.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/project_config_file.html',
                icon: '⚙️',
                tabId: 'config-main'
            },
            {
                filename: 'config.level',
                title: 'config.level File',
                description:
                    'Specifies which CTRL library each manager should load. Contains the default settings for the different WinCC OA managers.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Control_Grundlagen/Control_Grundlagen-17.html',
                icon: '�',
                tabId: 'config-level'
            },
            {
                filename: 'config.http',
                title: 'config.http',
                description: 'Specifies the basic settings for the HTTP Server.',
                officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/HTTP_Server/http1-10.html',
                icon: '🌐',
                tabId: 'config-http'
            },
            {
                filename: 'config.redu',
                title: 'config.redu',
                description: 'Contains the redundancy relevant settings for forward and copy DPs.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Redundancy/Redundancy-11.html',
                icon: '🔄',
                tabId: 'config-redu'
            },
            {
                filename: 'config.webclient',
                title: 'config.webclient',
                description: 'Specifies the web client specific settings.',
                officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/config_webclient.html',
                icon: '�',
                tabId: 'config-webclient'
            }
        ];

        // Build tab navigation and content for config files
        let configTabNavigation = '<div class="tab-nav">';
        let configTabContent = '';
        let configActiveTabSet = false;
        let hasAnyConfigFiles = false;

        for (const configFile of configFiles) {
            const configPath = path.join(project.config.installationDir, 'config', configFile.filename);

            if (fs.existsSync(configPath)) {
                hasAnyConfigFiles = true;
                const activeClass = !configActiveTabSet ? ' active' : '';

                configTabNavigation += `
					<button class="tab-button${activeClass}" data-tab="${configFile.tabId}" title="${configFile.description}">
						${configFile.icon} ${configFile.title}
					</button>`;

                const contentActiveClass = !configActiveTabSet ? ' active' : '';

                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const sections = this._parseProjectConfigFile(content);

                    const configContent =
                        Object.entries(sections).length > 0
                            ? Object.entries(sections)
                                  .map(
                                      ([sectionName, entries]) => `
						<div class="config-section">
							<div class="config-title">[${sectionName}]</div>
							${Object.entries(entries as Record<string, string>)
                                .map(
                                    ([key, value]) => `
							<div class="info-grid">
								<div class="info-label">${key}:</div>
								<div class="info-value">${value}</div>
							</div>
							`
                                )
                                .join('')}
						</div>
						`
                                  )
                                  .join('')
                            : `<div class="config-section">
							<div class="comment" style="text-align: center; padding: 20px; opacity: 0.7;">
								Configuration file exists but contains no readable sections.
							</div>
						</div>`;

                    configTabContent += `
						<div id="${configFile.tabId}" class="tab-content${contentActiveClass}">
							<div class="section-title" style="margin-bottom: 15px;">
								${configFile.icon} ${configFile.title}
								<span class="comment" style="font-size: 0.9em; font-weight: normal; margin-left: 10px;">
									(${configFile.filename})
								</span>
							</div>
							<div class="config-official-info" style="background-color: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); padding: 12px; margin-bottom: 20px; border-radius: 4px;">
								<div style="margin-bottom: 8px; font-weight: bold; color: var(--vscode-textLink-foreground);">
									📖 Official WinCC OA Documentation
								</div>
								<div style="margin-bottom: 10px; line-height: 1.4;">
									${configFile.description}
								</div>
								<div style="font-size: 0.9em;">
									<a href="${configFile.officialLink}" style="color: var(--vscode-textLink-foreground); text-decoration: none;"
									   onmouseover="this.style.textDecoration='underline'"
									   onmouseout="this.style.textDecoration='none'">
										🔗 View Official Documentation →
									</a>
								</div>
							</div>
							<div class="documentation-section">
								${configContent}
							</div>
						</div>`;

                    if (!configActiveTabSet) {
                        configActiveTabSet = true;
                    }
                } catch (error) {
                    console.error(`Error reading config file ${configPath}:`, error);

                    configTabContent += `
						<div id="${configFile.tabId}" class="tab-content${contentActiveClass}">
							<div class="section-title" style="margin-bottom: 15px;">
								${configFile.icon} ${configFile.title}
								<span class="comment" style="font-size: 0.9em; font-weight: normal; margin-left: 10px;">
									(${configFile.filename})
								</span>
							</div>
							<div class="config-official-info" style="background-color: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); padding: 12px; margin-bottom: 20px; border-radius: 4px;">
								<div style="margin-bottom: 8px; font-weight: bold; color: var(--vscode-textLink-foreground);">
									📖 Official WinCC OA Documentation
								</div>
								<div style="margin-bottom: 10px; line-height: 1.4;">
									${configFile.description}
								</div>
								<div style="font-size: 0.9em;">
									<a href="${configFile.officialLink}" style="color: var(--vscode-textLink-foreground); text-decoration: none;"
									   onmouseover="this.style.textDecoration='underline'"
									   onmouseout="this.style.textDecoration='none'">
										🔗 View Official Documentation →
									</a>
								</div>
							</div>
							<div class="documentation-section">
								<div class="config-section">
									<div class="comment" style="text-align: center; padding: 20px; color: var(--vscode-errorForeground);">
										⚠️ Error reading configuration file: ${error}
									</div>
								</div>
							</div>
						</div>`;

                    if (!configActiveTabSet) {
                        configActiveTabSet = true;
                    }
                }
            }
        }

        configTabNavigation += '</div>';

        if (!hasAnyConfigFiles) {
            return ''; // No configuration files found
        }

        return `
		<div class="section">
			<div class="section-title">⚙️ Project Configuration</div>
			<div class="tab-container">
				${configTabNavigation}
				${configTabContent}
			</div>
		</div>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				// Add click event listeners to config tab buttons
				const configButtons = document.querySelectorAll('[data-tab^="config-"]');
				configButtons.forEach(button => {
					button.addEventListener('click', function() {
						const tabId = this.getAttribute('data-tab');
						showConfigTab(tabId);
					});
				});
			});

			function showConfigTab(tabId) {
				// Hide all config tab contents
				const configContents = document.querySelectorAll('[id^="config-"]');
				configContents.forEach(content => content.classList.remove('active'));

				// Remove active class from all config buttons
				const configButtons = document.querySelectorAll('[data-tab^="config-"]');
				configButtons.forEach(button => button.classList.remove('active'));

				// Show selected config tab content
				const selectedContent = document.getElementById(tabId);
				if (selectedContent) {
					selectedContent.classList.add('active');
				}

				// Activate selected config button
				const selectedButton = document.querySelector(\`[data-tab="\${tabId}"]\`);
				if (selectedButton) {
					selectedButton.classList.add('active');
				}
			}
		</script>`;
    }

    private _parseConfigFile(content: string): Record<string, Record<string, string>> {
        const lines = content.split('\n');
        const sections: Record<string, Record<string, string>> = {};
        let currentSection = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                currentSection = trimmedLine.slice(1, -1);
                sections[currentSection] = {};
            } else if (currentSection && trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim().replace(/['"]/g, '');
                sections[currentSection][key.trim()] = value;
            }
        }

        return sections;
    }

    private _parseProjectConfigFile(content: string): Record<string, Record<string, string>> {
        const lines = content.split('\n');
        const sections: Record<string, Record<string, string>> = {};
        let currentSection = '';
        let pendingComment = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('#')) {
                // Store comment for next configuration entry
                pendingComment = trimmedLine.substring(1).trim();
            } else if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                currentSection = trimmedLine.slice(1, -1);
                sections[currentSection] = {};
                pendingComment = ''; // Reset comment for new section
            } else if (currentSection && trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim().replace(/['"]/g, '');
                const keyName = key.trim();

                // If we have a pending comment, add it with a special prefix
                if (pendingComment) {
                    sections[currentSection][`🗒️ ${keyName}`] =
                        `${value} <span class="comment">// ${pendingComment}</span>`;
                    pendingComment = ''; // Reset after use
                } else {
                    sections[currentSection][keyName] = value;
                }
            } else if (trimmedLine === '') {
                // Reset comment on empty lines
                pendingComment = '';
            }
        }

        return sections;
    }

    private _showVersionInOutput(versionInfo: DetailedVersionInfo): void {
        outputChannel.clear();
        outputChannel.appendLine('WinCC OA Detailed Version Information');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Version: ${versionInfo.version}`);
        outputChannel.appendLine(`Platform: ${versionInfo.platform} ${versionInfo.architecture}`);
        outputChannel.appendLine(`Build Date: ${versionInfo.buildDate}`);
        outputChannel.appendLine(`Commit Hash: ${versionInfo.commitHash}`);
        outputChannel.appendLine(`Executable: ${versionInfo.executablePath}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('Raw Output:');
        outputChannel.appendLine(versionInfo.rawOutput);
        outputChannel.show(true);
    }
}

/**
 * Registers an unregistered WinCC OA project using WCCILpmon executable
 * @param project The unregistered project to register
 */
async function registerProject(project: WinCCOAProject): Promise<void> {
    try {
        if (project.isRunnable) {
            // Register runnable project
            await registerRunnableProject(project);
        } else {
            // Register sub-project
            await registerSubProject(project);
        }

        console.log(`Successfully registered project: ${project.config.name}`);
    } catch (error) {
        throw new Error(`Failed to register project: ${error}`);
    }
}

/**
 * Registers a runnable WinCC OA project using WCCILpmon
 * @param project The runnable project to register
 */
async function registerRunnableProject(project: WinCCOAProject): Promise<void> {
    const projectVersion = project.version;
    if (!projectVersion) {
        throw new Error('Cannot determine WinCC OA version for runnable project');
    }

    const pmonPath = getWCCILpmonPath(projectVersion);
    if (!pmonPath) {
        throw new Error(`WCCILpmon not found for version ${projectVersion}`);
    }

    const configFilePath = path.join(project.config.installationDir, 'config', 'config');
    if (!fs.existsSync(configFilePath)) {
        throw new Error('Project config file not found');
    }

    return new Promise<void>((resolve, reject) => {
        const args = ['-config', configFilePath, '-status', '-log', '+stderr', '-autofreg'];

        outputChannel.appendLine(`[Runnable Project Registration] Executing: ${pmonPath} ${args.join(' ')}`);
        outputChannel.show(true); // Show the output channel

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            outputChannel.append(text);
        });

        child.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            outputChannel.append(text);
        });

        child.on('close', (code: number) => {
            outputChannel.appendLine(`[Runnable Project Registration] WCCILpmon exited with code: ${code}`);
            if (stdout.trim()) {
                outputChannel.appendLine(`[Runnable Project Registration] stdout: ${stdout.trim()}`);
            }
            if (stderr.trim()) {
                outputChannel.appendLine(`[Runnable Project Registration] stderr: ${stderr.trim()}`);
            }

            if (code === 3) {
                // Success case for runnable project registration
                outputChannel.appendLine(
                    `[Runnable Project Registration] ✅ Successfully registered runnable project: ${project.config.name}`
                );
                resolve();
            } else {
                outputChannel.appendLine(
                    `[Runnable Project Registration] ❌ Registration failed with exit code ${code}`
                );
                reject(new Error(`Registration failed with exit code ${code}. Error: ${stderr}`));
            }
        });

        child.on('error', (error: Error) => {
            outputChannel.appendLine(
                `[Runnable Project Registration] ❌ Failed to execute WCCILpmon: ${error.message}`
            );
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Registers a sub-project using WCCILpmon
 * @param project The sub-project to register
 */
async function registerSubProject(project: WinCCOAProject): Promise<void> {
    const pmonPath = getWCCILpmonPath(); // Use highest available version for sub-projects
    if (!pmonPath) {
        throw new Error('WCCILpmon not found for sub-project registration');
    }

    return new Promise<void>((resolve, reject) => {
        const args = ['-regsubf', '-proj', project.config.installationDir, '-log', '+stderr'];

        outputChannel.appendLine(`[Sub-Project Registration] Executing: ${pmonPath} ${args.join(' ')}`);
        outputChannel.show(true); // Show the output channel

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir // Execute in project directory
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            outputChannel.append(text);
        });

        child.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            outputChannel.append(text);
        });

        child.on('close', (code: number) => {
            outputChannel.appendLine(`[Sub-Project Registration] WCCILpmon exited with code: ${code}`);
            if (stdout.trim()) {
                outputChannel.appendLine(`[Sub-Project Registration] stdout: ${stdout.trim()}`);
            }
            if (stderr.trim()) {
                outputChannel.appendLine(`[Sub-Project Registration] stderr: ${stderr.trim()}`);
            }

            if (code === 0) {
                // Success case for sub-project registration
                outputChannel.appendLine(
                    `[Sub-Project Registration] ✅ Successfully registered sub-project: ${project.config.name}`
                );
                resolve();
            } else {
                outputChannel.appendLine(`[Sub-Project Registration] ❌ Registration failed with exit code ${code}`);
                reject(new Error(`Sub-project registration failed with exit code ${code}. Error: ${stderr}`));
            }
        });

        child.on('error', (error: Error) => {
            outputChannel.appendLine(`[Sub-Project Registration] ❌ Failed to execute WCCILpmon: ${error.message}`);
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets the path to WCCILpmon executable for a specific version or the highest available version
 * @param version Optional specific version to find. If not provided, returns highest available version
 * @returns Path to WCCILpmon executable or null if not found
 */
function getWCCILpmonPath(version?: string): string | null {
    // Get all WinCC OA system installations from registered projects
    const systemProjects = projectProvider?.getProjects().filter(p => p.isWinCCOASystem) || [];

    if (version) {
        // Look for specific version
        const systemProject = systemProjects.find(p => p.version === version);
        if (systemProject) {
            const pmonPath = buildWCCILpmonPathFromInstallation(systemProject.config.installationDir);
            return fs.existsSync(pmonPath) ? pmonPath : null;
        }
    } else {
        // Find highest available version by sorting system projects by version
        const sortedSystems = systemProjects
            .filter(p => p.version) // Only systems with valid version
            .sort((a, b) => {
                // Sort by version number (descending - highest first)
                const versionA = parseVersionString(a.version!);
                const versionB = parseVersionString(b.version!);
                return versionB - versionA;
            });

        // Try each system installation from highest to lowest version
        for (const systemProject of sortedSystems) {
            const pmonPath = buildWCCILpmonPathFromInstallation(systemProject.config.installationDir);
            if (fs.existsSync(pmonPath)) {
                console.log(`Using WCCILpmon from version ${systemProject.version}: ${pmonPath}`);
                return pmonPath;
            }
        }
    }

    return null;
}

/**
 * Builds the path to WCCILpmon executable from a WinCC OA installation directory
 * @param installationDir The WinCC OA installation directory from pvssInst.conf
 * @returns Full path to WCCILpmon executable
 */
function buildWCCILpmonPathFromInstallation(installationDir: string): string {
    if (os.platform() === 'win32') {
        // Windows: InstallationDir + bin\WCCILpmon.exe
        return path.join(installationDir, 'bin', 'WCCILpmon.exe');
    } else {
        // Linux/Unix: InstallationDir + bin/WCCILpmon
        return path.join(installationDir, 'bin', 'WCCILpmon');
    }
}

/**
 * Parses a version string into a numeric value for comparison
 * @param version Version string like "3.20", "3.19.1", etc.
 * @returns Numeric representation for comparison
 */
function parseVersionString(version: string): number {
    const parts = version.split('.').map(part => parseInt(part, 10));
    // Convert to format: major * 10000 + minor * 100 + patch
    return (parts[0] || 0) * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

/**
 * Gets all available WinCC OA versions installed on the system
 * @returns Array of version strings
 */
function getAvailableWinCCOAVersions(): string[] {
    // Get all WinCC OA system installations from registered projects
    const systemProjects = projectProvider?.getProjects().filter(p => p.isWinCCOASystem) || [];
    const availableVersions: string[] = [];

    for (const systemProject of systemProjects) {
        if (systemProject.version) {
            const pmonPath = buildWCCILpmonPathFromInstallation(systemProject.config.installationDir);
            if (fs.existsSync(pmonPath)) {
                availableVersions.push(systemProject.version);
            }
        }
    }

    // Sort versions in descending order (highest first)
    return availableVersions.sort((a, b) => {
        const versionA = parseVersionString(a);
        const versionB = parseVersionString(b);
        return versionB - versionA;
    });
}

/**
 * Pmon project running status enum based on WCCILpmon exit codes
 */
export enum PmonProjectRunningStatus {
    RUNNING = 'running', // Exit code 0: pmon is running
    STOPPED = 'stopped', // Exit code 3: pmon is stopped
    UNKNOWN = 'unknown' // Exit code 4: unknown status
}

/**
 * Checks if a WinCC OA project is currently running using WCCILpmon status command
 * @param project The WinCC OA project to check
 * @returns Promise that resolves to the project running status
 */
export async function checkProjectRunningStatus(project: WinCCOAProject): Promise<PmonProjectRunningStatus> {
    // Only check status for runnable projects
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot check status for non-runnable project: ${project.config.name}`);
    }

    // Get the appropriate WCCILpmon path for this project's version
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    // Build command arguments: -proj <project_name> -status
    const args = ['-proj', project.config.name, '-status'];

    outputChannel.appendLine(`[Project Status Check] Checking status for project: ${project.config.name}`);
    outputChannel.appendLine(`[Project Status Check] Executing: ${pmonPath} ${args.join(' ')}`);

    return new Promise<PmonProjectRunningStatus>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', data => {
            stdout += data.toString();
        });

        child.stderr?.on('data', data => {
            stderr += data.toString();
        });

        child.on('error', error => {
            outputChannel.appendLine(`[Project Status Check] ❌ Failed to execute WCCILpmon: ${error.message}`);
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });

        child.on('close', code => {
            outputChannel.appendLine(`[Project Status Check] WCCILpmon exited with code: ${code}`);

            if (stdout.trim()) {
                outputChannel.appendLine(`[Project Status Check] stdout: ${stdout.trim()}`);
            }
            if (stderr.trim()) {
                outputChannel.appendLine(`[Project Status Check] stderr: ${stderr.trim()}`);
            }

            // Interpret exit codes according to WCCILpmon specification
            let status: PmonProjectRunningStatus;
            switch (code) {
                case 0:
                    status = PmonProjectRunningStatus.RUNNING;
                    outputChannel.appendLine(`[Project Status Check] ✅ Project '${project.config.name}' is RUNNING`);
                    break;
                case 3:
                    status = PmonProjectRunningStatus.STOPPED;
                    outputChannel.appendLine(`[Project Status Check] ⏹️ Project '${project.config.name}' is STOPPED`);
                    break;
                case 4:
                    status = PmonProjectRunningStatus.UNKNOWN;
                    outputChannel.appendLine(
                        `[Project Status Check] ❓ Project '${project.config.name}' status is UNKNOWN`
                    );
                    break;
                default:
                    // Any other exit code is treated as an error
                    const errorMsg = `Unexpected exit code ${code} when checking project status`;
                    outputChannel.appendLine(`[Project Status Check] ❌ ${errorMsg}`);
                    reject(new Error(errorMsg));
                    return;
            }

            resolve(status);
        });
    });
}

/**
 * Checks if a WinCC OA project is currently running (convenience function)
 * @param project The WinCC OA project to check
 * @returns Promise that resolves to true if running, false if stopped, throws error if unknown or failed
 */
export async function isProjectRunning(project: WinCCOAProject): Promise<boolean> {
    const status = await checkProjectRunningStatus(project);

    switch (status) {
        case PmonProjectRunningStatus.RUNNING:
            return true;
        case PmonProjectRunningStatus.STOPPED:
            return false;
        case PmonProjectRunningStatus.UNKNOWN:
            throw new Error(`Project '${project.config.name}' status is unknown`);
        default:
            throw new Error(`Unexpected project status: ${status}`);
    }
}

/**
 * Interface for manager information
 */
export interface WinCCOAManager {
    index: number;
    name: string;
    status: string;
    pid?: number;
    startMode?: 'manual' | 'once' | 'always';
    secKill?: number;
    restartCount?: number;
    resetMin?: number;
    args?: string;
    // Additional fields from MGRLIST:STATI
    runningState?: 'stopped' | 'init' | 'running' | 'blocked';
    managerNumber?: number;
    startTimeStamp?: Date;
}

/**
 * Interface for detailed project state from MGRLIST:STATI
 */
export interface WinCCOAProjectState {
    status: 'Unknown' | 'Down' | 'Starting' | 'Monitoring' | 'Stopping' | 'Restarting';
    statusCode: number;
    text: string;
    emergency: boolean;
    demo: boolean;
}

/**
 * Interface for project status with managers
 */
export interface WinCCOAProjectStatus {
    projectName: string;
    isRunning: boolean;
    managers: WinCCOAManager[];
    pmonStatus: PmonProjectRunningStatus;
    lastUpdate: Date;
    projectState?: WinCCOAProjectState;
}

/**
 * Interface for project health assessment
 */
export interface WinCCOAProjectHealth {
    overallScore: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    status: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
    issues: string[];
    recommendations: string[];
    details: {
        managerHealth: number;
        projectStateHealth: number;
        performanceHealth: number;
        reliabilityHealth: number;
    };
}

/**
 * Calculates comprehensive health score for a WinCC OA project
 * @param managers List of managers with their status
 * @param projectState Current project state
 * @returns Health assessment with score, grade, and recommendations
 */
export function calculateProjectHealth(
    managers: WinCCOAManager[],
    projectState?: WinCCOAProjectState
): WinCCOAProjectHealth {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. Manager Health Score (40% weight)
    const managerHealth = calculateManagerHealth(managers, issues, recommendations);

    // 2. Project State Health Score (30% weight)
    const projectStateHealth = calculateProjectStateHealth(projectState, issues, recommendations);

    // 3. Performance Health Score (20% weight)
    const performanceHealth = calculatePerformanceHealth(managers, issues, recommendations);

    // 4. Reliability Health Score (10% weight)
    const reliabilityHealth = calculateReliabilityHealth(managers, projectState, issues, recommendations);

    // Calculate weighted overall score
    const overallScore = Math.round(
        managerHealth * 0.4 + projectStateHealth * 0.3 + performanceHealth * 0.2 + reliabilityHealth * 0.1
    );

    // Determine grade and status
    let grade: WinCCOAProjectHealth['grade'];
    let status: WinCCOAProjectHealth['status'];

    if (overallScore >= 90) {
        grade = 'A';
        status = 'Excellent';
    } else if (overallScore >= 80) {
        grade = 'B';
        status = 'Good';
    } else if (overallScore >= 70) {
        grade = 'C';
        status = 'Fair';
    } else if (overallScore >= 60) {
        grade = 'D';
        status = 'Poor';
    } else {
        grade = 'F';
        status = 'Critical';
    }

    return {
        overallScore,
        grade,
        status,
        issues,
        recommendations,
        details: {
            managerHealth,
            projectStateHealth,
            performanceHealth,
            reliabilityHealth
        }
    };
}

/**
 * Calculate manager health score based on running states and error conditions
 */
function calculateManagerHealth(managers: WinCCOAManager[], issues: string[], recommendations: string[]): number {
    if (managers.length === 0) {
        issues.push('No managers configured');
        recommendations.push('Configure project managers to enable functionality');
        return 0;
    }

    const runningCount = managers.filter(m => m.runningState === 'running').length;
    const stoppedCount = managers.filter(m => m.runningState === 'stopped').length;
    const blockedCount = managers.filter(m => m.runningState === 'blocked').length;
    const fatalCount = managers.filter(m => m.pid === -2).length;
    const initCount = managers.filter(m => m.runningState === 'init').length;

    let score = 100;

    // Deduct points for non-running managers
    const nonRunningPercentage = (stoppedCount + blockedCount + fatalCount) / managers.length;
    score -= nonRunningPercentage * 50; // Up to 50 points deduction

    // Heavy penalty for fatal errors (managers that can't start)
    if (fatalCount > 0) {
        score -= fatalCount * 15; // 15 points per fatal error
        issues.push(`${fatalCount} manager(s) have fatal startup errors`);
        recommendations.push('Check WinCC OA logs for database connections and configuration errors');
    }

    // Penalty for blocked managers
    if (blockedCount > 0) {
        score -= blockedCount * 10; // 10 points per blocked manager
        issues.push(`${blockedCount} manager(s) are blocked`);
        recommendations.push('Investigate blocked managers - check for resource conflicts or deadlocks');
    }

    // Minor penalty for initializing managers (if too many)
    if (initCount > managers.length * 0.3) {
        score -= 5;
        issues.push('Many managers are still initializing');
        recommendations.push('Allow more time for startup or check initialization dependencies');
    }

    // Bonus for high availability
    if (runningCount === managers.length && managers.length > 0) {
        score += 5; // Bonus for 100% availability
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate project state health score
 */
function calculateProjectStateHealth(
    projectState: WinCCOAProjectState | undefined,
    issues: string[],
    recommendations: string[]
): number {
    if (!projectState) {
        issues.push('Project state information unavailable');
        recommendations.push('Ensure pmon is running to get project state information');
        return 50; // Neutral score when unknown
    }

    let score = 100;

    switch (projectState.status) {
        case 'Monitoring':
            score = 100; // Perfect state
            break;
        case 'Starting':
            score = 80;
            issues.push('Project is still starting up');
            recommendations.push('Allow time for complete startup');
            break;
        case 'Down':
            score = 30;
            issues.push('Project is down');
            recommendations.push('Start the project to enable full functionality');
            break;
        case 'Stopping':
            score = 40;
            issues.push('Project is shutting down');
            break;
        case 'Restarting':
            score = 70;
            issues.push('Project is restarting');
            recommendations.push('Monitor restart progress');
            break;
        case 'Unknown':
        default:
            score = 20;
            issues.push('Project state is unknown');
            recommendations.push('Check pmon status and project configuration');
            break;
    }

    // Emergency mode penalty
    if (projectState.emergency) {
        score -= 30;
        issues.push('🚨 Project is running in EMERGENCY mode');
        recommendations.push('Investigate emergency condition and resolve underlying issues');
    }

    // Demo mode penalty (indicates licensing issues)
    if (projectState.demo) {
        score -= 10;
        issues.push('Project is running with demo license');
        recommendations.push('Install proper WinCC OA license for production use');
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate performance health score based on manager configuration and runtime behavior
 */
function calculatePerformanceHealth(managers: WinCCOAManager[], issues: string[], recommendations: string[]): number {
    if (managers.length === 0) {
        return 50; // Neutral when no managers
    }

    let score = 100;

    // Check for managers with negative secKill (won't be stopped on restart)
    const noStopCount = managers.filter(m => m.secKill && m.secKill < 0).length;
    const noStopPercentage = noStopCount / managers.length;

    if (noStopPercentage > 0.5) {
        score -= 10;
        issues.push('Many managers configured to persist through restarts');
        recommendations.push('Review manager restart policies - too many persistent managers may cause issues');
    }

    // Check for managers with high restart counts (indicating instability)
    const highRestartCount = managers.filter(m => m.restartCount && m.restartCount > 5).length;
    if (highRestartCount > 0) {
        score -= highRestartCount * 5;
        issues.push(`${highRestartCount} manager(s) configured with high restart counts`);
        recommendations.push('High restart counts may indicate stability issues - investigate manager reliability');
    }

    // Check start mode distribution
    const alwaysStartCount = managers.filter(m => m.startMode === 'always').length;
    const manualStartCount = managers.filter(m => m.startMode === 'manual').length;

    if (manualStartCount > alwaysStartCount) {
        score -= 5;
        recommendations.push("Consider setting critical managers to 'always' start mode for better availability");
    }

    // Check for very recent starts (may indicate recent crashes/restarts)
    const now = new Date();
    const recentStartsCount = managers.filter(m => {
        if (!m.startTimeStamp) {
            return false;
        }
        const timeDiff = now.getTime() - m.startTimeStamp.getTime();
        return timeDiff < 5 * 60 * 1000; // Started within last 5 minutes
    }).length;

    if (recentStartsCount > managers.length * 0.5 && managers.length > 2) {
        score -= 10;
        issues.push('Many managers started recently');
        recommendations.push('Recent mass restart detected - investigate potential system instability');
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate reliability health score based on system stability indicators
 */
function calculateReliabilityHealth(
    managers: WinCCOAManager[],
    projectState: WinCCOAProjectState | undefined,
    issues: string[],
    recommendations: string[]
): number {
    let score = 100;

    // Check for critical system managers
    const criticalManagers = ['WCCILpmon', 'WCCILdata', 'WCCILevent'];
    const runningCriticalCount = managers.filter(
        m => criticalManagers.includes(m.name) && m.runningState === 'running'
    ).length;
    const totalCriticalCount = managers.filter(m => criticalManagers.includes(m.name)).length;

    if (totalCriticalCount > 0) {
        const criticalHealthPercentage = runningCriticalCount / totalCriticalCount;
        if (criticalHealthPercentage < 1.0) {
            score -= (1.0 - criticalHealthPercentage) * 40; // Heavy penalty for non-running critical managers
            issues.push('Critical system managers are not running');
            recommendations.push('Ensure WCCILpmon, WCCILdata, and WCCILevent managers are running');
        }
    }

    // Check for UI managers (important for operator access)
    const uiManagers = managers.filter(m => m.name.includes('WCCOAui'));
    const runningUiCount = uiManagers.filter(m => m.runningState === 'running').length;

    if (uiManagers.length > 0 && runningUiCount === 0) {
        score -= 15;
        issues.push('No UI managers are running');
        recommendations.push('Start WCCOAui managers to enable operator interfaces');
    }

    // Stability bonus for long-running project
    if (projectState?.status === 'Monitoring') {
        const longRunningManagers = managers.filter(m => {
            if (!m.startTimeStamp) {
                return false;
            }
            const now = new Date();
            const uptime = now.getTime() - m.startTimeStamp.getTime();
            return uptime > 24 * 60 * 60 * 1000; // Running for more than 24 hours
        });

        if (longRunningManagers.length === managers.length && managers.length > 0) {
            score += 5; // Bonus for system stability
        }
    }

    return Math.max(0, Math.min(100, score));
}

/**
 * Get health score color for UI display
 */
export function getHealthScoreColor(score: number): string {
    if (score >= 90) {
        return '#28a745';
    } // Green - Excellent
    if (score >= 80) {
        return '#20c997';
    } // Teal - Good
    if (score >= 70) {
        return '#ffc107';
    } // Yellow - Fair
    if (score >= 60) {
        return '#fd7e14';
    } // Orange - Poor
    return '#dc3545'; // Red - Critical
}

/**
 * Get health grade icon
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

/**
 * Starts WinCC OA pmon manager only (no auto start)
 * @param project The WinCC OA project
 */
export async function startPmonOnly(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start pmon for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-log', '+stderr', '-noAutoStart'];
    const command = `${pmonPath} ${args.join(' ')}`;

    outputChannel.appendLine(`[Pmon Start] Starting pmon for project: ${project.config.name}`);
    outputChannel.appendLine(`[Pmon Start] Executing: ${command}`);
    outputChannel.show(true);

    return new Promise<void>((resolve, reject) => {
        let response = '';

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir,
            detached: true
        });

        child.stdout?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            outputChannel.appendLine(`[Pmon Start] ${output}`);
        });

        child.stderr?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            outputChannel.appendLine(`[Pmon Start] Error: ${output}`);
        });

        child.on('spawn', () => {
            outputChannel.appendLine(`✅ Pmon started for project '${project.config.name}' (PID: ${child.pid})`);
            vscode.window.showInformationMessage(`✅ Pmon started for project '${project.config.name}'`);

            // Add to history - for detached process, we consider spawn success as OK
            addToCommandHistory(project.config.name, command, response || 'OK');

            child.unref(); // Allow process to continue independently
            resolve();
        });

        child.on('error', error => {
            const errorMsg = `Failed to start pmon: ${error.message}`;
            outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);

            // Add error to history
            addToCommandHistory(project.config.name, command, `ERROR ${errorMsg}`);

            reject(error);
        });
    });
}

/**
 * Starts WinCC OA project
 * @param project The WinCC OA project
 */
export async function startProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    // Check if pmon is already running
    let args: string[];
    try {
        const status = await checkProjectRunningStatus(project);
        if (status === PmonProjectRunningStatus.RUNNING) {
            // Pmon is running, use START_ALL command
            args = ['-proj', project.config.name, '-command', 'START_ALL:'];
            outputChannel.appendLine(`[Project Start] Pmon is running, sending START_ALL command`);
        } else {
            // Pmon not running, start normally
            args = ['-proj', project.config.name];
            outputChannel.appendLine(`[Project Start] Pmon not running, starting project normally`);
        }
    } catch (error) {
        // If we can't determine status, try normal start
        args = ['-proj', project.config.name];
        outputChannel.appendLine(`[Project Start] Could not determine pmon status, trying normal start`);
    }

    outputChannel.appendLine(`[Project Start] Starting project: ${project.config.name}`);
    outputChannel.appendLine(`[Project Start] Executing: ${pmonPath} ${args.join(' ')}`);
    outputChannel.show(true);

    return executeWCCILpmonCommand(pmonPath, args, project, 'start project');
}

/**
 * Stops WinCC OA project
 * @param project The WinCC OA project
 */
export async function stopProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'STOP_ALL:'];

    outputChannel.appendLine(`[Project Stop] Stopping project: ${project.config.name}`);
    outputChannel.show(true);

    return executeWCCILpmonCommand(pmonPath, args, project, 'stop project');
}

/**
 * Stops WinCC OA project and pmon
 * @param project The WinCC OA project
 */
export async function stopProjectAndPmon(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-stopWait'];

    outputChannel.appendLine(`[Project Stop] Stopping project and pmon: ${project.config.name}`);
    outputChannel.show(true);

    return executeWCCILpmonCommand(pmonPath, args, project, 'stop project and pmon');
}

/**
 * Restarts WinCC OA project
 * @param project The WinCC OA project
 */
export async function restartProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot restart non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'RESTART_ALL:'];

    outputChannel.appendLine(`[Project Restart] Restarting project: ${project.config.name}`);
    outputChannel.show(true);

    return executeWCCILpmonCommand(pmonPath, args, project, 'restart project');
}

/**
 * Sets pmon to wait mode
 * @param project The WinCC OA project
 */
export async function setPmonWaitMode(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot set wait mode for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'WAIT_MODE:'];

    outputChannel.appendLine(`[Pmon Wait] Setting pmon to wait mode: ${project.config.name}`);
    outputChannel.show(true);

    return executeWCCILpmonCommand(pmonPath, args, project, 'set pmon wait mode');
}

/**
 * Gets list of managers for a project
 * @param project The WinCC OA project
 */
export async function getManagerList(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get managers for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'MGRLIST:LIST', '-log', '+stdout'];

    return new Promise<WinCCOAManager[]>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir
        });

        let output = '';
        child.stdout?.on('data', data => {
            output += data.toString();
        });

        child.stderr?.on('data', data => {
            outputChannel.appendLine(`Error: ${data.toString()}`);
        });

        child.on('close', code => {
            if (code === 0) {
                const managers = parseManagerList(output);
                resolve(managers);
            } else {
                reject(new Error(`Failed to get manager list. Exit code: ${code}`));
            }
        });

        child.on('error', error => {
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets detailed status of all managers and project state
 * @param project The WinCC OA project
 */
export async function getDetailedManagerStatus(
    project: WinCCOAProject
): Promise<{ managers: WinCCOAManager[]; projectState?: WinCCOAProjectState }> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get manager status for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'MGRLIST:STATI', '-log', '+stdout'];

    return new Promise<{ managers: WinCCOAManager[]; projectState?: WinCCOAProjectState }>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir
        });

        let output = '';
        child.stdout?.on('data', data => {
            output += data.toString();
        });

        child.stderr?.on('data', data => {
            outputChannel.appendLine(`Error: ${data.toString()}`);
        });

        child.on('close', code => {
            if (code === 0) {
                const result = parseManagerStatus(output);
                resolve(result);
            } else {
                reject(new Error(`Failed to get manager status. Exit code: ${code}`));
            }
        });

        child.on('error', error => {
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets status of all managers for a project
 * @param project The WinCC OA project
 */
export async function getManagerStatus(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get manager status for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'MGRLIST:STATI', '-log', '+stdout'];

    return new Promise<WinCCOAManager[]>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir
        });

        let output = '';
        child.stdout?.on('data', data => {
            output += data.toString();
        });

        child.stderr?.on('data', data => {
            outputChannel.appendLine(`Error: ${data.toString()}`);
        });

        child.on('close', code => {
            if (code === 0) {
                const result = parseManagerStatus(output);
                resolve(result.managers);
            } else {
                reject(new Error(`Failed to get manager status. Exit code: ${code}`));
            }
        });

        child.on('error', error => {
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets comprehensive project status including pmon and managers
 * @param project The WinCC OA project
 */
export async function getComprehensiveProjectStatus(project: WinCCOAProject): Promise<WinCCOAProjectStatus> {
    const [pmonStatus, managers] = await Promise.all([
        checkProjectRunningStatus(project).catch(() => PmonProjectRunningStatus.UNKNOWN),
        getManagerStatus(project).catch(() => [] as WinCCOAManager[])
    ]);

    return {
        projectName: project.config.name,
        isRunning: pmonStatus === PmonProjectRunningStatus.RUNNING,
        managers,
        pmonStatus,
        lastUpdate: new Date()
    };
}

/**
 * Manager operations
 */
export async function startManager(project: WinCCOAProject, index: number): Promise<void> {
    const args = ['-proj', project.config.name, '-command', `SINGLE_MGR:START ${index}`];
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    outputChannel.appendLine(`[Manager Start] Starting manager ${index} in project: ${project.config.name}`);
    return executeWCCILpmonCommand(pmonPath, args, project, `start manager ${index}`);
}

export async function stopManager(project: WinCCOAProject, index: number): Promise<void> {
    const args = ['-proj', project.config.name, '-command', `SINGLE_MGR:STOP ${index}`];
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    outputChannel.appendLine(`[Manager Stop] Stopping manager ${index} in project: ${project.config.name}`);
    return executeWCCILpmonCommand(pmonPath, args, project, `stop manager ${index}`);
}

export async function killManager(project: WinCCOAProject, index: number): Promise<void> {
    const args = ['-proj', project.config.name, '-command', `SINGLE_MGR:KILL ${index}`];
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    outputChannel.appendLine(`[Manager Kill] Killing manager ${index} in project: ${project.config.name}`);
    return executeWCCILpmonCommand(pmonPath, args, project, `kill manager ${index}`);
}

export async function removeManager(project: WinCCOAProject, index: number): Promise<void> {
    const args = ['-proj', project.config.name, '-command', `SINGLE_MGR:DEL ${index}`];
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    outputChannel.appendLine(`[Manager Remove] Removing manager ${index} from project: ${project.config.name}`);
    return executeWCCILpmonCommand(pmonPath, args, project, `remove manager ${index}`);
}

/**
 * Helper function to execute WCCILpmon commands
 */
async function executeWCCILpmonCommand(
    pmonPath: string,
    args: string[],
    project: WinCCOAProject,
    operation: string
): Promise<void> {
    // Add -log +stderr to minimize project logs
    const enhancedArgs = ['-log', '+stderr', ...args];
    const command = `${pmonPath} ${enhancedArgs.join(' ')}`;

    return new Promise<void>((resolve, reject) => {
        let response = '';

        const child = childProcess.spawn(pmonPath, enhancedArgs, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.config.installationDir,
            detached: !args.includes('-command') // Detach only if not a command
        });

        child.stdout?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            outputChannel.appendLine(output);
        });

        child.stderr?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            outputChannel.appendLine(`Error: ${output}`);
        });

        child.on('close', code => {
            if (code === 0) {
                // Success
                const finalResponse = response.trim() || 'OK';
                addToCommandHistory(project.config.name, command, finalResponse);

                outputChannel.appendLine(`✅ Successfully executed: ${operation} for '${project.config.name}'`);
                vscode.window.showInformationMessage(`✅ ${operation} completed for '${project.config.name}'`);
                resolve();
            } else {
                // Error
                const errorResponse = response.trim() || `Process exited with code ${code}`;
                addToCommandHistory(project.config.name, command, `ERROR ${errorResponse}`);

                const errorMsg = `Failed to ${operation}: ${errorResponse}`;
                outputChannel.appendLine(`❌ ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
                reject(new Error(errorResponse));
            }
        });

        child.on('spawn', () => {
            outputChannel.appendLine(`🔄 Executing: ${operation} for '${project.config.name}'`);
            if (!args.includes('-command')) {
                child.unref(); // Allow process to continue independently for non-command operations
            }
        });

        child.on('error', error => {
            const errorMsg = `Failed to ${operation}: ${error.message}`;
            addToCommandHistory(project.config.name, command, `ERROR ${errorMsg}`);

            outputChannel.appendLine(`❌ ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
            reject(error);
        });
    });
}

/**
 * Parse manager list output
 */
/**
 * Parse manager list output from MGRLIST:LIST command
 *
 * Expected format:
 * LIST:23
 * WCCILpmon;0;30;3;1;
 * WCCILdata;2;30;3;1;
 * WCCOAvalarch;2;30;3;1;-num 0
 * ...
 * ;
 *
 * Format: Component;startmode;seckill;restartcount;resetmin;args
 * - Component: WinCC OA manager name (executable without extension)
 * - startmode: 0=manual, 1=once, 2=always
 * - seckill: seconds to kill (default 60)
 * - restartcount: count of restarts (default 3)
 * - resetmin: Reset start counter (default 1)
 * - args: manager specific arguments
 */
export function parseManagerList(output: string): WinCCOAManager[] {
    const managers: WinCCOAManager[] = [];
    const lines = output.split('\n');

    let listStarted = false;
    let managerIndex = 0;

    for (const line of lines) {
        const trimmed = line.trim();

        // Check for list start (LIST:count)
        if (trimmed.startsWith('LIST:')) {
            listStarted = true;
            continue;
        }

        // Check for list end (line containing only ';')
        if (trimmed === ';') {
            break;
        }

        // Skip if list hasn't started yet or line is empty
        if (!listStarted || !trimmed) {
            continue;
        }

        // Parse manager line format: Component;startmode;seckill;restartcount;resetmin;args
        const parts = trimmed.split(';');
        if (parts.length >= 5) {
            const component = parts[0];
            const startModeNum = parseInt(parts[1], 10);
            const secKill = parseInt(parts[2], 10);
            const restartCount = parseInt(parts[3], 10);
            const resetMin = parseInt(parts[4], 10);
            const args = parts.length > 5 ? parts.slice(5).join(';') : '';

            // Convert numeric start mode to string
            let startMode: 'manual' | 'once' | 'always';
            switch (startModeNum) {
                case 0:
                    startMode = 'manual';
                    break;
                case 1:
                    startMode = 'once';
                    break;
                case 2:
                    startMode = 'always';
                    break;
                default:
                    startMode = 'manual';
                    break;
            }

            managers.push({
                index: managerIndex,
                name: component,
                status: 'configured', // For LIST command, we don't have runtime status
                startMode,
                secKill,
                restartCount,
                resetMin,
                args: args || undefined
            });

            managerIndex++;
        }
    }

    return managers;
}

/**
 * Parse project state line from MGRLIST:STATI output
 * Format: status text emergency demo
 * Example: "0 WAIT_MODE 0 0"
 */
function parseProjectState(line: string): WinCCOAProjectState | null {
    const parts = line.trim().split(/\s+/);
    if (parts.length >= 4) {
        const statusCode = parseInt(parts[0], 10);
        const text = parts[1];
        const emergency = parseInt(parts[2], 10) === 1;
        const demo = parseInt(parts[3], 10) === 1;

        // Map status code to enum value
        let status: WinCCOAProjectState['status'];
        switch (statusCode) {
            case -1:
                status = 'Unknown';
                break;
            case 0:
                status = 'Down';
                break;
            case 1:
                status = 'Starting';
                break;
            case 2:
                status = 'Monitoring';
                break;
            case 3:
                status = 'Stopping';
                break;
            case 5:
                status = 'Restarting';
                break;
            default:
                status = 'Unknown';
                break;
        }

        return {
            status,
            statusCode,
            text,
            emergency,
            demo
        };
    }

    return null;
}

/**
 * Parse manager status output from MGRLIST:STATI command
 *
 * Expected format:
 * LIST:9
 * 2;25404;0;2025.11.04 08:02:53.379;  1
 * 0;   -1;0;1970.01.01 01:00:00.000;  1
 * ...
 * 0 WAIT_MODE 0 0
 * ;
 *
 * Manager line format: runningState;PID;startMode;startTimeStamp;managerNumber
 * - runningState: 0=stopped, 1=init, 2=running, 3=blocked
 * - PID: process ID (-1 if not running)
 * - startMode: 0=manual, 1=once, 2=always (same as LIST)
 * - startTimeStamp: when manager started
 * - managerNumber: unique manager number from WinCC OA
 *
 * Last line before ';': status text emergency demo
 * - status: project state code (see ProjEnvProjectState enum)
 * - text: human readable state (WAIT_MODE, START_MODE, etc.)
 * - emergency: emergency mode (0=off, 1=on)
 * - demo: demo version (0=off, 1=on)
 */
export function parseManagerStatus(output: string): { managers: WinCCOAManager[]; projectState?: WinCCOAProjectState } {
    const managers: WinCCOAManager[] = [];
    const lines = output.split('\n');

    let listStarted = false;
    let managerIndex = 0;
    let projectState: WinCCOAProjectState | undefined;
    let projectStateLineFound = false;

    for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();

        // Check for list start (STATI:count or LIST:count)
        if (trimmed.startsWith('STATI:') || trimmed.startsWith('LIST:')) {
            listStarted = true;
            continue;
        }

        // Check for list end (line containing only ';')
        if (trimmed === ';') {
            break;
        }

        // Skip if list hasn't started yet or line is empty
        if (!listStarted || !trimmed) {
            continue;
        }

        // Check if this might be the project state line (just before the ';')
        // Look ahead to see if next non-empty line is ';'
        let isProjectStateLine = false;
        for (let j = i + 1; j < lines.length; j++) {
            const nextTrimmed = lines[j].trim();
            if (nextTrimmed === ';') {
                isProjectStateLine = true;
                break;
            } else if (nextTrimmed !== '') {
                break; // Found non-empty, non-semicolon line
            }
        }

        if (isProjectStateLine && !projectStateLineFound) {
            // This is the project state line
            const parsedState = parseProjectState(trimmed);
            if (parsedState) {
                projectState = parsedState;
            }
            projectStateLineFound = true;
            continue;
        }

        // Parse manager status line: runningState;PID;startMode;startTimeStamp;managerNumber
        const parts = trimmed.split(';');
        if (parts.length >= 5) {
            const runningStateNum = parseInt(parts[0].trim(), 10);
            const pid = parseInt(parts[1].trim(), 10);
            const startModeNum = parseInt(parts[2].trim(), 10);
            const startTimeStamp = parts[3].trim();
            const managerNumber = parseInt(parts[4].trim(), 10);

            // Convert numeric running state to string
            let runningState: 'stopped' | 'init' | 'running' | 'blocked';
            switch (runningStateNum) {
                case 0:
                    runningState = 'stopped';
                    break;
                case 1:
                    runningState = 'init';
                    break;
                case 2:
                    runningState = 'running';
                    break;
                case 3:
                    runningState = 'blocked';
                    break;
                default:
                    runningState = 'stopped';
                    break;
            }

            // Convert numeric start mode to string
            let startMode: 'manual' | 'once' | 'always';
            switch (startModeNum) {
                case 0:
                    startMode = 'manual';
                    break;
                case 1:
                    startMode = 'once';
                    break;
                case 2:
                    startMode = 'always';
                    break;
                default:
                    startMode = 'manual';
                    break;
            }

            // Parse timestamp
            let parsedTimestamp: Date | undefined;
            if (
                startTimeStamp &&
                startTimeStamp !== '0' &&
                startTimeStamp !== '' &&
                startTimeStamp !== '-1' &&
                !startTimeStamp.startsWith('1970')
            ) {
                try {
                    // Handle different timestamp formats from WinCC OA
                    let timestampStr = startTimeStamp.trim();

                    // Handle WinCC OA format: YYYY.MM.DD hh:mm:ss.ms (e.g., 2025.11.04 08:02:53.379)
                    const winccOaMatch = timestampStr.match(
                        /^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3})$/
                    );
                    if (winccOaMatch) {
                        const [, year, month, day, hours, minutes, seconds, milliseconds] = winccOaMatch;
                        parsedTimestamp = new Date(
                            parseInt(year, 10),
                            parseInt(month, 10) - 1, // Month is 0-indexed in JavaScript
                            parseInt(day, 10),
                            parseInt(hours, 10),
                            parseInt(minutes, 10),
                            parseInt(seconds, 10),
                            parseInt(milliseconds, 10)
                        );
                    }
                } catch {
                    parsedTimestamp = undefined;
                }
            }

            managers.push({
                index: managerIndex,
                name: `Manager-${managerNumber}`, // We don't have the actual name in STATI, use placeholder
                status: runningState,
                pid: pid === -1 ? undefined : pid,
                startMode,
                runningState,
                managerNumber,
                startTimeStamp: parsedTimestamp
            });

            managerIndex++;
        }
    }

    return { managers, projectState };
}

/**
 * Registers a runnable WinCC OA project from a directory path
 * @param directoryPath The path to the project directory
 * @param provider The tree data provider to refresh after registration
 * @returns Promise that resolves when project is registered
 */
async function registerRunnableProjectFromDirectory(
    directoryPath: string,
    provider?: WinCCOAProjectProvider
): Promise<void> {
    const projectName = path.basename(directoryPath);

    // Validate if directory contains a WinCC OA project structure
    const configFilePath = path.join(directoryPath, 'config', 'config');
    if (!fs.existsSync(configFilePath)) {
        vscode.window.showErrorMessage(
            `❌ Directory '${directoryPath}' does not appear to be a valid WinCC OA runnable project (no config/config found).`
        );
        return;
    }

    try {
        // Create a temporary project config for registration
        const tempConfig: ProjectConfig = {
            name: projectName,
            installationDir: directoryPath,
            installationDate: new Date().toISOString().split('T')[0],
            notRunnable: false, // Runnable project
            currentProject: false
        };

        // Detect version from config file
        const version = provider?.getProjectVersion(directoryPath);
        if (!version) {
            vscode.window.showErrorMessage(
                `❌ Cannot determine WinCC OA version for project '${projectName}'. Ensure the config file contains valid version information.`
            );
            return;
        }

        // Create a WinCCOAProject instance for registration
        const runnableProject = new WinCCOAProject(tempConfig, directoryPath, true, false, version);

        // Register the runnable project using the dedicated function
        await registerRunnableProject(runnableProject);

        vscode.window.showInformationMessage(`✅ Runnable project '${projectName}' has been registered successfully.`);
        if (provider) {
            provider.refresh();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to register runnable project '${projectName}': ${error}`);
    }
}

/**
 * Registers a sub-project WinCC OA project from a directory path
 * @param directoryPath The path to the project directory
 * @param provider The tree data provider to refresh after registration
 * @returns Promise that resolves when project is registered
 */
async function registerSubProjectFromDirectory(
    directoryPath: string,
    provider?: WinCCOAProjectProvider
): Promise<void> {
    const projectName = path.basename(directoryPath);

    try {
        // Create a temporary project config for registration
        const tempConfig: ProjectConfig = {
            name: projectName,
            installationDir: directoryPath,
            installationDate: new Date().toISOString().split('T')[0],
            notRunnable: true, // Sub-projects are typically not runnable
            currentProject: false
        };

        // Detect version if config file exists
        const configPath = path.join(directoryPath, 'config', 'config');
        const hasConfig = fs.existsSync(configPath);
        let version: string | undefined;
        if (hasConfig) {
            version = provider?.getProjectVersion(directoryPath);
        }

        // Create a WinCCOAProject instance for registration
        const subProject = new WinCCOAProject(tempConfig, directoryPath, false, false, version);

        // Register the sub-project using the dedicated function
        await registerSubProject(subProject);

        vscode.window.showInformationMessage(`✅ Sub-project '${projectName}' has been registered successfully.`);
        if (provider) {
            provider.refresh();
        }
    } catch (error) {
        vscode.window.showErrorMessage(`❌ Failed to register sub-project '${projectName}': ${error}`);
    }
}

/**
 * Unregisters a WinCC OA project using WCCILpmon
 * @param projectName The name of the project to unregister
 * @returns Promise that resolves when project is unregistered
 */
async function unregisterProject(projectName: string): Promise<void> {
    const pmonPath = getWCCILpmonPath(); // Use highest available version
    if (!pmonPath) {
        throw new Error('WCCILpmon not found for project unregistration');
    }

    return new Promise<void>((resolve, reject) => {
        const args = ['-unreg', projectName, '-log', '+stderr'];

        outputChannel.appendLine(`[Project Unregistration] Executing: ${pmonPath} ${args.join(' ')}`);
        outputChannel.show(true); // Show the output channel

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            outputChannel.append(text);
        });

        child.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            outputChannel.append(text);
        });

        child.on('close', (code: number) => {
            outputChannel.appendLine(`[Project Unregistration] WCCILpmon exited with code: ${code}`);
            if (stdout.trim()) {
                outputChannel.appendLine(`[Project Unregistration] stdout: ${stdout.trim()}`);
            }
            if (stderr.trim()) {
                outputChannel.appendLine(`[Project Unregistration] stderr: ${stderr.trim()}`);
            }

            if (code === 0) {
                // Success case for unregistration
                outputChannel.appendLine(
                    `[Project Unregistration] ✅ Successfully unregistered project: ${projectName}`
                );
                resolve();
            } else {
                outputChannel.appendLine(`[Project Unregistration] ❌ Unregistration failed with exit code ${code}`);
                reject(new Error(`Project unregistration failed with exit code ${code}. Error: ${stderr}`));
            }
        });

        child.on('error', (error: Error) => {
            outputChannel.appendLine(`[Project Unregistration] ❌ Failed to execute WCCILpmon: ${error.message}`);
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Generates a unique section name for a project in the configuration file
 * @param content Current content of the configuration file
 * @param projectName The name of the project
 * @returns A unique section name
 */
function generateUniqueSectionName(content: string, projectName: string): string {
    let baseName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    let sectionName = baseName;
    let counter = 1;

    // Check if section name already exists
    while (content.includes(`[${sectionName}]`)) {
        sectionName = `${baseName}_${counter}`;
        counter++;
    }

    return sectionName;
}

/**
 * Creates a configuration section for a project
 * @param sectionName The section name to use
 * @param project The project to create configuration for
 * @returns The formatted configuration section
 */
function createProjectConfigSection(sectionName: string, project: WinCCOAProject): string {
    const installationDate = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

    const section = [
        `[${sectionName}]`,
        `InstallationDir="${project.config.installationDir}"`,
        `InstallationDate="${installationDate}"`,
        `NotRunnable=${project.isRunnable ? 'FALSE' : 'TRUE'}`,
        `Company="${project.config.company || 'Unknown'}"`
    ];

    return section.join('\n');
}

export function deactivate() {
    // Clean up resources
    if (outputChannel) {
        outputChannel.dispose();
    }
}

// Export types and interfaces for other extensions to use
export interface WinCCOAExtensionAPI {
    getProjects(): WinCCOAProject[];
    getProjectByPath(path: string): WinCCOAProject | undefined;
    getProjectVersion(installationDir: string): string | undefined;
    getRegisteredProjects(): ProjectConfig[];
    refreshProjects(): void;
    getPvssInstConfPath(): string;
    getProjectCategories(): ProjectCategory[];
    getRunnableProjects(): WinCCOAProject[];
    getSubProjects(): WinCCOAProject[];
    getWinCCOASystemVersions(): WinCCOAProject[];
    getSubProjectsByVersion(version: string): WinCCOAProject[];
    getWinCCOADeliveredSubProjects(): WinCCOAProject[];
    getUserSubProjects(): WinCCOAProject[];
    getCurrentProjects(): WinCCOAProject[];
    getCurrentProjectsInfo(): CurrentProjectInfo[];
}

// Export the types so other extensions can use them
export { WinCCOAProject, ProjectConfig, CurrentProjectInfo };

let projectProvider: WinCCOAProjectProvider;

// Direct API function exports for other extensions to use
export function getProjects(): WinCCOAProject[] {
    return projectProvider?.getProjects() || [];
}

export function getProjectByPath(path: string): WinCCOAProject | undefined {
    const projects = projectProvider?.getProjects() || [];
    return projects.find(p => p.installationDir === path || p.config.installationDir === path);
}

export function getProjectVersion(installationDir: string): string | undefined {
    return projectProvider?.getProjectVersion(installationDir);
}

export function getRegisteredProjects(): ProjectConfig[] {
    const configPath = getPvssInstConfPath();
    if (projectProvider && fs.existsSync(configPath)) {
        return projectProvider.parseConfigFile(configPath);
    }
    return [];
}

export function refreshProjects(): void {
    projectProvider?.refresh();
}

export function getProjectCategories(): ProjectCategory[] {
    return projectProvider?.categories || [];
}

export function getRunnableProjects(): WinCCOAProject[] {
    return projectProvider?.getProjects().filter(p => p.isRunnable && !p.isWinCCOASystem) || [];
}

export function getSubProjects(): WinCCOAProject[] {
    return projectProvider?.getProjects().filter(p => !p.isRunnable && !p.isWinCCOASystem) || [];
}

export function getWinCCOASystemVersions(): WinCCOAProject[] {
    return projectProvider?.getProjects().filter(p => p.isWinCCOASystem) || [];
}

export function getSubProjectsByVersion(version: string): WinCCOAProject[] {
    const subProjects = projectProvider?.getProjects().filter(p => !p.isRunnable && !p.isWinCCOASystem) || [];
    return subProjects.filter(p => {
        // Use the same version extraction logic as in the provider
        const projectVersion =
            p.version ||
            p.config.name.match(/(\d{1,2}[._]\d{1,2}(?:[._]\d{1,2})?)/)?.[1]?.replace(/_/g, '.') ||
            p.config.installationDir.match(/(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/)?.[1] ||
            'Unknown';
        return projectVersion === version;
    });
}

export function getWinCCOADeliveredSubProjects(): WinCCOAProject[] {
    const allSubProjects = projectProvider?.getProjects().filter(p => !p.isRunnable && !p.isWinCCOASystem) || [];
    return allSubProjects.filter(p => isWinCCOADeliveredSubProject(p));
}

export function getUserSubProjects(): WinCCOAProject[] {
    const allSubProjects = projectProvider?.getProjects().filter(p => !p.isRunnable && !p.isWinCCOASystem) || [];
    return allSubProjects.filter(p => !isWinCCOADeliveredSubProject(p));
}

export function getCurrentProjects(): WinCCOAProject[] {
    return projectProvider?.getProjects().filter(p => p.isCurrent) || [];
}

export function getCurrentProjectsInfo(): CurrentProjectInfo[] {
    const configPath = getPvssInstConfPath();
    if (projectProvider && fs.existsSync(configPath)) {
        return projectProvider.parseCurrentProjects(configPath);
    }
    return [];
}

/**
 * Interface for detailed WinCC OA version information
 */
export interface DetailedVersionInfo {
    version: string;
    platform: string;
    architecture: string;
    buildDate: string;
    commitHash: string;
    rawOutput: string;
    executablePath: string;
}

/**
 * Gets detailed version information using WCCILpmon -version command
 * @param project The WinCC OA system project to get version info for
 * @returns Promise with detailed version information
 */
export async function getDetailedVersionInfo(project: WinCCOAProject): Promise<DetailedVersionInfo> {
    if (!project.isWinCCOASystem || !project.version) {
        throw new Error('Can only get version information for WinCC OA system installations');
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath || !fs.existsSync(pmonPath)) {
        throw new Error(`WCCILpmon not found for WinCC OA version ${project.version}`);
    }

    return new Promise<DetailedVersionInfo>((resolve, reject) => {
        outputChannel.appendLine(`[Version Info] Executing: ${pmonPath} -version`);
        outputChannel.show(true);

        const child = childProcess.spawn(pmonPath, ['-version'], {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
            const text = data.toString();
            stdout += text;
            outputChannel.append(text);
        });

        child.stderr.on('data', (data: Buffer) => {
            const text = data.toString();
            stderr += text;
            outputChannel.append(text);
        });

        child.on('close', (code: number | null) => {
            if (code === 0 || code === 1) {
                // WCCILpmon -version exits with code 1
                try {
                    const versionInfo = parseVersionOutput(stdout + stderr, pmonPath);
                    outputChannel.appendLine(`[Version Info] ✅ Successfully retrieved version information`);
                    resolve(versionInfo);
                } catch (error) {
                    outputChannel.appendLine(`[Version Info] ❌ Failed to parse version output: ${error}`);
                    reject(error);
                }
            } else {
                const errorMsg = `WCCILpmon exited with code ${code}. Output: ${stdout + stderr}`;
                outputChannel.appendLine(`[Version Info] ❌ ${errorMsg}`);
                reject(new Error(errorMsg));
            }
        });

        child.on('error', (error: Error) => {
            outputChannel.appendLine(`[Version Info] ❌ Failed to execute WCCILpmon: ${error.message}`);
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Parses the output from WCCILpmon -version command
 * @param output The raw output from the command
 * @param executablePath The path to the WCCILpmon executable
 * @returns Parsed version information
 */
export function parseVersionOutput(output: string, executablePath: string): DetailedVersionInfo {
    // Example output:
    // WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)
    // WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!

    const lines = output.split('\n').filter(line => line.trim());

    for (const line of lines) {
        // Look for the full version line (contains version, platform, build date, commit hash)
        const fullVersionMatch = line.match(
            /:\s*(\d+\.\d+\.\d+)\s+platform\s+(\w+)\s+(\w+)\s+linked\s+at\s+([^(]+)\s*\(([^)]+)\)/
        );

        if (fullVersionMatch) {
            return {
                version: fullVersionMatch[1],
                platform: fullVersionMatch[2],
                architecture: fullVersionMatch[3],
                buildDate: fullVersionMatch[4].trim(),
                commitHash: fullVersionMatch[5],
                rawOutput: output,
                executablePath: executablePath
            };
        }

        // Look for partial version line (version and platform without build info)
        const partialVersionMatch = line.match(/:\s*(\d+\.\d+\.\d+)\s+platform\s+(\w+)\s+(\w+)(?!\s+linked)/);

        if (partialVersionMatch) {
            return {
                version: partialVersionMatch[1],
                platform: partialVersionMatch[2],
                architecture: partialVersionMatch[3],
                buildDate: 'Unknown',
                commitHash: 'Unknown',
                rawOutput: output,
                executablePath: executablePath
            };
        }
    }

    // If parsing fails, try to extract basic version information
    const basicVersionMatch = output.match(/:\s*(\d+\.\d+\.\d+)/);
    return {
        version: basicVersionMatch ? basicVersionMatch[1] : 'Unknown',
        platform: 'Unknown',
        architecture: 'Unknown',
        buildDate: 'Unknown',
        commitHash: 'Unknown',
        rawOutput: output,
        executablePath: executablePath
    };
}

/**
 * Shows detailed version information in a formatted dialog
 * @param versionInfo The version information to display
 */
export async function showVersionInfoDialog(versionInfo: DetailedVersionInfo): Promise<void> {
    const formattedInfo = [
        `🔧 **WinCC OA Detailed Version Information**`,
        ``,
        `**Version:** ${versionInfo.version}`,
        `**Platform:** ${versionInfo.platform} ${versionInfo.architecture}`,
        `**Build Date:** ${versionInfo.buildDate}`,
        `**Commit Hash:** ${versionInfo.commitHash}`,
        `**Executable:** ${versionInfo.executablePath}`,
        ``,
        `**Raw Output:**`,
        `\`\`\``,
        versionInfo.rawOutput.trim(),
        `\`\`\``
    ].join('\n');

    // Create a new document with the version information
    const doc = await vscode.workspace.openTextDocument({
        content: formattedInfo,
        language: 'markdown'
    });

    // Show the document in a new editor
    await vscode.window.showTextDocument(doc, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside
    });

    // Also show a summary in an information message
    const summaryMsg = `WinCC OA ${versionInfo.version} (${versionInfo.platform} ${versionInfo.architecture}, built ${versionInfo.buildDate})`;

    const action = await vscode.window.showInformationMessage(summaryMsg, 'Copy to Clipboard', 'Show in Output');

    if (action === 'Copy to Clipboard') {
        await vscode.env.clipboard.writeText(versionInfo.rawOutput);
        vscode.window.showInformationMessage('Version information copied to clipboard');
    } else if (action === 'Show in Output') {
        outputChannel.clear();
        outputChannel.appendLine('WinCC OA Detailed Version Information');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Version: ${versionInfo.version}`);
        outputChannel.appendLine(`Platform: ${versionInfo.platform} ${versionInfo.architecture}`);
        outputChannel.appendLine(`Build Date: ${versionInfo.buildDate}`);
        outputChannel.appendLine(`Commit Hash: ${versionInfo.commitHash}`);
        outputChannel.appendLine(`Executable: ${versionInfo.executablePath}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('Raw Output:');
        outputChannel.appendLine(versionInfo.rawOutput);
        outputChannel.show(true);
    }
}

// Export the path utility functions and new types
export { getPvssInstConfPath, ProjectCategory, WinCCOAProjectProvider };

// Backward compatibility: Keep the getAPI function for existing consumers
export function getAPI(): WinCCOAExtensionAPI {
    return {
        getProjects,
        getProjectByPath,
        getProjectVersion,
        getRegisteredProjects,
        refreshProjects,
        getPvssInstConfPath,
        getProjectCategories,
        getRunnableProjects,
        getSubProjects,
        getWinCCOASystemVersions,
        getSubProjectsByVersion,
        getWinCCOADeliveredSubProjects,
        getUserSubProjects,
        getCurrentProjects,
        getCurrentProjectsInfo
    };
}

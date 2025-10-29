import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

export function activate(context: vscode.ExtensionContext) {
	console.log('WinCC OA Projects extension is now active!');

	const provider = new WinCCOAProjectProvider();
        projectProvider = provider;
	const treeView = vscode.window.createTreeView('winccOAProjects', {
		treeDataProvider: provider,
		showCollapseAll: true
	});

	// Handle tree view selection - show project details when clicked
	treeView.onDidChangeSelection((e: vscode.TreeViewSelectionChangeEvent<WinCCOAProject>) => {
		if (e.selection.length > 0) {
			const project = e.selection[0];
			ProjectViewPanel.createOrShow(context.extensionUri, project);
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

	const openProjectCommand = vscode.commands.registerCommand('winccOAProjects.openProject', async (project?: WinCCOAProject) => {
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
	});

	const openProjectNewWindowCommand = vscode.commands.registerCommand('winccOAProjects.openProjectNewWindow', async (project?: WinCCOAProject) => {
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
	});

	const openInExplorerCommand = vscode.commands.registerCommand('winccOAProjects.openInExplorer', async (project?: WinCCOAProject) => {
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
	});

	const showProjectViewCommand = vscode.commands.registerCommand('winccOAProjects.showProjectView', async (project?: WinCCOAProject) => {
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
	});

	context.subscriptions.push(
		treeView, 
		watcher,
		refreshCommand, 
		openProjectCommand, 
		openProjectNewWindowCommand,
		openInExplorerCommand,
		showProjectViewCommand
	);

	// Auto-refresh when extension starts
	provider.refresh();
}

interface ProjectConfig {
	name: string;
	installationDir: string;
	installationDate: string;
	notRunnable: boolean;
	company?: string;
	currentProject?: boolean;
}

class WinCCOAProject extends vscode.TreeItem {
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
		this.contextValue = 'winccOAProject';
		this.iconPath = this.getIcon();
	}

	public get isWinCCOASystem(): boolean {
		// Check if this is a WinCC OA system installation (name matches version)
		return this.version !== undefined && this.config.name === this.version;
	}

	private createTooltip(): string {
		let projectType: string;
		if (this.isWinCCOASystem) {
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
		
		if (this.isCurrent) {
			lines.unshift('*** CURRENT PROJECT ***');
		}
		
		return lines.join('\n');
	}

	private createDescription(): string {
		const labels: string[] = [];
		
		// Add status indicators
		if (this.isCurrent) {
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
		if (this.isCurrent) {
			return new vscode.ThemeIcon('star-full');
		} else if (this.isWinCCOASystem) {
			// WinCC OA system installations (name equals version)
			return new vscode.ThemeIcon('gear');
		} else if (this.isRunnable) {
			// Runnable projects - use server/monitor icon
			return new vscode.ThemeIcon('server-process');
		} else {
			// Non-runnable are extensions/plugins/add-ons
			return new vscode.ThemeIcon('extensions');
		}
	}
}

class WinCCOAProjectProvider implements vscode.TreeDataProvider<WinCCOAProject> {
	private _onDidChangeTreeData: vscode.EventEmitter<WinCCOAProject | undefined | void> = new vscode.EventEmitter<WinCCOAProject | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<WinCCOAProject | undefined | void> = this._onDidChangeTreeData.event;

	private projects: WinCCOAProject[] = [];

	refresh(): void {
		this.loadProjects();
		this._onDidChangeTreeData.fire();
	}

	getProjects(): WinCCOAProject[] {
		return this.projects;
	}

	getTreeItem(element: WinCCOAProject): vscode.TreeItem {
		return element;
	}

	getChildren(element?: WinCCOAProject): Promise<WinCCOAProject[]> {
		if (!element) {
			return Promise.resolve(this.projects);
		}
		return Promise.resolve([]);
	}

	private loadProjects(): void {
		const configPath = getPvssInstConfPath();
		
		if (!fs.existsSync(configPath)) {
			vscode.window.showWarningMessage(`WinCC OA configuration file not found: ${configPath}`);
			this.projects = [];
			return;
		}

		try {
			const projectConfigs = this.parseConfigFile(configPath);
			const projects: WinCCOAProject[] = [];

			for (const config of projectConfigs) {
				// Use currentProject property from config instead of workspace folders
				const isCurrent = config.currentProject || false;
				const isRunnable = !config.notRunnable && this.checkProjectRunnable(config.installationDir);
				const version = isRunnable ? this.getProjectVersion(config.installationDir) : undefined;

				projects.push(new WinCCOAProject(config, config.installationDir, isRunnable, isCurrent, version));
			}

			// Sort projects: current first, then runnable projects, then WinCC OA systems, then extensions/plugins
			projects.sort((a, b) => {
				if (a.isCurrent && !b.isCurrent) { return -1; }
				if (!a.isCurrent && b.isCurrent) { return 1; }
				if (a.isRunnable && !b.isRunnable && !b.isWinCCOASystem) { return -1; }
				if (!a.isRunnable && !a.isWinCCOASystem && b.isRunnable) { return 1; }
				if (a.isWinCCOASystem && !b.isWinCCOASystem) { return -1; }
				if (!a.isWinCCOASystem && b.isWinCCOASystem) { return 1; }
				return a.config.name.localeCompare(b.config.name);
			});

			this.projects = projects;
		} catch (error) {
			vscode.window.showErrorMessage(`Error loading WinCC OA projects: ${error}`);
			this.projects = [];
		}
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
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (ProjectViewPanel.currentPanel) {
			ProjectViewPanel.currentPanel._panel.reveal(column);
			ProjectViewPanel.currentPanel._update(project);
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

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private project: WinCCOAProject) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update(project);

		// Listen for when the panel is disposed
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
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

	private _update(project: WinCCOAProject) {
		this.project = project;
		this._panel.title = `WinCC OA Project: ${project.config.name}`;
		this._panel.webview.html = this._getHtmlForWebview(project);
	}

	private _getHtmlForWebview(project: WinCCOAProject): string {
		const configDetails = this._getConfigDetails(project);
		const projectDetails = this._getProjectDetails(project);

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
            ${project.version ? `
            <div class="info-label">WinCC OA Version:</div>
            <div class="info-value">${project.version}</div>
            ` : ''}
            ${project.config.company ? `
            <div class="info-label">Company:</div>
            <div class="info-value">${project.config.company}</div>
            ` : ''}
        </div>
    </div>

    ${projectDetails}
    ${configDetails}
</body>
</html>`;
	}

	private _getProjectDetails(project: WinCCOAProject): string {
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
					
					if (trimmedLine.includes('InstallationDir') && 
						trimmedLine.includes(project.config.installationDir)) {
						inProjectSection = true;
					}
				}

				if (currentProjectLines.length > 0) {
					projectSection = `
					<div class="section">
						<div class="section-title">Project Configuration (pvssInst.conf)</div>
						<div class="config-section">
							${currentProjectLines.filter(line => line.includes('=')).map(line => {
								const [key, value] = line.split('=', 2).map(s => s.trim());
								return `
								<div class="info-grid">
									<div class="info-label">${key}:</div>
									<div class="info-value">${value.replace(/['"]/g, '')}</div>
								</div>`;
							}).join('')}
						</div>
					</div>`;
				}
			}
		} catch (error) {
			console.error('Error reading project details:', error);
		}

		return projectSection;
	}

	private _getConfigDetails(project: WinCCOAProject): string {
		if (!project.isRunnable || project.isWinCCOASystem) {
			return '';
		}

		const configFiles = ['config', 'config.level', 'config.http', 'config.redu'];
		let configSections = '';

		for (const configFile of configFiles) {
			const configPath = path.join(project.config.installationDir, 'config', configFile);
			
			if (fs.existsSync(configPath)) {
				try {
					const content = fs.readFileSync(configPath, 'utf-8');
					const sections = this._parseProjectConfigFile(content);
					
					configSections += `
					<div class="section">
						<div class="section-title">Configuration File: ${configFile}</div>
						${Object.entries(sections).map(([sectionName, entries]) => `
						<div class="config-section">
							<div class="config-title">[${sectionName}]</div>
							${Object.entries(entries as Record<string, string>).map(([key, value]) => `
							<div class="info-grid">
								<div class="info-label">${key}:</div>
								<div class="info-value">${value}</div>
							</div>
							`).join('')}
						</div>
						`).join('')}
					</div>`;
				} catch (error) {
					console.error(`Error reading config file ${configPath}:`, error);
				}
			}
		}

		return configSections;
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
					sections[currentSection][`🗒️ ${keyName}`] = `${value} <span class="comment">// ${pendingComment}</span>`;
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
}

export function deactivate() {}

// Export types and interfaces for other extensions to use
export interface WinCCOAExtensionAPI {
    getProjects(): WinCCOAProject[];
    getProjectByPath(path: string): WinCCOAProject | undefined;
    getProjectVersion(installationDir: string): string | undefined;
    getRegisteredProjects(): ProjectConfig[];
    refreshProjects(): void;
    getPvssInstConfPath(): string;
}

// Export the types so other extensions can use them
export { WinCCOAProject, ProjectConfig };

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

// Export the path utility function
export { getPvssInstConfPath };

// Backward compatibility: Keep the getAPI function for existing consumers
export function getAPI(): WinCCOAExtensionAPI {
    return {
        getProjects,
        getProjectByPath,
        getProjectVersion,
        getRegisteredProjects,
        refreshProjects,
        getPvssInstConfPath
    };
}

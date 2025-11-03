import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as childProcess from 'child_process';
// import { JSDOM } from 'jsdom';
// import * as DOMPurify from 'dompurify';

// Global output channel for WCCILpmon command outputs
let outputChannel: vscode.OutputChannel;

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
		
		if (searchTerm !== undefined) { // User didn't cancel
			provider.setFilter(searchTerm.trim());
		}
	});

	const clearFilterCommand = vscode.commands.registerCommand('winccOAProjects.clearFilter', () => {
		provider.setFilter('');
	});

	const registerProjectCommand = vscode.commands.registerCommand('winccOAProjects.registerProject', async (project?: WinCCOAProject) => {
		if (project) {
			// Called from context menu or with specific project
			try {
				await registerProject(project);
				vscode.window.showInformationMessage(`✅ Project '${project.config.name}' has been registered successfully.`);
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
	});

	const registerSubProjectCommand = vscode.commands.registerCommand('winccOAProjects.registerSubProject', async (uri?: vscode.Uri) => {
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
		const existingProject = provider.getProjects().find(p => 
			path.normalize(p.config.installationDir).toLowerCase() === path.normalize(directoryPath).toLowerCase()
		);
		
		if (existingProject && !provider.isUnregistered(existingProject)) {
			vscode.window.showWarningMessage(`Project '${projectName}' is already registered in WinCC OA.`);
			return;
		}

		// Check if directory contains WinCC OA project structure
		const configPath = path.join(directoryPath, 'config', 'config');
		const hasConfig = fs.existsSync(configPath);
		
		if (hasConfig) {
			vscode.window.showErrorMessage(`❌ Failed to register sub-project '${projectName}': \n\nThe directory appears to be a runnable WinCC OA project (config/config found). Please use 'Register Project' command instead.`);
			return;
		}

		try {
			// Use the dedicated sub-project registration function
			await registerSubProjectFromDirectory(directoryPath, provider);
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Failed to register sub-project '${projectName}': ${error}`);
		}
	});

	const registerRunnableProjectCommand = vscode.commands.registerCommand('winccOAProjects.registerRunnableProject', async (uri?: vscode.Uri) => {
		let directoryPath: string;
		let projectName: string;

		if (uri && fs.existsSync(uri.fsPath)) {
			// Called from context menu with specific directory
			directoryPath = uri.fsPath;
			projectName = path.basename(directoryPath);
			
			// Check if it's a directory
			const stats = fs.statSync(directoryPath);
			if (!stats.isDirectory()) {
				vscode.window.showErrorMessage('WinCC OA runnable projects can only be registered from directories.');
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
		const existingProject = provider.getProjects().find(p => 
			path.normalize(p.config.installationDir).toLowerCase() === path.normalize(directoryPath).toLowerCase()
		);
		
		if (existingProject && !provider.isUnregistered(existingProject)) {
			vscode.window.showWarningMessage(`Project '${projectName}' is already registered in WinCC OA.`);
			return;
		}

		// Check if directory contains WinCC OA project structure
		const configPath = path.join(directoryPath, 'config', 'config');
		const hasConfig = fs.existsSync(configPath);
		
		if (!hasConfig) {
			vscode.window.showErrorMessage(`❌ Failed to register runnable project '${projectName}': \n\nThe directory does not appear to be a runnable WinCC OA project (no config/config found). Please use 'Register Sub Project' command instead.`);
			return;
		}

		try {
			// Use the dedicated runnable project registration function
			await registerRunnableProjectFromDirectory(directoryPath, provider);
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Failed to register runnable project '${projectName}': ${error}`);
		}
	});

	const unregisterProjectCommand = vscode.commands.registerCommand('winccOAProjects.unregisterProject', async (project?: WinCCOAProject) => {
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
			'Yes, Unregister', 'Cancel'
		);

		if (confirmResult !== 'Yes, Unregister') {
			return;
		}

		try {
			await unregisterProject(targetProject.config.name);
			vscode.window.showInformationMessage(`✅ Project '${targetProject.config.name}' has been unregistered successfully.`);
			provider.refresh();
		} catch (error) {
			vscode.window.showErrorMessage(`❌ Failed to unregister project '${targetProject.config.name}': ${error}`);
		}
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

	const scanForProjectsCommand = vscode.commands.registerCommand('winccOAProjects.scanForProjects', async () => {
		vscode.window.showInformationMessage('Scanning for unregistered WinCC OA projects...');
		provider.refresh(); // This will trigger the scan for unregistered projects
		vscode.window.showInformationMessage('Project scan completed. Check the "Unregistered Projects" section.');
	});

	const registerAllUnregisteredCommand = vscode.commands.registerCommand('winccOAProjects.registerAllUnregistered', async () => {
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
	});

	const getVersionInfoCommand = vscode.commands.registerCommand('winccOAProjects.getVersionInfo', async (project?: WinCCOAProject) => {
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
	});

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
		getVersionInfoCommand
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
		
		// Regular projects that can be unregistered
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

type TreeItem = ProjectCategory | WinCCOAProject;

class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private projects: WinCCOAProject[] = [];
	public categories: ProjectCategory[] = [];
	public currentFilter: string = '';
	private filteredCategories: ProjectCategory[] = [];

	refresh(): void {
		this.loadProjects().then(() => {
			this._onDidChangeTreeData.fire();
		}).catch(error => {
			console.error('Error refreshing projects:', error);
			this._onDidChangeTreeData.fire();
		});
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
			if (filteredCategory && (filteredCategory.projects.length > 0 || filteredCategory.subCategories.length > 0)) {
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
		const filteredProjects = category.projects.filter(project => 
			this.projectMatchesFilter(project, searchTerm)
		);

		// Filter sub-categories recursively
		const filteredSubCategories: ProjectCategory[] = [];
		for (const subCategory of category.subCategories) {
			const filteredSubCategory = this.filterCategory(subCategory, searchTerm);
			if (filteredSubCategory && (filteredSubCategory.projects.length > 0 || filteredSubCategory.subCategories.length > 0)) {
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
		
		return projectName.includes(searchTerm) || 
			   projectPath.includes(searchTerm) || 
			   projectVersion.includes(searchTerm) ||
			   projectCompany.includes(searchTerm);
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
				const existingProject = projects.find(p => 
					p.config.name === currentProject.projectName && 
					p.version === currentProject.version
				);
				
				if (!existingProject && currentProject.installationDir && fs.existsSync(currentProject.installationDir)) {
					// Create a config for the current project
					const currentConfig: ProjectConfig = {
						name: currentProject.projectName,
						installationDir: currentProject.installationDir,
						installationDate: 'Unknown',
						notRunnable: false,
						currentProject: true
					};
					
					const isRunnable = this.checkProjectRunnable(currentProject.installationDir);
					const version = isRunnable ? this.getProjectVersion(currentProject.installationDir) : currentProject.version;
					
					projects.push(new WinCCOAProject(currentConfig, currentProject.installationDir, isRunnable, true, version));
				}
			}

			// Add unregistered projects to the list
			const unregisteredProjects = await this.findUnregisteredProjects();
			projects.push(...unregisteredProjects);

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
		const runnableProjects = this.projects.filter(p => p.isRunnable && !p.isWinCCOASystem && !p.isCurrent && !this.isUnregistered(p));
		const winccOASystemVersions = this.projects.filter(p => p.isWinCCOASystem && !this.isUnregistered(p));
		
		// Separate WinCC OA delivered sub-projects from user sub-projects
		const allSubProjects = this.projects.filter(p => !p.isRunnable && !p.isWinCCOASystem && !this.isUnregistered(p));
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
			const winccOASubProjectsCategory = this.createSubProjectsWithVersions(winccOADeliveredSubProjects, 'WinCC OA Version Sub-Projects', 'Delivered by WinCC OA installation');
			this.categories.push(winccOASubProjectsCategory);
		}
		
		if (userSubProjects.length > 0) {
			const userSubProjectsCategory = this.createSubProjectsWithVersions(userSubProjects, 'User Sub-Projects', 'Manually registered sub-projects');
			this.categories.push(userSubProjectsCategory);
		}
		
		if (unregisteredProjects.length > 0) {
			this.categories.push(new ProjectCategory('Unregistered Projects', unregisteredProjects, 'notregistered', undefined, 'Found projects that are not registered in pvssInst.conf'));
		}

		// Log category summary
		console.log(`WinCC OA Projects loaded: ${this.projects.length} total, ${this.categories.length} categories, ${currentProjects.length} current`);
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
		const subProjectsCategory = new ProjectCategory(categoryName, [], 'subprojects', undefined, categoryDescription);
		
		// Create version sub-categories
		const sortedVersions = Array.from(versionGroups.keys()).sort();
		
		for (const version of sortedVersions) {
			const versionProjects = versionGroups.get(version)!;
			const versionCategory = new ProjectCategory(
				`Version ${version}`,
				versionProjects,
				'version',
				version
			);
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

	private async scanDirectoryForProjects(searchPath: string, registeredPaths: Set<string>, depth: number = 0): Promise<WinCCOAProject[]> {
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
			'.git', '.svn', '.hg', // Version control
			'node_modules', '.npm', // Node.js
			'bin', 'obj', 'build', 'dist', 'out', // Build outputs
			'temp', 'tmp', '.tmp', // Temporary directories
			'cache', '.cache', // Cache directories
			'logs', 'log', // Log directories
			'__pycache__', '.pytest_cache', // Python
			'.vs', '.vscode', '.idea', // IDE directories
			'$Recycle.Bin', 'System Volume Information', // Windows system
			'.Trash', '.Trashes' // macOS system
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
				const versionMatch = sectionName.match(/Software\\[^\\]*\\PVSS II\\(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/i) || 
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
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

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

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, private project: WinCCOAProject) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update(project).catch(console.error);

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

	private async _update(project: WinCCOAProject) {
		this.project = project;
		this._panel.title = `WinCC OA Project: ${project.config.name}`;
		this._panel.webview.html = await this._getHtmlForWebview(project);
	}

	private async _getHtmlForWebview(project: WinCCOAProject): Promise<string> {
		const configDetails = this._getConfigDetails(project);
		const projectDetails = await this._getProjectDetails(project);

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

		return documentationSection + projectSection;
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
				filenames: ['RELEASENOTES.md', 'ReleaseNotes.md', 'releasenotes.md', 'RELEASE-NOTES.md', 'release-notes.md'],
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

	private async _getDocumentFileSection(project: WinCCOAProject, docType: { filenames: string[], title: string, icon: string, mandatory?: boolean, tabId?: string }): Promise<string> {
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
			html = html.replace(/&/g, '&amp;')
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
			html = html.replace(/```[\s\S]*?```/g, (match) => {
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
		html = html.replace(/&/g, '&amp;')
					.replace(/</g, '&lt;')
					.replace(/>/g, '&gt;')
					.replace(/"/g, '&quot;')
					.replace(/'/g, '&#39;');
		
		// Preserve line breaks and spacing
		html = html.replace(/\n/g, '<br>');
		
		// Handle multiple spaces
		html = html.replace(/ {2,}/g, (match) => '&nbsp;'.repeat(match.length));
		
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
				officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/project_config_file.html',
				icon: '⚙️',
				tabId: 'config-main'
			},
			{
				filename: 'config.level',
				title: 'config.level File',
				description: 'Specifies which CTRL library each manager should load. Contains the default settings for the different WinCC OA managers.',
				officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Control_Grundlagen/Control_Grundlagen-17.html',
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
				officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Redundancy/Redundancy-11.html',
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
					
					const configContent = Object.entries(sections).length > 0 ? 
						Object.entries(sections).map(([sectionName, entries]) => `
						<div class="config-section">
							<div class="config-title">[${sectionName}]</div>
							${Object.entries(entries as Record<string, string>).map(([key, value]) => `
							<div class="info-grid">
								<div class="info-label">${key}:</div>
								<div class="info-value">${value}</div>
							</div>
							`).join('')}
						</div>
						`).join('') : 
						`<div class="config-section">
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
		const args = ['-config', `"${configFilePath}"`, '-status', '-log', '+stderr', '-autofreg'];
		
		outputChannel.appendLine(`[Runnable Project Registration] Executing: "${pmonPath}" ${args.join(' ')}`);
		outputChannel.show(true); // Show the output channel
		
		const child = childProcess.spawn(`"${pmonPath}"`, args, {
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true
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
				outputChannel.appendLine(`[Runnable Project Registration] ✅ Successfully registered runnable project: ${project.config.name}`);
				resolve();
			} else {
				outputChannel.appendLine(`[Runnable Project Registration] ❌ Registration failed with exit code ${code}`);
				reject(new Error(`Registration failed with exit code ${code}. Error: ${stderr}`));
			}
		});

		child.on('error', (error: Error) => {
			outputChannel.appendLine(`[Runnable Project Registration] ❌ Failed to execute WCCILpmon: ${error.message}`);
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
		const args = ['-regsubf', '-proj', `"${project.config.installationDir}"`, '-log', '+stderr'];
		
		outputChannel.appendLine(`[Sub-Project Registration] Executing: "${pmonPath}" ${args.join(' ')}`);
		outputChannel.show(true); // Show the output channel
		
		const child = childProcess.spawn(`"${pmonPath}"`, args, {
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true,
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
				outputChannel.appendLine(`[Sub-Project Registration] ✅ Successfully registered sub-project: ${project.config.name}`);
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
 * Registers a runnable WinCC OA project from a directory path
 * @param directoryPath The path to the project directory
 * @param provider The tree data provider to refresh after registration
 * @returns Promise that resolves when project is registered
 */
async function registerRunnableProjectFromDirectory(directoryPath: string, provider?: WinCCOAProjectProvider): Promise<void> {
	const projectName = path.basename(directoryPath);
	
	// Validate if directory contains a WinCC OA project structure
	const configFilePath = path.join(directoryPath, 'config', 'config');
	if (!fs.existsSync(configFilePath)) {
		vscode.window.showErrorMessage(`❌ Directory '${directoryPath}' does not appear to be a valid WinCC OA runnable project (no config/config found).`);
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
			vscode.window.showErrorMessage(`❌ Cannot determine WinCC OA version for project '${projectName}'. Ensure the config file contains valid version information.`);
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
async function registerSubProjectFromDirectory(directoryPath: string, provider?: WinCCOAProjectProvider): Promise<void> {
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
		const args = ['-unreg', `"${projectName}"`, '-log', '+stderr'];
		
		outputChannel.appendLine(`[Project Unregistration] Executing: "${pmonPath}" ${args.join(' ')}`);
		outputChannel.show(true); // Show the output channel
		
		const child = childProcess.spawn(`"${pmonPath}"`, args, {
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true
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
				outputChannel.appendLine(`[Project Unregistration] ✅ Successfully unregistered project: ${projectName}`);
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
        const projectVersion = p.version || 
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
interface DetailedVersionInfo {
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
async function getDetailedVersionInfo(project: WinCCOAProject): Promise<DetailedVersionInfo> {
	if (!project.isWinCCOASystem || !project.version) {
		throw new Error('Can only get version information for WinCC OA system installations');
	}

	const pmonPath = getWCCILpmonPath(project.version);
	if (!pmonPath || !fs.existsSync(pmonPath)) {
		throw new Error(`WCCILpmon not found for WinCC OA version ${project.version}`);
	}

	return new Promise<DetailedVersionInfo>((resolve, reject) => {
		outputChannel.appendLine(`[Version Info] Executing: "${pmonPath}" -version`);
		outputChannel.show(true);

		const child = childProcess.spawn(`"${pmonPath}"`, ['-version'], {
			stdio: ['pipe', 'pipe', 'pipe'],
			shell: true
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
			if (code === 0 || code === 1) { // WCCILpmon -version exits with code 1
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
function parseVersionOutput(output: string, executablePath: string): DetailedVersionInfo {
	// Example output:
	// WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)
	// WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!

	const lines = output.split('\n').filter(line => line.trim());
	
	for (const line of lines) {
		// Look for the version line (contains version, platform, build date, commit hash)
		const versionMatch = line.match(/(\d+\.\d+\.\d+)\s+platform\s+(\w+)\s+(\w+)\s+linked\s+at\s+([^(]+)\s*\(([^)]+)\)/);
		
		if (versionMatch) {
			return {
				version: versionMatch[1],
				platform: versionMatch[2],
				architecture: versionMatch[3], 
				buildDate: versionMatch[4].trim(),
				commitHash: versionMatch[5],
				rawOutput: output,
				executablePath: executablePath
			};
		}
	}

	// If parsing fails, return basic information
	const basicVersionMatch = output.match(/(\d+\.\d+\.\d+)/);
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
async function showVersionInfoDialog(versionInfo: DetailedVersionInfo): Promise<void> {
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
	
	const action = await vscode.window.showInformationMessage(
		summaryMsg,
		'Copy to Clipboard',
		'Show in Output'
	);

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

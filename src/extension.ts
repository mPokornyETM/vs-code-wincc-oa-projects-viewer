import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JSDOM } from 'jsdom';
import * as DOMPurify from 'dompurify';

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
 * Gets the common WinCC OA installation paths for detecting delivered sub-projects
 * @returns Array of common installation paths in lowercase
 */
function getWinCCOAInstallationPaths(): string[] {
	// Return all possible installation paths (both Windows and Unix) for testing compatibility
	const windowsPaths = [
		'c:\\siemens\\automation\\wincc_oa\\',
		'c:\\program files\\siemens\\wincc_oa\\',
		'c:\\program files (x86)\\siemens\\wincc_oa\\',
		'c:\\programdata\\siemens\\wincc_oa\\'
	];
	
	const unixPaths = [
		'/opt/wincc_oa/'
	];
	
	if (os.platform() === 'win32') {
		// On Windows, include both Windows paths and Unix paths for cross-platform compatibility
		return [...windowsPaths, ...unixPaths];
	} else {
		// On Unix systems, return Unix paths
		return unixPaths;
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
	
	// Try to extract version from project name (look for patterns like 3.20, 3_20, 3.21.1, etc.)
	if (project.config.name) {
		const versionMatch = project.config.name.match(/(\d{1,2}[._]\d{1,2}(?:[._]\d{1,2})?)/);
		if (versionMatch) {
			// Convert underscores to dots for consistency
			return versionMatch[1].replace(/_/g, '.');
		}
	}
	
	// Try to extract from installation directory path
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
	
	// Check if the project is installed in the WinCC OA installation directory
	const installDir = project.config.installationDir.toLowerCase().replace(/\\/g, '/');
	const winccOAInstallPaths = getWinCCOAInstallationPaths();
	
	return winccOAInstallPaths.some(path => {
		const normalizedPath = path.toLowerCase().replace(/\\/g, '/');
		return installDir.startsWith(normalizedPath);
	});
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

type TreeItem = ProjectCategory | WinCCOAProject;

class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<TreeItem | undefined | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

	private projects: WinCCOAProject[] = [];
	public categories: ProjectCategory[] = [];

	refresh(): void {
		this.loadProjects();
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
			// Return top-level categories
			return Promise.resolve(this.categories);
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

	private loadProjects(): void {
		const configPath = getPvssInstConfPath();
		
		if (!fs.existsSync(configPath)) {
			vscode.window.showWarningMessage(`WinCC OA configuration file not found: ${configPath}`);
			this.projects = [];
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
		const currentProjects = this.projects.filter(p => p.isCurrent);
		const runnableProjects = this.projects.filter(p => p.isRunnable && !p.isWinCCOASystem && !p.isCurrent);
		const winccOASystemVersions = this.projects.filter(p => p.isWinCCOASystem);
		
		// Separate WinCC OA delivered sub-projects from user sub-projects
		const allSubProjects = this.projects.filter(p => !p.isRunnable && !p.isWinCCOASystem && !this.isUnregistered(p));
		const winccOADeliveredSubProjects = allSubProjects.filter(p => this.isWinCCOADeliveredSubProject(p));
		const userSubProjects = allSubProjects.filter(p => !this.isWinCCOADeliveredSubProject(p));
		
		const notRegisteredProjects = this.projects.filter(p => this.isUnregistered(p));

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
		
		if (notRegisteredProjects.length > 0) {
			this.categories.push(new ProjectCategory('Not Registered', notRegisteredProjects, 'notregistered'));
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
			const version = this.extractVersionFromProject(project) || 'Unknown';
			
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

	private extractVersionFromProject(project: WinCCOAProject): string | null {
		// Check for null or undefined project
		if (!project || !project.config) {
			return null;
		}
		
		// Try to extract version from project version field first
		if (project.version) {
			return project.version;
		}
		
		// Try to extract version from project name (look for patterns like 3.20, 3_20, 3.21.1, etc.)
		if (project.config.name) {
			const versionMatch = project.config.name.match(/(\d{1,2}[._]\d{1,2}(?:[._]\d{1,2})?)/);
			if (versionMatch) {
				// Convert underscores to dots for consistency
				return versionMatch[1].replace(/_/g, '.');
			}
		}
		
		// Try to extract from installation directory path
		if (project.config.installationDir) {
			const pathVersionMatch = project.config.installationDir.match(/(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/);
			if (pathVersionMatch) {
				return pathVersionMatch[1];
			}
		}
		
		return null;
	}

	private isUnregistered(project: WinCCOAProject): boolean {
		// For now, we'll consider projects as "not registered" if they don't have proper config
		// This can be expanded based on specific criteria
		return !project.config.installationDir || project.config.installationDir === 'Unknown';
	}

	private isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
		// Use the global utility function to check for WinCC OA delivered sub-projects
		return isWinCCOADeliveredSubProject(project);
	}

	private async findUnregisteredProjects(): Promise<WinCCOAProject[]> {
		// This method can be extended to scan file system for WinCC OA projects
		// that are not registered in pvssInst.conf
		const unregisteredProjects: WinCCOAProject[] = [];
		
		// Example: Scan common WinCC OA project locations
		// This would need to be implemented based on specific requirements
		// For now, return empty array
		
		return unregisteredProjects;
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
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 0;
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
        }
        .tab-button:hover {
            opacity: 1;
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .tab-button.active {
            opacity: 1;
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
        }
        .tab-content {
            display: none;
            padding: 20px 0;
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
			// Dynamically import marked since it's an ES module
			const { marked } = await import('marked');
			
			// Configure marked options
			marked.setOptions({
				gfm: true, // GitHub Flavored Markdown
				breaks: true, // Convert line breaks to <br>
			});

			// Convert markdown to HTML
			const rawHtml = await marked.parse(markdown);
			
			// Sanitize HTML to prevent XSS attacks
			const window = new JSDOM('').window;
			const purify = DOMPurify.default(window as any);
			
			// Configure DOMPurify to allow safe HTML elements
			const cleanHtml = purify.sanitize(rawHtml, {
				ALLOWED_TAGS: [
					'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
					'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
					'ul', 'ol', 'li', 'blockquote',
					'a', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
					'hr', 'div', 'span'
				],
				ALLOWED_ATTR: [
					'href', 'title', 'alt', 'src', 'width', 'height',
					'class', 'id', 'style'
				],
				ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|ftp):|[^a-z]|[a-z+.-]+(?:[^a-z+.-:]|$))/i
			});

			return cleanHtml;
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

// Export the path utility functions and new types
export { getPvssInstConfPath, getWinCCOAInstallationPaths, ProjectCategory, WinCCOAProjectProvider };

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

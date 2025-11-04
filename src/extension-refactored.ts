import * as vscode from 'vscode';

// Import all the refactored modules
import { WinCCOAProject, ProjectCategory, TreeItem, ProjectConfig, CurrentProjectInfo } from './types';
import { 
	getPvssInstConfPath, 
	extractVersionFromProject, 
	isWinCCOADeliveredSubProject, 
	canUnregisterProject 
} from './utils';
import { 
	initializeCommandHistory, 
	addToCommandHistory, 
	showCommandHistory, 
	clearCommandHistory 
} from './commands/history';
import { 
	calculateProjectHealth, 
	getHealthScoreColor, 
	getHealthGradeIcon 
} from './health';
import { 
	getDetailedVersionInfo, 
	parseVersionOutput, 
	showVersionInfoDialog 
} from './version';

// Re-export types for backward compatibility
export { 
	WinCCOAProject, 
	ProjectCategory, 
	TreeItem, 
	ProjectConfig, 
	CurrentProjectInfo,
	extractVersionFromProject,
	isWinCCOADeliveredSubProject,
	canUnregisterProject,
	calculateProjectHealth,
	getHealthScoreColor,
	getHealthGradeIcon,
	getDetailedVersionInfo,
	parseVersionOutput
};

// Global variables
let outputChannel: vscode.OutputChannel;
let provider: WinCCOAProjectProvider;

/**
 * Extension activation function
 * @param context - VS Code extension context
 */
export function activate(context: vscode.ExtensionContext) {
	console.log('WinCC OA Projects extension is now active!');

	// Initialize output channel
	outputChannel = vscode.window.createOutputChannel('WinCC OA Projects');
	context.subscriptions.push(outputChannel);

	// Initialize command history
	initializeCommandHistory(outputChannel);

	// Initialize tree data provider
	provider = new WinCCOAProjectProvider();
	vscode.window.createTreeView('wincc-oa-projects', { 
		treeDataProvider: provider,
		showCollapseAll: true
	});

	// Register commands
	registerCommands(context);

	// Initial project loading
	provider.refresh();

	console.log('WinCC OA Projects extension fully activated');
}

/**
 * Extension deactivation function
 */
export function deactivate() {
	// Cleanup if needed
}

/**
 * Register all extension commands
 */
function registerCommands(context: vscode.ExtensionContext): void {
	// Tree view commands
	context.subscriptions.push(
		vscode.commands.registerCommand('wincc-oa-projects.refresh', () => {
			provider.refresh();
		})
	);

	// Project management commands
	context.subscriptions.push(
		vscode.commands.registerCommand('wincc-oa-projects.openProjectView', (project: WinCCOAProject) => {
			// This would open the project view panel - implementation needed
			vscode.window.showInformationMessage(`Opening project view for: ${project.name}`);
		})
	);

	// Version information commands
	context.subscriptions.push(
		vscode.commands.registerCommand('wincc-oa-projects.getVersionInfo', async (project?: WinCCOAProject) => {
			if (project) {
				await showVersionInfoDialog(project);
			}
		})
	);

	// Command history commands
	context.subscriptions.push(
		vscode.commands.registerCommand('wincc-oa-projects.showCommandHistory', () => {
			showCommandHistory();
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('wincc-oa-projects.clearCommandHistory', () => {
			clearCommandHistory();
			vscode.window.showInformationMessage('Command history cleared');
		})
	);
}

/**
 * Placeholder for WinCCOAProjectProvider class
 * This should be moved to src/providers/projectProvider.ts
 */
class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

	constructor() {
		// Initialize provider
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: TreeItem): Thenable<TreeItem[]> {
		if (!element) {
			// Return root level categories
			return Promise.resolve(this.getProjectCategories());
		}

		if (element instanceof ProjectCategory) {
			// Return projects in category
			return Promise.resolve(element.projects);
		}

		return Promise.resolve([]);
	}

	private getProjectCategories(): ProjectCategory[] {
		// This is a simplified implementation
		// The full implementation should parse pvssInst.conf and create categories
		return [
			new ProjectCategory('Runnable Projects', []),
			new ProjectCategory('WinCC OA Delivered Sub-Projects', []),
			new ProjectCategory('User Sub-Projects', [])
		];
	}
}

/**
 * Get API object for external extensions
 */
export function getAPI() {
	return {
		getProjects: () => provider ? [] : [], // Placeholder
		getRunnableProjects: () => provider ? [] : [], // Placeholder  
		getSubProjects: () => provider ? [] : [], // Placeholder
		getWinCCOASystemVersions: () => provider ? [] : [], // Placeholder
		getSubProjectsByVersion: (version: string) => provider ? [] : [], // Placeholder
		getWinCCOADeliveredSubProjects: () => provider ? [] : [], // Placeholder
		getUserSubProjects: () => provider ? [] : [], // Placeholder
		getCurrentProjects: () => provider ? [] : [], // Placeholder
		getCurrentProjectsInfo: () => provider ? [] : [], // Placeholder
		refreshProjects: () => provider?.refresh(),
		getPvssInstConfPath,
		getProjectCategories: () => provider ? [] : [] // Placeholder
	};
}
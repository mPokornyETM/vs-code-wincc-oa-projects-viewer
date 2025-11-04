import * as vscode from 'vscode';

// Pmon command history tracking
export interface PmonCommandHistory {
	timestamp: Date;
	project: string;
	command: string;
	response: string;
	success: boolean;
	errorReason?: string;
}

export interface ProjectConfig {
	name: string;
	id: number;
	path: string;
	system: number;
	runnable: boolean;
	installationDir: string;
	version?: string;
}

export interface CurrentProjectInfo {
	name: string;
	path: string;
	version?: string;
}

export enum PmonProjectRunningStatus {
	Unknown = 'unknown',
	Running = 'running',
	NotRunning = 'not-running',
	NotRunnable = 'not-runnable',
	SystemProject = 'system-project'
}

export interface WinCCOAManager {
	index: number;
	name: string;
	type: string;
	state: string;
	mode?: string;
	restarts: number;
	user?: string;
	startTime?: Date;
	lastRestart?: Date;
	severity?: 'OK' | 'WARNING' | 'ERROR' | 'FATAL';
	isBlocked?: boolean;
	isCritical?: boolean;
}

export interface WinCCOAProjectState {
	isRunning: boolean;
	mode: 'normal' | 'demo' | 'emergency' | 'safe' | 'unknown';
	licenseType?: 'full' | 'demo' | 'development' | 'unknown';
	systemInfo?: {
		hostname: string;
		platform: string;
		architecture: string;
	};
}

export interface WinCCOAProjectStatus {
	project: WinCCOAProject;
	managers: WinCCOAManager[];
	projectState?: WinCCOAProjectState;
	runningStatus: PmonProjectRunningStatus;
	healthScore?: WinCCOAProjectHealth;
	lastUpdated: Date;
}

export interface WinCCOAProjectHealth {
	overallScore: number;
	grade: string; // A, B, C, D, F
	status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
	issues: string[];
	recommendations: string[];
	components: {
		managerHealth: number;
		projectState: number;
		performance: number;
		reliability: number;
	};
	weights: {
		managerHealth: number;
		projectState: number;
		performance: number;
		reliability: number;
	};
}

export interface DetailedVersionInfo {
	version: string;
	platform: string;
	architecture: string;
	buildDate: string;
	commitHash: string;
	executablePath: string;
	rawOutput: string;
}

export class ProjectCategory extends vscode.TreeItem {
	constructor(
		public readonly name: string,
		public readonly projects: WinCCOAProject[],
		public readonly version?: string
	) {
		super(name, vscode.TreeItemCollapsibleState.Expanded);
		
		// Set the description to show project count
		this.description = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
		
		// Use folder icon for categories
		this.iconPath = new vscode.ThemeIcon('folder');
		
		// Set context value based on category type
		if (version) {
			this.contextValue = 'projectVersionCategory';
		} else if (name === 'WinCC OA Delivered Sub-Projects') {
			this.contextValue = 'deliveredSubProjectCategory';
		} else if (name === 'User Sub-Projects') {
			this.contextValue = 'userSubProjectCategory';
		} else if (name === 'Runnable Projects') {
			this.contextValue = 'runnableProjectCategory';
		} else {
			this.contextValue = 'projectCategory';
		}
	}
}

export class WinCCOAProject extends vscode.TreeItem {
	public readonly name: string;
	public readonly projectId: number;
	public readonly path: string;
	public readonly system: number;
	public readonly runnable: boolean;
	public readonly installationDir: string;
	public readonly version?: string;
	public readonly isCurrent: boolean;
	public readonly isWinCCOASystem: boolean;

	constructor(config: ProjectConfig, isCurrent: boolean = false) {
		super(config.name, vscode.TreeItemCollapsibleState.None);
		
		this.name = config.name;
		this.projectId = config.id;
		this.id = config.id.toString();
		this.path = config.path;
		this.system = config.system;
		this.runnable = config.runnable;
		this.installationDir = config.installationDir;
		this.version = config.version;
		this.isCurrent = isCurrent;
		this.isWinCCOASystem = config.system === 1;
		
		// Set the description with path and version info
		const pathInfo = this.path === 'N/A' ? '' : ` • ${this.path}`;
		const versionInfo = this.version ? ` • v${this.version}` : '';
		this.description = `${pathInfo}${versionInfo}`;
		
		// Set tooltip with all project information
		this.tooltip = this.generateTooltip();
		
		// Set icon based on project type and state
		this.setIconAndContext();
		
		// Set command to open project view when clicked
		this.command = {
			command: 'wincc-oa-projects.openProjectView',
			title: 'Open Project View',
			arguments: [this]
		};
	}

	private generateTooltip(): vscode.MarkdownString {
		const tooltip = new vscode.MarkdownString();
		tooltip.isTrusted = true;
		
		tooltip.appendMarkdown(`**${this.name}**\n\n`);
		tooltip.appendMarkdown(`• **ID:** ${this.projectId}\n`);
		tooltip.appendMarkdown(`• **Type:** ${this.getProjectTypeDescription()}\n`);
		
		if (this.path !== 'N/A') {
			tooltip.appendMarkdown(`• **Path:** \`${this.path}\`\n`);
		}
		
		tooltip.appendMarkdown(`• **Installation:** \`${this.installationDir}\`\n`);
		
		if (this.version) {
			tooltip.appendMarkdown(`• **Version:** ${this.version}\n`);
		}
		
		tooltip.appendMarkdown(`• **Runnable:** ${this.runnable ? '✅ Yes' : '❌ No'}\n`);
		
		if (this.isCurrent) {
			tooltip.appendMarkdown(`• **Status:** 🟢 Current Project\n`);
		}
		
		return tooltip;
	}

	private getProjectTypeDescription(): string {
		if (this.isWinCCOASystem) {
			return 'WinCC OA System Installation';
		}
		if (this.runnable) {
			return 'Runnable Project';
		}
		if (this.installationDir.includes('WinCC_OA')) {
			return 'WinCC OA Delivered Sub-Project';
		}
		return 'User Sub-Project';
	}

	private setIconAndContext(): void {
		if (this.isCurrent) {
			// Current project - green dot
			this.iconPath = new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor('terminal.ansiGreen'));
			this.contextValue = 'currentProject';
		} else if (this.isWinCCOASystem) {
			// WinCC OA system installation
			this.iconPath = new vscode.ThemeIcon('server');
			this.contextValue = 'winccOASystemProject';
		} else if (this.runnable) {
			// Runnable project
			this.iconPath = new vscode.ThemeIcon('play');
			this.contextValue = 'runnableProject';
		} else if (this.installationDir.includes('WinCC_OA')) {
			// WinCC OA delivered sub-project
			this.iconPath = new vscode.ThemeIcon('package');
			this.contextValue = 'deliveredSubProject';
		} else {
			// User sub-project
			this.iconPath = new vscode.ThemeIcon('file-directory');
			this.contextValue = 'userSubProject';
		}
	}
}

export type TreeItem = ProjectCategory | WinCCOAProject;
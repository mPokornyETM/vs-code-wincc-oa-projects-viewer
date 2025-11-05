import * as vscode from 'vscode';

// Import all the refactored modules
import { WinCCOAProject, ProjectCategory, TreeItem, ProjectConfig, CurrentProjectInfo } from './types';
import { extractVersionFromProject, isWinCCOADeliveredSubProject, canUnregisterProject } from './utils';
import {
    initializeCommandHistory,
    addToCommandHistory,
    showCommandHistory,
    clearCommandHistory
} from './commands/history';
import { calculateProjectHealth, getHealthScoreColor, getHealthGradeIcon } from './health';
import { getDetailedVersionInfo, parseVersionOutput, showVersionInfoDialog } from './version';

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
            vscode.window.showInformationMessage(`Opening project view for: ${project.config.name}`);
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
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | null | void> = new vscode.EventEmitter<
        TreeItem | undefined | null | void
    >();
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
            new ProjectCategory('Runnable Projects', [], 'runnable'),
            new ProjectCategory('WinCC OA Delivered Sub-Projects', [], 'subprojects'),
            new ProjectCategory('User Sub-Projects', [], 'subprojects')
        ];
    }
}

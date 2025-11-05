// Enhanced Tree Provider for Base Extension
// This file shows how to enhance the existing tree provider to support admin actions

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { readProjectVersionFromConfig } from '../utils';

import { ProjectConfig, PmonProjectRunningStatus } from '../types';

// Enhanced WinCC OA Project interface (extends the base ProjectConfig)
export interface EnhancedWinCCOAProject extends Omit<ProjectConfig, 'notRunnable'> {
    configPath: string;
    projectPath: string;
    version?: string;
    // Additional properties for admin functionality
    isRunnable: boolean;
    isSubProject?: boolean;
    registrationStatus?: 'registered' | 'unregistered' | 'unknown';
}

// Enhanced tree data provider with admin functionality
export class EnhancedWinCCOAProjectProvider implements vscode.TreeDataProvider<EnhancedWinCCOAProject> {
    private _onDidChangeTreeData: vscode.EventEmitter<EnhancedWinCCOAProject | undefined | null | void> =
        new vscode.EventEmitter<EnhancedWinCCOAProject | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<EnhancedWinCCOAProject | undefined | null | void> =
        this._onDidChangeTreeData.event;

    private projects: EnhancedWinCCOAProject[] = [];
    private outputChannel: vscode.OutputChannel;

    constructor(outputChannel: vscode.OutputChannel) {
        this.outputChannel = outputChannel;
        this.refreshProjects();
    }

    refresh(): void {
        this.refreshProjects().then(() => {
            this._onDidChangeTreeData.fire();
        });
    }

    // Enhanced getTreeItem with admin context support
    getTreeItem(element: EnhancedWinCCOAProject): vscode.TreeItem {
        const displayName = element.version ? `${element.name} (v${element.version})` : element.name;
        const treeItem = new vscode.TreeItem(displayName, vscode.TreeItemCollapsibleState.None);

        // Enhanced tooltip with admin info
        let tooltip = `Project: ${element.name}\nPath: ${element.projectPath}`;
        if (element.version) {
            tooltip += `\nVersion: ${element.version}`;
        }
        if (element.registrationStatus) {
            tooltip += `\nStatus: ${element.registrationStatus}`;
        }
        treeItem.tooltip = tooltip;

        // Set description
        treeItem.description = element.version || path.dirname(element.configPath);

        // IMPORTANT: Set contextValue to enable admin commands
        treeItem.contextValue = 'winccoa.project'; // This enables the admin context menu items

        // Set resource URI for additional context
        treeItem.resourceUri = vscode.Uri.file(element.projectPath);

        // Add project status icon
        if (element.registrationStatus === 'registered') {
            treeItem.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('charts.green'));
        } else if (element.registrationStatus === 'unregistered') {
            treeItem.iconPath = new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.red'));
        } else {
            treeItem.iconPath = new vscode.ThemeIcon('project');
        }

        // Store project data in the tree item for admin commands
        (treeItem as any).projectData = {
            name: element.name,
            path: element.projectPath,
            projectPath: element.projectPath,
            configPath: element.configPath,
            version: element.version
        };

        return treeItem;
    }

    getChildren(element?: EnhancedWinCCOAProject): Thenable<EnhancedWinCCOAProject[]> {
        if (!element) {
            return Promise.resolve(this.projects);
        }
        return Promise.resolve([]);
    }

    // Enhanced project refresh with registration status detection
    private async refreshProjects(): Promise<void> {
        this.projects = [];
        const workspaceFolders = vscode.workspace.workspaceFolders;

        if (workspaceFolders) {
            for (const folder of workspaceFolders) {
                await this.findWinCCOAProjects(folder.uri.fsPath);
            }
        }

        // Also discover registered projects from system
        await this.discoverRegisteredProjects();
    }

    private async findWinCCOAProjects(folderPath: string): Promise<void> {
        try {
            const files = fs.readdirSync(folderPath);

            for (const file of files) {
                const fullPath = path.join(folderPath, file);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory() && file === 'config') {
                    // Check if config directory contains config file
                    const configFilePath = path.join(fullPath, 'config');
                    if (fs.existsSync(configFilePath)) {
                        const configStat = fs.statSync(configFilePath);
                        if (configStat.isFile()) {
                            const projectName = path.basename(folderPath);

                            // Read version from config file directly
                            const version = readProjectVersionFromConfig(folderPath);

                            // Detect registration status
                            const registrationStatus = await this.detectRegistrationStatus(folderPath, projectName);

                            this.projects.push({
                                name: projectName,
                                configPath: configFilePath,
                                projectPath: folderPath,
                                version: version || undefined,
                                registrationStatus,
                                isRunnable: registrationStatus === 'registered',
                                installationDir: folderPath,
                                installationDate: new Date().toISOString()
                            });
                        }
                    }
                } else if (stat.isDirectory() && !file.startsWith('.')) {
                    await this.findWinCCOAProjects(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${folderPath}:`, error);
        }
    }

    // Method to discover registered projects from WinCC OA system
    private async discoverRegisteredProjects(): Promise<void> {
        try {
            // This would integrate with the base extension's project discovery
            // For now, we'll use a placeholder implementation
            this.outputChannel.appendLine('Discovering registered WinCC OA projects...');

            // In a real implementation, this would:
            // 1. Read from pvssInst.conf
            // 2. Query WinCC OA registry
            // 3. Call base extension APIs

            // Placeholder: mark existing projects as registered if they have valid configs
            for (const project of this.projects) {
                if (!project.registrationStatus || project.registrationStatus === 'unknown') {
                    project.registrationStatus = fs.existsSync(project.configPath) ? 'registered' : 'unregistered';
                }
            }
        } catch (error) {
            this.outputChannel.appendLine(`Error discovering registered projects: ${error}`);
        }
    }

    // Method to detect registration status of a project
    private async detectRegistrationStatus(
        projectPath: string,
        projectName: string
    ): Promise<'registered' | 'unregistered' | 'unknown'> {
        try {
            // Check if project is registered by looking for it in various places
            // For now, we'll use a simple heuristic based on config file existence
            // In a real implementation, this would check the WinCC OA registry

            // Check if config file exists and is valid
            const configPath = path.join(projectPath, 'config', 'config');
            if (fs.existsSync(configPath)) {
                return 'registered';
            }

            return 'unregistered';
        } catch (error) {
            console.error(`Error detecting registration status for ${projectName}:`, error);
            return 'unknown';
        }
    }

    // Method to update project registration status
    public updateProjectStatus(projectPath: string, status: 'registered' | 'unregistered' | 'unknown'): void {
        const project = this.projects.find(p => p.projectPath === projectPath);
        if (project) {
            project.registrationStatus = status;
            project.isRunnable = status === 'registered';
            this._onDidChangeTreeData.fire(project);
        }
    }

    // Method to select a specific project
    public selectProject(projectPath: string): void {
        // This would be called by admin commands after registration
        const project = this.projects.find(p => p.projectPath === projectPath);
        if (project) {
            // Reveal the project in the tree view
            vscode.commands.executeCommand('winccOAProjects.focus');
            // Additional selection logic would go here
        }
    }

    // Method to get project by path (useful for admin operations)
    public getProjectByPath(projectPath: string): EnhancedWinCCOAProject | undefined {
        return this.projects.find(p => p.projectPath === projectPath);
    }

    // Method to get all registered projects
    public getRegisteredProjects(): EnhancedWinCCOAProject[] {
        return this.projects.filter(p => p.registrationStatus === 'registered');
    }
}

// Enhanced tree view registration function
export function registerEnhancedTreeView(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
): EnhancedWinCCOAProjectProvider {
    const provider = new EnhancedWinCCOAProjectProvider(outputChannel);

    // Register the tree data provider
    const treeView = vscode.window.createTreeView('winccOAProjects', {
        treeDataProvider: provider,
        showCollapseAll: true
    });

    context.subscriptions.push(treeView);

    // Register refresh command
    const refreshCommand = vscode.commands.registerCommand('winccoa.refreshProjects', () => {
        outputChannel.appendLine('Refreshing WinCC OA project list...');
        provider.refresh();
        vscode.window.showInformationMessage('WinCC OA project list refreshed');
    });

    context.subscriptions.push(refreshCommand);

    // Register select project command
    const selectProjectCommand = vscode.commands.registerCommand('winccoa.selectProject', (projectPath: string) => {
        outputChannel.appendLine(`Selecting project: ${projectPath}`);
        provider.selectProject(projectPath);
    });

    context.subscriptions.push(selectProjectCommand);

    return provider;
}

// Utility function to enhance existing tree items with admin context
export function enhanceTreeItemWithAdminContext(
    treeItem: vscode.TreeItem,
    project: EnhancedWinCCOAProject
): vscode.TreeItem {
    // Set the context value to enable admin menu items
    treeItem.contextValue = 'winccoa.project';

    // Add project data for admin commands
    (treeItem as any).projectData = {
        name: project.name,
        path: project.projectPath,
        projectPath: project.projectPath,
        configPath: project.configPath,
        version: project.version
    };

    return treeItem;
}

// Example of how to integrate with existing tree provider
export function integrateAdminWithExistingProvider(existingProvider: vscode.TreeDataProvider<any>): void {
    // This function shows how to add admin functionality to an existing tree provider

    const originalGetTreeItem = existingProvider.getTreeItem;

    // Override getTreeItem to add admin context
    existingProvider.getTreeItem = function (element: any): vscode.TreeItem | Thenable<vscode.TreeItem> {
        const treeItemResult = originalGetTreeItem.call(this, element);

        // Handle both TreeItem and Thenable<TreeItem>
        if (treeItemResult && typeof (treeItemResult as any).then === 'function') {
            // It's a Thenable<TreeItem>
            return (treeItemResult as Thenable<vscode.TreeItem>).then(treeItem => {
                // Add admin context if this is a WinCC OA project
                if (element && (element.projectPath || element.configPath)) {
                    treeItem.contextValue = 'winccoa.project';

                    // Store project data for admin commands
                    (treeItem as any).projectData = {
                        name: element.name || path.basename(element.projectPath || element.path),
                        path: element.projectPath || element.path,
                        projectPath: element.projectPath || element.path,
                        configPath: element.configPath,
                        version: element.version
                    };
                }
                return treeItem;
            });
        } else {
            // It's a TreeItem
            const treeItem = treeItemResult as vscode.TreeItem;
            // Add admin context if this is a WinCC OA project
            if (element && (element.projectPath || element.configPath)) {
                treeItem.contextValue = 'winccoa.project';

                // Store project data for admin commands
                (treeItem as any).projectData = {
                    name: element.name || path.basename(element.projectPath || element.path),
                    path: element.projectPath || element.path,
                    projectPath: element.projectPath || element.path,
                    configPath: element.configPath,
                    version: element.version
                };
            }
            return treeItem;
        }
    };
}

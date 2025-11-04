/**
 * @fileoverview User Interface and Tree View Types
 *
 * This module defines the classes and types used for the VS Code tree view
 * interface, including project categories and project tree items that are
 * displayed in the WinCC OA Projects view.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */

import * as vscode from 'vscode';
import { ProjectConfig, PmonProjectRunningStatus } from './project';

//------------------------------------------------------------------------------

/**
 * Represents a category node in the project tree view.
 * Categories group projects by type, status, or version for better organization.
 */
export class ProjectCategory extends vscode.TreeItem {
    /** Sub-categories nested under this category */
    public subCategories: ProjectCategory[] = [];

    /**
     * Creates a new project category for the tree view.
     *
     * @param label Display name for the category
     * @param projects Array of projects in this category
     * @param categoryType Type of category for different behaviors
     * @param version Optional version string for version-based categories
     * @param categoryDescription Optional description for tooltip
     */
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

    //--------------------------------------------------------------------------

    /**
     * Creates a detailed tooltip for the category showing project count and description.
     *
     * @returns Formatted tooltip string with project information
     */
    private createTooltip(): string {
        if (this.version) {
            return `WinCC OA ${this.version}: ${this.projects.length} sub-project(s)`;
        }
        if (this.categoryDescription) {
            return `${this.categoryDescription}\n${this.projects.length} project(s)`;
        }
        return `${this.projects.length} project(s)`;
    }

    //--------------------------------------------------------------------------

    /**
     * Creates the description text shown next to the category name.
     *
     * @returns Formatted description string with counts
     */
    private createDescription(): string {
        if (this.subCategories.length > 0) {
            const totalProjects = this.subCategories.reduce((sum, cat) => sum + cat.projects.length, 0);
            return `(${this.subCategories.length} versions, ${totalProjects} projects)`;
        }
        return `(${this.projects.length})`;
    }

    //--------------------------------------------------------------------------

    /**
     * Returns the appropriate icon for the category based on its type.
     *
     * @returns VS Code theme icon with appropriate color
     */
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

//------------------------------------------------------------------------------

/**
 * Represents a WinCC OA project node in the tree view.
 * Extends VS Code TreeItem with WinCC OA specific properties and behaviors.
 */
export class WinCCOAProject extends vscode.TreeItem {
    /** Current PMON status of the project */
    private _pmonStatus: PmonProjectRunningStatus = PmonProjectRunningStatus.Unknown;

    /**
     * Creates a new WinCC OA project tree item.
     *
     * @param config Project configuration data
     * @param installationDir Installation directory path
     * @param isRunnable Whether the project can be executed
     * @param isCurrent Whether this is the currently active project
     * @param version Optional WinCC OA version string
     */
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

    //--------------------------------------------------------------------------

    /**
     * Gets the current PMON status of the project.
     *
     * @returns Current PMON project running status
     */
    public get pmonStatus(): PmonProjectRunningStatus {
        return this._pmonStatus;
    }

    //--------------------------------------------------------------------------

    /**
     * Sets the PMON status and updates UI elements accordingly.
     *
     * @param status New PMON status to set
     */
    public set pmonStatus(status: PmonProjectRunningStatus) {
        this._pmonStatus = status;
        this.contextValue = this.getContextValue();
        this.iconPath = this.getIcon();
    }

    //--------------------------------------------------------------------------

    /**
     * Determines if this project is a WinCC OA system installation.
     * System projects are part of the WinCC OA installation itself.
     *
     * @returns True if this is a system installation project
     */
    public get isWinCCOASystem(): boolean {
        return this.version !== undefined && this.config.name === this.version;
    }

    //--------------------------------------------------------------------------

    /**
     * Determines the VS Code context value for this project.
     * Context values control which commands are available in the context menu.
     *
     * @returns Context value string for VS Code command filtering
     */
    private getContextValue(): string {
        // Special context for WinCC OA system installations
        if (this.isWinCCOASystem) {
            return 'winccOASystemProject';
        }

        // Unregistered projects have special context
        if (this.contextValue === 'winccOAProjectUnregistered') {
            return 'winccOAProjectUnregistered';
        }

        // Runnable projects have different contexts based on running state
        if (this.isRunnable) {
            switch (this._pmonStatus) {
                case PmonProjectRunningStatus.Running:
                    return 'winccOAProjectRunnableRunning';
                case PmonProjectRunningStatus.NotRunning:
                    return 'winccOAProjectRunnableStopped';
                case PmonProjectRunningStatus.Unknown:
                default:
                    return 'winccOAProjectRunnable';
            }
        }

        // Regular projects (sub-projects, extensions)
        return 'winccOAProject';
    }

    //--------------------------------------------------------------------------

    /**
     * Creates a detailed tooltip showing project information.
     *
     * @returns Multi-line tooltip string with project details
     */
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
        } else if (this.isCurrent) {
            lines.unshift('*** CURRENT PROJECT ***');
        }

        return lines.join('\n');
    }

    //--------------------------------------------------------------------------

    /**
     * Creates the description text shown next to the project name.
     *
     * @returns Formatted description string with status indicators
     */
    private createDescription(): string {
        const labels: string[] = [];

        // Add status indicators
        if (this.contextValue === 'winccOAProjectUnregistered') {
            labels.push('❗ Unregistered');
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

    //--------------------------------------------------------------------------

    /**
     * Returns the appropriate icon for the project based on its state and type.
     *
     * @returns VS Code theme icon with appropriate color coding
     */
    private getIcon(): vscode.ThemeIcon {
        if (this.contextValue === 'winccOAProjectUnregistered') {
            return new vscode.ThemeIcon('warning', new vscode.ThemeColor('list.warningForeground'));
        } else if (this.isCurrent) {
            return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('list.highlightForeground'));
        } else if (this.isWinCCOASystem) {
            return new vscode.ThemeIcon('gear');
        } else if (this.isRunnable) {
            // Different icons based on PMON status
            switch (this._pmonStatus) {
                case PmonProjectRunningStatus.Running:
                    return new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('testing.iconPassed'));
                case PmonProjectRunningStatus.NotRunning:
                    return new vscode.ThemeIcon('stop-circle', new vscode.ThemeColor('testing.iconFailed'));
                case PmonProjectRunningStatus.Unknown:
                default:
                    return new vscode.ThemeIcon('server-process');
            }
        } else {
            // Non-runnable projects are extensions/plugins
            return new vscode.ThemeIcon('extensions');
        }
    }
}

//------------------------------------------------------------------------------

/**
 * Union type representing any item that can appear in the project tree view.
 */
export type TreeItem = ProjectCategory | WinCCOAProject;

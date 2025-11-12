/**
 * @fileoverview WinCC OA Project Tree Item Type
 *
 * This module defines the WinCCOAProject class used for representing
 * individual WinCC OA projects in the VS Code tree view interface.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

import * as vscode from 'vscode';
import { ProjectConfig } from '../project/ProjectConfig';
import { PmonProjectRunningStatus } from '../project/PmonProjectRunningStatus';

//------------------------------------------------------------------------------

/**
 * Represents a WinCC OA project node in the tree view.
 * Extends VS Code TreeItem with WinCC OA specific properties and behaviors.
 */
export class WinCCOAProject extends vscode.TreeItem {
    /** Current PMON status of the project */
    private _pmonStatus: PmonProjectRunningStatus = PmonProjectRunningStatus.Unknown;

    /** Function to check if project can be unregistered (for protected status) */
    private _canUnregisterCheck?: (project: WinCCOAProject) => { canUnregister: boolean; reason?: string };

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
     * Sets the function used to check if project can be unregistered.
     * This is used to determine protected project status.
     *
     * @param checkFn Function that checks unregister eligibility
     */
    public setCanUnregisterCheck(
        checkFn: (project: WinCCOAProject) => { canUnregister: boolean; reason?: string }
    ): void {
        this._canUnregisterCheck = checkFn;
        // Update UI elements that depend on protected status
        this.contextValue = this.getContextValue();
        this.tooltip = this.createTooltip();
        this.description = this.createDescription();
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

        // Check if project can be unregistered (protected projects)
        if (this._canUnregisterCheck) {
            const canUnregisterResult = this._canUnregisterCheck(this);
            if (!canUnregisterResult.canUnregister) {
                return 'winccOAProjectProtected';
            }
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

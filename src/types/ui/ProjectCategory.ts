/**
 * @fileoverview Project Category Tree Item Type
 *
 * This module defines the ProjectCategory class used for organizing
 * WinCC OA projects into categories within the VS Code tree view.
 */

import * as vscode from 'vscode';
import { WinCCOAProject } from './WinCCOAProject';

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

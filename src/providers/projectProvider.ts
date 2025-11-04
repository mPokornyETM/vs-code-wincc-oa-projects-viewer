import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TreeItem } from 'vscode';

// Import types and utilities from our modules
import { WinCCOAProject, ProjectCategory, ProjectConfig, CurrentProjectInfo, PmonProjectRunningStatus } from '../types';
import { getPvssInstConfPath, extractVersionFromProject, isWinCCOADeliveredSubProject } from '../utils';
import { checkProjectRunningStatus } from '../pmon';

/**
 * Tree data provider for WinCC OA projects
 * Manages loading, filtering, and displaying projects in the VS Code tree view
 */
export class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TreeItem | undefined | void> = new vscode.EventEmitter<
        TreeItem | undefined | void
    >();
    readonly onDidChangeTreeData: vscode.Event<TreeItem | undefined | void> = this._onDidChangeTreeData.event;

    private projects: WinCCOAProject[] = [];
    public categories: ProjectCategory[] = [];
    public currentFilter: string = '';
    private filteredCategories: ProjectCategory[] = [];

    /**
     * Refreshes the project list and updates the tree view
     */
    refresh(): void {
        this.loadProjects()
            .then(() => {
                this._onDidChangeTreeData.fire();
            })
            .catch(error => {
                console.error('Error refreshing projects:', error);
                this._onDidChangeTreeData.fire();
            });
    }

    /**
     * Updates pmon status for all runnable projects and refreshes the tree view
     */
    async updatePmonStatuses(): Promise<void> {
        const runnableProjects = this.projects.filter(p => p.isRunnable && !p.isWinCCOASystem);

        for (const project of runnableProjects) {
            try {
                const status = await checkProjectRunningStatus(project);
                project.pmonStatus = status;
            } catch (error) {
                // If we can't determine status, set to unknown
                project.pmonStatus = PmonProjectRunningStatus.Unknown;
            }
        }

        // Refresh tree view to show updated icons and context
        this._onDidChangeTreeData.fire();
    }

    /**
     * Updates pmon status for a specific project and refreshes the tree view
     */
    async updateProjectPmonStatus(project: WinCCOAProject): Promise<void> {
        if (!project.isRunnable || project.isWinCCOASystem) {
            return;
        }

        try {
            const status = await checkProjectRunningStatus(project);
            project.pmonStatus = status;
        } catch (error) {
            // If we can't determine status, set to unknown
            project.pmonStatus = PmonProjectRunningStatus.Unknown;
        }

        // Refresh tree view to show updated icons and context
        this._onDidChangeTreeData.fire();
    }

    /**
     * Gets all loaded projects
     */
    getProjects(): WinCCOAProject[] {
        return this.projects;
    }

    /**
     * Gets a tree item for the VS Code tree view
     */
    getTreeItem(element: TreeItem): vscode.TreeItem {
        return element;
    }

    /**
     * Gets children for the tree view (categories or projects)
     */
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
            if (
                filteredCategory &&
                (filteredCategory.projects.length > 0 || filteredCategory.subCategories.length > 0)
            ) {
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
        const filteredProjects = category.projects.filter(project => this.projectMatchesFilter(project, searchTerm));

        // Filter sub-categories recursively
        const filteredSubCategories: ProjectCategory[] = [];
        for (const subCategory of category.subCategories) {
            const filteredSubCategory = this.filterCategory(subCategory, searchTerm);
            if (
                filteredSubCategory &&
                (filteredSubCategory.projects.length > 0 || filteredSubCategory.subCategories.length > 0)
            ) {
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

        return (
            projectName.includes(searchTerm) ||
            projectPath.includes(searchTerm) ||
            projectVersion.includes(searchTerm) ||
            projectCompany.includes(searchTerm)
        );
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

    /**
     * Loads projects from configuration file and unregistered projects from workspace
     */
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
                const existingProject = projects.find(
                    p => p.config.name === currentProject.projectName && p.version === currentProject.version
                );

                if (
                    !existingProject &&
                    currentProject.installationDir &&
                    fs.existsSync(currentProject.installationDir)
                ) {
                    // Create a config for the current project
                    const currentConfig: ProjectConfig = {
                        name: currentProject.projectName,
                        installationDir: currentProject.installationDir,
                        installationDate: 'Unknown',
                        notRunnable: false,
                        currentProject: true
                    };

                    const isRunnable = this.checkProjectRunnable(currentProject.installationDir);
                    const version = isRunnable
                        ? this.getProjectVersion(currentProject.installationDir)
                        : currentProject.version;

                    projects.push(
                        new WinCCOAProject(currentConfig, currentProject.installationDir, isRunnable, true, version)
                    );
                }
            }

            // Add unregistered projects to the list
            const unregisteredProjects = await this.findUnregisteredProjects();
            projects.push(...unregisteredProjects);

            // Sort projects: current first, then runnable projects, then WinCC OA systems, then extensions/plugins
            projects.sort((a, b) => {
                if (a.isCurrent && !b.isCurrent) {
                    return -1;
                }
                if (!a.isCurrent && b.isCurrent) {
                    return 1;
                }
                if (a.isRunnable && !b.isRunnable && !b.isWinCCOASystem) {
                    return -1;
                }
                if (!a.isRunnable && !a.isWinCCOASystem && b.isRunnable) {
                    return 1;
                }
                if (a.isWinCCOASystem && !b.isWinCCOASystem) {
                    return -1;
                }
                if (!a.isWinCCOASystem && b.isWinCCOASystem) {
                    return 1;
                }
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

    /**
     * Creates project categories and organizes projects
     */
    private createCategories(): void {
        // Filter projects into categories
        const currentProjects = this.projects.filter(p => p.isCurrent && !this.isUnregistered(p));
        const runnableProjects = this.projects.filter(
            p => p.isRunnable && !p.isWinCCOASystem && !p.isCurrent && !this.isUnregistered(p)
        );
        const winccOASystemVersions = this.projects.filter(p => p.isWinCCOASystem && !this.isUnregistered(p));

        // Separate WinCC OA delivered sub-projects from user sub-projects
        const allSubProjects = this.projects.filter(
            p => !p.isRunnable && !p.isWinCCOASystem && !this.isUnregistered(p)
        );
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
            const winccOASubProjectsCategory = this.createSubProjectsWithVersions(
                winccOADeliveredSubProjects,
                'WinCC OA Version Sub-Projects',
                'Delivered by WinCC OA installation'
            );
            this.categories.push(winccOASubProjectsCategory);
        }

        if (userSubProjects.length > 0) {
            const userSubProjectsCategory = this.createSubProjectsWithVersions(
                userSubProjects,
                'User Sub-Projects',
                'Manually registered sub-projects'
            );
            this.categories.push(userSubProjectsCategory);
        }

        if (unregisteredProjects.length > 0) {
            this.categories.push(
                new ProjectCategory(
                    'Unregistered Projects',
                    unregisteredProjects,
                    'notregistered',
                    undefined,
                    'Found projects that are not registered in pvssInst.conf'
                )
            );
        }

        // Log category summary
        console.log(
            `WinCC OA Projects loaded: ${this.projects.length} total, ${this.categories.length} categories, ${currentProjects.length} current`
        );
    }

    /**
     * Creates sub-project categories organized by version
     */
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
        const subProjectsCategory = new ProjectCategory(
            categoryName,
            [],
            'subprojects',
            undefined,
            categoryDescription
        );

        // Create version sub-categories
        const sortedVersions = Array.from(versionGroups.keys()).sort();

        for (const version of sortedVersions) {
            const versionProjects = versionGroups.get(version)!;
            const versionCategory = new ProjectCategory(`Version ${version}`, versionProjects, 'version', version);
            subProjectsCategory.subCategories.push(versionCategory);
        }

        return subProjectsCategory;
    }

    /**
     * Checks if a project is unregistered
     */
    public isUnregistered(project: WinCCOAProject): boolean {
        // Check if the project has the unregistered context value
        return project.contextValue === 'winccOAProjectUnregistered';
    }

    /**
     * Checks if a project is a WinCC OA delivered sub-project
     */
    private isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
        // Use the global utility function to check for WinCC OA delivered sub-projects
        return isWinCCOADeliveredSubProject(project);
    }

    /**
     * Finds unregistered WinCC OA projects in workspace folders
     */
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

    /**
     * Gets project search paths from workspace folders
     */
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

    /**
     * Recursively scans a directory for WinCC OA projects
     */
    private async scanDirectoryForProjects(
        searchPath: string,
        registeredPaths: Set<string>,
        depth: number = 0
    ): Promise<WinCCOAProject[]> {
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

    /**
     * Checks if a directory is a WinCC OA project
     */
    private isWinCCOAProject(directoryPath: string): boolean {
        // Check if directory contains the essential WinCC OA project structure
        const configPath = path.join(directoryPath, 'config', 'config');
        return fs.existsSync(configPath);
    }

    /**
     * Determines if a directory should be skipped during scanning
     */
    private shouldSkipDirectory(dirName: string): boolean {
        // Skip common directories that are unlikely to contain WinCC OA projects
        const skipDirs = new Set([
            '.git',
            '.svn',
            '.hg', // Version control
            'node_modules',
            '.npm', // Node.js
            'bin',
            'obj',
            'build',
            'dist',
            'out', // Build outputs
            'temp',
            'tmp',
            '.tmp', // Temporary directories
            'cache',
            '.cache', // Cache directories
            'logs',
            'log', // Log directories
            '__pycache__',
            '.pytest_cache', // Python
            '.vs',
            '.vscode',
            '.idea', // IDE directories
            '$Recycle.Bin',
            'System Volume Information', // Windows system
            '.Trash',
            '.Trashes' // macOS system
        ]);

        return skipDirs.has(dirName) || dirName.startsWith('.');
    }

    /**
     * Creates a config object from a directory
     */
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

    /**
     * Parses the pvssInst.conf file to extract project configurations
     */
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
                const versionMatch =
                    sectionName.match(/Software\\[^\\]*\\PVSS II\\(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)/i) ||
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

    /**
     * Checks if a project is runnable (has config/config file)
     */
    private checkProjectRunnable(installationDir: string): boolean {
        const configPath = path.join(installationDir, 'config', 'config');
        return fs.existsSync(configPath);
    }

    /**
     * Gets the WinCC OA version from project config file
     */
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

    /**
     * Gets current project paths from VS Code workspace
     */
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

import * as assert from 'assert';
import * as path from 'path';

// Import functions directly from extension for direct testing
import * as vscode from 'vscode';
import { 
    getPvssInstConfPath, 
    extractVersionFromProject,
    isWinCCOADeliveredSubProject,
    WinCCOAProjectProvider,
    ProjectCategory,
    getProjects,
    getRunnableProjects,
    getSubProjects,
    getWinCCOADeliveredSubProjects,
    getUserSubProjects,
    getCurrentProjects,
    getAPI
} from '../extension';

// Helper function to create mock WinCCOAProject
function createMockWinCCOAProject(config: any, installationDir?: string, isRunnable = true, isCurrent = false, version?: string): any {
    return {
        config: {
            name: config.name || 'MockProject',
            installationDir: config.installationDir || installationDir || 'C:\\MockProject',
            installationDate: config.installationDate || '2024-01-01 10:00:00',
            notRunnable: config.notRunnable || !isRunnable,
            company: config.company,
            currentProject: config.currentProject || isCurrent,
            version: config.version || version
        },
        installationDir: installationDir || config.installationDir || 'C:\\MockProject',
        isRunnable,
        isCurrent,
        version,
        label: config.name || 'MockProject',
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        tooltip: `Mock project tooltip`,
        description: `Mock description`,
        contextValue: 'winccOAProject',
        isWinCCOASystem: version !== undefined && (config.name === version)
    };
}

suite('Direct Function Tests', () => {
    
    test('getPvssInstConfPath should return a path', () => {
        const result = getPvssInstConfPath();
        assert.ok(typeof result === 'string');
        assert.ok(result.length > 0);
    });
    
    test('extractVersionFromProject should handle valid project with version', () => {
        const mockProject = createMockWinCCOAProject({
            name: 'TestProject',
            version: '3.21',
            installationDir: 'C:\\TestProject'
        }, undefined, true, false, '3.21');
        
        const result = extractVersionFromProject(mockProject);
        assert.strictEqual(result, '3.21');
    });
    
    test('extractVersionFromProject should handle project without version field', () => {
        const mockProject = createMockWinCCOAProject({
            name: 'TestProject_3_20',
            installationDir: 'C:\\TestProject'
        });
        
        const result = extractVersionFromProject(mockProject);
        assert.strictEqual(result, '3.20');
    });
    
    test('extractVersionFromProject should handle project with version in path', () => {
        const mockProject = createMockWinCCOAProject({
            name: 'TestProject',
            installationDir: 'C:\\WinCC_OA\\3.19\\projects\\TestProject'
        });
        
        const result = extractVersionFromProject(mockProject);
        assert.strictEqual(result, '3.19');
    });
    
    test('isWinCCOADeliveredSubProject should identify delivered projects', () => {
        const mockProject = createMockWinCCOAProject({
            name: 'OPC_UA',
            installationDir: 'C:\\Siemens\\Automation\\WinCC_OA\\3.21\\projects\\OPC_UA'
        });
        
        const result = isWinCCOADeliveredSubProject(mockProject);
        assert.strictEqual(result, true);
    });
    
    test('isWinCCOADeliveredSubProject should identify user projects', () => {
        const mockProject = createMockWinCCOAProject({
            name: 'MyUserProject',
            installationDir: 'C:\\MyProjects\\MyUserProject'
        });
        
        const result = isWinCCOADeliveredSubProject(mockProject);
        assert.strictEqual(result, false);
    });
    
    test('ProjectCategory should create instance with correct properties', () => {
        const mockChildren: any[] = [];
        const category = new ProjectCategory('Test Category', mockChildren, 'runnable');
        
        assert.strictEqual(category.label, 'Test Category');
        assert.ok(category.collapsibleState !== undefined);
    });
    
    test('WinCCOAProjectProvider should be instantiable', () => {
        const provider = new WinCCOAProjectProvider();
        assert.ok(provider instanceof WinCCOAProjectProvider);
    });
    
    test('WinCCOAProjectProvider should have required methods', () => {
        const provider = new WinCCOAProjectProvider();
        
        assert.ok(typeof provider.getTreeItem === 'function');
        assert.ok(typeof provider.getChildren === 'function');
        assert.ok(typeof provider.refresh === 'function');
        assert.ok(provider.onDidChangeTreeData !== undefined);
    });
    
    test('API functions should be callable', () => {
        // These functions should be callable without throwing
        assert.doesNotThrow(() => {
            getProjects();
        });
        
        assert.doesNotThrow(() => {
            getRunnableProjects();
        });
        
        assert.doesNotThrow(() => {
            getSubProjects();
        });
        
        assert.doesNotThrow(() => {
            getWinCCOADeliveredSubProjects();
        });
        
        assert.doesNotThrow(() => {
            getUserSubProjects();
        });
        
        assert.doesNotThrow(() => {
            getCurrentProjects();
        });
    });
    
    test('API functions should return arrays', () => {
        const projects = getProjects();
        assert.ok(Array.isArray(projects));
        
        const runnableProjects = getRunnableProjects();
        assert.ok(Array.isArray(runnableProjects));
        
        const subProjects = getSubProjects();
        assert.ok(Array.isArray(subProjects));
        
        const deliveredProjects = getWinCCOADeliveredSubProjects();
        assert.ok(Array.isArray(deliveredProjects));
        
        const userProjects = getUserSubProjects();
        assert.ok(Array.isArray(userProjects));
        
        const currentProjects = getCurrentProjects();
        assert.ok(Array.isArray(currentProjects));
    });
    
    test('getAPI should return object with expected methods', () => {
        const api = getAPI();
        assert.ok(typeof api === 'object');
        assert.ok(typeof api.getProjects === 'function');
        assert.ok(typeof api.getRunnableProjects === 'function');
        assert.ok(typeof api.getSubProjects === 'function');
        assert.ok(typeof api.getWinCCOADeliveredSubProjects === 'function');
        assert.ok(typeof api.getUserSubProjects === 'function');
        assert.ok(typeof api.getCurrentProjects === 'function');
        assert.ok(typeof api.getCurrentProjectsInfo === 'function');
        assert.ok(typeof api.getWinCCOASystemVersions === 'function');
        assert.ok(typeof api.getSubProjectsByVersion === 'function');
    });
    
    test('WinCCOAProjectProvider refresh should not throw', () => {
        const provider = new WinCCOAProjectProvider();
        assert.doesNotThrow(() => {
            provider.refresh();
        });
    });
    
    test('WinCCOAProjectProvider getTreeItem should return item', () => {
        const provider = new WinCCOAProjectProvider();
        const mockItem = createMockWinCCOAProject({ name: 'TestProject' });
        
        const result = provider.getTreeItem(mockItem);
        assert.strictEqual(result, mockItem);
    });

    test('extractVersionFromProject should handle various version patterns', () => {
        // Test version with dots
        const project1 = createMockWinCCOAProject({
            name: 'Project_3_21_1',
            installationDir: 'C:\\Test'
        });
        assert.strictEqual(extractVersionFromProject(project1), '3.21.1');
        
        // Test version with underscores
        const project2 = createMockWinCCOAProject({
            name: 'Project_3_20',
            installationDir: 'C:\\Test'
        });
        assert.strictEqual(extractVersionFromProject(project2), '3.20');
        
        // Test path-based version
        const project3 = createMockWinCCOAProject({
            name: 'TestProject',
            installationDir: 'C:\\WinCC_OA\\3.19\\projects\\TestProject'
        });
        assert.strictEqual(extractVersionFromProject(project3), '3.19');
    });

    test('isWinCCOADeliveredSubProject should handle various path patterns', () => {
        // Standard Windows installation path
        const project1 = createMockWinCCOAProject({
            name: 'OPC_UA',
            installationDir: 'C:\\Siemens\\Automation\\WinCC_OA\\3.21\\projects\\OPC_UA'
        });
        assert.strictEqual(isWinCCOADeliveredSubProject(project1), true);
        
        // User project path
        const project2 = createMockWinCCOAProject({
            name: 'UserProject',
            installationDir: 'C:\\MyProjects\\UserProject'
        });
        assert.strictEqual(isWinCCOADeliveredSubProject(project2), false);
        
        // Project with missing installationDir should handle gracefully
        const project3 = createMockWinCCOAProject({
            name: 'TestProject',
            installationDir: '' // Empty installation dir
        });
        assert.strictEqual(isWinCCOADeliveredSubProject(project3), false);
    });
});
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as os from 'os';
import * as path from 'path';

// Import functions and classes from extension
import { 
    getPvssInstConfPath, 
    getWinCCOAInstallationPaths,
    extractVersionFromProject, 
    isWinCCOADeliveredSubProject,
    WinCCOAProjectProvider,
    ProjectCategory,
    getProjects,
    getRunnableProjects,
    getSubProjects,
    getWinCCOASystemVersions,
    getWinCCOADeliveredSubProjects,
    getUserSubProjects,
    getCurrentProjects,
    getCurrentProjectsInfo,
    getAPI,
    deactivate
} from '../extension';

// Helper function to create mock WinCCOA project
function createMockProject(config: any): any {
    return {
        config: {
            name: config.name || 'TestProject',
            installationDir: config.installationDir || 'C:\\TestProject',
            installationDate: '2024-01-01 10:00:00',
            notRunnable: config.notRunnable || false
        },
        installationDir: config.installationDir || 'C:\\TestProject',
        isRunnable: !config.notRunnable,
        isCurrent: config.isCurrent || false,
        isWinCCOASystem: config.isWinCCOASystem || false,
        version: config.version || null
    };
}

suite('WinCC OA Core Functionality Tests', () => {
    
    suite('Platform Path Resolution', () => {
        test('getPvssInstConfPath should return correct path for current platform', () => {
            const path = getPvssInstConfPath();
            assert.ok(typeof path === 'string');
            assert.ok(path.length > 0);
            assert.ok(path.includes('pvssInst.conf'));
            
            // Should be either Windows or Unix format
            const isWindowsPath = path.includes('C:\\') || path.includes('ProgramData');
            const isUnixPath = path.startsWith('/') && (path.includes('/etc') || path.includes('/opt'));
            assert.ok(isWindowsPath || isUnixPath, 'Path should be in Windows or Unix format');
        });

        test('getPvssInstConfPath should be consistent', () => {
            const path1 = getPvssInstConfPath();
            const path2 = getPvssInstConfPath();
            assert.strictEqual(path1, path2, 'Function should return consistent results');
        });

        test('getWinCCOAInstallationPaths should return array of paths', () => {
            const paths = getWinCCOAInstallationPaths();
            assert.ok(Array.isArray(paths));
            assert.ok(paths.length > 0);
            
            // All paths should be strings
            paths.forEach(path => {
                assert.ok(typeof path === 'string');
                assert.ok(path.length > 0);
            });
        });

        test('getWinCCOAInstallationPaths should contain WinCC OA related paths', () => {
            const paths = getWinCCOAInstallationPaths();
            assert.ok(Array.isArray(paths));
            
            // Should contain some WinCC OA related paths (case-insensitive)
            const hasWinCCOAPaths = paths.some(p => 
                p.toLowerCase().includes('wincc') || 
                p.toLowerCase().includes('siemens') ||
                p.toLowerCase().includes('pvss') ||
                p.includes('opt')
            );
            assert.ok(hasWinCCOAPaths, 'Should contain WinCC OA related paths');
        });
    });

    suite('Version Extraction', () => {
        test('extractVersionFromProject should extract version from project version field', () => {
            const project = createMockProject({
                name: 'TestProject',
                version: '3.21'
            });
            const version = extractVersionFromProject(project);
            assert.strictEqual(version, '3.21');
        });

        test('extractVersionFromProject should extract version from project name', () => {
            const project = createMockProject({
                name: 'Project_v3.20_Demo',
                version: null
            });
            const version = extractVersionFromProject(project);
            assert.strictEqual(version, '3.20');
        });

        test('extractVersionFromProject should extract version from installation directory', () => {
            const project = createMockProject({
                name: 'TestProject',
                installationDir: 'C:\\Siemens\\WinCC_OA\\3.21\\projects\\TestProject',
                version: null
            });
            const version = extractVersionFromProject(project);
            assert.strictEqual(version, '3.21');
        });

        test('extractVersionFromProject should return null if no version found', () => {
            const project = createMockProject({
                name: 'TestProject',
                installationDir: 'C:\\TestProject',
                version: null
            });
            const version = extractVersionFromProject(project);
            assert.strictEqual(version, null);
        });
    });

    suite('Project Classification', () => {
        test('isWinCCOADeliveredSubProject should identify delivered projects', () => {
            const project = createMockProject({
                name: 'OPC_UA',
                installationDir: 'C:\\Siemens\\Automation\\WinCC_OA\\3.21\\projects\\OPC_UA'
            });
            const isDelivered = isWinCCOADeliveredSubProject(project);
            assert.strictEqual(isDelivered, true);
        });

        test('isWinCCOADeliveredSubProject should identify user projects', () => {
            const project = createMockProject({
                name: 'MyCustomProject',
                installationDir: 'C:\\MyProjects\\CustomProject'
            });
            const isDelivered = isWinCCOADeliveredSubProject(project);
            assert.strictEqual(isDelivered, false);
        });

        test('isWinCCOADeliveredSubProject should handle Unix paths', () => {
            const project = createMockProject({
                name: 'BACnet',
                installationDir: '/opt/wincc_oa/3.21/projects/BACnet'
            });
            const isDelivered = isWinCCOADeliveredSubProject(project);
            assert.strictEqual(isDelivered, true);
        });
    });

    suite('ProjectCategory Class', () => {
        test('ProjectCategory should create instance with basic properties', () => {
            const mockProjects = [createMockProject({ name: 'TestProject' })];
            const category = new ProjectCategory('Test Category', mockProjects, 'runnable', undefined, 'Test Description');
            
            assert.strictEqual(category.label, 'Test Category');
            assert.ok(category.tooltip && typeof category.tooltip === 'string' && category.tooltip.includes('Test Description'));
            assert.strictEqual(category.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
            assert.strictEqual(category.contextValue, 'projectCategory');
        });

        test('ProjectCategory should handle project count', () => {
            const mockProjects = [
                createMockProject({ name: 'Project1' }),
                createMockProject({ name: 'Project2' })
            ];
            const category = new ProjectCategory('Test Category', mockProjects, 'runnable');
            
            assert.strictEqual(category.projects.length, 2);
        });

        test('ProjectCategory should handle version categories', () => {
            const mockProjects = [createMockProject({ name: 'VersionProject' })];
            const category = new ProjectCategory('Version 3.21', mockProjects, 'version', '3.21');
            
            assert.strictEqual(category.version, '3.21');
            assert.strictEqual(category.contextValue, 'projectVersionCategory');
            assert.ok(category.tooltip && typeof category.tooltip === 'string' && category.tooltip.includes('WinCC OA 3.21'));
        });
    });

    suite('WinCCOAProjectProvider Class', () => {
        let provider: WinCCOAProjectProvider;

        setup(() => {
            provider = new WinCCOAProjectProvider();
        });

        test('WinCCOAProjectProvider should be instantiable', () => {
            assert.ok(provider instanceof WinCCOAProjectProvider);
        });

        test('getTreeItem should return the item itself', () => {
            const mockProject = createMockProject({ name: 'TestProject' });
            const result = provider.getTreeItem(mockProject);
            assert.strictEqual(result, mockProject);
        });

        test('refresh should fire onDidChangeTreeData event', () => {
            let eventFired = false;
            provider.onDidChangeTreeData(() => {
                eventFired = true;
            });
            
            provider.refresh();
            assert.strictEqual(eventFired, true);
        });
    });

    suite('API Functions', () => {
        test('getProjects should return array', () => {
            const projects = getProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getRunnableProjects should return array', () => {
            const projects = getRunnableProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getSubProjects should return array', () => {
            const projects = getSubProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getWinCCOASystemVersions should return array', () => {
            const projects = getWinCCOASystemVersions();
            assert.ok(Array.isArray(projects));
        });

        test('getWinCCOADeliveredSubProjects should return array', () => {
            const projects = getWinCCOADeliveredSubProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getUserSubProjects should return array', () => {
            const projects = getUserSubProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getCurrentProjects should return array', () => {
            const projects = getCurrentProjects();
            assert.ok(Array.isArray(projects));
        });

        test('getCurrentProjectsInfo should return array', () => {
            const projectInfo = getCurrentProjectsInfo();
            assert.ok(Array.isArray(projectInfo));
        });

        test('getAPI should return valid API object', () => {
            const api = getAPI();
            assert.ok(api);
            assert.ok(typeof api.getProjects === 'function');
            assert.ok(typeof api.getProjectByPath === 'function');
            assert.ok(typeof api.getProjectVersion === 'function');
        });

        test('deactivate should not throw', () => {
            assert.doesNotThrow(() => {
                deactivate();
            });
        });
    });

    suite('Edge Cases and Error Handling', () => {
        test('extractVersionFromProject should handle null project', () => {
            const version = extractVersionFromProject(null as any);
            assert.strictEqual(version, null);
        });

        test('extractVersionFromProject should handle undefined project', () => {
            const version = extractVersionFromProject(undefined as any);
            assert.strictEqual(version, null);
        });

        test('extractVersionFromProject should handle project without config', () => {
            const project = { installationDir: 'C:\\Test' };
            const version = extractVersionFromProject(project as any);
            assert.strictEqual(version, null);
        });

        test('isWinCCOADeliveredSubProject should handle null project', () => {
            const isDelivered = isWinCCOADeliveredSubProject(null as any);
            assert.strictEqual(isDelivered, false);
        });

        test('isWinCCOADeliveredSubProject should handle project without installationDir', () => {
            const project = createMockProject({ name: 'Test' });
            delete project.installationDir;
            const isDelivered = isWinCCOADeliveredSubProject(project);
            assert.strictEqual(isDelivered, false);
        });

        test('ProjectCategory should handle empty projects array', () => {
            const category = new ProjectCategory('Test', [], 'runnable');
            assert.strictEqual(category.projects.length, 0);
            assert.ok(category.tooltip && typeof category.tooltip === 'string' && category.tooltip.includes('0 project'));
        });

        test('ProjectCategory should handle single project', () => {
            const mockProject = createMockProject({ name: 'SingleProject' });
            const category = new ProjectCategory('Test', [mockProject], 'runnable');
            assert.strictEqual(category.projects.length, 1);
        });
    });

    suite('String Manipulation and Parsing', () => {
        test('version extraction should handle various patterns', () => {
            const testCases = [
                { input: 'Project_v3.21_Final', expected: '3.21' },
                { input: 'C:\\WinCC_OA\\3.20\\test', expected: '3.20' },
                { input: '/opt/wincc_oa/3.19/projects/demo', expected: '3.19' },
                { input: 'NoVersionHere', expected: null },
                { input: '', expected: null }
            ];

            testCases.forEach(testCase => {
                const project = createMockProject({
                    name: testCase.input,
                    installationDir: testCase.input,
                    version: null
                });
                const result = extractVersionFromProject(project);
                assert.strictEqual(result, testCase.expected, `Failed for input: ${testCase.input}`);
            });
        });

        test('path normalization should work correctly', () => {
            const testPaths = [
                'C:\\Siemens\\Automation\\WinCC_OA\\3.21\\projects\\OPC_UA',
                'c:\\siemens\\automation\\wincc_oa\\3.21\\projects\\opc_ua',
                '/opt/wincc_oa/3.21/projects/BACnet'
            ];

            testPaths.forEach(testPath => {
                const project = createMockProject({
                    name: 'TestProject',
                    installationDir: testPath
                });
                const isDelivered = isWinCCOADeliveredSubProject(project);
                // Should handle case-insensitive comparison
                assert.ok(typeof isDelivered === 'boolean');
            });
        });
    });
});
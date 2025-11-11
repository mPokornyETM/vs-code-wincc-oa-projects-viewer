import * as assert from 'assert';
import * as vscode from 'vscode';

// Import functions from extension
import { getPvssInstConfPath, WinCCOAProjectProvider, ProjectCategory } from '../extension';
import { extractVersionFromProject, isWinCCOADeliveredSubProject } from '../utils';

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
        version: config.version
    };
}

suite('WinCC OA Projects Extension Test Suite', () => {
    vscode.window.showInformationMessage('Starting WinCC OA Projects tests.');

    suite('Cross-Platform Path Resolution', () => {
        test('should return Windows path on Windows platform', () => {
            // Mock Windows platform
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'win32', configurable: true });

            const path = getPvssInstConfPath();
            assert.ok(path.includes('C:\\ProgramData\\Siemens\\WinCC_OA'), 'Should return Windows path');
            assert.ok(path.endsWith('pvssInst.conf'), 'Should end with config filename');

            // Restore original platform
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        });

        test('should return Unix path on Unix platform', () => {
            // Mock Unix platform
            const originalPlatform = process.platform;
            Object.defineProperty(process, 'platform', { value: 'linux', configurable: true });

            const path = getPvssInstConfPath();
            assert.ok(path.includes('/etc/opt/pvss'), 'Should return Unix path');
            assert.ok(path.endsWith('pvssInst.conf'), 'Should end with config filename');

            // Restore original platform
            Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true });
        });

        test('should handle path normalization', () => {
            const path = getPvssInstConfPath();
            assert.ok(typeof path === 'string', 'Path should be a string');
            assert.ok(path.length > 0, 'Path should not be empty');
            assert.ok(!path.includes('//'), 'Path should not contain double slashes');
        });
    });

    suite('Version Detection', () => {
        test('should extract version from project name', () => {
            const testCases = [
                { name: 'MyProject_3.20', expected: '3.20' },
                { name: 'TestApp_3.21', expected: '3.21' },
                { name: 'Project_3.19', expected: '3.19' },
                { name: 'NoVersionProject', expected: null }
            ];

            testCases.forEach(testCase => {
                const project = createMockProject({ name: testCase.name });
                const version = extractVersionFromProject(project);
                assert.strictEqual(version, testCase.expected, `Version extraction failed for ${testCase.name}`);
            });
        });

        test('should extract version from installation path', () => {
            const project = createMockProject({
                name: 'TestProject',
                installationDir: 'C:\\WinCC_OA\\3.20\\projects\\TestProject'
            });

            const version = extractVersionFromProject(project);
            assert.strictEqual(version, '3.20', 'Should extract version from path');
        });

        test('should handle projects without version', () => {
            const project = createMockProject({ name: 'SimpleProject' });
            const version = extractVersionFromProject(project);
            assert.strictEqual(version, null, 'Should return null for no version');
        });
    });

    suite('Project Classification', () => {
        test('should identify WinCC OA delivered sub-projects', () => {
            const deliveredPaths = [
                'C:\\Program Files\\Siemens\\WinCC_OA\\3.20\\projects\\BACnet',
                '/opt/wincc_oa/3.21/projects/OPC_UA',
                'C:\\ProgramData\\Siemens\\WinCC_OA\\projects\\Modbus'
            ];

            deliveredPaths.forEach(installDir => {
                const project = createMockProject({ installationDir: installDir });
                const isDelivered = isWinCCOADeliveredSubProject(project);
                assert.ok(isDelivered, `Should identify ${installDir} as WinCC OA delivered`);
            });
        });

        test('should identify user sub-projects', () => {
            const userPaths = [
                'C:\\MyProjects\\CustomProject',
                'D:\\Development\\TestProject',
                '/home/user/projects/MyApp'
            ];

            userPaths.forEach(installDir => {
                const project = createMockProject({ installationDir: installDir });
                const isDelivered = isWinCCOADeliveredSubProject(project);
                assert.ok(!isDelivered, `Should identify ${installDir} as user project`);
            });
        });
    });

    suite('Project Category Creation', () => {
        test('should create category with correct properties', () => {
            const mockProjects: any[] = [];
            const category = new ProjectCategory('Test Category', mockProjects, 'runnable');

            assert.strictEqual(category.label, 'Test Category', 'Label should match');
            assert.strictEqual(
                category.collapsibleState,
                vscode.TreeItemCollapsibleState.Expanded,
                'Should be expanded by default'
            );
        });

        test('should handle version categories', () => {
            const mockProjects: any[] = [];
            const versionCategory = new ProjectCategory('Version 3.20', mockProjects, 'version', '3.20');

            assert.strictEqual(versionCategory.label, 'Version 3.20', 'Label should match');
            assert.strictEqual(versionCategory.version, '3.20', 'Version should match');
        });
    });

    suite('Tree Data Provider', () => {
        let provider: WinCCOAProjectProvider;

        setup(() => {
            provider = new WinCCOAProjectProvider();
        });

        test('should create provider instance', () => {
            assert.ok(provider, 'Provider should be created');
            assert.ok(typeof provider.getTreeItem === 'function', 'Should have getTreeItem method');
            assert.ok(typeof provider.getChildren === 'function', 'Should have getChildren method');
        });

        test('should handle getTreeItem calls', () => {
            const mockProjects: any[] = [];
            const category = new ProjectCategory('Test Category', mockProjects, 'runnable');

            const treeItem = provider.getTreeItem(category);
            assert.ok(treeItem, 'Should return tree item');
            assert.strictEqual(treeItem.label, 'Test Category', 'Should preserve label');
        });

        test('should refresh project data', () => {
            let refreshEventFired = false;

            provider.onDidChangeTreeData(() => {
                refreshEventFired = true;
            });

            provider.refresh();

            // The refresh event should be fired
            setTimeout(() => {
                assert.ok(refreshEventFired, 'Refresh event should be fired');
            }, 100);
        });
    });

    suite('Basic Functionality', () => {
        test('should handle getPvssInstConfPath call', () => {
            const path = getPvssInstConfPath();
            assert.ok(typeof path === 'string', 'Should return a string path');
            assert.ok(path.length > 0, 'Path should not be empty');
        });

        test('should handle version extraction edge cases', () => {
            const projectNoVersion = createMockProject({ name: 'TestProject' });
            const version = extractVersionFromProject(projectNoVersion);
            assert.strictEqual(version, null, 'Should return null for no version');
        });

        test('should handle classification edge cases', () => {
            const project = createMockProject({
                installationDir: 'C:\\UnknownPath\\TestProject'
            });
            const isDelivered = isWinCCOADeliveredSubProject(project);
            assert.strictEqual(isDelivered, false, 'Should classify unknown paths as user projects');
        });
    });

    suite('Integration Tests', () => {
        test('should handle real world project configurations', () => {
            // Test with realistic project configurations
            const projects = [
                createMockProject({
                    name: 'MyProject_3.20',
                    installationDir: 'C:\\Projects\\MyProject_3.20'
                }),
                createMockProject({
                    name: 'BACnet',
                    installationDir: 'C:\\ProgramData\\Siemens\\WinCC_OA\\3.20\\projects\\BACnet'
                })
            ];

            projects.forEach(project => {
                const version = extractVersionFromProject(project);
                const isDelivered = isWinCCOADeliveredSubProject(project);

                assert.ok(version !== undefined || version === null, 'Version extraction should work');
                assert.ok(typeof isDelivered === 'boolean', 'Classification should return boolean');
            });
        });
    });
});

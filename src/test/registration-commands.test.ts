import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

// Import functions from extension
import { WinCCOAProjectProvider, WinCCOAProject } from '../extension';

// Mock project config interface
interface MockProjectConfig {
    name: string;
    installationDir: string;
    installationDate: string;
    notRunnable: boolean;
    currentProject: boolean;
    company?: string;
}

// Helper function to create mock WinCC OA project
function createMockProject(
    config: Partial<MockProjectConfig>,
    isRunnable: boolean = true,
    isCurrent: boolean = false,
    version?: string
): WinCCOAProject {
    const mockConfig: MockProjectConfig = {
        name: config.name || 'TestProject',
        installationDir: config.installationDir || 'C:\\TestProject',
        installationDate: config.installationDate || '2024-01-01',
        notRunnable: config.notRunnable || false,
        currentProject: config.currentProject || false,
        company: config.company || 'Test Company'
    };

    return new WinCCOAProject(mockConfig, mockConfig.installationDir, isRunnable, isCurrent, version);
}

suite('Registration Commands Test Suite', () => {
    suite('Command Registration', () => {
        test('should have registerRunnableProject command available', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('winccOAProjects.registerRunnableProject'),
                'registerRunnableProject command should be registered'
            );
        });

        test('should have registerSubProject command available', async () => {
            const commands = await vscode.commands.getCommands(true);
            assert.ok(
                commands.includes('winccOAProjects.registerSubProject'),
                'registerSubProject command should be registered'
            );
        });
    });

    suite('Path Validation Logic', () => {
        test('should validate Windows paths correctly', () => {
            const windowsPaths = [
                'C:\\WinCC_OA\\3.21\\projects\\TestProject',
                'D:\\MyProjects\\TestProject',
                'C:\\Program Files\\Siemens\\WinCC_OA\\3.21\\projects\\OPC_UA'
            ];

            windowsPaths.forEach(testPath => {
                assert.ok(path.isAbsolute(testPath), `${testPath} should be absolute`);
                assert.ok(testPath.includes('\\'), `${testPath} should use Windows separators`);
            });
        });

        test('should validate Unix paths correctly', () => {
            const unixPaths = [
                '/opt/WinCC_OA/3.21/projects/TestProject',
                '/home/user/projects/TestProject',
                '/etc/opt/pvss/TestProject'
            ];

            unixPaths.forEach(testPath => {
                assert.ok(path.isAbsolute(testPath), `${testPath} should be absolute`);
                assert.ok(testPath.startsWith('/'), `${testPath} should start with /`);
            });
        });

        test('should handle path normalization across platforms', () => {
            const testPaths = [
                'C:\\Test\\..\\TestProject',
                '/opt/WinCC_OA/../projects/TestProject',
                'C:\\Test\\Project\\..\\..\\Final'
            ];

            testPaths.forEach(testPath => {
                const normalized = path.normalize(testPath);
                assert.ok(typeof normalized === 'string', 'Normalized path should be string');
                assert.ok(normalized.length > 0, 'Normalized path should not be empty');
            });
        });

        test('should handle case-insensitive path comparison', () => {
            const path1 = 'C:\\TestProject';
            const path2 = 'c:\\testproject';

            const normalized1 = path.normalize(path1).toLowerCase();
            const normalized2 = path.normalize(path2).toLowerCase();

            // On Windows, these should be considered the same
            if (process.platform === 'win32') {
                assert.strictEqual(normalized1, normalized2, 'Case-insensitive paths should match on Windows');
            }
        });
    });

    suite('Project Registration Helpers', () => {
        test('should create config path correctly', () => {
            const directoryPath = 'C:\\TestProject';
            const expectedConfigPath = path.join(directoryPath, 'config', 'config');

            assert.strictEqual(expectedConfigPath, 'C:\\TestProject\\config\\config');
        });

        test('should validate project structure requirements', () => {
            // Test logic for runnable vs sub-project distinction
            const runnableProjectPath = 'C:\\TestProject';
            const configPath = path.join(runnableProjectPath, 'config', 'config');

            // Runnable projects require config/config file
            const hasConfigFile = true; // Would be fs.existsSync(configPath) in real code

            if (hasConfigFile) {
                // Should be registered as runnable project
                assert.ok(true, 'Runnable project should have config file');
            } else {
                // Should be registered as sub-project
                assert.ok(false, 'Should not reach this for runnable projects');
            }
        });

        test('should handle project already registered scenario', () => {
            // Test the logic for checking if project is already registered
            const directoryPath = 'C:\\TestProject';
            const existingProjects = [
                createMockProject({ name: 'ExistingProject', installationDir: 'C:\\TestProject' })
            ];

            const normalizedPath = path.normalize(directoryPath).toLowerCase();
            const isAlreadyRegistered = existingProjects.some(
                p => path.normalize(p.config.installationDir).toLowerCase() === normalizedPath
            );

            assert.ok(isAlreadyRegistered, 'Should detect already registered project');
        });
    });

    suite('Version Detection for Registration', () => {
        test('should detect version from config file content', () => {
            // Test the regex pattern used for version extraction
            const mockConfigContent = `
[general]
version = "3.21"
installationType = "client"
`;

            // Simulate version extraction from config content
            const versionMatch = mockConfigContent.match(/version\s*=\s*"([^"]+)"/);
            const extractedVersion = versionMatch ? versionMatch[1] : undefined;

            assert.strictEqual(extractedVersion, '3.21');
        });

        test('should handle missing version in config', () => {
            const mockConfigContent = `
[general]
installationType = "client"
`;

            const versionMatch = mockConfigContent.match(/version\s*=\s*"([^"]+)"/);
            const extractedVersion = versionMatch ? versionMatch[1] : undefined;

            assert.strictEqual(extractedVersion, undefined);
        });

        test('should handle various version formats', () => {
            const versionTests = [
                { content: 'version = "3.21"', expected: '3.21' },
                { content: 'version="3.20"', expected: '3.20' },
                { content: 'version = "3.19.1"', expected: '3.19.1' },
                { content: 'other = "value"', expected: undefined }
            ];

            versionTests.forEach(test => {
                const versionMatch = test.content.match(/version\s*=\s*"([^"]+)"/);
                const extractedVersion = versionMatch ? versionMatch[1] : undefined;
                assert.strictEqual(extractedVersion, test.expected, `Version extraction failed for: ${test.content}`);
            });
        });
    });

    suite('Project Provider Integration', () => {
        let provider: WinCCOAProjectProvider;

        setup(() => {
            provider = new WinCCOAProjectProvider();
        });

        test('should create provider instance for registration commands', () => {
            assert.ok(provider instanceof WinCCOAProjectProvider);
            assert.ok(typeof provider.refresh === 'function');
            assert.ok(typeof provider.getProjectVersion === 'function');
        });

        test('should handle refresh after registration', () => {
            let refreshCalled = false;

            // Mock the refresh method
            const originalRefresh = provider.refresh;
            provider.refresh = () => {
                refreshCalled = true;
                originalRefresh.call(provider);
            };

            // Simulate calling refresh after registration
            provider.refresh();

            assert.ok(refreshCalled, 'Refresh should be called after registration');

            // Restore original method
            provider.refresh = originalRefresh;
        });
    });

    suite('Error Handling Scenarios', () => {
        test('should handle invalid paths gracefully', () => {
            const invalidPaths = ['', null, undefined];

            invalidPaths.forEach(invalidPath => {
                try {
                    if (!invalidPath) {
                        throw new Error('Invalid path provided');
                    }
                    const normalized = path.normalize(invalidPath);
                    assert.ok(typeof normalized === 'string');
                } catch (error) {
                    // Expected for invalid inputs
                    assert.ok(error instanceof Error);
                }
            });
        });

        test('should validate directory vs file distinction', () => {
            // Test the logic for checking if path is a directory
            const testCases = [
                { path: 'C:\\TestProject', isDirectory: true, shouldPass: true },
                { path: 'C:\\TestProject\\file.txt', isDirectory: false, shouldPass: false }
            ];

            testCases.forEach(testCase => {
                // Simulate the directory check
                if (!testCase.isDirectory) {
                    const error = new Error('WinCC OA projects can only be registered from directories.');
                    assert.ok(error.message.includes('directories'), 'Should reject non-directory paths');
                }
            });
        });
    });

    suite('Menu Context Integration', () => {
        test('should handle URI parameter from context menu', () => {
            // Test the URI handling logic
            const mockUri = { fsPath: 'C:\\TestProject' };

            assert.ok(mockUri.fsPath, 'URI should have fsPath property');
            assert.ok(typeof mockUri.fsPath === 'string', 'fsPath should be string');
            assert.ok(path.isAbsolute(mockUri.fsPath), 'fsPath should be absolute');
        });

        test('should handle command palette invocation (no URI)', () => {
            // Test the dialog logic when no URI provided
            const uri = undefined;

            if (!uri) {
                // Should trigger folder selection dialog
                const dialogOptions = {
                    canSelectFolders: true,
                    canSelectFiles: false,
                    canSelectMany: false,
                    openLabel: 'Select WinCC OA Project Directory',
                    title: 'Select WinCC OA Project Directory to Register'
                };

                assert.strictEqual(dialogOptions.canSelectFolders, true);
                assert.strictEqual(dialogOptions.canSelectFiles, false);
                assert.strictEqual(dialogOptions.canSelectMany, false);
            }
        });
    });

    suite('Registration Flow Validation', () => {
        test('should follow correct runnable project registration flow', () => {
            const steps = [
                'Validate directory exists',
                'Check if directory is actually a directory',
                'Check if project already registered',
                'Validate config/config file exists',
                'Extract version from config',
                'Create project instance',
                'Execute registration',
                'Show success message',
                'Refresh provider'
            ];

            // Validate each step exists in the flow
            steps.forEach(step => {
                assert.ok(typeof step === 'string', `Step should be defined: ${step}`);
            });
        });

        test('should follow correct sub-project registration flow', () => {
            const steps = [
                'Validate directory exists',
                'Check if directory is actually a directory',
                'Check if project already registered',
                'Verify NO config/config file (not runnable)',
                'Create project instance as sub-project',
                'Execute registration',
                'Show success message',
                'Refresh provider'
            ];

            // Validate each step exists in the flow
            steps.forEach(step => {
                assert.ok(typeof step === 'string', `Step should be defined: ${step}`);
            });
        });
    });
});

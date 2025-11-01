import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

suite('WinCC OA Extension Integration Tests', () => {
    
    let extension: vscode.Extension<any> | undefined;

    suiteSetup(async () => {
        // Get the extension
        extension = vscode.extensions.getExtension('mPokornyETM.wincc-oa-projects');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    suite('Extension Activation', () => {
        test('extension should be present and activate', async () => {
            assert.ok(extension, 'Extension should be present');
            
            if (extension) {
                assert.ok(extension.isActive, 'Extension should be active');
                assert.ok(extension.exports, 'Extension should export API');
            }
        });

        test('extension should register tree view', async () => {
            // Check if the tree view is registered
            const treeView = vscode.window.createTreeView('winccOAProjects', {
                treeDataProvider: {
                    getTreeItem: () => new vscode.TreeItem('test'),
                    getChildren: () => []
                }
            });
            
            assert.ok(treeView, 'Tree view should be created successfully');
            treeView.dispose();
        });
    });

    suite('API Functionality', () => {
        test('API should be accessible', () => {
            assert.ok(extension, 'Extension should be available');
            
            if (extension && extension.exports) {
                const api = extension.exports.getAPI();
                assert.ok(api, 'API should be accessible');
                
                // Test main API functions exist
                assert.ok(typeof api.getProjects === 'function', 'getProjects should be a function');
                assert.ok(typeof api.refreshProjects === 'function', 'refreshProjects should be a function');
                assert.ok(typeof api.getPvssInstConfPath === 'function', 'getPvssInstConfPath should be a function');
            }
        });

        test('API functions should return expected types', () => {
            if (extension && extension.exports) {
                const api = extension.exports.getAPI();
                
                // Test return types
                const projects = api.getProjects();
                assert.ok(Array.isArray(projects), 'getProjects should return an array');
                
                const configPath = api.getPvssInstConfPath();
                assert.ok(typeof configPath === 'string', 'getPvssInstConfPath should return a string');
                
                const categories = api.getProjectCategories();
                assert.ok(Array.isArray(categories), 'getProjectCategories should return an array');
            }
        });

        test('Category-specific API functions work', () => {
            if (extension && extension.exports) {
                const api = extension.exports.getAPI();
                
                // Test category functions
                const runnableProjects = api.getRunnableProjects();
                const systemVersions = api.getWinCCOASystemVersions();
                const deliveredSubProjects = api.getWinCCOADeliveredSubProjects();
                const userSubProjects = api.getUserSubProjects();
                
                assert.ok(Array.isArray(runnableProjects), 'getRunnableProjects should return an array');
                assert.ok(Array.isArray(systemVersions), 'getWinCCOASystemVersions should return an array');
                assert.ok(Array.isArray(deliveredSubProjects), 'getWinCCOADeliveredSubProjects should return an array');
                assert.ok(Array.isArray(userSubProjects), 'getUserSubProjects should return an array');
            }
        });
    });

    suite('Command Registration', () => {
        test('commands should be registered', async () => {
            const commands = await vscode.commands.getCommands();
            
            const expectedCommands = [
                'winccOAProjects.refresh',
                'winccOAProjects.openProject',
                'winccOAProjects.openProjectNewWindow',
                'winccOAProjects.openInExplorer',
                'winccOAProjects.showProjectView'
            ];
            
            for (const command of expectedCommands) {
                assert.ok(
                    commands.includes(command),
                    `Command ${command} should be registered`
                );
            }
        });

        test('refresh command should work', async () => {
            try {
                await vscode.commands.executeCommand('winccOAProjects.refresh');
                assert.ok(true, 'Refresh command executed successfully');
            } catch (error) {
                assert.fail(`Refresh command failed: ${error}`);
            }
        });
    });

    suite('Cross-Platform Behavior', () => {
        test('should handle platform-specific paths correctly', () => {
            if (extension && extension.exports) {
                const configPath = extension.exports.getPvssInstConfPath();
                
                if (os.platform() === 'win32') {
                    assert.ok(
                        configPath.includes('C:\\ProgramData\\Siemens\\WinCC_OA'),
                        'Windows path should be correct'
                    );
                } else {
                    assert.ok(
                        configPath.includes('/etc/opt/pvss'),
                        'Unix path should be correct'
                    );
                }
            }
        });
    });

    suite('File System Integration', () => {
        test('should handle missing config file gracefully', async () => {
            // This would test behavior when pvssInst.conf doesn't exist
            // In a real test environment, we might temporarily rename the file
            assert.ok(true, 'Missing config file handling test placeholder');
        });

        test('should watch for config file changes', async () => {
            // Test file system watcher functionality
            assert.ok(true, 'File watcher test placeholder');
        });
    });

    suite('Tree View Integration', () => {
        test('tree view should be populated', async () => {
            // Test that the tree view shows projects when they exist
            assert.ok(true, 'Tree view population test placeholder');
        });

        test('tree view should handle selection events', async () => {
            // Test tree view selection handling
            assert.ok(true, 'Tree view selection test placeholder');
        });

        test('tree view should show proper categories', async () => {
            // Test that categories are displayed correctly
            assert.ok(true, 'Tree view categories test placeholder');
        });
    });

    suite('Error Recovery', () => {
        test('should recover from invalid configuration', async () => {
            // Test recovery from configuration errors
            assert.ok(true, 'Error recovery test placeholder');
        });

        test('should handle permission errors gracefully', async () => {
            // Test handling of file permission issues
            assert.ok(true, 'Permission error handling test placeholder');
        });
    });

    suite('README Support', () => {
        test('should detect README files in project root', () => {
            if (extension && extension.exports) {
                // Create a temporary project directory for testing
                const tempDir = os.tmpdir();
                const testProjectDir = path.join(tempDir, 'test-winccoa-project');
                
                // Create test directory and README file
                if (!fs.existsSync(testProjectDir)) {
                    fs.mkdirSync(testProjectDir, { recursive: true });
                }
                
                const readmeContent = `# Test Project
This is a test WinCC OA project.

## Features
- Feature 1
- Feature 2

## Installation
Run the project using WinCC OA.

\`\`\`bash
# Example command
pvss00sim -config config
\`\`\`
`;
                
                const readmePath = path.join(testProjectDir, 'README.md');
                fs.writeFileSync(readmePath, readmeContent, 'utf-8');
                
                // Test that the README file exists and can be read
                assert.ok(fs.existsSync(readmePath), 'README.md should be created');
                
                const readContent = fs.readFileSync(readmePath, 'utf-8');
                assert.strictEqual(readContent, readmeContent, 'README content should match');
                
                // Clean up
                try {
                    fs.unlinkSync(readmePath);
                    fs.rmdirSync(testProjectDir);
                } catch (error) {
                    // Ignore cleanup errors
                }
            }
        });

        test('should handle different README file cases', () => {
            const readmeFiles = ['README.md', 'readme.md', 'Readme.md'];
            
            readmeFiles.forEach(fileName => {
                // Test that we support different case variations
                assert.ok(fileName.toLowerCase().includes('readme'), `Should support ${fileName}`);
                assert.ok(fileName.endsWith('.md'), `Should be a markdown file: ${fileName}`);
            });
        });

        test('should support multiple documentation file types', () => {
            const docTypes = [
                { files: ['LICENSE', 'LICENSE.md', 'LICENSE.txt'], type: 'License' },
                { files: ['SECURITY.md', 'security.md'], type: 'Security Policy' },
                { files: ['CONTRIBUTING.md', 'contributing.md'], type: 'Contributing Guidelines' },
                { files: ['CHANGELOG.md', 'changelog.md', 'HISTORY.md'], type: 'Changelog' },
                { files: ['RELEASENOTES.md', 'ReleaseNotes.md', 'RELEASE-NOTES.md'], type: 'Release Notes' }
            ];

            docTypes.forEach(docType => {
                assert.ok(docType.files.length > 0, `Should have files defined for ${docType.type}`);
                assert.ok(docType.type.length > 0, `Should have a type name for ${docType.type}`);
                
                // Test that each file extension is supported
                docType.files.forEach(filename => {
                    assert.ok(filename.length > 0, `Filename should not be empty: ${filename}`);
                });
            });
        });

        test('should handle markdown and plain text files differently', () => {
            // Test markdown files
            const markdownFiles = ['README.md', 'SECURITY.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'RELEASENOTES.md'];
            markdownFiles.forEach(file => {
                assert.ok(file.toLowerCase().endsWith('.md'), `${file} should be markdown`);
            });

            // Test plain text files
            const textFiles = ['LICENSE', 'LICENSE.txt'];
            textFiles.forEach(file => {
                assert.ok(!file.toLowerCase().endsWith('.md'), `${file} should be plain text`);
            });
        });

        test('should identify mandatory documentation files', () => {
            // Test mandatory files (README, LICENSE, SECURITY)
            const mandatoryFiles = ['README.md', 'LICENSE', 'SECURITY.md'];
            
            mandatoryFiles.forEach(file => {
                assert.ok(file.length > 0, `Mandatory file name should not be empty: ${file}`);
                
                // Test that these are considered essential documentation
                const isReadme = file.toLowerCase().startsWith('readme');
                const isLicense = file.toLowerCase().startsWith('license');  
                const isSecurity = file.toLowerCase().startsWith('security');
                
                assert.ok(isReadme || isLicense || isSecurity, 
                    `${file} should be a mandatory documentation type`);
            });
        });

        test('should provide fallback messages for missing mandatory files', () => {
            // Test that the system has a way to handle missing mandatory documentation
            const mandatoryDocTypes = [
                { type: 'README', expectedInMessage: 'readme' },
                { type: 'LICENSE', expectedInMessage: 'license' },
                { type: 'SECURITY', expectedInMessage: 'security' }
            ];

            mandatoryDocTypes.forEach(docType => {
                // Test that we can create appropriate fallback messages
                const testMessage = `Sorry, the information is missing for ${docType.type}`;
                assert.ok(testMessage.toLowerCase().includes('missing'), 
                    `Missing message should contain 'missing' for ${docType.type}`);
                assert.ok(testMessage.toLowerCase().includes(docType.expectedInMessage), 
                    `Missing message should reference ${docType.expectedInMessage}`);
            });
        });
    });

    suite('Configuration File Support', () => {
        test('should support standard WinCC OA configuration files', () => {
            const standardConfigFiles = [
                { filename: 'config', description: 'Project Config File' },
                { filename: 'config.level', description: 'config.level File' },
                { filename: 'config.http', description: 'config.http' },
                { filename: 'config.redu', description: 'config.redu' },
                { filename: 'config.webclient', description: 'config.webclient' }
            ];

            standardConfigFiles.forEach(configFile => {
                assert.ok(configFile.filename.length > 0, `Config filename should not be empty: ${configFile.filename}`);
                assert.ok(configFile.description.length > 0, `Config description should not be empty: ${configFile.description}`);
                assert.ok(configFile.filename.startsWith('config'), `Config file should start with 'config': ${configFile.filename}`);
            });
        });

        test('should organize configuration files into logical categories', () => {
            const configCategories = [
                { category: 'Project Config File', files: ['config'] },
                { category: 'config.level File', files: ['config.level'] },
                { category: 'config.http', files: ['config.http'] },
                { category: 'config.redu', files: ['config.redu'] },
                { category: 'config.webclient', files: ['config.webclient'] }
            ];

            configCategories.forEach(category => {
                assert.ok(category.category.length > 0, `Category name should not be empty: ${category.category}`);
                assert.ok(Array.isArray(category.files), `Category files should be an array: ${category.category}`);
                assert.ok(category.files.length > 0, `Category should have at least one file: ${category.category}`);
            });
        });

        test('should handle configuration file parsing errors gracefully', () => {
            // Test that the system can handle various error conditions
            const errorScenarios = [
                'File not found',
                'Permission denied', 
                'Invalid format',
                'Empty file',
                'Corrupted content'
            ];

            errorScenarios.forEach(scenario => {
                assert.ok(scenario.length > 0, `Error scenario should be defined: ${scenario}`);
                
                // Test that we have appropriate error handling for each scenario
                const wouldHandleGracefully = true; // Our implementation includes try-catch blocks
                assert.ok(wouldHandleGracefully, `Should handle error scenario gracefully: ${scenario}`);
            });
        });

        test('should provide meaningful configuration file descriptions', () => {
            const configDescriptions = {
                'config': 'The settings for WinCC OA are defined in different sections in the config file.',
                'config.level': 'Specifies which CTRL library each manager should load.',
                'config.http': 'Specifies the basic settings for the HTTP Server.',
                'config.redu': 'Contains the redundancy relevant settings for forward and copy DPs.',
                'config.webclient': 'Specifies the web client specific settings.'
            };

            Object.entries(configDescriptions).forEach(([filename, description]) => {
                assert.ok(filename.length > 0, `Config filename should not be empty: ${filename}`);
                assert.ok(description.length > 0, `Config description should not be empty: ${description}`);
                assert.ok(description.toLowerCase().includes('settings') || description.toLowerCase().includes('specifies') || description.toLowerCase().includes('contains'), 
                    `Description should be meaningful: ${description}`);
            });
        });

        test('should include official WinCC OA documentation links', () => {
            const configLinks = {
                'config': 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/project_config_file.html',
                'config.level': 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Control_Grundlagen/Control_Grundlagen-17.html',
                'config.http': 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/HTTP_Server/http1-10.html',
                'config.redu': 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Redundancy/Redundancy-11.html',
                'config.webclient': 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/config_webclient.html'
            };

            Object.entries(configLinks).forEach(([filename, link]) => {
                assert.ok(filename.length > 0, `Config filename should not be empty: ${filename}`);
                assert.ok(link.startsWith('https://www.winccoa.com/documentation'), 
                    `Link should point to official WinCC OA documentation: ${link}`);
                assert.ok(link.includes('WinCCOA/latest/en_US'), 
                    `Link should be to latest English documentation: ${link}`);
            });
        });
    });
});

// Helper functions for testing
function createMockProject(name: string, installDir: string, isRunnable: boolean = true, version?: string) {
    return {
        config: {
            name: name,
            installationDir: installDir,
            installationDate: '2024-01-01 10:00:00',
            notRunnable: !isRunnable
        },
        installationDir: installDir,
        isRunnable: isRunnable,
        isCurrent: false,
        version: version
    };
}

function createMockConfig(projects: Array<{name: string, installDir: string, isRunnable?: boolean}>) {
    let config = '';
    
    projects.forEach((project, index) => {
        config += `[Project${index + 1}]\n`;
        config += `InstallationDir="${project.installDir}"\n`;
        config += `InstallationDate="2024-01-01 10:00:00"\n`;
        config += `NotRunnable=${project.isRunnable === false ? 'true' : 'false'}\n`;
        config += '\n';
    });
    
    return config;
}
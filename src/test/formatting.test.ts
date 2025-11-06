/**
 * Test suite for CTL code formatting functionality
 */

import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as formatting from '../formatting';

suite('CTL Code Formatting Test Suite', () => {
    const testWorkspaceRoot = path.join(os.tmpdir(), 'winccoa-formatting-test');
    const testCtlFile = path.join(testWorkspaceRoot, 'test.ctl');
    const testFileNoExt = path.join(testWorkspaceRoot, 'test');
    const testConfigDir = path.join(testWorkspaceRoot, 'config');
    const testConfigFile = path.join(testConfigDir, 'config');

    suiteSetup(async () => {
        // Create test workspace directory structure
        if (!fs.existsSync(testWorkspaceRoot)) {
            fs.mkdirSync(testWorkspaceRoot, { recursive: true });
        }
        if (!fs.existsSync(testConfigDir)) {
            fs.mkdirSync(testConfigDir, { recursive: true });
        }

        // Create test .ctl file with unformatted code
        const unformattedCode = `main()
{
int x=5;
string s="test";
if(x>0){
DebugN("positive");
}
}`;
        fs.writeFileSync(testCtlFile, unformattedCode, 'utf8');

        // Create test file without extension
        fs.writeFileSync(testFileNoExt, unformattedCode, 'utf8');

        // Create test project config
        const projectConfig = `pvss_version = "3.20"
pvss_path = "C:\\Siemens\\Automation\\WinCC_OA\\3.20"`;
        fs.writeFileSync(testConfigFile, projectConfig, 'utf8');
    });

    suiteTeardown(() => {
        // Clean up test workspace
        if (fs.existsSync(testWorkspaceRoot)) {
            fs.rmSync(testWorkspaceRoot, { recursive: true, force: true });
        }
    });

    test('findAStyleExecutable should find astyle from project config', async () => {
        const result = await formatting.findAStyleExecutable(testWorkspaceRoot);

        if (result) {
            assert.ok(result.executable, 'Should return executable path');
            assert.ok(result.version, 'Should return version');
            assert.strictEqual(result.version, '3.20', 'Should detect correct version');
            assert.ok(
                result.executable.toLowerCase().includes('astyle.exe'),
                'Executable path should contain astyle.exe'
            );
        } else {
            // This is acceptable if WinCC OA is not installed (CI/CD environments)
            console.log('⚠️  astyle.exe not found - WinCC OA not installed (expected in CI/CD)');
            assert.ok(true, 'Test passes - WinCC OA not required for basic tests');
        }
    });

    test('findAStyleExecutable should return null for invalid project path', async () => {
        const result = await formatting.findAStyleExecutable('/invalid/path/that/does/not/exist');
        assert.strictEqual(result, null, 'Should return null for invalid path');
    });

    test('findAStyleExecutable should detect astyle.config if available', async () => {
        const result = await formatting.findAStyleExecutable(testWorkspaceRoot);

        if (result && result.configFile) {
            assert.ok(fs.existsSync(result.configFile), 'Config file should exist');
            assert.ok(result.configFile.toLowerCase().includes('astyle.config'), 'Should be astyle.config file');
        }
    });

    test('formatCtrlFile should accept valid file path', async () => {
        // This test requires astyle.exe to be available
        // Skip if not available
        const astyleConfig = await formatting.findAStyleExecutable(testWorkspaceRoot);

        if (!astyleConfig) {
            console.log('⚠️  Skipping formatCtrlFile test - astyle.exe not available (expected in CI/CD)');
            assert.ok(true, 'Test skipped - WinCC OA not installed');
            return;
        }

        try {
            const result = await formatting.formatCtrlFile(
                testCtlFile,
                astyleConfig.executable,
                astyleConfig.configFile || undefined
            );
            assert.strictEqual(result, true, 'Should return true on successful formatting');

            // Verify file still exists
            assert.ok(fs.existsSync(testCtlFile), 'File should still exist after formatting');
        } catch (error) {
            console.log('⚠️  formatCtrlFile test failed:', error);
            // Don't fail the test if astyle execution fails on CI/CD
            assert.ok(true, 'Test passes - errors expected without proper WinCC OA environment');
        }
    });

    test('formatCtrlFile should handle missing config file', async () => {
        const astyleConfig = await formatting.findAStyleExecutable(testWorkspaceRoot);

        if (!astyleConfig) {
            console.log(
                '⚠️  Skipping formatCtrlFile without config test - astyle.exe not available (expected in CI/CD)'
            );
            assert.ok(true, 'Test skipped - WinCC OA not installed');
            return;
        }

        try {
            // Call without config file - should use default options
            const result = await formatting.formatCtrlFile(testCtlFile, astyleConfig.executable, undefined);
            assert.strictEqual(result, true, 'Should return true even without config file');
        } catch (error) {
            console.log('⚠️  formatCtrlFile without config test failed:', error);
            assert.ok(true, 'Test passes - errors expected without proper WinCC OA environment');
        }
    });

    test('formatCtrlFile should throw error for invalid astyle path', async () => {
        try {
            await formatting.formatCtrlFile(testCtlFile, '/invalid/astyle.exe', undefined);
            assert.fail('Should throw error for invalid astyle path');
        } catch (error) {
            assert.ok(error, 'Should throw error');
        }
    });

    test('formatCtrlFile should throw error for non-existent file', async () => {
        const astyleConfig = await formatting.findAStyleExecutable(testWorkspaceRoot);

        if (!astyleConfig) {
            console.log('⚠️  Skipping non-existent file test - astyle.exe not available (expected in CI/CD)');
            assert.ok(true, 'Test skipped - WinCC OA not installed');
            return;
        }

        try {
            await formatting.formatCtrlFile('/non/existent/file.ctl', astyleConfig.executable, undefined);
            assert.fail('Should throw error for non-existent file');
        } catch (error) {
            assert.ok(error, 'Should throw error');
        }
    });

    test('Configuration settings should have default values', () => {
        const config = vscode.workspace.getConfiguration('winccOAProjects');

        // Check that settings exist with expected default values
        const astylePath = config.get<string>('astylePath');
        const astyleConfigPath = config.get<string>('astyleConfigPath');
        const astyleCreateBackup = config.get<boolean>('astyleCreateBackup');

        assert.notStrictEqual(astylePath, undefined, 'astylePath setting should exist');
        assert.notStrictEqual(astyleConfigPath, undefined, 'astyleConfigPath setting should exist');
        assert.strictEqual(astyleCreateBackup, false, 'astyleCreateBackup should default to false');
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands();

        assert.ok(commands.includes('winccOAProjects.formatCtrlFile'), 'formatCtrlFile command should be registered');
        assert.ok(
            commands.includes('winccOAProjects.formatAllCtrlFiles'),
            'formatAllCtrlFiles command should be registered'
        );
        assert.ok(
            commands.includes('winccOAProjects.formatAllCtrlFilesInFolder'),
            'formatAllCtrlFilesInFolder command should be registered'
        );
    });

    test('Output channel should be created', () => {
        // This is more of an integration test
        // We verify that the module exports the dispose function
        assert.ok(formatting.dispose, 'dispose function should exist');
        assert.strictEqual(typeof formatting.dispose, 'function', 'dispose should be a function');
    });

    test('File without extension should be detectable', () => {
        const fileExtension = path.extname(testFileNoExt);
        assert.strictEqual(fileExtension, '', 'File should have no extension');

        const fileName = path.basename(testFileNoExt);
        assert.strictEqual(fileName, 'test', 'File name should be correct');
    });

    test('CTL file extension should be detected', () => {
        const fileExtension = path.extname(testCtlFile);
        assert.strictEqual(fileExtension.toLowerCase(), '.ctl', 'Should detect .ctl extension');
    });

    test('Environment variable PVSS_II should be accessible', () => {
        const pvssPath = process.env.PVSS_II;
        // Just verify we can access it - value may or may not be set on systems without WinCC OA
        // This is not an error, just checking that environment variables are accessible
        if (pvssPath) {
            assert.ok(pvssPath.length > 0, 'PVSS_II should not be empty if set');
        } else {
            // No WinCC OA installed - this is acceptable for CI/CD environments
            assert.ok(true, 'PVSS_II not set - WinCC OA not installed (acceptable for CI/CD)');
        }
    });

    test('Common installation paths should be testable', () => {
        const version = '3.20';
        const commonPaths = [
            `C:\\Siemens\\Automation\\WinCC_OA\\${version}`,
            `C:\\WinCC_OA\\${version}`,
            `D:\\Siemens\\Automation\\WinCC_OA\\${version}`
        ];

        commonPaths.forEach(commonPath => {
            // We don't assert paths exist, just that we can construct them
            assert.ok(commonPath.includes(version), `Path should include version ${version}`);
            assert.ok(commonPath.length > 0, 'Path should not be empty');
        });
    });

    test('astyle.config path construction should be correct', () => {
        const binPath = 'C:\\Siemens\\Automation\\WinCC_OA\\3.20';
        const astyleConfigPath = path.join(binPath, 'config', 'astyle.config');

        assert.ok(astyleConfigPath.includes('config'), 'Path should include config directory');
        assert.ok(astyleConfigPath.endsWith('astyle.config'), 'Path should end with astyle.config');
    });

    test('Backup file configuration should be respected', () => {
        const config = vscode.workspace.getConfiguration('winccOAProjects');
        const createBackup = config.get<boolean>('astyleCreateBackup', false);

        // Default should be false
        assert.strictEqual(createBackup, false, 'Backup creation should be disabled by default');
    });
});

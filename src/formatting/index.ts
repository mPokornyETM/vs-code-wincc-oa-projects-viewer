/**
 * WinCC OA Code Formatting Module
 * Provides functionality to format .ctl files using astyle.exe from WinCC OA installation
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

interface AStyleConfig {
    executable: string;
    version: string;
}

/**
 * Find astyle.exe in WinCC OA installation
 */
export async function findAStyleExecutable(projectPath: string): Promise<AStyleConfig | null> {
    try {
        // Read project config to get WinCC OA version
        const configPath = path.join(projectPath, 'config', 'config');
        if (!fs.existsSync(configPath)) {
            return null;
        }

        const configContent = fs.readFileSync(configPath, 'utf8');
        const versionMatch = configContent.match(/pvss_version\s*=\s*"([^"]+)"/);

        if (!versionMatch) {
            return null;
        }

        const version = versionMatch[1];

        // Try to find astyle.exe in WinCC OA bin directory
        // Check PVSS_II environment variable first
        let binPath = process.env.PVSS_II;

        if (!binPath) {
            // Try to extract from config file
            const pvssPath = configContent.match(/pvss_path\s*=\s*"([^"]+)"/);
            if (pvssPath) {
                binPath = pvssPath[1];
            }
        }

        if (!binPath) {
            // Try common installation paths
            const commonPaths = [
                `C:\\Siemens\\Automation\\WinCC_OA\\${version}`,
                `C:\\WinCC_OA\\${version}`,
                `D:\\Siemens\\Automation\\WinCC_OA\\${version}`
            ];

            for (const commonPath of commonPaths) {
                if (fs.existsSync(commonPath)) {
                    binPath = commonPath;
                    break;
                }
            }
        }

        if (!binPath) {
            return null;
        }

        const astylePath = path.join(binPath, 'bin', 'astyle.exe');

        if (fs.existsSync(astylePath)) {
            return {
                executable: astylePath,
                version: version
            };
        }

        return null;
    } catch (error) {
        console.error('Error finding astyle executable:', error);
        return null;
    }
}

/**
 * Prompt user to select astyle.exe if not found automatically
 */
export async function promptForAStylePath(version: string): Promise<string | undefined> {
    const message = `astyle.exe not found for WinCC OA version ${version}. Please select astyle.exe from your WinCC OA installation.`;

    const selection = await vscode.window.showWarningMessage(message, 'Select astyle.exe', 'Cancel');

    if (selection === 'Select astyle.exe') {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: {
                Executables: ['exe']
            },
            title: 'Select astyle.exe from WinCC OA bin directory'
        });

        if (result && result.length > 0) {
            const selectedPath = result[0].fsPath;

            // Verify it's astyle.exe
            if (path.basename(selectedPath).toLowerCase() === 'astyle.exe') {
                // Store the path in workspace settings for future use
                await vscode.workspace
                    .getConfiguration('winccOAProjects')
                    .update('astylePath', selectedPath, vscode.ConfigurationTarget.Workspace);

                return selectedPath;
            } else {
                vscode.window.showErrorMessage('Selected file is not astyle.exe');
            }
        }
    }

    return undefined;
}

/**
 * Format a .ctl file using astyle
 */
export async function formatCtrlFile(filePath: string, astylePath: string): Promise<boolean> {
    try {
        // AStyle options for WinCC OA CTRL code formatting
        const astyleOptions = [
            '--style=allman', // Allman bracket style (commonly used in WinCC OA)
            '--indent=spaces=2', // 2-space indentation
            '--indent-switches', // Indent switch cases
            '--indent-cases', // Indent case statements
            '--pad-oper', // Pad operators with spaces
            '--pad-header', // Pad headers (if, for, while, etc.)
            '--unpad-paren', // Remove padding around parentheses
            '--align-pointer=name', // Align pointer/reference to variable name
            '--break-blocks', // Add blank lines around blocks
            '--convert-tabs', // Convert tabs to spaces
            '--max-code-length=120', // Max line length
            '--mode=c', // C/C++ mode (CTRL is C-like)
            filePath // File to format (in-place)
        ];

        await execFileAsync(astylePath, astyleOptions);

        return true;
    } catch (error) {
        console.error('Error formatting file:', error);
        throw error;
    }
}

/**
 * Format the active .ctl file
 */
export async function formatActiveCtrlFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const document = editor.document;

    // Check if it's a .ctl file
    if (path.extname(document.fileName).toLowerCase() !== '.ctl') {
        vscode.window.showInformationMessage('Active file is not a WinCC OA CTRL file (.ctl)');
        return;
    }

    // Save the file before formatting
    if (document.isDirty) {
        await document.save();
    }

    try {
        // Try to get astyle path from workspace settings
        let astylePath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astylePath');

        // If not in settings, try to find it automatically
        if (!astylePath) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }

            const projectPath = workspaceFolders[0].uri.fsPath;
            const astyleConfig = await findAStyleExecutable(projectPath);

            if (astyleConfig) {
                astylePath = astyleConfig.executable;

                // Store for future use
                await vscode.workspace
                    .getConfiguration('winccOAProjects')
                    .update('astylePath', astylePath, vscode.ConfigurationTarget.Workspace);
            } else {
                // Prompt user to select
                astylePath = await promptForAStylePath('unknown');
            }
        }

        if (!astylePath) {
            return; // User cancelled
        }

        // Verify astyle.exe exists
        if (!fs.existsSync(astylePath)) {
            vscode.window.showErrorMessage(`astyle.exe not found at: ${astylePath}`);

            // Clear invalid path
            await vscode.workspace
                .getConfiguration('winccOAProjects')
                .update('astylePath', undefined, vscode.ConfigurationTarget.Workspace);

            return;
        }

        // Format the file
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Formatting CTRL code...',
                cancellable: false
            },
            async () => {
                await formatCtrlFile(document.fileName, astylePath!);
            }
        );

        // Reload the file to show formatted content
        await vscode.commands.executeCommand('workbench.action.files.revert');

        vscode.window.showInformationMessage('CTRL code formatted successfully');
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to format CTRL code: ${error}`);
    }
}

/**
 * Format all .ctl files in the workspace
 */
export async function formatAllCtrlFiles(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    try {
        // Try to get astyle path
        let astylePath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astylePath');

        if (!astylePath) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            const astyleConfig = await findAStyleExecutable(projectPath);

            if (astyleConfig) {
                astylePath = astyleConfig.executable;
            } else {
                astylePath = await promptForAStylePath('unknown');
            }
        }

        if (!astylePath || !fs.existsSync(astylePath)) {
            vscode.window.showErrorMessage('astyle.exe not found');
            return;
        }

        // Find all .ctl files
        const ctlFiles = await vscode.workspace.findFiles('**/*.ctl', '**/node_modules/**');

        if (ctlFiles.length === 0) {
            vscode.window.showInformationMessage('No .ctl files found');
            return;
        }

        const selection = await vscode.window.showWarningMessage(
            `Found ${ctlFiles.length} .ctl file(s). Format all?`,
            'Yes',
            'No'
        );

        if (selection !== 'Yes') {
            return;
        }

        let successCount = 0;
        let failureCount = 0;

        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Formatting CTRL files...',
                cancellable: false
            },
            async progress => {
                for (let i = 0; i < ctlFiles.length; i++) {
                    const file = ctlFiles[i];
                    progress.report({
                        message: `${i + 1}/${ctlFiles.length}: ${path.basename(file.fsPath)}`,
                        increment: 100 / ctlFiles.length
                    });

                    try {
                        await formatCtrlFile(file.fsPath, astylePath!);
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to format ${file.fsPath}:`, error);
                        failureCount++;
                    }
                }
            }
        );

        vscode.window.showInformationMessage(
            `Formatted ${successCount} file(s). ${failureCount > 0 ? `Failed: ${failureCount}` : ''}`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to format CTRL files: ${error}`);
    }
}

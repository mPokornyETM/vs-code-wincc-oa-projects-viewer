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

// Create output channel for astyle logs
let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        outputChannel = vscode.window.createOutputChannel('WinCC OA Formatting');
    }
    return outputChannel;
}

interface AStyleConfig {
    executable: string;
    configFile: string | null;
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
        const astyleConfigPath = path.join(binPath, 'config', 'astyle.config');

        if (fs.existsSync(astylePath)) {
            return {
                executable: astylePath,
                configFile: fs.existsSync(astyleConfigPath) ? astyleConfigPath : null,
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
export async function formatCtrlFile(filePath: string, astylePath: string, configFilePath?: string): Promise<boolean> {
    try {
        const output = getOutputChannel();
        output.appendLine(`\n${'='.repeat(80)}`);
        output.appendLine(`Formatting: ${filePath}`);
        output.appendLine(`astyle.exe: ${astylePath}`);

        const astyleOptions: string[] = [];

        // Check if user wants to create backup files (.orig)
        const createBackup = vscode.workspace
            .getConfiguration('winccOAProjects')
            .get<boolean>('astyleCreateBackup', false);

        if (!createBackup) {
            // Don't create .orig backup files
            astyleOptions.push('--suffix=none');
            output.appendLine('Backup files: Disabled');
        } else {
            output.appendLine('Backup files: Enabled (.orig)');
        }

        // Use config file if provided or available
        if (configFilePath && fs.existsSync(configFilePath)) {
            astyleOptions.push(`--options=${configFilePath}`);
            output.appendLine(`Config file: ${configFilePath}`);
        } else {
            output.appendLine('Config file: None (using default options)');
            // Fallback to default options if no config file
            astyleOptions.push(
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
                '--mode=c' // C/C++ mode (CTRL is C-like)
            );
        }

        astyleOptions.push(filePath); // File to format (in-place)

        output.appendLine(`Command: ${astylePath} ${astyleOptions.join(' ')}`);
        output.appendLine('');

        const { stdout, stderr } = await execFileAsync(astylePath, astyleOptions);

        if (stdout) {
            output.appendLine('STDOUT:');
            output.appendLine(stdout);
        }

        if (stderr) {
            output.appendLine('STDERR:');
            output.appendLine(stderr);
        }

        output.appendLine('✓ Formatting completed successfully');
        output.show(true); // Show output channel (preserveFocus = true)

        return true;
    } catch (error) {
        const output = getOutputChannel();
        output.appendLine(`✗ Error formatting file: ${error}`);
        output.show(true);
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
    const fileExtension = path.extname(document.fileName).toLowerCase();
    if (fileExtension !== '.ctl') {
        const fileName = path.basename(document.fileName);
        const message = fileExtension
            ? `File "${fileName}" has extension "${fileExtension}" instead of ".ctl". Format anyway?`
            : `File "${fileName}" has no extension. Format as CTRL file anyway?`;

        const selection = await vscode.window.showWarningMessage(message, 'Yes', 'No');

        if (selection !== 'Yes') {
            return;
        }
    }

    // Save the file before formatting
    if (document.isDirty) {
        await document.save();
    }

    try {
        // Try to get astyle path from workspace settings
        let astylePath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astylePath');
        let astyleConfigPath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astyleConfigPath');

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
                astyleConfigPath = astyleConfig.configFile || undefined;

                // Store for future use
                await vscode.workspace
                    .getConfiguration('winccOAProjects')
                    .update('astylePath', astylePath, vscode.ConfigurationTarget.Workspace);

                if (astyleConfigPath) {
                    await vscode.workspace
                        .getConfiguration('winccOAProjects')
                        .update('astyleConfigPath', astyleConfigPath, vscode.ConfigurationTarget.Workspace);
                }
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
                await formatCtrlFile(document.fileName, astylePath!, astyleConfigPath);
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
 * Format a CTRL file from URI (called from explorer context menu)
 */
export async function formatCtrlFileFromUri(uri: vscode.Uri): Promise<void> {
    const filePath = uri.fsPath;

    // Check if it's a .ctl file
    const fileExtension = path.extname(filePath).toLowerCase();
    if (fileExtension !== '.ctl') {
        const fileName = path.basename(filePath);
        const message = fileExtension
            ? `File "${fileName}" has extension "${fileExtension}" instead of ".ctl". Format anyway?`
            : `File "${fileName}" has no extension. Format as CTRL file anyway?`;

        const selection = await vscode.window.showWarningMessage(message, 'Yes', 'No');

        if (selection !== 'Yes') {
            return;
        }
    }

    // Check if file is open and dirty
    const openDocument = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === filePath);
    if (openDocument && openDocument.isDirty) {
        await openDocument.save();
    }

    try {
        // Try to get astyle path from workspace settings
        let astylePath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astylePath');
        let astyleConfigPath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astyleConfigPath');

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
                astyleConfigPath = astyleConfig.configFile || undefined;

                // Store for future use
                await vscode.workspace
                    .getConfiguration('winccOAProjects')
                    .update('astylePath', astylePath, vscode.ConfigurationTarget.Workspace);

                if (astyleConfigPath) {
                    await vscode.workspace
                        .getConfiguration('winccOAProjects')
                        .update('astyleConfigPath', astyleConfigPath, vscode.ConfigurationTarget.Workspace);
                }
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
                title: `Formatting ${path.basename(filePath)}...`,
                cancellable: false
            },
            async () => {
                await formatCtrlFile(filePath, astylePath!, astyleConfigPath);
            }
        );

        // If file is open, reload it
        if (openDocument) {
            await vscode.commands.executeCommand('workbench.action.files.revert', uri);
        }

        vscode.window.showInformationMessage(`CTRL code formatted successfully: ${path.basename(filePath)}`);
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
        let astyleConfigPath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astyleConfigPath');

        if (!astylePath) {
            const projectPath = workspaceFolders[0].uri.fsPath;
            const astyleConfig = await findAStyleExecutable(projectPath);

            if (astyleConfig) {
                astylePath = astyleConfig.executable;
                astyleConfigPath = astyleConfig.configFile || undefined;
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
                        await formatCtrlFile(file.fsPath, astylePath!, astyleConfigPath);
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

/**
 * Format all .ctl files in a specific folder (recursively)
 */
export async function formatAllCtrlFilesInFolder(folderUri?: vscode.Uri): Promise<void> {
    try {
        // If no folder URI provided, use the first workspace folder
        let folderPath: string;

        if (folderUri) {
            folderPath = folderUri.fsPath;
        } else {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                vscode.window.showErrorMessage('No workspace folder open');
                return;
            }
            folderPath = workspaceFolders[0].uri.fsPath;
        }

        // Verify it's a directory
        if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
            vscode.window.showErrorMessage('Selected item is not a folder');
            return;
        }

        // Try to get astyle path
        let astylePath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astylePath');
        let astyleConfigPath = vscode.workspace.getConfiguration('winccOAProjects').get<string>('astyleConfigPath');

        if (!astylePath) {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const projectPath = workspaceFolders[0].uri.fsPath;
                const astyleConfig = await findAStyleExecutable(projectPath);

                if (astyleConfig) {
                    astylePath = astyleConfig.executable;
                    astyleConfigPath = astyleConfig.configFile || undefined;
                } else {
                    astylePath = await promptForAStylePath('unknown');
                }
            }
        }

        if (!astylePath || !fs.existsSync(astylePath)) {
            vscode.window.showErrorMessage('astyle.exe not found');
            return;
        }

        // Find all .ctl files in the folder (recursively)
        const pattern = new vscode.RelativePattern(folderPath, '**/*.ctl');
        const ctlFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');

        if (ctlFiles.length === 0) {
            vscode.window.showInformationMessage(`No .ctl files found in ${path.basename(folderPath)}`);
            return;
        }

        const selection = await vscode.window.showWarningMessage(
            `Found ${ctlFiles.length} .ctl file(s) in ${path.basename(folderPath)}. Format all?`,
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
                title: `Formatting CTRL files in ${path.basename(folderPath)}...`,
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
                        await formatCtrlFile(file.fsPath, astylePath!, astyleConfigPath);
                        successCount++;
                    } catch (error) {
                        console.error(`Failed to format ${file.fsPath}:`, error);
                        failureCount++;
                    }
                }
            }
        );

        vscode.window.showInformationMessage(
            `Formatted ${successCount} file(s) in ${path.basename(folderPath)}. ${failureCount > 0 ? `Failed: ${failureCount}` : ''}`
        );
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to format CTRL files: ${error}`);
    }
}

/**
 * Dispose output channel
 */
export function dispose(): void {
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = undefined;
    }
}

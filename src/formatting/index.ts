/**
 * WinCC OA Code Formatting Module
 * Provides functionality to format .ctl files using astyle.exe from WinCC OA installation
 *
 * Note: astyle.exe is only available in WinCC OA version 3.19 and later.
 * Formatting features will not work with older versions.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import {
    getProjectByPath,
    getProjects,
    getWinCCOASystemVersions,
    selectWinCCOAVersion,
    WinCCOAProject
} from '../extension';

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
 * Find the WinCC OA project path for a given file or folder path
 * Checks all registered projects and returns the project path that contains the given path
 * @param selectedPath - The path to check (file or folder)
 * @returns The project installation directory, or null if not found
 */
export function findProjectPathForFile(selectedPath: string): string | null {
    const allProjects = getProjects();

    // Normalize the selected path for comparison
    const normalizedPath = path.normalize(selectedPath).toLowerCase();

    // Find the project whose installation directory is a parent of the selected path
    // Sort by path length descending to find the most specific (deepest) match first
    const matchingProject = allProjects
        .filter(project => {
            const projectPath = path.normalize(project.installationDir).toLowerCase();
            return normalizedPath.startsWith(projectPath);
        })
        .sort((a, b) => b.installationDir.length - a.installationDir.length)[0];

    return matchingProject ? matchingProject.installationDir : null;
}

/**
 * Find astyle.exe in WinCC OA installation
 * Note: astyle.exe is only available in WinCC OA version 3.19 and later
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
 * Get or configure astyle paths (executable and config file)
 * Tries auto-detection, throws error if not found
 * Note: Requires WinCC OA version 3.19 or later
 * @param filePath - Optional file path to determine the correct project (for multi-project workspaces)
 */
async function getAStylePaths(filePath: string): Promise<{ astylePath: string; astyleConfigPath?: string }> {
    let astyleConfigPath: string | undefined;
    let oaVersion: string;

    const output = getOutputChannel();

    if (!filePath) {
        throw new Error('File path is required to determine the WinCC OA project');
    }
    let project = getProjectByPath(filePath);
    let oaVersionSystem: WinCCOAProject | undefined;

    if (project) {
        //try to find the astyle confi file in the project directory first
        let projectPath = project.installationDir;
        output.appendLine('I have project path: ' + projectPath);
        astyleConfigPath = path.join(projectPath, 'config', 'astyle.config');
        if (!fs.existsSync(astyleConfigPath)) {
            astyleConfigPath = undefined;
        }

        oaVersion = project.version || '';
        oaVersionSystem = getWinCCOASystemVersions().find(version => version.id === oaVersion);
    }

    if (!oaVersionSystem) {
        output.appendLine('Ask user for oa path');
        oaVersionSystem = await selectWinCCOAVersion();
    }

    if (!oaVersionSystem) {
        throw new Error(`Cannot determine WinCC OA system installation from file path: ` + filePath);
    }

    let astyleExecutablePath = path.join(oaVersionSystem.installationDir, 'bin', 'astyle.exe');
    if (!astyleConfigPath) {
        astyleConfigPath = path.join(oaVersionSystem.installationDir, 'config', 'astyle.config');
    }

    if (
        !astyleExecutablePath ||
        !fs.existsSync(astyleExecutablePath) ||
        !astyleConfigPath ||
        !fs.existsSync(astyleConfigPath)
    ) {
        throw new Error(
            'astyle.exe not found in WinCC OA installation. ' +
                'Please ensure WinCC OA version 3.19 or later is properly installed. ' +
                'Code formatting is not available for older versions.'
        );
    }

    return {
        astylePath: astyleExecutablePath,
        astyleConfigPath: astyleConfigPath
    };
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
            throw new Error('astyle.config file not found. Please ensure it exists in the WinCC OA config directory.');
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
        const paths = await getAStylePaths(document.fileName);

        // Format the file
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Formatting CTRL code...',
                cancellable: false
            },
            async () => {
                await formatCtrlFile(document.fileName, paths.astylePath, paths.astyleConfigPath);
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
        const paths = await getAStylePaths(filePath);

        // Format the file
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: `Formatting ${path.basename(filePath)}...`,
                cancellable: false
            },
            async () => {
                await formatCtrlFile(filePath, paths.astylePath, paths.astyleConfigPath);
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
        // Use first workspace folder to determine project
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }
        const searchPath = workspaceFolders[0].uri.fsPath;

        const paths = await getAStylePaths(searchPath);

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
                        await formatCtrlFile(file.fsPath, paths.astylePath, paths.astyleConfigPath);
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

        const paths = await getAStylePaths(folderPath);

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
                        await formatCtrlFile(file.fsPath, paths.astylePath, paths.astyleConfigPath);
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

/**
 * Document formatting provider for CTRL (.ctl) files
 * Integrates with VS Code's built-in formatting commands
 */
export class CtrlDocumentFormattingProvider implements vscode.DocumentFormattingEditProvider {
    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        options: vscode.FormattingOptions,
        token: vscode.CancellationToken
    ): Promise<vscode.TextEdit[]> {
        try {
            // Save the document before formatting
            if (document.isDirty) {
                await document.save();
            }

            const filePath = document.uri.fsPath;
            const paths = await getAStylePaths(filePath);

            // Format the file
            await formatCtrlFile(filePath, paths.astylePath, paths.astyleConfigPath);

            // Return empty array since formatting is done in-place
            // VS Code will reload the file automatically
            return [];
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to format CTRL code: ${error}`);
            return [];
        }
    }
}

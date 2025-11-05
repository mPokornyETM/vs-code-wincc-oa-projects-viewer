// Admin Commands Module for Base Extension
// This file contains all admin functionality to be integrated into the base WinCC OA extension

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { spawn } from 'child_process';
import {
    getAvailableWinCCOAVersions,
    findAvailableWinCCOAVersions,
    getWCCILpmonPath,
    parseVersionString,
    getWinCCOAInstallationPath,
    searchForPmonExecutable,
    readProjectVersionFromConfig,
    markProjectAsNotRunnable
} from '../utils';
import { WinCCOAProject as ModularWinCCOAProject } from '../types';

// Interface for WinCC OA Project
export interface WinCCOAProject {
    name: string;
    configPath: string;
    projectPath: string;
    version?: string;
}

// Global output channel - should be passed from main extension
let adminOutputChannel: vscode.OutputChannel;

export function initializeAdminCommands(outputChannel: vscode.OutputChannel) {
    adminOutputChannel = outputChannel;
}

// Register project from file context menu
export function registerProjectFromFileCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('winccoa.registerProjectFromFile', async (uri: vscode.Uri) => {
        if (uri && uri.fsPath) {
            adminOutputChannel.appendLine(`Context menu registration requested for file: ${uri.fsPath}`);
            await registerWinCCOAProject(uri.fsPath);
        }
    });
}

// Register project from directory context menu
export function registerProjectFromDirectoryCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('winccoa.registerProjectFromDirectory', async (uri: vscode.Uri) => {
        if (uri && uri.fsPath) {
            adminOutputChannel.appendLine(`Context menu registration requested for directory: ${uri.fsPath}`);

            // Look for config file in the directory
            const configPath = await findConfigFileInDirectory(uri.fsPath);
            if (configPath) {
                await registerWinCCOAProject(configPath);
            } else {
                const errorMsg = `No WinCC OA config file found in directory: ${uri.fsPath}`;
                adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
                vscode.window.showErrorMessage(errorMsg);
            }
        }
    });
}

// Register sub-project from directory context menu
export function registerSubProjectFromDirectoryCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('winccoa.registerSubProjectFromDirectory', async (uri: vscode.Uri) => {
        if (uri && uri.fsPath) {
            adminOutputChannel.appendLine(`Sub-project registration requested for directory: ${uri.fsPath}`);
            await registerWinCCOASubProject(uri.fsPath);
        }
    });
}

// Unregister project from directory context menu
export function unregisterProjectFromDirectoryCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('winccoa.unregisterProjectFromDirectory', async (uri: vscode.Uri) => {
        if (uri && uri.fsPath) {
            const projectName = path.basename(uri.fsPath);
            adminOutputChannel.appendLine(
                `Unregistration requested for project: ${projectName} (from directory: ${uri.fsPath})`
            );

            const confirm = await vscode.window.showWarningMessage(
                `Do you want to unregister the WinCC OA project "${projectName}"?`,
                { modal: true },
                'Yes, Unregister'
            );

            if (confirm === 'Yes, Unregister') {
                try {
                    await unregisterProjectWithPmon(projectName);

                    // Trigger refresh of project tree
                    await vscode.commands.executeCommand('winccoa.refreshProjects');
                } catch (error) {
                    adminOutputChannel.appendLine(`Failed to unregister project: ${error}`);
                }
            }
        }
    });
}

// Unregister from tree view command
export function unregisterProjectFromTreeViewCommand(): vscode.Disposable {
    return vscode.commands.registerCommand('winccoa.unregisterProjectFromTreeView', async (treeItem: any) => {
        let projectName: string = '';
        let projectPath: string | undefined = undefined;

        // Extract project information from tree item
        if (treeItem && treeItem.label) {
            projectName = treeItem.label.toString();
            // Remove version info from display name if present
            projectName = projectName.replace(/ \(v[\d.]+\)$/, '');
        } else if (treeItem && treeItem.name) {
            projectName = treeItem.name;
        } else if (treeItem && treeItem.projectName) {
            projectName = treeItem.projectName;
        } else {
            vscode.window.showErrorMessage('Unable to determine project name from tree item');
            return;
        }

        // Get project path if available
        if (treeItem && treeItem.path) {
            projectPath = treeItem.path;
        } else if (treeItem && treeItem.projectPath) {
            projectPath = treeItem.projectPath;
        } else if (treeItem && treeItem.resourceUri) {
            projectPath = treeItem.resourceUri.fsPath;
        }

        adminOutputChannel.appendLine(`Tree view unregistration requested for project: ${projectName}`);
        if (projectPath) {
            adminOutputChannel.appendLine(`Project path: ${projectPath}`);
        }

        const confirm = await vscode.window.showWarningMessage(
            `Do you want to unregister the WinCC OA project "${projectName}"?`,
            { modal: true },
            'Yes, Unregister'
        );

        if (confirm === 'Yes, Unregister') {
            try {
                await unregisterProjectWithPmon(projectName);

                // Trigger refresh of project tree
                await vscode.commands.executeCommand('winccoa.refreshProjects');

                vscode.window.showInformationMessage(`Project "${projectName}" unregistered successfully`);
            } catch (error) {
                adminOutputChannel.appendLine(`Failed to unregister project: ${error}`);
                vscode.window.showErrorMessage(`Failed to unregister project "${projectName}": ${error}`);
            }
        }
    });
}

// Helper function to find config file in directory
async function findConfigFileInDirectory(directoryPath: string): Promise<string | null> {
    try {
        // Check if we're in config directory
        let configFile = path.join(directoryPath, 'config');

        if (fs.existsSync(configFile)) {
            const configStat = fs.statSync(configFile);
            if (configStat.isFile()) {
                return configFile;
            }
        }

        // Check if we're in project directory
        configFile = path.join(directoryPath, 'config', 'config');
        if (fs.existsSync(configFile)) {
            return configFile;
        }

        return null;
    } catch (error) {
        console.error(`Error searching for config file in ${directoryPath}:`, error);
        return null;
    }
}

// Main project registration function
async function registerWinCCOAProject(configPath: string): Promise<void> {
    try {
        adminOutputChannel.appendLine(`Starting registration for: ${configPath}`);

        // Read WinCC OA version from project config
        const projectDir = path.dirname(path.dirname(configPath)); // Go up from config/config to project root
        const version = readProjectVersionFromConfig(projectDir);

        if (version) {
            adminOutputChannel.appendLine(`Project WinCC OA version: ${version}`);
        } else {
            const warningMsg = `No proj_version found for project: ${configPath}`;
            adminOutputChannel.appendLine(`ERROR: ${warningMsg}`);
            vscode.window.showErrorMessage(`WinCC OA Version Not Found: ${configPath}`);
            return;
        }

        // Get pmon path based on project version
        const pmonPath = await searchForPmonExecutable(version);

        // Check if pmon executable exists
        if (!pmonPath) {
            const errorMsg = `Cannot register project: No WinCC OA pmon executable found for version ${version}. Please ensure WinCC OA ${version} is properly installed and registered.`;
            adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
            return;
        }

        if (!fs.existsSync(pmonPath)) {
            const errorMsg = `Cannot register project: WinCC OA pmon executable not found at detected path: ${pmonPath}. The installation may be corrupted or moved.`;
            adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
            return;
        }

        // Show progress while registering
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Registering WinCC OA Project',
                cancellable: false
            },
            async progress => {
                progress.report({ increment: 0, message: 'Starting pmon registration...' });

                return new Promise<void>((resolve, reject) => {
                    const command = `"${pmonPath}"`;
                    const args = ['-config', `"${configPath}"`, '-log', '+stderr', '-autofreg', '-status'];

                    const fullCommand = `${command} ${args.join(' ')}`;
                    adminOutputChannel.appendLine(`Executing command: ${fullCommand}`);
                    adminOutputChannel.show(true);

                    const child = spawn(command, args, {
                        shell: true,
                        stdio: ['pipe', 'pipe', 'pipe']
                    });

                    let stdout = '';
                    let stderr = '';

                    child.stdout?.on('data', data => {
                        const output = data.toString();
                        stdout += output;
                        adminOutputChannel.append(output);
                        progress.report({ increment: 25, message: 'Processing...' });
                    });

                    child.stderr?.on('data', data => {
                        const output = data.toString();
                        stderr += output;
                        adminOutputChannel.append(`[STDERR] ${output}`);
                    });

                    child.on('close', code => {
                        progress.report({ increment: 100, message: 'Completed' });

                        adminOutputChannel.appendLine(`\npmon process exited with code: ${code}`);
                        adminOutputChannel.appendLine('--- Command execution completed ---\n');

                        // Only exit codes 0 and 3 indicate successful registration
                        if (code === 0 || code === 3) {
                            const successMsg = `WinCC OA project registered successfully! (Exit code: ${code})`;
                            adminOutputChannel.appendLine(`SUCCESS: ${successMsg}`);
                            vscode.window.showInformationMessage(successMsg);

                            // Trigger refresh of project tree and select project
                            vscode.commands.executeCommand('winccoa.refreshProjects').then(() => {
                                vscode.commands.executeCommand('winccoa.selectProject', projectDir);
                            });

                            resolve();
                        } else {
                            const errorMessage = `Failed to register WinCC OA project. Exit code: ${code}`;
                            adminOutputChannel.appendLine(`ERROR: ${errorMessage}`);
                            if (stderr) {
                                adminOutputChannel.appendLine(`STDERR: ${stderr}`);
                            }
                            if (stdout) {
                                adminOutputChannel.appendLine(`STDOUT: ${stdout}`);
                            }
                            vscode.window.showErrorMessage(errorMessage);
                            reject(new Error(errorMessage));
                        }
                    });

                    child.on('error', error => {
                        const errorMessage = `Failed to start pmon process: ${error.message}`;
                        adminOutputChannel.appendLine(`ERROR: ${errorMessage}`);
                        vscode.window.showErrorMessage(errorMessage);
                        reject(error);
                    });
                });
            }
        );
    } catch (error) {
        const errorMsg = `Error registering WinCC OA project: ${error}`;
        adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
        vscode.window.showErrorMessage(errorMsg);
    }
}

// Sub-project registration function
async function registerWinCCOASubProject(projectPath: string): Promise<void> {
    try {
        adminOutputChannel.appendLine(`Starting sub-project registration for: ${projectPath}`);

        // Find available WinCC OA versions
        const availableVersions = getAvailableWinCCOAVersions();
        if (availableVersions.length === 0) {
            const errorMsg = 'No WinCC OA installations found. Please install WinCC OA first.';
            adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
            vscode.window.showErrorMessage(errorMsg);
            return;
        }

        adminOutputChannel.appendLine(`Available WinCC OA versions: ${availableVersions.join(', ')}`);

        // Ask user to select WinCC OA version (default to highest version)
        const selectedVersion = await vscode.window.showQuickPick(availableVersions, {
            placeHolder: `Select WinCC OA version (default: ${availableVersions[0]})`,
            canPickMany: false
        });

        const version = selectedVersion || availableVersions[0];
        adminOutputChannel.appendLine(`Selected WinCC OA version: ${version}`);

        const projectName = path.basename(projectPath);

        // Register the sub-project using pmon with -regsubf option
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'Registering WinCC OA Sub-Project',
                cancellable: false
            },
            async progress => {
                progress.report({ increment: 0, message: 'Starting sub-project registration...' });

                try {
                    await registerSubProjectWithPmon(projectPath, version);

                    progress.report({ increment: 100, message: 'Completed' });

                    const successMsg = `WinCC OA sub-project '${projectName}' registered successfully as addOn/plugin!`;
                    adminOutputChannel.appendLine(`SUCCESS: ${successMsg}`);
                    vscode.window.showInformationMessage(successMsg);

                    // Trigger refresh of project tree and select project
                    await vscode.commands.executeCommand('winccoa.refreshProjects');
                    await vscode.commands.executeCommand('winccoa.selectProject', projectPath);
                } catch (error) {
                    const errorMessage = `Failed to register WinCC OA sub-project: ${error}`;
                    adminOutputChannel.appendLine(`ERROR: ${errorMessage}`);
                    vscode.window.showErrorMessage(errorMessage);
                    throw error;
                }
            }
        );
    } catch (error) {
        const errorMsg = `Error registering WinCC OA sub-project: ${error}`;
        adminOutputChannel.appendLine(`ERROR: ${errorMsg}`);
        vscode.window.showErrorMessage(errorMsg);
    }
}

// Helper function to register sub-project using -regsubf option
async function registerSubProjectWithPmon(projectPath: string, version: string): Promise<void> {
    const installationPath = getWinCCOAInstallationPath(version);
    if (!installationPath) {
        throw new Error(`WinCC OA installation not found for version ${version}`);
    }

    const isWindows = os.platform() === 'win32';
    const pmonExecutable = isWindows ? 'WCCILpmon.exe' : 'WCCILpmon';
    const pmonPath = path.join(installationPath, 'bin', pmonExecutable);

    if (!fs.existsSync(pmonPath)) {
        throw new Error(`pmon executable not found at ${pmonPath}`);
    }

    adminOutputChannel.appendLine(`Registering sub-project: ${projectPath}`);
    adminOutputChannel.appendLine(`Using WinCC OA version: ${version}`);
    adminOutputChannel.appendLine(`pmon path: ${pmonPath}`);

    // Use -regsubf option to register sub-project
    const args = ['-regsubf', '-proj', projectPath, '-log', '+stderr'];

    adminOutputChannel.appendLine(`Executing: ${pmonPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
        const process = spawn(pmonPath, args, {
            cwd: path.dirname(pmonPath),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', data => {
            const output = data.toString();
            stdout += output;
            adminOutputChannel.append(output);
        });

        process.stderr?.on('data', data => {
            const output = data.toString();
            stderr += output;
            adminOutputChannel.append(output);
        });

        process.on('close', code => {
            adminOutputChannel.appendLine(`\nProcess exited with code: ${code}`);

            // Success codes: 0 (success), 3 (already registered)
            if (code === 0 || code === 3) {
                adminOutputChannel.appendLine('Sub-project registration completed successfully!');
                resolve();
            } else {
                const errorMsg = `Sub-project registration failed with exit code ${code}`;
                adminOutputChannel.appendLine(errorMsg);
                if (stderr) {
                    adminOutputChannel.appendLine(`Error details: ${stderr}`);
                }
                reject(new Error(errorMsg));
            }
        });

        process.on('error', error => {
            const errorMsg = `Failed to start pmon process: ${error.message}`;
            adminOutputChannel.appendLine(errorMsg);
            reject(new Error(errorMsg));
        });
    });
}

// Helper function to unregister project using -unreg option
async function unregisterProjectWithPmon(projectName: string, version?: string): Promise<void> {
    // Find a suitable WinCC OA version if not provided
    if (!version) {
        const versions = getAvailableWinCCOAVersions();
        if (versions.length === 0) {
            throw new Error('No WinCC OA installation found');
        }
        version = versions[0]; // Use the highest version
    }

    const installationPath = getWinCCOAInstallationPath(version);
    if (!installationPath) {
        throw new Error(`WinCC OA installation not found for version ${version}`);
    }

    const isWindows = os.platform() === 'win32';
    const pmonExecutable = isWindows ? 'WCCILpmon.exe' : 'WCCILpmon';
    const pmonPath = path.join(installationPath, 'bin', pmonExecutable);

    if (!fs.existsSync(pmonPath)) {
        throw new Error(`pmon executable not found at ${pmonPath}`);
    }

    adminOutputChannel.appendLine(`Unregistering project: ${projectName}`);
    adminOutputChannel.appendLine(`Using WinCC OA version: ${version}`);
    adminOutputChannel.appendLine(`pmon path: ${pmonPath}`);

    // Use -unreg option to unregister project
    const args = ['-unreg', projectName, '-log', '+stderr'];

    adminOutputChannel.appendLine(`Executing: ${pmonPath} ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
        const process = spawn(pmonPath, args, {
            cwd: path.dirname(pmonPath),
            stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        process.stdout?.on('data', data => {
            const output = data.toString();
            stdout += output;
            adminOutputChannel.append(output);
        });

        process.stderr?.on('data', data => {
            const output = data.toString();
            stderr += output;
            adminOutputChannel.append(output);
        });

        process.on('close', code => {
            adminOutputChannel.appendLine(`\nProcess exited with code: ${code}`);

            // Success code: 0 (success)
            if (code === 0) {
                adminOutputChannel.appendLine('Project unregistration completed successfully!');
                resolve();
            } else {
                const errorMsg = `Project unregistration failed with exit code ${code}`;
                adminOutputChannel.appendLine(errorMsg);
                if (stderr) {
                    adminOutputChannel.appendLine(`Error details: ${stderr}`);
                }
                reject(new Error(errorMsg));
            }
        });

        process.on('error', error => {
            const errorMsg = `Failed to start pmon process: ${error.message}`;
            adminOutputChannel.appendLine(errorMsg);
            reject(new Error(errorMsg));
        });
    });
}

// Export all command registration functions for easy integration
export const adminCommands = {
    registerProjectFromFileCommand,
    registerProjectFromDirectoryCommand,
    registerSubProjectFromDirectoryCommand,
    unregisterProjectFromDirectoryCommand,
    unregisterProjectFromTreeViewCommand
};

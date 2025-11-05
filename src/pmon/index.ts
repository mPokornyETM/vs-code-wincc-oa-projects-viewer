import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import {
    WinCCOAProject,
    WinCCOAManager,
    WinCCOAProjectState,
    WinCCOAProjectStatus,
    PmonProjectRunningStatus
} from '../types';
import { getWCCILpmonPath, parseManagerList, parseManagerStatus } from '../utils';
import { addToCommandHistory } from '../commands/history';

// Output channel reference
let outputChannel: vscode.OutputChannel;

/**
 * Initialize the pmon module with output channel
 */
export function initializePmonModule(channel: vscode.OutputChannel): void {
    outputChannel = channel;
}

/**
 * Checks if a WinCC OA project is currently running using WCCILpmon status command
 * @param project The WinCC OA project to check
 * @returns Promise that resolves to the project running status
 */
export async function checkProjectRunningStatus(project: WinCCOAProject): Promise<PmonProjectRunningStatus> {
    // Only check status for runnable projects
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot check status for non-runnable project: ${project.config.name}`);
    }

    // Get the appropriate WCCILpmon path for this project's version
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    // Build command arguments: -proj <project_name> -status
    const args = ['-proj', project.config.name, '-status'];

    if (outputChannel) {
        outputChannel.appendLine(`[Project Status Check] Checking status for project: ${project.config.name}`);
        outputChannel.appendLine(`[Project Status Check] Executing: ${pmonPath} ${args.join(' ')}`);
    }

    return new Promise<PmonProjectRunningStatus>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.installationDir
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', data => {
            stdout += data.toString();
        });

        child.stderr?.on('data', data => {
            stderr += data.toString();
        });

        child.on('error', error => {
            if (outputChannel) {
                outputChannel.appendLine(`[Project Status Check] ❌ Failed to execute WCCILpmon: ${error.message}`);
            }
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });

        child.on('close', code => {
            if (outputChannel) {
                outputChannel.appendLine(`[Project Status Check] WCCILpmon exited with code: ${code}`);

                if (stdout.trim()) {
                    outputChannel.appendLine(`[Project Status Check] stdout: ${stdout.trim()}`);
                }
                if (stderr.trim()) {
                    outputChannel.appendLine(`[Project Status Check] stderr: ${stderr.trim()}`);
                }
            }

            // Interpret exit codes according to WCCILpmon specification
            let status: PmonProjectRunningStatus;
            switch (code) {
                case 0:
                    status = PmonProjectRunningStatus.Running;
                    if (outputChannel) {
                        outputChannel.appendLine(
                            `[Project Status Check] ✅ Project '${project.config.name}' is RUNNING`
                        );
                    }
                    break;
                case 3:
                    status = PmonProjectRunningStatus.NotRunning;
                    if (outputChannel) {
                        outputChannel.appendLine(
                            `[Project Status Check] ⏹️ Project '${project.config.name}' is STOPPED`
                        );
                    }
                    break;
                case 4:
                    status = PmonProjectRunningStatus.Unknown;
                    if (outputChannel) {
                        outputChannel.appendLine(
                            `[Project Status Check] ❓ Project '${project.config.name}' status is UNKNOWN`
                        );
                    }
                    break;
                default:
                    // Any other exit code is treated as an error
                    const errorMsg = `Unexpected exit code ${code} when checking project status`;
                    if (outputChannel) {
                        outputChannel.appendLine(`[Project Status Check] ❌ ${errorMsg}`);
                    }
                    reject(new Error(errorMsg));
                    return;
            }

            resolve(status);
        });
    });
}

/**
 * Checks if a WinCC OA project is currently running (convenience function)
 * @param project The WinCC OA project to check
 * @returns Promise that resolves to true if running, false if stopped, throws error if unknown or failed
 */
export async function isProjectRunning(project: WinCCOAProject): Promise<boolean> {
    const status = await checkProjectRunningStatus(project);

    switch (status) {
        case PmonProjectRunningStatus.Running:
            return true;
        case PmonProjectRunningStatus.NotRunning:
            return false;
        case PmonProjectRunningStatus.Unknown:
        default:
            throw new Error(`Cannot determine project status: ${status}`);
    }
}

/**
 * Starts WinCC OA pmon manager only (no auto start)
 * @param project The WinCC OA project
 */
export async function startPmonOnly(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start pmon for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-log', '+stderr', '-noAutoStart'];
    const command = `${pmonPath} ${args.join(' ')}`;

    if (outputChannel) {
        outputChannel.appendLine(`[Pmon Start] Starting pmon for project: ${project.config.name}`);
        outputChannel.appendLine(`[Pmon Start] Executing: ${command}`);
        outputChannel.show(true);
    }

    return new Promise<void>((resolve, reject) => {
        let response = '';

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.installationDir,
            detached: true
        });

        child.stdout?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            if (outputChannel) {
                outputChannel.appendLine(`[Pmon Start] ${output}`);
            }
        });

        child.stderr?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            if (outputChannel) {
                outputChannel.appendLine(`[Pmon Start] Error: ${output}`);
            }
        });

        child.on('spawn', () => {
            if (outputChannel) {
                outputChannel.appendLine(`✅ Pmon started for project '${project.config.name}' (PID: ${child.pid})`);
            }
            vscode.window.showInformationMessage(`✅ Pmon started for project '${project.config.name}'`);

            // Add to history - for detached process, we consider spawn success as OK
            addToCommandHistory(project.config.name, command, response || 'OK');

            child.unref(); // Allow process to continue independently
            resolve();
        });

        child.on('error', error => {
            const errorMsg = `Failed to start pmon: ${error.message}`;
            if (outputChannel) {
                outputChannel.appendLine(`❌ ${errorMsg}`);
            }
            vscode.window.showErrorMessage(errorMsg);

            // Add error to history
            addToCommandHistory(project.config.name, command, `ERROR ${errorMsg}`);

            reject(error);
        });
    });
}

/**
 * Starts WinCC OA project
 * @param project The WinCC OA project
 */
export async function startProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    // Check if pmon is already running
    let args: string[];
    try {
        const status = await checkProjectRunningStatus(project);
        if (status === PmonProjectRunningStatus.Running) {
            // Pmon is running, use START_ALL command
            args = ['-proj', project.config.name, '-command', 'START_ALL:'];
            if (outputChannel) {
                outputChannel.appendLine(`[Project Start] Pmon is running, sending START_ALL command`);
            }
        } else {
            // Pmon not running, start normally
            args = ['-proj', project.config.name];
            if (outputChannel) {
                outputChannel.appendLine(`[Project Start] Pmon not running, starting project normally`);
            }
        }
    } catch (error) {
        // If we can't determine status, try normal start
        args = ['-proj', project.config.name];
        if (outputChannel) {
            outputChannel.appendLine(`[Project Start] Could not determine pmon status, trying normal start`);
        }
    }

    const command = `${pmonPath} ${args.join(' ')}`;

    return executePmonCommand(project, pmonPath, args, command);
}

/**
 * Stops WinCC OA project
 * @param project The WinCC OA project
 */
export async function stopProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'STOP_ALL:'];
    const command = `${pmonPath} ${args.join(' ')}`;

    return executePmonCommand(project, pmonPath, args, command);
}

/**
 * Stops WinCC OA project and pmon
 * @param project The WinCC OA project
 */
export async function stopProjectAndPmon(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'EXIT:'];
    const command = `${pmonPath} ${args.join(' ')}`;

    return executePmonCommand(project, pmonPath, args, command);
}

/**
 * Restarts WinCC OA project
 * @param project The WinCC OA project
 */
export async function restartProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot restart non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'RESTART_ALL:'];
    const command = `${pmonPath} ${args.join(' ')}`;

    return executePmonCommand(project, pmonPath, args, command);
}

/**
 * Sets pmon wait mode
 * @param project The WinCC OA project
 */
export async function setPmonWaitMode(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot set wait mode for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'WAIT_MODE:'];
    const command = `${pmonPath} ${args.join(' ')}`;

    return executePmonCommand(project, pmonPath, args, command);
}

/**
 * Gets list of managers for a project
 * @param project The WinCC OA project
 */
export async function getManagerList(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get managers for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'MGRLIST:LIST', '-log', '+stdout'];

    return new Promise<WinCCOAManager[]>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.installationDir
        });

        let output = '';
        child.stdout?.on('data', data => {
            output += data.toString();
        });

        child.stderr?.on('data', data => {
            if (outputChannel) {
                outputChannel.appendLine(`Error: ${data.toString()}`);
            }
        });

        child.on('close', code => {
            if (code === 0) {
                const managers = parseManagerList(output);
                resolve(managers);
            } else {
                reject(new Error(`Failed to get manager list. Exit code: ${code}`));
            }
        });

        child.on('error', error => {
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets detailed status of all managers and project state
 * @param project The WinCC OA project
 */
export async function getDetailedManagerStatus(
    project: WinCCOAProject
): Promise<{ managers: WinCCOAManager[]; projectState?: WinCCOAProjectState }> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get manager status for non-runnable project: ${project.config.name}`);
    }

    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const args = ['-proj', project.config.name, '-command', 'MGRLIST:STATI', '-log', '+stdout'];

    return new Promise<{ managers: WinCCOAManager[]; projectState?: WinCCOAProjectState }>((resolve, reject) => {
        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.installationDir
        });

        let output = '';
        child.stdout?.on('data', data => {
            output += data.toString();
        });

        child.stderr?.on('data', data => {
            if (outputChannel) {
                outputChannel.appendLine(`Error: ${data.toString()}`);
            }
        });

        child.on('close', code => {
            if (code === 0) {
                const result = parseManagerStatus(output);
                resolve(result);
            } else {
                reject(new Error(`Failed to get manager status. Exit code: ${code}`));
            }
        });

        child.on('error', error => {
            reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
        });
    });
}

/**
 * Gets status of all managers for a project
 * @param project The WinCC OA project
 */
export async function getManagerStatus(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    const result = await getDetailedManagerStatus(project);
    return result.managers;
}

/**
 * Gets comprehensive project status including pmon and managers
 * @param project The WinCC OA project
 */
export async function getComprehensiveProjectStatus(project: WinCCOAProject): Promise<WinCCOAProjectStatus> {
    const [runningStatus, detailedStatus] = await Promise.all([
        checkProjectRunningStatus(project).catch(() => PmonProjectRunningStatus.Unknown),
        getDetailedManagerStatus(project).catch(() => ({ managers: [] as WinCCOAManager[], projectState: undefined }))
    ]);

    return {
        project: project.config,
        managers: detailedStatus.managers,
        projectState: detailedStatus.projectState,
        runningStatus,
        lastUpdated: new Date()
    };
}

/**
 * Starts a specific manager
 * @param project The WinCC OA project
 * @param index Manager index
 */
export async function startManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    const args = ['-proj', project.config.name, '-command', `START_MANAGER:${index}`];
    await executeManagerCommand(project, args);
}

/**
 * Stops a specific manager
 * @param project The WinCC OA project
 * @param index Manager index
 */
export async function stopManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    const args = ['-proj', project.config.name, '-command', `STOP_MANAGER:${index}`];
    await executeManagerCommand(project, args);
}

/**
 * Kills a specific manager
 * @param project The WinCC OA project
 * @param index Manager index
 */
export async function killManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    const args = ['-proj', project.config.name, '-command', `KILL_MANAGER:${index}`];
    await executeManagerCommand(project, args);
}

/**
 * Removes a specific manager
 * @param project The WinCC OA project
 * @param index Manager index
 */
export async function removeManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    const args = ['-proj', project.config.name, '-command', `REMOVE_MANAGER:${index}`];
    await executeManagerCommand(project, args);
}

// Helper functions

/**
 * Executes a pmon command and handles the response
 */
function executePmonCommand(project: WinCCOAProject, pmonPath: string, args: string[], command: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (outputChannel) {
            outputChannel.appendLine(`[Pmon Command] Executing: ${command}`);
            outputChannel.show(true);
        }

        const child = childProcess.spawn(pmonPath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            shell: false,
            cwd: project.installationDir
        });

        let response = '';

        child.stdout?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            if (outputChannel) {
                outputChannel.appendLine(`[Pmon Command] ${output}`);
            }
        });

        child.stderr?.on('data', data => {
            const output = data.toString().trim();
            response += output + '\n';
            if (outputChannel) {
                outputChannel.appendLine(`[Pmon Command] Error: ${output}`);
            }
        });

        child.on('close', code => {
            if (outputChannel) {
                outputChannel.appendLine(`[Pmon Command] Process exited with code: ${code}`);
            }

            // Add to command history
            addToCommandHistory(
                project.config.name,
                command,
                response.trim() || (code === 0 ? 'OK' : `Exit code: ${code}`)
            );

            if (code === 0) {
                vscode.window.showInformationMessage(
                    `✅ Command executed successfully for project '${project.config.name}'`
                );
                resolve();
            } else {
                const errorMsg = `Command failed with exit code ${code}`;
                vscode.window.showErrorMessage(`❌ ${errorMsg} for project '${project.config.name}'`);
                reject(new Error(errorMsg));
            }
        });

        child.on('error', error => {
            const errorMsg = `Failed to execute command: ${error.message}`;
            if (outputChannel) {
                outputChannel.appendLine(`❌ ${errorMsg}`);
            }

            // Add error to history
            addToCommandHistory(project.config.name, command, `ERROR ${errorMsg}`);

            vscode.window.showErrorMessage(errorMsg);
            reject(error);
        });
    });
}

/**
 * Validates manager operation parameters
 */
function validateManagerOperation(project: WinCCOAProject, index: number): void {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot perform manager operation on non-runnable project: ${project.config.name}`);
    }

    if (index < 0) {
        throw new Error('Manager index must be non-negative');
    }
}

/**
 * Executes a manager-specific command
 */
async function executeManagerCommand(project: WinCCOAProject, args: string[]): Promise<void> {
    const pmonPath = getWCCILpmonPath(project.version);
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for WinCC OA version ${project.version || 'unknown'}`);
    }

    const command = `${pmonPath} ${args.join(' ')}`;
    return executePmonCommand(project, pmonPath, args, command);
}

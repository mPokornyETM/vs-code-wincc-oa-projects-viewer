import * as vscode from 'vscode';
import {
    WinCCOAProject,
    WinCCOAManager,
    WinCCOAProjectState,
    WinCCOAProjectStatus,
    PmonProjectRunningStatus
} from '../types';
import { PmonComponent } from '../types/components/implementations/PmonComponent';
import { parseManagerList, parseManagerStatus } from '../utils';
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
 * Creates and initializes a PmonComponent for a project
 */
function createPmonComponent(project: WinCCOAProject): PmonComponent {
    const pmon = new PmonComponent();
    pmon.setOaVersion(project.version || '');
    return pmon;
}

/**
 * Output callback that logs to the output channel
 */
function logOutput(message: string): void {
    if (outputChannel) {
        outputChannel.appendLine(message);
    }
}

/**
 * Checks if a WinCC OA project is currently running using WCCILpmon status command
 * @param project The WinCC OA project to check
 * @returns Promise that resolves to the project running status
 */
export async function checkProjectRunningStatus(project: WinCCOAProject): Promise<PmonProjectRunningStatus> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot check status for non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Project Status Check] Checking status for project: ${project.config.name}`);
    }

    const pmon = createPmonComponent(project);

    try {
        const isRunning = await pmon.checkProjectStatus(project.config.name, logOutput);
        const status = isRunning ? PmonProjectRunningStatus.Running : PmonProjectRunningStatus.NotRunning;

        if (outputChannel) {
            if (isRunning) {
                outputChannel.appendLine(`[Project Status Check] ✅ Project '${project.config.name}' is RUNNING`);
            } else {
                outputChannel.appendLine(`[Project Status Check] ⏹️ Project '${project.config.name}' is STOPPED`);
            }
        }

        addToCommandHistory(
            project.config.name,
            'checkProjectRunningStatus',
            isRunning ? 'Project is running' : 'Project is stopped'
        );

        return status;
    } catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`[Project Status Check] ❌ Failed: ${(error as Error).message}`);
        }

        addToCommandHistory(project.config.name, 'checkProjectRunningStatus', `ERROR: ${(error as Error).message}`);

        return PmonProjectRunningStatus.Unknown;
    }
}

/**
 * Checks if a WinCC OA project is currently running (convenience function)
 */
export async function isProjectRunning(project: WinCCOAProject): Promise<boolean> {
    const status = await checkProjectRunningStatus(project);
    switch (status) {
        case PmonProjectRunningStatus.Running:
            return true;
        case PmonProjectRunningStatus.NotRunning:
            return false;
        default:
            throw new Error(`Cannot determine project status: ${status}`);
    }
}

/**
 * Starts WinCC OA pmon manager only (no auto start)
 */
export async function startPmonOnly(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start pmon for non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Pmon Start] Starting pmon for project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.startPmonOnly(project.config.name, msg => {
            logOutput(`[Pmon Start] ${msg}`);
        });

        if (outputChannel) {
            outputChannel.appendLine(`✅ Pmon started for project '${project.config.name}'`);
        }
        vscode.window.showInformationMessage(`✅ Pmon started for project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to start pmon: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Starts WinCC OA project
 */
export async function startProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot start non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Project Start] Starting project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        // Check if already running to determine strategy
        let startAll = false;
        try {
            const status = await checkProjectRunningStatus(project);
            startAll = status === PmonProjectRunningStatus.Running;
            if (outputChannel) {
                if (startAll) {
                    outputChannel.appendLine(`[Project Start] Pmon is running, sending START_ALL command`);
                } else {
                    outputChannel.appendLine(`[Project Start] Pmon not running, starting project normally`);
                }
            }
        } catch {
            if (outputChannel) {
                outputChannel.appendLine(`[Project Start] Could not determine pmon status, trying normal start`);
            }
        }

        await pmon.startProject(project.config.name, startAll, msg => {
            logOutput(`[Project Start] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Project '${project.config.name}' started successfully`);
    } catch (error) {
        const errorMsg = `Failed to start project: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Stops WinCC OA project
 */
export async function stopProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Project Stop] Stopping project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.stopProject(project.config.name, msg => {
            logOutput(`[Project Stop] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Project '${project.config.name}' stopped successfully`);
    } catch (error) {
        const errorMsg = `Failed to stop project: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Stops WinCC OA project and pmon
 */
export async function stopProjectAndPmon(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot stop non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Project Stop] Stopping project and pmon: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.stopProjectAndPmon(project.config.name, msg => {
            logOutput(`[Project Stop] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Project '${project.config.name}' and pmon stopped successfully`);
    } catch (error) {
        const errorMsg = `Failed to stop project and pmon: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Restarts WinCC OA project
 */
export async function restartProject(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot restart non-runnable project: ${project.config.name}`);
    }

    if (outputChannel) {
        outputChannel.appendLine(`[Project Restart] Restarting project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.restartProject(project.config.name, msg => {
            logOutput(`[Project Restart] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Project '${project.config.name}' restarted successfully`);
    } catch (error) {
        const errorMsg = `Failed to restart project: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Sets pmon wait mode
 */
export async function setPmonWaitMode(project: WinCCOAProject): Promise<void> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot set wait mode for non-runnable project: ${project.config.name}`);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.setWaitMode(project.config.name, logOutput);
        vscode.window.showInformationMessage(`✅ Wait mode set for project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to set wait mode: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Gets list of managers for a project
 */
export async function getManagerList(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get managers for non-runnable project: ${project.config.name}`);
    }

    const pmon = createPmonComponent(project);

    try {
        const managerStrings = await pmon.getManagerList(project.config.name, logOutput);
        const managers = parseManagerList(managerStrings.join('\n'));
        return managers;
    } catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`❌ Failed to get manager list: ${(error as Error).message}`);
        }
        throw error;
    }
}

/**
 * Gets detailed status of all managers and project state
 */
export async function getDetailedManagerStatus(
    project: WinCCOAProject
): Promise<{ managers: WinCCOAManager[]; projectState?: WinCCOAProjectState }> {
    if (!project.isRunnable || project.isWinCCOASystem) {
        throw new Error(`Cannot get manager status for non-runnable project: ${project.config.name}`);
    }

    const pmon = createPmonComponent(project);

    try {
        const statusOutput = await pmon.getDetailedManagerStatus(project.config.name, logOutput);
        const result = parseManagerStatus(statusOutput);
        return result;
    } catch (error) {
        if (outputChannel) {
            outputChannel.appendLine(`❌ Failed to get manager status: ${(error as Error).message}`);
        }
        throw error;
    }
}

/**
 * Gets status of all managers for a project
 */
export async function getManagerStatus(project: WinCCOAProject): Promise<WinCCOAManager[]> {
    const result = await getDetailedManagerStatus(project);
    return result.managers;
}

/**
 * Gets comprehensive project status including pmon and managers
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
 */
export async function startManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    if (outputChannel) {
        outputChannel.appendLine(`[Manager Start] Starting manager ${index} for project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.startManager(project.config.name, index, msg => {
            logOutput(`[Manager Start] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Manager ${index} started for project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to start manager: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Stops a specific manager
 */
export async function stopManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    if (outputChannel) {
        outputChannel.appendLine(`[Manager Stop] Stopping manager ${index} for project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.stopManager(project.config.name, index, msg => {
            logOutput(`[Manager Stop] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Manager ${index} stopped for project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to stop manager: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Kills a specific manager
 */
export async function killManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    if (outputChannel) {
        outputChannel.appendLine(`[Manager Kill] Killing manager ${index} for project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.killManager(project.config.name, index, msg => {
            logOutput(`[Manager Kill] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Manager ${index} killed for project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to kill manager: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

/**
 * Removes a specific manager
 */
export async function removeManager(project: WinCCOAProject, index: number): Promise<void> {
    validateManagerOperation(project, index);

    if (outputChannel) {
        outputChannel.appendLine(`[Manager Remove] Removing manager ${index} for project: ${project.config.name}`);
        outputChannel.show(true);
    }

    const pmon = createPmonComponent(project);

    try {
        await pmon.removeManager(project.config.name, index, msg => {
            logOutput(`[Manager Remove] ${msg}`);
        });

        vscode.window.showInformationMessage(`✅ Manager ${index} removed from project '${project.config.name}'`);
    } catch (error) {
        const errorMsg = `Failed to remove manager: ${(error as Error).message}`;
        if (outputChannel) {
            outputChannel.appendLine(`❌ ${errorMsg}`);
        }
        vscode.window.showErrorMessage(errorMsg);
        throw error;
    }
}

// Helper functions

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

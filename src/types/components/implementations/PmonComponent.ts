/**
 * Process Monitor Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export class PmonComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILpmon';
    }

    public getDescription(): string {
        return 'Process Monitor';
    }

    /**
     * Registers a sub-project using pmon's -regsubf option
     * @param projectPath - Path to the sub-project directory
     * @param outputCallback - Optional callback for output logging
     * @returns Promise that resolves when registration is complete
     */
    public async registerSubProject(projectPath: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            throw new Error('pmon executable not found');
        }

        if (!fs.existsSync(pmonPath)) {
            throw new Error(`pmon executable not found at ${pmonPath}`);
        }

        if (outputCallback) {
            outputCallback(`Registering sub-project: ${projectPath}`);
            outputCallback(`pmon path: ${pmonPath}`);
        }

        // Use -regsubf option to register sub-project
        const args = ['-regsubf', '-proj', projectPath, '-log', '+stderr'];

        if (outputCallback) {
            outputCallback(`Executing: ${pmonPath} ${args.join(' ')}`);
        }

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
                this.stdOut += output;
                if (outputCallback) {
                    outputCallback(output);
                }
            });

            process.stderr?.on('data', data => {
                const output = data.toString();
                stderr += output;
                this.stdErr += output;
                if (outputCallback) {
                    outputCallback(output);
                }
            });

            process.on('close', code => {
                if (outputCallback) {
                    outputCallback(`\nProcess exited with code: ${code}`);
                }

                // Success codes: 0 (success), 3 (already registered)
                if (code === 0 || code === 3) {
                    if (outputCallback) {
                        outputCallback('Sub-project registration completed successfully!');
                    }
                    resolve();
                } else {
                    const errorMsg = `Sub-project registration failed with exit code ${code}`;
                    if (outputCallback) {
                        outputCallback(errorMsg);
                        if (stderr) {
                            outputCallback(`Error details: ${stderr}`);
                        }
                    }
                    reject(new Error(errorMsg));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start pmon process: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Unregisters a project using pmon's -unreg option
     * @param projectName - Name of the project to unregister
     * @param outputCallback - Optional callback for output logging
     * @returns Promise that resolves when unregistration is complete
     */
    public async unregisterProject(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            throw new Error('pmon executable not found');
        }

        if (!fs.existsSync(pmonPath)) {
            throw new Error(`pmon executable not found at ${pmonPath}`);
        }

        if (outputCallback) {
            outputCallback(`Unregistering project: ${projectName}`);
            outputCallback(`pmon path: ${pmonPath}`);
        }

        // Use -unreg option to unregister project
        const args = ['-unreg', projectName, '-log', '+stderr'];

        if (outputCallback) {
            outputCallback(`Executing: ${pmonPath} ${args.join(' ')}`);
        }

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
                this.stdOut += output;
                if (outputCallback) {
                    outputCallback(output);
                }
            });

            process.stderr?.on('data', data => {
                const output = data.toString();
                stderr += output;
                this.stdErr += output;
                if (outputCallback) {
                    outputCallback(output);
                }
            });

            process.on('close', code => {
                if (outputCallback) {
                    outputCallback(`\nProcess exited with code: ${code}`);
                }

                // Success code: 0 (success)
                if (code === 0) {
                    if (outputCallback) {
                        outputCallback('Project unregistration completed successfully!');
                    }
                    resolve();
                } else {
                    const errorMsg = `Project unregistration failed with exit code ${code}`;
                    if (outputCallback) {
                        outputCallback(errorMsg);
                        if (stderr) {
                            outputCallback(`Error details: ${stderr}`);
                        }
                    }
                    reject(new Error(errorMsg));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start pmon process: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Registers a runnable project using pmon's -config -autofreg -status options
     * @param configPath - Path to the project config file
     * @param outputCallback - Optional callback for output logging
     * @returns Promise that resolves when registration is complete with exit code
     */
    public async registerProject(configPath: string, outputCallback?: (message: string) => void): Promise<number> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            throw new Error('pmon executable not found');
        }

        if (!fs.existsSync(pmonPath)) {
            throw new Error(`pmon executable not found at ${pmonPath}`);
        }

        if (outputCallback) {
            outputCallback(`Registering project: ${configPath}`);
            outputCallback(`pmon path: ${pmonPath}`);
        }

        // Use -config -autofreg -status options to register runnable project
        const args = ['-config', configPath, '-log', '+stderr', '-autofreg', '-status'];

        if (outputCallback) {
            outputCallback(`Executing: ${pmonPath} ${args.join(' ')}`);
        }

        return new Promise((resolve, reject) => {
            const process = spawn(pmonPath, args, {
                shell: false,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            process.stdout?.on('data', data => {
                const output = data.toString();
                stdout += output;
                this.stdOut += output;
                if (outputCallback) {
                    outputCallback(output);
                }
            });

            process.stderr?.on('data', data => {
                const output = data.toString();
                stderr += output;
                this.stdErr += output;
                if (outputCallback) {
                    outputCallback(`[STDERR] ${output}`);
                }
            });

            process.on('close', code => {
                if (outputCallback) {
                    outputCallback(`\npmon process exited with code: ${code}`);
                }

                // Exit codes 0 and 3 indicate successful registration
                if (code === 0 || code === 3) {
                    if (outputCallback) {
                        outputCallback('Project registration completed successfully!');
                    }
                    resolve(code || 0);
                } else {
                    const errorMsg = `Project registration failed with exit code ${code}`;
                    if (outputCallback) {
                        outputCallback(errorMsg);
                        if (stderr) {
                            outputCallback(`STDERR: ${stderr}`);
                        }
                        if (stdout) {
                            outputCallback(`STDOUT: ${stdout}`);
                        }
                    }
                    reject(new Error(errorMsg));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start pmon process: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Checks if a project is running by querying pmon status
     */
    async checkProjectStatus(projectName: string, outputCallback?: (message: string) => void): Promise<boolean> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-status', '-proj', projectName, '-log', '+stdout'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', data => {
                stdout += data.toString();
            });

            process.stderr.on('data', data => {
                stderr += data.toString();
            });

            process.on('close', code => {
                if (outputCallback) {
                    if (stdout) {
                        outputCallback(stdout);
                    }
                    if (stderr) {
                        outputCallback(stderr);
                    }
                }

                // Exit code 0 = running, non-zero = not running
                resolve(code === 0);
            });

            process.on('error', error => {
                const errorMsg = `Failed to check project status: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Starts pmon only (without auto-starting managers)
     */
    async startPmonOnly(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-noAutostart'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, {
                shell: false,
                detached: true
            });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Pmon process exited with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start pmon: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Starts a project with all managers
     */
    async startProject(
        projectName: string,
        startAll: boolean = true,
        outputCallback?: (message: string) => void
    ): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            var args = ['-proj', projectName];
            var detached = false;

            if (startAll) {
                args = args.concat(['-command', 'START_ALL:']);
            } else {
                // starting pmon only without extra arguments means, it will start the project too.
                // that means the pmon process will never end (hopefully, otherwise it crashed), so we need to detach
                detached = true;
            }

            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false, detached: detached });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Start project failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start project: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Stops all managers in a project
     */
    async stopProject(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', 'STOP_ALL:'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Stop project failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to stop project: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Stops all managers and exits pmon
     */
    async stopProjectAndPmon(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-stopWait'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Stop and exit pmon failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to stop project and pmon: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Restarts all managers in a project
     */
    async restartProject(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', 'RESTART_ALL:'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Restart project failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to restart project: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Sets pmon wait mode
     */
    async setWaitMode(projectName: string, outputCallback?: (message: string) => void): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', 'WAIT_MODE:'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Set wait mode failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to set wait mode: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Gets the list of managers in a project
     */
    async getManagerList(projectName: string, outputCallback?: (message: string) => void): Promise<string[]> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', 'MGRLIST:LIST', '-log', '+stdout'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', data => {
                stdout += data.toString();
            });

            process.stderr.on('data', data => {
                stderr += data.toString();
            });

            process.on('close', code => {
                if (outputCallback) {
                    if (stdout) {
                        outputCallback(stdout);
                    }
                    if (stderr) {
                        outputCallback(stderr);
                    }
                }

                if (code === 0) {
                    // Parse manager list from output
                    const managers = stdout.split('\n').filter(line => line.trim().length > 0);
                    resolve(managers);
                } else {
                    reject(new Error(`Get manager list failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to get manager list: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Gets detailed status of all managers
     */
    async getDetailedManagerStatus(projectName: string, outputCallback?: (message: string) => void): Promise<string> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', 'MGRLIST:STATI', '-log', '+stdout'];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', data => {
                stdout += data.toString();
            });

            process.stderr.on('data', data => {
                stderr += data.toString();
            });

            process.on('close', code => {
                if (outputCallback) {
                    if (stdout) {
                        outputCallback(stdout);
                    }
                    if (stderr) {
                        outputCallback(stderr);
                    }
                }

                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Get manager status failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to get manager status: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Starts a specific manager by index
     */
    async startManager(
        projectName: string,
        managerIndex: number,
        outputCallback?: (message: string) => void
    ): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', `START_MANAGER:${managerIndex}`];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Start manager failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to start manager: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Stops a specific manager by index
     */
    async stopManager(
        projectName: string,
        managerIndex: number,
        outputCallback?: (message: string) => void
    ): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', `STOP_MANAGER:${managerIndex}`];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Stop manager failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to stop manager: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Kills a specific manager by index
     */
    async killManager(
        projectName: string,
        managerIndex: number,
        outputCallback?: (message: string) => void
    ): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', `KILL_MANAGER:${managerIndex}`];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Kill manager failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to kill manager: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }

    /**
     * Removes a specific manager by index
     */
    async removeManager(
        projectName: string,
        managerIndex: number,
        outputCallback?: (message: string) => void
    ): Promise<void> {
        const pmonPath = this.getPath();
        if (!pmonPath) {
            const errorMsg = 'Could not locate WCCILpmon executable';
            if (outputCallback) {
                outputCallback(errorMsg);
            }
            throw new Error(errorMsg);
        }

        return new Promise((resolve, reject) => {
            const args = ['-proj', projectName, '-command', `REMOVE_MANAGER:${managerIndex}`];
            const command = `"${pmonPath}" ${args.join(' ')}`;

            if (outputCallback) {
                outputCallback(`Executing:\n${command}`);
            }

            const process = spawn(pmonPath, args, { shell: false });

            process.stdout.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.stderr.on('data', data => {
                if (outputCallback) {
                    outputCallback(data.toString());
                }
            });

            process.on('close', code => {
                if (code === 0) {
                    resolve();
                } else {
                    reject(new Error(`Remove manager failed with code ${code}`));
                }
            });

            process.on('error', error => {
                const errorMsg = `Failed to remove manager: ${error.message}`;
                if (outputCallback) {
                    outputCallback(errorMsg);
                }
                reject(new Error(errorMsg));
            });
        });
    }
}

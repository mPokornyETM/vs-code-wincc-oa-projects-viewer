/**
 * WinCC OA Component Types and Base Class
 */

import { spawn, execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import { getWinCCOAInstallationPathByVersion } from '../../utils/winccoa-paths';
import { getAvailableWinCCOAVersions } from '../../utils/winccoa-paths';
import path from 'path';

/**
 * Base implementation for components with common behavior
 */
export abstract class WinCCOAComponent {
    protected OaVersion?: string;
    protected executablePath?: string;
    protected projectName?: string;
    protected configPath?: string;
    protected stdOut: string = '';
    protected stdErr: string = '';

    /**
     * Gets the component executable name without extension
     * @returns The executable name without .exe extension
     */
    public abstract getName(): string;

    public getExecutableName(): string {
        if (os.platform() === 'win32') {
            return this.getName() + '.exe';
        } else {
            return this.getName();
        }
    }

    /**
     * Gets the component description
     * @returns Short description of the component
     */
    public abstract getDescription(): string;

    public setOaVersion(version: string): void {
        this.OaVersion = version;
    }

    public getOaVersion(): string | undefined {
        return this.OaVersion;
    }

    /**
     * Checks if the component executable exists on the file system
     * @returns true if the executable exists, false otherwise
     */
    public exists(): boolean {
        try {
            const path = this.getPath();
            if (!path) {
                return false;
            }
            return fs.existsSync(path);
        } catch (error) {
            return false;
        }
    }

    /**
     * Gets the full path to the component executable
     * @returns Full path to component executable or null if not found
     */
    public getPath(): string | null {
        if (this.executablePath !== undefined) {
            return this.executablePath;
        }

        const executableName = this.getExecutableName();

        // If version is provided, search in that specific installation
        if (this.OaVersion) {
            const installPath = getWinCCOAInstallationPathByVersion(this.OaVersion);
            if (installPath) {
                const componentPath = path.join(installPath, 'bin', executableName);
                if (fs.existsSync(componentPath)) {
                    return componentPath;
                }
            }
            return null;
        }

        // Search in all available versions (highest version first)
        const availableVersions = getAvailableWinCCOAVersions();
        for (const availableVersion of availableVersions) {
            const installPath = getWinCCOAInstallationPathByVersion(availableVersion);
            if (installPath) {
                const componentPath = path.join(installPath, 'bin', executableName);
                if (fs.existsSync(componentPath)) {
                    return componentPath;
                }
            }
        }

        return null;
    }

    public async getHelp(): Promise<string | null> {
        try {
            const output = execSync(`"${this.getPath()}" -help`, {
                encoding: 'utf-8',
                timeout: 5000
            });
            return output;
        } catch (error: any) {
            this.stdErr = error.message || '';
            return null;
        }
    }

    /** Returns the component version */
    public async getVersion(): Promise<string | null> {
        try {
            const output = execSync(`"${this.getPath()}" -version`, {
                encoding: 'utf-8',
                timeout: 5000
            });
            return output.trim();
        } catch (error: any) {
            this.stdErr = error.message || '';
            return null;
        }
    }

    /**
     * Parses version output from WinCC OA component -version command
     * @param output - Raw output from component -version
     * @param executablePath - Path to the component executable
     * @returns Parsed version information object
     */
    public static parseVersionOutput(
        output: string,
        executablePath: string
    ): {
        version: string;
        platform: string;
        architecture: string;
        buildDate: string;
        commitHash: string;
        executablePath: string;
        rawOutput: string;
    } {
        const defaultInfo = {
            version: 'Unknown',
            platform: 'Unknown',
            architecture: 'Unknown',
            buildDate: 'Unknown',
            commitHash: 'Unknown',
            executablePath,
            rawOutput: output
        };

        if (!output || output.trim() === '') {
            return defaultInfo;
        }

        try {
            // Handle different timestamp formats and improved regex pattern
            const versionRegex =
                /WCCILpmon.*?(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3}):\s*(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)\s+platform\s+(\w+(?:\s+\w+)*)\s+linked\s+at\s+(.+?)\s+\(([a-f0-9]+)\)/i;
            const match = output.match(versionRegex);

            if (match) {
                // Full parsing successful
                const [
                    ,
                    year,
                    month,
                    day,
                    hour,
                    minute,
                    second,
                    millisecond,
                    version,
                    platformAndArch,
                    buildDate,
                    commitHash
                ] = match;

                // Split platform and architecture
                const platformParts = platformAndArch.trim().split(/\s+/);
                const platform = platformParts[0] || 'Unknown';
                const architecture = platformParts.length > 1 ? platformParts.slice(1).join(' ') : 'Unknown';

                return {
                    version,
                    platform,
                    architecture,
                    buildDate: buildDate.trim(),
                    commitHash: commitHash.substring(0, 8), // Show first 8 characters
                    executablePath,
                    rawOutput: output
                };
            }

            // Try partial parsing for cases where build info might be missing
            const partialRegex = /(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)\s+platform\s+(\w+(?:\s+\w+)*)/i;
            const partialMatch = output.match(partialRegex);

            if (partialMatch) {
                const [, version, platformAndArch] = partialMatch;
                const platformParts = platformAndArch.trim().split(/\s+/);
                const platform = platformParts[0] || 'Unknown';
                const architecture = platformParts.length > 1 ? platformParts.slice(1).join(' ') : 'Unknown';

                return {
                    version,
                    platform,
                    architecture,
                    buildDate: 'Not available',
                    commitHash: 'Not available',
                    executablePath,
                    rawOutput: output
                };
            }

            // Try to extract just the version as a fallback
            const versionOnlyRegex = /(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/;
            const versionMatch = output.match(versionOnlyRegex);

            if (versionMatch) {
                return {
                    ...defaultInfo,
                    version: versionMatch[1],
                    rawOutput: output
                };
            }

            // If no patterns match, return default with raw output
            return defaultInfo;
        } catch (error) {
            // If parsing fails, return default info with raw output for debugging
            return defaultInfo;
        }
    }

    public async start(args: string[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const allArgs = [...this.buildCommonArgs(), ...args];
            const path = this.getPath();

            if (!path) {
                reject(new Error('Component executable path not found'));
                return;
            }

            const proc = spawn(path, allArgs, {
                stdio: ['ignore', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            proc.stdout?.on('data', data => {
                stdout += data.toString();
            });

            proc.stderr?.on('data', data => {
                stderr += data.toString();
            });

            proc.on('close', code => {
                this.stdOut = stdout;
                this.stdErr = stderr;
                resolve(code || 0);
            });

            proc.on('error', error => {
                this.stdErr = error.message;
                reject(error);
            });
        });
    }

    public async startDetached(args: string[]): Promise<number> {
        return new Promise((resolve, reject) => {
            const allArgs = [...this.buildCommonArgs(), ...args];
            const path = this.getPath();

            if (!path) {
                reject(new Error('Component executable path not found'));
                return;
            }

            const proc = spawn(path, allArgs, {
                detached: true,
                stdio: 'ignore'
            });

            proc.unref();

            if (proc.pid) {
                resolve(proc.pid);
            } else {
                reject(new Error('Failed to start detached process'));
            }
        });
    }

    /**
     * Gets standard output from last execution
     */
    public getStdOut(): string {
        return this.stdOut;
    }

    /**
     * Gets standard error from last execution
     */
    public getStdErr(): string {
        return this.stdErr;
    }

    /**
     * Gets the project name
     */
    public getProject(): string | undefined {
        return this.projectName;
    }

    /**
     * Sets the project name
     */
    public setProject(projectName: string): void {
        this.projectName = projectName;
        this.configPath = undefined;
    }

    /**
     * Gets the config path
     */
    public getConfigPath(): string | undefined {
        return this.configPath;
    }

    /**
     * Sets the config path
     */
    public setConfigPath(configPath: string): void {
        this.configPath = configPath;
        this.projectName = undefined;
    }

    /**
     * Builds common command line arguments
     * @returns Array of common arguments
     */
    protected buildCommonArgs(): string[] {
        const args: string[] = [];

        if (this.projectName) {
            args.push('-proj', this.projectName);
        }

        if (this.configPath) {
            args.push('-config', this.configPath);
        }

        return args;
    }
}

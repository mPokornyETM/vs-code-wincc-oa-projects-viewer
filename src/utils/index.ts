import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { WinCCOAProject, WinCCOAManager, WinCCOAProjectState } from '../types';
import * as winccOAPaths from './winccoa-paths';

/**
 * Gets the platform-specific path to the pvssInst.conf file
 * @returns The full path to the pvssInst.conf file
 */
export function getPvssInstConfPath(): string {
    if (os.platform() === 'win32') {
        // Windows path
        return 'C:\\ProgramData\\Siemens\\WinCC_OA\\pvssInst.conf';
    } else {
        // Unix/Linux path
        return '/etc/opt/pvss/pvssInst.conf';
    }
}

/**
 * Analyzes pmon command response to determine success/failure
 * @param response - The raw response from pmon command
 * @returns Object with success status and error reason if failed
 */
export function analyzePmonResponse(response: string): { success: boolean; errorReason?: string } {
    const trimmedResponse = response.trim();

    if (trimmedResponse === 'OK') {
        return { success: true };
    }

    if (trimmedResponse.startsWith('ERROR')) {
        const errorReason = trimmedResponse.substring(5).trim(); // Remove 'ERROR' prefix
        return { success: false, errorReason };
    }

    // Consider empty or other responses as successful if they don't start with ERROR
    return { success: true };
}

/**
 * Extracts version from a WinCC OA project
 * @param project - The WinCC OA project
 * @returns The version string or null if not found
 */
export function extractVersionFromProject(project: WinCCOAProject): string | null {
    // Check for null or undefined project
    if (!project) {
        return null;
    }

    // First try to get version from project version field
    if (project.version) {
        return project.version;
    }

    if (project.config) {
        const versionFromConfig = readProjectVersionFromConfig(project.installationDir);
        if (versionFromConfig) {
            return versionFromConfig;
        }

        // Try to match installation directory with known WinCC OA versions
        const oaVersions = winccOAPaths.getAvailableWinCCOAVersions();
        for (const version of oaVersions) {
            const oaInstallPath = winccOAPaths.getWinCCOAInstallationPathByVersion(version);
            if (oaInstallPath && project.config.installationDir.startsWith(oaInstallPath)) {
                return version;
            }
        }

        // this is not very reliable, but as a last resort:
        // Try to extract version from project name
        const nameMatch = project.config.name.match(/(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/);
        if (nameMatch) {
            return nameMatch[1];
        }
    }

    // Try to extract version from installation directory
    const pathMatch =
        project.installationDir && project.installationDir.match(/WinCC_OA[\\\/](\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/);
    if (pathMatch) {
        return pathMatch[1];
    }

    return null;
}

/**
 * Determines if a project is a WinCC OA delivered sub-project
 * @param project - The WinCC OA project
 * @returns True if it's a delivered sub-project
 */
export function isWinCCOADeliveredSubProject(project: WinCCOAProject): boolean {
    if (!project) {
        return false;
    }

    // Check if it's not runnable and not a system project
    if (project.isRunnable || project.isWinCCOASystem) {
        return false;
    }

    // Normalize the project path for comparison (handle both Windows and Unix paths)
    const normalizedProjectPath = project.config.installationDir.replace(/\\/g, '/').toLowerCase();

    const oaVersions = winccOAPaths.getAvailableWinCCOAVersions();
    for (const version of oaVersions) {
        const oaInstallPath = winccOAPaths.getWinCCOAInstallationPathByVersion(version);
        if (oaInstallPath) {
            // Normalize the OA install path for comparison
            const normalizedOAPath = oaInstallPath.replace(/\\/g, '/').toLowerCase();
            if (normalizedProjectPath.startsWith(normalizedOAPath)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Determines if a project can be unregistered
 * @param project - The WinCC OA project
 * @returns Object with canUnregister flag and reason if not allowed
 */
export function canUnregisterProject(project: WinCCOAProject): { canUnregister: boolean; reason?: string } {
    // Cannot unregister WinCC OA system projects
    if (project.isWinCCOASystem) {
        return {
            canUnregister: false,
            reason: 'Cannot unregister WinCC OA system installations'
        };
    }

    // Cannot unregister WinCC OA delivered sub-projects
    if (isWinCCOADeliveredSubProject(project)) {
        return {
            canUnregister: false,
            reason: 'Cannot unregister WinCC OA delivered sub-projects'
        };
    }

    // User projects can be unregistered
    return { canUnregister: true };
}

/**
 * Parses a version string to a comparable number
 * @param version - Version string like "3.21" or "3.20.5"
 * @returns Numeric representation for comparison
 */
export function parseVersionString(version: string): number {
    const parts = version.split('.').map(part => parseInt(part, 10));
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

//--------------------------------------------------------------------------

/**
 * Reads project version from config files
 * @param projectDir - Project directory path
 * @returns Version string or null if not found
 */
export function readProjectVersionFromConfig(projectDir: string): string | null {
    try {
        // Try to read from config/config file
        const configPath = path.join(projectDir, 'config', 'config');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');

            // Look for proj_version line
            const versionMatch = content.match(/^proj_version\s*=\s*"?([^"\r\n]+)"?/m);
            if (versionMatch) {
                return versionMatch[1].trim();
            }
        }

        return null;
    } catch (error) {
        return null;
    }
}

/**
 * Parses manager list output from WCCILpmon
 * @param output - Raw output from MGRLIST:LIST command
 * @returns Array of manager names
 */
export function parseManagerList(output: string): WinCCOAManager[] {
    if (!output || output.trim() === '') {
        return [];
    }

    const lines = output.split('\n');
    const managers: WinCCOAManager[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Skip empty lines and headers
        if (trimmedLine === '' || trimmedLine.includes('Manager') || trimmedLine.includes('---')) {
            continue;
        }

        // Extract manager name (usually the first column)
        const parts = trimmedLine.split(/\s+/);
        if (parts.length > 0 && parts[0] !== '') {
            const manager: WinCCOAManager = {
                index: i,
                name: parts[0],
                type: parts[1] || 'unknown',
                state: parts[2] || 'unknown',
                restarts: 0
            };
            managers.push(manager);
        }
    }

    return managers;
}

/**
 * Parses manager status output from WCCILpmon
 * @param output - Raw output from MGRLIST:STATI command
 * @returns Array of manager status objects
 */
export function parseManagerStatus(output: string): { managers: WinCCOAManager[]; projectState?: WinCCOAProjectState } {
    if (!output || output.trim() === '') {
        return { managers: [] };
    }

    const lines = output.split('\n');
    const managers: WinCCOAManager[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines and headers
        if (line === '' || line.includes('Manager') || line.includes('---')) {
            continue;
        }

        // Basic parsing - this might need to be enhanced based on actual output format
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
            const manager: WinCCOAManager = {
                index: i,
                name: parts[0],
                type: parts[1] || 'unknown',
                state: parts[2] || 'unknown',
                restarts: 0
            };
            managers.push(manager);
        }
    }

    return { managers };
}

/**
 * WinCC OA Installation Path Utilities
 * Handles platform-specific path discovery and component path resolution
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

/**
 * Finds the WinCC OA installation path for a given version
 * @param version - WinCC OA version (e.g., "3.20", "3.21")
 * @returns Installation path or null if not found
 */
export function getWinCCOAInstallationPathByVersion(version: string): string | null {
    const platform = os.platform();

    if (platform === 'win32') {
        return getWindowsInstallationPath(version);
    } else {
        // Unix/Linux systems
        return getUnixInstallationPath(version);
    }
}

/**
 * Gets WinCC OA installation path from Windows registry
 * @param version - WinCC OA version
 * @returns Installation path or null if not found
 */
function getWindowsInstallationPath(version: string): string | null {
    try {
        // Try to read from registry
        const regKey = `HKLM\\Software\\ETM\\WinCC_OA\\${version}`;
        const command = `reg query "${regKey}" /v INSTALLDIR`;

        const output = execSync(command, { encoding: 'utf-8' });

        // Parse the output to extract the INSTALLDIR value
        const match = output.match(/INSTALLDIR\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            const installPath = match[1].trim();
            if (fs.existsSync(installPath)) {
                return installPath;
            }
        }
    } catch (error) {
        // Registry key not found or command failed
        // Fall back to default paths
    }

    return null;
}

/**
 * Gets WinCC OA installation path on Unix/Linux systems
 * @param version - WinCC OA version
 * @returns Installation path or null if not found
 */
function getUnixInstallationPath(version: string): string | null {
    const installPath = `/opt/WinCC_OA/${version}`;

    if (fs.existsSync(installPath)) {
        return installPath;
    }

    return null;
}

/**
 * Gets available WinCC OA versions installed on the system
 * @returns Array of version strings sorted from highest to lowest
 */
function getAvailableWinCCOAVersions(): string[] {
    const platform = os.platform();

    if (platform === 'win32') {
        return getWindowsAvailableVersions();
    } else {
        return getUnixAvailableVersions();
    }
}

/**
 * Gets available WinCC OA versions on Windows
 * @returns Array of version strings sorted from highest to lowest
 */
function getWindowsAvailableVersions(): string[] {
    const versions: string[] = [];

    try {
        // Try to read from registry
        const regKey = 'HKLM\\Software\\ETM\\WinCC_OA';
        const command = `reg query "${regKey}"`;

        const output = execSync(command, { encoding: 'utf-8' });
        const lines = output.split('\n');

        for (const line of lines) {
            const match = line.match(/WinCC_OA\\(\d+\.\d+(?:\.\d+)?)/);
            if (match && match[1]) {
                versions.push(match[1]);
            }
        }
    } catch (error) {
        // Registry query failed, try common paths
    }

    // Sort versions descending
    return versions.sort((a, b) => parseVersionString(b) - parseVersionString(a));
}

/**
 * Gets available WinCC OA versions on Unix/Linux
 * @returns Array of version strings sorted from highest to lowest
 */
function getUnixAvailableVersions(): string[] {
    const basePath = '/opt/WinCC_OA';

    if (!fs.existsSync(basePath)) {
        return [];
    }

    try {
        const entries = fs.readdirSync(basePath);
        const versions = entries.filter(entry => {
            const fullPath = path.join(basePath, entry);
            return fs.statSync(fullPath).isDirectory() && /^\d+\.\d+/.test(entry);
        });

        // Sort versions descending
        return versions.sort((a, b) => parseVersionString(b) - parseVersionString(a));
    } catch (error) {
        return [];
    }
}

/**
 * Parses a version string to a comparable number
 * @param version - Version string like "3.21" or "3.20.5"
 * @returns Numeric representation for comparison
 */
function parseVersionString(version: string): number {
    const parts = version.split('.').map(part => parseInt(part, 10));
    return parts[0] * 10000 + (parts[1] || 0) * 100 + (parts[2] || 0);
}

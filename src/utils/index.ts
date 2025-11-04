import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { WinCCOAProject } from '../types';

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
	// First try to get version from project version field
	if (project.version) {
		return project.version;
	}

	// Try to extract version from project name
	const nameMatch = project.name.match(/(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/);
	if (nameMatch) {
		return nameMatch[1];
	}

	// Try to extract version from installation directory
	const pathMatch = project.installationDir.match(/WinCC_OA[\\\/](\d+\.\d+(?:\.\d+)?(?:\.\d+)?)/);
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
	if (project.runnable || project.system === 1) {
		return false;
	}

	// Check if installation directory contains WinCC_OA (indicating delivered sub-project)
	const normalizedPath = project.installationDir.replace(/\\/g, '/');
	return normalizedPath.includes('/WinCC_OA/') || normalizedPath.includes('\\WinCC_OA\\');
}

/**
 * Determines if a project can be unregistered
 * @param project - The WinCC OA project
 * @returns Object with canUnregister flag and reason if not allowed
 */
export function canUnregisterProject(project: WinCCOAProject): { canUnregister: boolean; reason?: string } {
	// Cannot unregister WinCC OA system projects
	if (project.system === 1) {
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
 * Gets the WCCILpmon executable path for a specific version
 * @param version - Optional version string
 * @returns Path to WCCILpmon executable or null if not found
 */
export function getWCCILpmonPath(version?: string): string | null {
	if (os.platform() !== 'win32') {
		// On non-Windows platforms, assume pmon is in PATH
		return 'pmon';
	}

	// Windows-specific logic
	const basePath = 'C:\\Program Files\\Siemens\\WinCC_OA';

	if (version) {
		// Try specific version first
		const versionPath = path.join(basePath, version, 'bin', 'WCCILpmon.exe');
		if (fs.existsSync(versionPath)) {
			return versionPath;
		}
	}

	// Find the highest available version
	const availableVersions = getAvailableWinCCOAVersions();
	for (const availableVersion of availableVersions) {
		const pmonPath = buildWCCILpmonPathFromInstallation(path.join(basePath, availableVersion));
		if (fs.existsSync(pmonPath)) {
			return pmonPath;
		}
	}

	return null;
}

/**
 * Builds the WCCILpmon path from an installation directory
 * @param installationDir - The WinCC OA installation directory
 * @returns Full path to WCCILpmon executable
 */
export function buildWCCILpmonPathFromInstallation(installationDir: string): string {
	if (os.platform() === 'win32') {
		return path.join(installationDir, 'bin', 'WCCILpmon.exe');
	} else {
		return path.join(installationDir, 'bin', 'pmon');
	}
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

/**
 * Gets available WinCC OA versions installed on the system
 * @returns Array of version strings sorted from highest to lowest
 */
export function getAvailableWinCCOAVersions(): string[] {
	if (os.platform() !== 'win32') {
		return [];
	}

	const basePath = 'C:\\Program Files\\Siemens\\WinCC_OA';
	
	try {
		if (!fs.existsSync(basePath)) {
			return [];
		}

		const versions = fs.readdirSync(basePath)
			.filter(item => {
				const fullPath = path.join(basePath, item);
				return fs.statSync(fullPath).isDirectory() && /^\d+\.\d+/.test(item);
			})
			.sort((a, b) => parseVersionString(b) - parseVersionString(a)); // Sort descending

		return versions;
	} catch (error) {
		return [];
	}
}

/**
 * Parses manager list output from WCCILpmon
 * @param output - Raw output from MGRLIST:LIST command
 * @returns Array of manager names
 */
export function parseManagerList(output: string): string[] {
	if (!output || output.trim() === '') {
		return [];
	}

	const lines = output.split('\n');
	const managers: string[] = [];

	for (const line of lines) {
		const trimmedLine = line.trim();
		
		// Skip empty lines and headers
		if (trimmedLine === '' || trimmedLine.includes('Manager') || trimmedLine.includes('---')) {
			continue;
		}

		// Extract manager name (usually the first column)
		const parts = trimmedLine.split(/\s+/);
		if (parts.length > 0 && parts[0] !== '') {
			managers.push(parts[0]);
		}
	}

	return managers;
}

/**
 * Parses manager status output from WCCILpmon
 * @param output - Raw output from MGRLIST:STATI command
 * @returns Array of manager status objects
 */
export function parseManagerStatus(output: string): any[] {
	if (!output || output.trim() === '') {
		return [];
	}

	const lines = output.split('\n');
	const managers: any[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		
		// Skip empty lines and headers
		if (line === '' || line.includes('Manager') || line.includes('---')) {
			continue;
		}

		// Basic parsing - this might need to be enhanced based on actual output format
		const parts = line.split(/\s+/);
		if (parts.length >= 3) {
			managers.push({
				name: parts[0],
				status: parts[1],
				info: parts.slice(2).join(' ')
			});
		}
	}

	return managers;
}
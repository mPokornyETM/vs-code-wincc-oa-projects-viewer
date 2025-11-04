import * as vscode from 'vscode';
import * as childProcess from 'child_process';
import { DetailedVersionInfo, WinCCOAProject } from '../types';
import { getWCCILpmonPath } from '../utils';

/**
 * Gets detailed version information from a WinCC OA project
 * @param project - The WinCC OA project
 * @returns Promise with detailed version information
 */
export async function getDetailedVersionInfo(project: WinCCOAProject): Promise<DetailedVersionInfo> {
	return new Promise((resolve, reject) => {
		// Only get version info for WinCC OA system projects
		if (project.system !== 1) {
			reject(new Error('Version information is only available for WinCC OA system installations'));
			return;
		}

		// Get the pmon path for this project's version
		const projectVersion = project.version;
		const pmonPath = getWCCILpmonPath(projectVersion);

		if (!pmonPath) {
			reject(new Error(`WCCILpmon executable not found for version ${projectVersion || 'default'}`));
			return;
		}

		// Execute WCCILpmon -version
		const pmonProcess = childProcess.spawn(pmonPath, ['-version'], {
			stdio: ['pipe', 'pipe', 'pipe']
		});

		let stdout = '';
		let stderr = '';

		pmonProcess.stdout?.on('data', (data) => {
			stdout += data.toString();
		});

		pmonProcess.stderr?.on('data', (data) => {
			stderr += data.toString();
		});

		pmonProcess.on('close', (code) => {
			if (code === 0 || stdout.trim() !== '') {
				try {
					const versionInfo = parseVersionOutput(stdout + stderr, pmonPath);
					resolve(versionInfo);
				} catch (parseError) {
					reject(new Error(`Failed to parse version output: ${parseError}`));
				}
			} else {
				reject(new Error(`WCCILpmon exited with code ${code}: ${stderr || 'No error details available'}`));
			}
		});

		pmonProcess.on('error', (error) => {
			reject(new Error(`Failed to execute WCCILpmon: ${error.message}`));
		});

		// Close stdin to prevent hanging
		pmonProcess.stdin?.end();
	});
}

/**
 * Parses version output from WCCILpmon -version command
 * @param output - Raw output from WCCILpmon -version
 * @param executablePath - Path to the WCCILpmon executable
 * @returns Parsed version information
 */
export function parseVersionOutput(output: string, executablePath: string): DetailedVersionInfo {
	const defaultInfo: DetailedVersionInfo = {
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
		const versionRegex = /WCCILpmon.*?(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2}):(\d{2})\.(\d{3}):\s*(\d+\.\d+(?:\.\d+)?(?:\.\d+)?)\s+platform\s+(\w+(?:\s+\w+)*)\s+linked\s+at\s+(.+?)\s+\(([a-f0-9]+)\)/i;
		const match = output.match(versionRegex);

		if (match) {
			// Full parsing successful
			const [, year, month, day, hour, minute, second, millisecond, version, platformAndArch, buildDate, commitHash] = match;
			
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

/**
 * Shows version information dialog
 * @param project - The WinCC OA project
 */
export async function showVersionInfoDialog(project: WinCCOAProject): Promise<void> {
	try {
		const versionInfo = await getDetailedVersionInfo(project);
		
		// Create formatted version information
		const versionText = `WinCC OA Version Information

Project: ${project.name}
Version: ${versionInfo.version}
Platform: ${versionInfo.platform}
Architecture: ${versionInfo.architecture}
Build Date: ${versionInfo.buildDate}
Commit Hash: ${versionInfo.commitHash}
Executable: ${versionInfo.executablePath}

Raw Output:
${versionInfo.rawOutput}`;

		// Show in a new document
		const document = await vscode.workspace.openTextDocument({
			content: versionText,
			language: 'plaintext'
		});
		
		await vscode.window.showTextDocument(document);
		
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to get version information: ${error}`);
	}
}
import * as vscode from 'vscode';
import { DetailedVersionInfo, WinCCOAProject, PmonComponent, WinCCOAComponent } from '../types';

/**
 * Gets detailed version information from a WinCC OA project
 * @param project - The WinCC OA project
 * @returns Promise with detailed version information
 */
export async function getDetailedVersionInfo(project: WinCCOAProject): Promise<DetailedVersionInfo> {
    // Only get version info for WinCC OA system projects
    if (!project.isWinCCOASystem) {
        throw new Error('Version information is only available for WinCC OA system installations');
    }

    // Create PmonComponent instance for this project's version
    const pmonComponent = new PmonComponent();
    if (project.version) {
        pmonComponent.setOaVersion(project.version);
    }

    const pmonPath = pmonComponent.getPath();
    if (!pmonPath) {
        throw new Error(`WCCILpmon executable not found for version ${project.version || 'default'}`);
    }

    // Get version output using PmonComponent
    const versionOutput = await pmonComponent.getVersion();
    if (!versionOutput) {
        throw new Error(`Failed to get version information: ${pmonComponent.getStdErr()}`);
    }

    // Parse version output using WinCCOAComponent static method
    const versionInfo = WinCCOAComponent.parseVersionOutput(versionOutput, pmonPath);

    return versionInfo;
}

/**
 * Parses version output from WCCILpmon -version command
 * @param output - Raw output from WCCILpmon -version
 * @param executablePath - Path to the WCCILpmon executable
 * @returns Parsed version information
 * @deprecated Use WinCCOAComponent.parseVersionOutput() instead
 */
export function parseVersionOutput(output: string, executablePath: string): DetailedVersionInfo {
    return WinCCOAComponent.parseVersionOutput(output, executablePath);
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

Project: ${project.config.name}
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

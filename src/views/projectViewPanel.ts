import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Import types and utilities from our modules
import { WinCCOAProject, DetailedVersionInfo } from '../types';
import { getPvssInstConfPath } from '../utils';
import { getDetailedVersionInfo } from '../version';

/**
 * Project view panel for displaying detailed project information
 * Provides comprehensive project details, documentation, and configuration
 */
export class ProjectViewPanel {
    public static currentPanel: ProjectViewPanel | undefined;
    public static readonly viewType = 'winccOAProjectView';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    /**
     * Creates or shows a project view panel
     */
    public static createOrShow(extensionUri: vscode.Uri, project: WinCCOAProject) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // If we already have a panel, show it.
        if (ProjectViewPanel.currentPanel) {
            ProjectViewPanel.currentPanel._panel.reveal(column);
            ProjectViewPanel.currentPanel._update(project).catch(console.error);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            ProjectViewPanel.viewType,
            `WinCC OA Project: ${project.config.name}`,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        ProjectViewPanel.currentPanel = new ProjectViewPanel(panel, extensionUri, project);
    }

    /**
     * Revives a project view panel from serialized state
     */
    public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, project: WinCCOAProject) {
        ProjectViewPanel.currentPanel = new ProjectViewPanel(panel, extensionUri, project);
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        private project: WinCCOAProject
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial html content
        this._update(project).catch(console.error);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'copyToClipboard':
                        if (message.text) {
                            await vscode.env.clipboard.writeText(message.text);
                            vscode.window.showInformationMessage('Version information copied to clipboard');
                        }
                        break;
                    case 'showInOutput':
                        if (message.versionInfo) {
                            this._showVersionInOutput(message.versionInfo);
                        }
                        break;
                    case 'retryVersionInfo':
                        // Refresh the panel to retry getting version info
                        this._update(this.project).catch(console.error);
                        break;
                }
            },
            undefined,
            this._disposables
        );
    }

    /**
     * Disposes the panel and cleans up resources
     */
    public dispose() {
        ProjectViewPanel.currentPanel = undefined;

        // Clean up our resources
        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    /**
     * Updates the panel with new project information
     */
    private async _update(project: WinCCOAProject) {
        this.project = project;
        this._panel.title = `WinCC OA Project: ${project.config.name}`;
        this._panel.webview.html = await this._getHtmlForWebview(project);
    }

    /**
     * Generates HTML content for the webview
     */
    private async _getHtmlForWebview(project: WinCCOAProject): Promise<string> {
        const configDetails = this._getConfigDetails(project);
        const projectDetails = await this._getProjectDetails(project);
        const versionInfoSection = project.isWinCCOASystem ? await this._getVersionInfoSection(project) : '';

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WinCC OA Project: ${project.config.name}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .project-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .status {
            font-size: 14px;
            padding: 4px 8px;
            border-radius: 4px;
            display: inline-block;
        }
        .status.runnable {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        .status.not-runnable {
            background-color: var(--vscode-testing-iconFailed);
            color: white;
        }
        .status.system {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .section {
            margin-bottom: 30px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
        }
        .info-grid {
            display: grid;
            grid-template-columns: 200px 1fr;
            gap: 10px;
            margin-bottom: 15px;
        }
        .info-label {
            font-weight: bold;
            color: var(--vscode-descriptionForeground);
        }
        .info-value {
            word-break: break-all;
        }
        .config-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
        }
        .config-title {
            font-weight: bold;
            margin-bottom: 10px;
        }
        .comment {
            color: var(--vscode-descriptionForeground);
            font-style: italic;
            opacity: 0.8;
        }
        .documentation-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            line-height: 1.6;
            max-height: 400px;
            overflow-y: auto;
        }
        .documentation-section h1, .documentation-section h2, .documentation-section h3 {
            color: var(--vscode-textLink-foreground);
            margin-top: 20px;
            margin-bottom: 10px;
        }
        .documentation-section h1 {
            font-size: 1.8em;
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 5px;
        }
        .documentation-section h2 {
            font-size: 1.5em;
        }
        .documentation-section h3 {
            font-size: 1.3em;
        }
        .documentation-section code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 2px;
            font-family: var(--vscode-editor-font-family);
        }
        .documentation-section pre {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .documentation-section pre code {
            background: none;
            padding: 0;
        }
        .documentation-section a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        .documentation-section a:hover {
            text-decoration: underline;
        }
        .documentation-section ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .documentation-section li {
            margin: 5px 0;
        }
        .plain-text-content {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        /* Tab Navigation */
        .tab-container {
            margin-top: 20px;
        }
        .tab-nav {
            display: flex;
            flex-wrap: wrap;
            border-bottom: 1px solid var(--vscode-panel-border);
            margin-bottom: 0;
            gap: 2px;
        }
        .tab-button {
            background: transparent;
            border: none;
            color: var(--vscode-foreground);
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            font-size: 14px;
            transition: all 0.2s ease;
            opacity: 0.7;
            white-space: nowrap;
            border-radius: 4px 4px 0 0;
        }
        .tab-button:hover {
            opacity: 1;
            background-color: var(--vscode-toolbar-hoverBackground);
        }
        .tab-button.active {
            opacity: 1;
            border-bottom-color: var(--vscode-textLink-foreground);
            color: var(--vscode-textLink-foreground);
            background-color: var(--vscode-editor-background);
        }
        .tab-content {
            display: none;
            padding: 20px 0;
            animation: fadeIn 0.2s ease-in;
        }
        .tab-content.active {
            display: block;
        }
        .tab-badge {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 10px;
            padding: 2px 6px;
            font-size: 11px;
            margin-left: 6px;
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        /* Config-specific styling */
        .config-section {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 15px;
            border-left: 3px solid var(--vscode-textLink-foreground);
        }
        .config-title {
            font-weight: bold;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
            font-size: 1.1em;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="project-name">${project.config.name}</div>
        <span class="status ${project.isWinCCOASystem ? 'system' : project.isRunnable ? 'runnable' : 'not-runnable'}">
            ${project.isWinCCOASystem ? '⚙️ System Installation' : project.isRunnable ? '✓ Runnable' : '✗ Not Runnable'}
        </span>
        ${project.isCurrent ? '<span class="status runnable">⭐ Current</span>' : ''}
    </div>

    <div class="section">
        <div class="section-title">Project Information</div>
        <div class="info-grid">
            <div class="info-label">Name:</div>
            <div class="info-value">${project.config.name}</div>
            <div class="info-label">Location:</div>
            <div class="info-value">${project.config.installationDir}</div>
            <div class="info-label">Created:</div>
            <div class="info-value">${project.config.installationDate}</div>
            ${
                project.version
                    ? `
            <div class="info-label">WinCC OA Version:</div>
            <div class="info-value">${project.version}</div>
            `
                    : ''
            }
            ${
                project.config.company
                    ? `
            <div class="info-label">Company:</div>
            <div class="info-value">${project.config.company}</div>
            `
                    : ''
            }
        </div>
    </div>

    ${versionInfoSection}
    ${projectDetails}
    ${configDetails}
</body>
</html>`;
    }

    /**
     * Gets project details including documentation
     */
    private async _getProjectDetails(project: WinCCOAProject): Promise<string> {
        // Read documentation files if they exist
        const documentationSection = await this._getDocumentationSection(project);

        // Read additional project details from pvssInst.conf
        const configPath = getPvssInstConfPath();
        let projectSection = '';

        try {
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf-8');
                const lines = content.split('\n');
                let inProjectSection = false;
                let currentProjectLines: string[] = [];

                for (const line of lines) {
                    const trimmedLine = line.trim();

                    if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                        if (inProjectSection) {
                            break; // End of our project section
                        }
                        inProjectSection = false;
                        currentProjectLines = [];
                    }

                    if (inProjectSection) {
                        currentProjectLines.push(trimmedLine);
                    }

                    if (
                        trimmedLine.includes('InstallationDir') &&
                        trimmedLine.includes(project.config.installationDir)
                    ) {
                        inProjectSection = true;
                    }
                }

                if (currentProjectLines.length > 0) {
                    projectSection = `
					<div class="section">
						<div class="section-title">Project Configuration (pvssInst.conf)</div>
						<div class="config-section">
							${currentProjectLines
                                .filter(line => line.includes('='))
                                .map(line => {
                                    const [key, value] = line.split('=', 2).map(s => s.trim());
                                    return `
								<div class="info-grid">
									<div class="info-label">${key}:</div>
									<div class="info-value">${value.replace(/['"]/g, '')}</div>
								</div>`;
                                })
                                .join('')}
						</div>
					</div>`;
                }
            }
        } catch (error) {
            console.error('Error reading project details:', error);
        }

        return documentationSection + projectSection;
    }

    /**
     * Gets version information section for system installations
     */
    private async _getVersionInfoSection(project: WinCCOAProject): Promise<string> {
        if (!project.isWinCCOASystem) {
            return '';
        }

        try {
            const versionInfo = await getDetailedVersionInfo(project);

            return `
			<div class="section">
				<div class="section-title">🔧 Detailed Version Information</div>
				<div class="config-section">
					<div class="info-grid">
						<div class="info-label">Version:</div>
						<div class="info-value">${versionInfo.version}</div>
						<div class="info-label">Platform:</div>
						<div class="info-value">${versionInfo.platform} ${versionInfo.architecture}</div>
						<div class="info-label">Build Date:</div>
						<div class="info-value">${versionInfo.buildDate}</div>
						<div class="info-label">Commit Hash:</div>
						<div class="info-value"><code>${versionInfo.commitHash}</code></div>
						<div class="info-label">Executable:</div>
						<div class="info-value">${versionInfo.executablePath}</div>
					</div>
					<div style="margin-top: 15px;">
						<div class="config-title">Raw Output</div>
						<pre style="background-color: var(--vscode-textCodeBlock-background); padding: 10px; border-radius: 4px; font-size: 0.9em; overflow-x: auto; margin: 5px 0;">${versionInfo.rawOutput.trim()}</pre>
						<div style="margin-top: 10px;">
							<button onclick="copyVersionInfo()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer; margin-right: 8px;">📋 Copy to Clipboard</button>
							<button onclick="showInOutput()" style="background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">📄 Show in Output</button>
						</div>
					</div>
				</div>

				<script>
					const vscodeApi = acquireVsCodeApi();

					function copyVersionInfo() {
						const versionText = \`${versionInfo.rawOutput.replace(/`/g, '\\`').replace(/\$/g, '\\$')}\`;
						vscodeApi.postMessage({
							command: 'copyToClipboard',
							text: versionText
						});
					}

					function showInOutput() {
						vscodeApi.postMessage({
							command: 'showInOutput',
							versionInfo: ${JSON.stringify(versionInfo)}
						});
					}
				</script>
			</div>`;
        } catch (error) {
            return `
			<div class="section">
				<div class="section-title">🔧 Detailed Version Information</div>
				<div class="config-section" style="background-color: var(--vscode-inputValidation-errorBackground); border-left: 3px solid var(--vscode-inputValidation-errorBorder);">
					<div style="color: var(--vscode-inputValidation-errorForeground);">
						<strong>⚠️ Unable to retrieve version information</strong><br>
						Error: ${error}<br><br>
						<em>This feature requires WCCILpmon.exe to be accessible for this WinCC OA installation.</em>
					</div>
					<div style="margin-top: 10px;">
						<button onclick="retryVersionInfo()" style="background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 6px 12px; border-radius: 3px; cursor: pointer;">🔄 Retry</button>
					</div>
				</div>

				<script>
					const vscodeApi = acquireVsCodeApi();

					function retryVersionInfo() {
						vscodeApi.postMessage({
							command: 'retryVersionInfo'
						});
					}
				</script>
			</div>`;
        }
    }

    /**
     * Gets documentation section with tabbed interface
     */
    private async _getDocumentationSection(project: WinCCOAProject): Promise<string> {
        const documentationFiles = [
            {
                filenames: ['README.md', 'readme.md', 'Readme.md'],
                title: '📖 Project README',
                icon: '📖',
                mandatory: true,
                tabId: 'readme'
            },
            {
                filenames: ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md'],
                title: '📄 License',
                icon: '📄',
                mandatory: true,
                tabId: 'license'
            },
            {
                filenames: ['SECURITY.md', 'security.md', 'Security.md'],
                title: '🔒 Security Policy',
                icon: '🔒',
                mandatory: true,
                tabId: 'security'
            },
            {
                filenames: ['CONTRIBUTING.md', 'contributing.md', 'Contributing.md'],
                title: '🤝 Contributing Guidelines',
                icon: '🤝',
                mandatory: false,
                tabId: 'contributing'
            },
            {
                filenames: ['CHANGELOG.md', 'changelog.md', 'Changelog.md', 'HISTORY.md', 'RELEASES.md'],
                title: '📝 Changelog',
                icon: '📝',
                mandatory: false,
                tabId: 'changelog'
            },
            {
                filenames: [
                    'RELEASENOTES.md',
                    'ReleaseNotes.md',
                    'releasenotes.md',
                    'RELEASE-NOTES.md',
                    'release-notes.md'
                ],
                title: '📋 Release Notes',
                icon: '📋',
                mandatory: false,
                tabId: 'releasenotes'
            }
        ];

        // Build tab navigation and content
        let tabNavigation = '<div class="tab-nav">';
        let tabContent = '';
        let activeTabSet = false;

        for (const docType of documentationFiles) {
            const section = await this._getDocumentFileSection(project, docType);
            const hasContent = section !== '';

            // Show tab even if content is missing for mandatory documents
            if (hasContent || docType.mandatory) {
                const activeClass = !activeTabSet ? ' active' : '';
                const badge = docType.mandatory && !hasContent ? '<span class="tab-badge">Missing</span>' : '';

                tabNavigation += `
					<button class="tab-button${activeClass}" data-tab="${docType.tabId}">
						${docType.icon} ${docType.title.replace(/📖|📄|🔒|🤝|📝|📋/, '').trim()}${badge}
					</button>`;

                const contentActiveClass = !activeTabSet ? ' active' : '';
                const contentHtml = hasContent ? section : this._getMissingDocumentationMessage(docType.title);

                tabContent += `
					<div id="${docType.tabId}" class="tab-content${contentActiveClass}">
						${contentHtml}
					</div>`;

                if (!activeTabSet) {
                    activeTabSet = true;
                }
            }
        }

        tabNavigation += '</div>';

        if (tabNavigation === '<div class="tab-nav"></div>') {
            return ''; // No documentation at all
        }

        return `
		<div class="section">
			<div class="section-title">📚 Project Documentation</div>
			<div class="tab-container">
				${tabNavigation}
				${tabContent}
			</div>
		</div>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				// Add click event listeners to tab buttons
				const buttons = document.querySelectorAll('.tab-button');
				buttons.forEach(button => {
					button.addEventListener('click', function() {
						const tabId = this.getAttribute('data-tab');
						showTab(tabId);
					});
				});
			});

			function showTab(tabId) {
				// Hide all tab contents
				const contents = document.querySelectorAll('.tab-content');
				contents.forEach(content => content.classList.remove('active'));

				// Remove active class from all buttons
				const buttons = document.querySelectorAll('.tab-button');
				buttons.forEach(button => button.classList.remove('active'));

				// Show selected tab content
				const selectedContent = document.getElementById(tabId);
				if (selectedContent) {
					selectedContent.classList.add('active');
				}

				// Activate selected button
				const selectedButton = document.querySelector(\`[data-tab="\${tabId}"]\`);
				if (selectedButton) {
					selectedButton.classList.add('active');
				}
			}
		</script>`;
    }

    /**
     * Gets missing documentation message
     */
    private _getMissingDocumentationMessage(title: string): string {
        return `
		<div class="documentation-section">
			<div style="text-align: center; padding: 40px 20px; color: var(--vscode-descriptionForeground);">
				<div style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;">📝</div>
				<h3 style="color: var(--vscode-descriptionForeground); margin-bottom: 10px;">Sorry, the information is missing</h3>
				<p style="margin: 0; opacity: 0.8;">The ${title.replace(/📖|📄|🔒|🤝|📝|📋/, '').trim()} file could not be found in this project.</p>
				<p style="margin: 10px 0 0 0; font-size: 0.9em; opacity: 0.6;">
					This document is required for proper project documentation.
				</p>
			</div>
		</div>`;
    }

    /**
     * Gets a document file section
     */
    private async _getDocumentFileSection(
        project: WinCCOAProject,
        docType: { filenames: string[]; title: string; icon: string; mandatory?: boolean; tabId?: string }
    ): Promise<string> {
        for (const filename of docType.filenames) {
            const filePath = path.join(project.config.installationDir, filename);

            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf-8');
                    const htmlContent = await this._convertDocumentToHtml(content, filename);

                    return `
					<div class="section">
						<div class="section-title">${docType.title}</div>
						<div class="documentation-section">
							${htmlContent}
						</div>
					</div>`;
                } catch (error) {
                    console.error(`Error reading documentation file ${filePath}:`, error);
                }
            }
        }

        return ''; // No file found for this document type
    }

    /**
     * Converts document content to HTML
     */
    private async _convertDocumentToHtml(content: string, filename: string): Promise<string> {
        const isMarkdown = filename.toLowerCase().endsWith('.md');

        if (isMarkdown) {
            return await this._convertMarkdownToHtml(content);
        } else {
            // For plain text files (LICENSE, etc.), preserve formatting
            return this._convertPlainTextToHtml(content);
        }
    }

    /**
     * Converts markdown to HTML (simple implementation)
     */
    private async _convertMarkdownToHtml(markdown: string): Promise<string> {
        try {
            // Simple markdown-to-HTML conversion without external dependencies
            let html = markdown;

            // Escape HTML characters first
            html = html
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');

            // Convert markdown syntax to HTML
            // Headers
            html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

            // Bold and italic
            html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

            // Code blocks
            html = html.replace(/```[\s\S]*?```/g, match => {
                const code = match.slice(3, -3).trim();
                return `<pre><code>${code}</code></pre>`;
            });

            // Inline code
            html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

            // Links
            html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

            // Line breaks
            html = html.replace(/\n\n/g, '</p><p>');
            html = html.replace(/\n/g, '<br>');

            // Wrap in paragraphs
            if (!html.startsWith('<')) {
                html = '<p>' + html + '</p>';
            }

            return html;
        } catch (error) {
            console.error('Error converting markdown to HTML:', error);
            // Fall back to simple text conversion
            return this._convertPlainTextToHtml(markdown);
        }
    }

    /**
     * Converts plain text to HTML
     */
    private _convertPlainTextToHtml(text: string): string {
        // For plain text files like LICENSE, preserve formatting and make it readable
        let html = text;

        // Escape HTML characters
        html = html
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // Preserve line breaks and spacing
        html = html.replace(/\n/g, '<br>');

        // Handle multiple spaces
        html = html.replace(/ {2,}/g, match => '&nbsp;'.repeat(match.length));

        return `<div class="plain-text-content">${html}</div>`;
    }

    /**
     * Gets project configuration details with tabs for different config files
     */
    private _getConfigDetails(project: WinCCOAProject): string {
        if (!project.isRunnable || project.isWinCCOASystem) {
            return '';
        }

        const configFiles = [
            {
                filename: 'config',
                title: 'Project Config File',
                description: 'The settings for WinCC OA are defined in different sections in the config file.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/project_config_file.html',
                icon: '⚙️',
                tabId: 'config-main'
            },
            {
                filename: 'config.level',
                title: 'config.level File',
                description:
                    'Specifies which CTRL library each manager should load. Contains the default settings for the different WinCC OA managers.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Control_Grundlagen/Control_Grundlagen-17.html',
                icon: '📚',
                tabId: 'config-level'
            },
            {
                filename: 'config.http',
                title: 'config.http',
                description: 'Specifies the basic settings for the HTTP Server.',
                officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/HTTP_Server/http1-10.html',
                icon: '🌐',
                tabId: 'config-http'
            },
            {
                filename: 'config.redu',
                title: 'config.redu',
                description: 'Contains the redundancy relevant settings for forward and copy DPs.',
                officialLink:
                    'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Redundancy/Redundancy-11.html',
                icon: '🔄',
                tabId: 'config-redu'
            },
            {
                filename: 'config.webclient',
                title: 'config.webclient',
                description: 'Specifies the web client specific settings.',
                officialLink: 'https://www.winccoa.com/documentation/WinCCOA/latest/en_US/Notes/config_webclient.html',
                icon: '💻',
                tabId: 'config-webclient'
            }
        ];

        // Build tab navigation and content for config files
        let configTabNavigation = '<div class="tab-nav">';
        let configTabContent = '';
        let configActiveTabSet = false;
        let hasAnyConfigFiles = false;

        for (const configFile of configFiles) {
            const configPath = path.join(project.config.installationDir, 'config', configFile.filename);

            if (fs.existsSync(configPath)) {
                hasAnyConfigFiles = true;
                const activeClass = !configActiveTabSet ? ' active' : '';

                configTabNavigation += `
					<button class="tab-button${activeClass}" data-tab="${configFile.tabId}" title="${configFile.description}">
						${configFile.icon} ${configFile.title}
					</button>`;

                const contentActiveClass = !configActiveTabSet ? ' active' : '';

                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const sections = this._parseProjectConfigFile(content);

                    const configContent =
                        Object.entries(sections).length > 0
                            ? Object.entries(sections)
                                  .map(
                                      ([sectionName, entries]) => `
						<div class="config-section">
							<div class="config-title">[${sectionName}]</div>
							${Object.entries(entries as Record<string, string>)
                                .map(
                                    ([key, value]) => `
							<div class="info-grid">
								<div class="info-label">${key}:</div>
								<div class="info-value">${value}</div>
							</div>
							`
                                )
                                .join('')}
						</div>
						`
                                  )
                                  .join('')
                            : `<div class="config-section">
							<div class="comment" style="text-align: center; padding: 20px; opacity: 0.7;">
								Configuration file exists but contains no readable sections.
							</div>
						</div>`;

                    configTabContent += `
						<div id="${configFile.tabId}" class="tab-content${contentActiveClass}">
							<div class="section-title" style="margin-bottom: 15px;">
								${configFile.icon} ${configFile.title}
								<span class="comment" style="font-size: 0.9em; font-weight: normal; margin-left: 10px;">
									(${configFile.filename})
								</span>
							</div>
							<div class="config-official-info" style="background-color: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); padding: 12px; margin-bottom: 20px; border-radius: 4px;">
								<div style="margin-bottom: 8px; font-weight: bold; color: var(--vscode-textLink-foreground);">
									📖 Official WinCC OA Documentation
								</div>
								<div style="margin-bottom: 10px; line-height: 1.4;">
									${configFile.description}
								</div>
								<div style="font-size: 0.9em;">
									<a href="${configFile.officialLink}" style="color: var(--vscode-textLink-foreground); text-decoration: none;"
									   onmouseover="this.style.textDecoration='underline'"
									   onmouseout="this.style.textDecoration='none'">
										🔗 View Official Documentation →
									</a>
								</div>
							</div>
							<div class="documentation-section">
								${configContent}
							</div>
						</div>`;

                    if (!configActiveTabSet) {
                        configActiveTabSet = true;
                    }
                } catch (error) {
                    console.error(`Error reading config file ${configPath}:`, error);

                    configTabContent += `
						<div id="${configFile.tabId}" class="tab-content${contentActiveClass}">
							<div class="section-title" style="margin-bottom: 15px;">
								${configFile.icon} ${configFile.title}
								<span class="comment" style="font-size: 0.9em; font-weight: normal; margin-left: 10px;">
									(${configFile.filename})
								</span>
							</div>
							<div class="config-official-info" style="background-color: var(--vscode-textBlockQuote-background); border-left: 3px solid var(--vscode-textLink-foreground); padding: 12px; margin-bottom: 20px; border-radius: 4px;">
								<div style="margin-bottom: 8px; font-weight: bold; color: var(--vscode-textLink-foreground);">
									📖 Official WinCC OA Documentation
								</div>
								<div style="margin-bottom: 10px; line-height: 1.4;">
									${configFile.description}
								</div>
								<div style="font-size: 0.9em;">
									<a href="${configFile.officialLink}" style="color: var(--vscode-textLink-foreground); text-decoration: none;"
									   onmouseover="this.style.textDecoration='underline'"
									   onmouseout="this.style.textDecoration='none'">
										🔗 View Official Documentation →
									</a>
								</div>
							</div>
							<div class="documentation-section">
								<div class="config-section">
									<div class="comment" style="text-align: center; padding: 20px; color: var(--vscode-errorForeground);">
										⚠️ Error reading configuration file: ${error}
									</div>
								</div>
							</div>
						</div>`;

                    if (!configActiveTabSet) {
                        configActiveTabSet = true;
                    }
                }
            }
        }

        configTabNavigation += '</div>';

        if (!hasAnyConfigFiles) {
            return ''; // No configuration files found
        }

        return `
		<div class="section">
			<div class="section-title">⚙️ Project Configuration</div>
			<div class="tab-container">
				${configTabNavigation}
				${configTabContent}
			</div>
		</div>
		<script>
			document.addEventListener('DOMContentLoaded', function() {
				// Add click event listeners to config tab buttons
				const configButtons = document.querySelectorAll('[data-tab^="config-"]');
				configButtons.forEach(button => {
					button.addEventListener('click', function() {
						const tabId = this.getAttribute('data-tab');
						showConfigTab(tabId);
					});
				});
			});

			function showConfigTab(tabId) {
				// Hide all config tab contents
				const configContents = document.querySelectorAll('[id^="config-"]');
				configContents.forEach(content => content.classList.remove('active'));

				// Remove active class from all config buttons
				const configButtons = document.querySelectorAll('[data-tab^="config-"]');
				configButtons.forEach(button => button.classList.remove('active'));

				// Show selected config tab content
				const selectedContent = document.getElementById(tabId);
				if (selectedContent) {
					selectedContent.classList.add('active');
				}

				// Activate selected config button
				const selectedButton = document.querySelector(\`[data-tab="\${tabId}"]\`);
				if (selectedButton) {
					selectedButton.classList.add('active');
				}
			}
		</script>`;
    }

    /**
     * Parses configuration file content
     */
    private _parseConfigFile(content: string): Record<string, Record<string, string>> {
        const lines = content.split('\n');
        const sections: Record<string, Record<string, string>> = {};
        let currentSection = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                currentSection = trimmedLine.slice(1, -1);
                sections[currentSection] = {};
            } else if (currentSection && trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim().replace(/['"]/g, '');
                sections[currentSection][key.trim()] = value;
            }
        }

        return sections;
    }

    /**
     * Parses project configuration file with comments
     */
    private _parseProjectConfigFile(content: string): Record<string, Record<string, string>> {
        const lines = content.split('\n');
        const sections: Record<string, Record<string, string>> = {};
        let currentSection = '';
        let pendingComment = '';

        for (const line of lines) {
            const trimmedLine = line.trim();

            if (trimmedLine.startsWith('#')) {
                // Store comment for next configuration entry
                pendingComment = trimmedLine.substring(1).trim();
            } else if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
                currentSection = trimmedLine.slice(1, -1);
                sections[currentSection] = {};
                pendingComment = ''; // Reset comment for new section
            } else if (currentSection && trimmedLine.includes('=')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                const value = valueParts.join('=').trim().replace(/['"]/g, '');
                const keyName = key.trim();

                // If we have a pending comment, add it with a special prefix
                if (pendingComment) {
                    sections[currentSection][`🗒️ ${keyName}`] =
                        `${value} <span class="comment">// ${pendingComment}</span>`;
                    pendingComment = ''; // Reset after use
                } else {
                    sections[currentSection][keyName] = value;
                }
            } else if (trimmedLine === '') {
                // Reset comment on empty lines
                pendingComment = '';
            }
        }

        return sections;
    }

    /**
     * Shows version information in output channel
     */
    private _showVersionInOutput(versionInfo: DetailedVersionInfo): void {
        const outputChannel = vscode.window.createOutputChannel('WinCC OA Projects');
        outputChannel.clear();
        outputChannel.appendLine('WinCC OA Detailed Version Information');
        outputChannel.appendLine('=====================================');
        outputChannel.appendLine(`Version: ${versionInfo.version}`);
        outputChannel.appendLine(`Platform: ${versionInfo.platform} ${versionInfo.architecture}`);
        outputChannel.appendLine(`Build Date: ${versionInfo.buildDate}`);
        outputChannel.appendLine(`Commit Hash: ${versionInfo.commitHash}`);
        outputChannel.appendLine(`Executable: ${versionInfo.executablePath}`);
        outputChannel.appendLine('');
        outputChannel.appendLine('Raw Output:');
        outputChannel.appendLine(versionInfo.rawOutput);
        outputChannel.show(true);
    }
}

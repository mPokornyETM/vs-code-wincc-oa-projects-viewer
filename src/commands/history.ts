import * as vscode from 'vscode';
import { PmonCommandHistory } from '../types';
import { analyzePmonResponse } from '../utils';

// Global command history storage
let pmonCommandHistory: PmonCommandHistory[] = [];

// Global output channel for WCCILpmon command outputs
let outputChannel: vscode.OutputChannel;

/**
 * Initialize the command history system
 * @param channel - The VS Code output channel to use
 */
export function initializeCommandHistory(channel: vscode.OutputChannel): void {
	outputChannel = channel;
}

/**
 * Adds a command to the pmon command history
 * @param project - Project name
 * @param command - Command that was executed
 * @param response - Response received from pmon
 */
export function addToCommandHistory(project: string, command: string, response: string): void {
	const analysis = analyzePmonResponse(response);
	
	const historyEntry: PmonCommandHistory = {
		timestamp: new Date(),
		project,
		command,
		response: response.trim(),
		success: analysis.success,
		errorReason: analysis.errorReason
	};
	
	pmonCommandHistory.unshift(historyEntry); // Add to beginning
	
	// Keep only last 100 entries to prevent memory bloat
	if (pmonCommandHistory.length > 100) {
		pmonCommandHistory = pmonCommandHistory.slice(0, 100);
	}
	
	// Log to output channel if available
	if (outputChannel) {
		const status = analysis.success ? '✅' : '❌';
		const errorInfo = analysis.errorReason ? ` (${analysis.errorReason})` : '';
		outputChannel.appendLine(`${status} [${historyEntry.timestamp.toLocaleString()}] ${project}: ${command}${errorInfo}`);
	}
	
	// Show warning for errors
	if (!analysis.success) {
		vscode.window.showWarningMessage(
			`WinCC OA Command Failed: ${command}\nReason: ${analysis.errorReason || 'Unknown error'}`,
			'Show History'
		).then(selection => {
			if (selection === 'Show History') {
				showCommandHistory();
			}
		});
	}
}

/**
 * Shows the command history in a webview
 */
export function showCommandHistory(): void {
	const panel = vscode.window.createWebviewPanel(
		'pmonCommandHistory',
		'Pmon Command History',
		vscode.ViewColumn.One,
		{
			enableScripts: true,
			retainContextWhenHidden: true
		}
	);

	panel.webview.html = generateCommandHistoryHTML();
}

/**
 * Gets the current command history
 * @returns Array of command history entries
 */
export function getCommandHistory(): PmonCommandHistory[] {
	return [...pmonCommandHistory]; // Return a copy
}

/**
 * Clears the command history
 */
export function clearCommandHistory(): void {
	pmonCommandHistory = [];
	if (outputChannel) {
		outputChannel.clear();
	}
}

/**
 * Generates HTML content for the command history webview
 * @returns HTML string
 */
function generateCommandHistoryHTML(): string {
	const historyItems = pmonCommandHistory.map(entry => {
		const statusIcon = entry.success ? '✅' : '❌';
		const errorInfo = entry.errorReason ? `<br><span style="color: #ff6b6b; font-size: 0.9em;">Error: ${entry.errorReason}</span>` : '';
		
		return `
			<div class="history-item ${entry.success ? 'success' : 'error'}">
				<div class="history-header">
					<span class="status-icon">${statusIcon}</span>
					<span class="project-name">${entry.project}</span>
					<span class="timestamp">${entry.timestamp.toLocaleString()}</span>
				</div>
				<div class="command-info">
					<strong>Command:</strong> <code>${entry.command}</code>
				</div>
				<div class="response-info">
					<strong>Response:</strong> <code>${entry.response}</code>
					${errorInfo}
				</div>
			</div>
		`;
	}).join('');

	return `
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Pmon Command History</title>
			<style>
				body {
					font-family: var(--vscode-font-family);
					background-color: var(--vscode-editor-background);
					color: var(--vscode-editor-foreground);
					margin: 0;
					padding: 20px;
				}
				
				.header {
					margin-bottom: 20px;
					border-bottom: 1px solid var(--vscode-panel-border);
					padding-bottom: 10px;
				}
				
				.header h1 {
					margin: 0 0 5px 0;
					color: var(--vscode-foreground);
				}
				
				.header p {
					margin: 0;
					color: var(--vscode-descriptionForeground);
				}
				
				.history-item {
					margin-bottom: 15px;
					padding: 12px;
					border-left: 4px solid var(--vscode-panel-border);
					background-color: var(--vscode-editor-background);
					border-radius: 4px;
				}
				
				.history-item.success {
					border-left-color: #28a745;
					background-color: rgba(40, 167, 69, 0.1);
				}
				
				.history-item.error {
					border-left-color: #dc3545;
					background-color: rgba(220, 53, 69, 0.1);
				}
				
				.history-header {
					display: flex;
					align-items: center;
					margin-bottom: 8px;
					gap: 10px;
				}
				
				.status-icon {
					font-size: 1.1em;
				}
				
				.project-name {
					font-weight: bold;
					color: var(--vscode-symbolIcon-namespaceForeground);
				}
				
				.timestamp {
					margin-left: auto;
					font-size: 0.9em;
					color: var(--vscode-descriptionForeground);
				}
				
				.command-info, .response-info {
					margin-bottom: 5px;
					font-size: 0.95em;
				}
				
				code {
					background-color: var(--vscode-textBlockQuote-background);
					padding: 2px 6px;
					border-radius: 3px;
					font-family: var(--vscode-editor-font-family);
				}
				
				.empty-state {
					text-align: center;
					padding: 40px 20px;
					color: var(--vscode-descriptionForeground);
				}
				
				.empty-state .icon {
					font-size: 3em;
					margin-bottom: 15px;
				}
			</style>
		</head>
		<body>
			<div class="header">
				<h1>📋 Pmon Command History</h1>
				<p>History of WinCC OA pmon commands executed through VS Code</p>
			</div>
			
			<div class="history-container">
				${pmonCommandHistory.length > 0 ? historyItems : `
					<div class="empty-state">
						<div class="icon">📝</div>
						<h3>No Command History</h3>
						<p>Pmon commands executed through VS Code will appear here.</p>
					</div>
				`}
			</div>
		</body>
		</html>
	`;
}
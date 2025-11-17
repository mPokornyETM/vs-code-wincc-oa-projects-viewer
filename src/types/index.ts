/**
 * @fileoverview Type Definitions Index
 *
 * This module re-exports all type definitions used throughout the WinCC OA Projects
 * extension. Types are organized by category in separate directories and files
 * for better maintainability, navigation, and overview.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

// Project configuration and base types
export * from './project/ProjectConfig';
export * from './project/CurrentProjectInfo';
export * from './project/PmonProjectRunningStatus';

// UI and tree view types
export * from './ui/WinCCOAProject';
export * from './ui/ProjectCategory';
export * from './ui/TreeItem';

// Runtime status and health types
export * from './status/WinCCOAManager';
export * from './status/WinCCOAProjectState';
export * from './status/WinCCOAProjectStatus';
export * from './status/WinCCOAProjectHealth';

// Command history types
export * from './history/PmonCommandHistory';

// Version information types
export * from './version/DetailedVersionInfo';

// Component types
export * from './components/WinCCOAComponent';
export * from './components/ComponentImplementations';

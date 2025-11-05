# TypeScript Code Style Guide

## Overview

This document defines the coding standards for the WinCC OA Projects extension TypeScript codebase. These rules ensure consistency, readability, and maintainability across all source files.

## Core Principles

### 1. **Documentation First**

- Every non-public function MUST have JSDoc documentation
- All classes and interfaces MUST have comprehensive documentation
- Parameters and return types MUST be documented

### 2. **Consistent Formatting**

- Use 4 spaces for indentation (NO tabs)
- Remove all trailing spaces
- Use 80-character delimiters between functions
- Maximum line length: 120 characters

### 3. **Clear Separation**

- Functions are separated by 80-character comment delimiters
- Classes have proper spacing and organization
- Imports are grouped and organized

## Formatting Rules

### Indentation

```typescript
// ✅ Correct: 4 spaces
if (condition) {
    doSomething();
    if (nested) {
        doNestedAction();
    }
}

// ❌ Wrong: tabs or other spacing
if (condition) {
    doSomething(); // Tab used
    doNestedAction(); // 2 spaces
}
```

### Function Delimiters

```typescript
/**
 * First function with proper documentation.
 */
public firstFunction(): void {
    // Implementation
}

//------------------------------------------------------------------------------

/**
 * Second function separated by 80-character delimiter.
 */
private secondFunction(): string {
    return 'result';
}
```

### Trailing Spaces

```typescript
// ✅ Correct: No trailing spaces
const value = 'clean line';

// ❌ Wrong: Trailing spaces (invisible but detected by linter)
const value = 'line with spaces   ';
```

## Documentation Requirements

### Function Documentation

All non-public functions require comprehensive JSDoc:

```typescript
/**
 * Calculates the health score for a WinCC OA project based on manager status.
 *
 * This function evaluates multiple factors including manager health, project state,
 * performance metrics, and reliability indicators to produce an overall health score.
 *
 * @param managers - Array of WinCC OA managers to analyze
 * @param projectState - Current state of the project
 * @param weights - Optional weights for different health components
 * @returns Comprehensive health assessment with score and recommendations
 * @throws {Error} When invalid manager data is provided
 * @since 1.0.0
 */
private calculateProjectHealth(
    managers: WinCCOAManager[],
    projectState: WinCCOAProjectState,
    weights?: HealthWeights
): WinCCOAProjectHealth {
    // Implementation
}
```

### Class Documentation

```typescript
/**
 * Manages WinCC OA project tree view data and provides project organization.
 *
 * This class implements the VS Code TreeDataProvider interface to display
 * WinCC OA projects in a hierarchical tree structure with categorization
 * by project type, status, and version.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */
export class WinCCOAProjectProvider implements vscode.TreeDataProvider<TreeItem> {
    // Implementation
}
```

### Interface Documentation

```typescript
/**
 * Represents the runtime status of a WinCC OA manager process.
 *
 * Managers are the core runtime components that handle different aspects
 * of WinCC OA functionality including UI, database access, drivers, and
 * control logic execution.
 */
export interface WinCCOAManager {
    /** Numeric identifier for the manager within the project */
    index: number;

    /** Display name of the manager */
    name: string;

    /** Type classification (UI, CTRL, DRIVER, etc.) */
    type: string;
}
```

## File Structure Template

Every TypeScript file should follow this structure:

```typescript
/**
 * @fileoverview Brief description of the file's purpose
 *
 * Detailed description explaining what this module does,
 * its main responsibilities, and how it fits into the
 * overall extension architecture.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-04
 */

import * as vscode from 'vscode';
import { SomeType } from './types';

//------------------------------------------------------------------------------

/**
 * Main class or interface documentation.
 */
export class ExampleClass {
    /**
     * Constructor documentation.
     */
    constructor(private readonly config: Config) {
        // Implementation
    }

    //--------------------------------------------------------------------------

    /**
     * Public method documentation.
     */
    public publicMethod(): void {
        this.privateHelper();
    }

    //--------------------------------------------------------------------------

    /**
     * Private helper method documentation.
     *
     * @param parameter - Description of parameter
     * @returns Description of return value
     */
    private privateHelper(parameter?: string): boolean {
        // Implementation
        return true;
    }
}
```

## Automated Enforcement

### ESLint Configuration

The project uses ESLint with TypeScript support to enforce:

- Indentation (4 spaces)
- Trailing space removal
- JSDoc requirements
- TypeScript best practices

### Prettier Configuration

Prettier automatically formats:

- Consistent spacing
- Quote style (single quotes)
- Line endings
- Bracket placement

### Pre-commit Hooks

```bash
# Install dependencies for linting
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint-plugin-jsdoc prettier

# Run linting
npm run lint

# Run formatting
npm run format

# Run both (recommended before commits)
npm run style-check
```

## VS Code Settings

Recommended VS Code workspace settings:

```json
{
    "editor.insertSpaces": true,
    "editor.tabSize": 4,
    "editor.detectIndentation": false,
    "editor.trimAutoWhitespace": true,
    "files.trimTrailingWhitespace": true,
    "files.insertFinalNewline": true,
    "eslint.validate": ["typescript"],
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

## Examples

### ✅ Good Code Style

```typescript
/**
 * @fileoverview Project health assessment utilities
 */

import { WinCCOAManager, WinCCOAProjectHealth } from '../types';

//------------------------------------------------------------------------------

/**
 * Calculates comprehensive health metrics for a WinCC OA project.
 */
export class HealthCalculator {
    /**
     * Creates a new health calculator with specified weights.
     */
    constructor(private readonly weights: HealthWeights) {
        // Initialization
    }

    //--------------------------------------------------------------------------

    /**
     * Computes the overall health score.
     *
     * @param managers - Project managers to analyze
     * @returns Health assessment with score and recommendations
     */
    public calculateHealth(managers: WinCCOAManager[]): WinCCOAProjectHealth {
        const managerScore = this.evaluateManagers(managers);
        return this.buildHealthReport(managerScore);
    }

    //--------------------------------------------------------------------------

    /**
     * Evaluates the health of individual managers.
     *
     * @param managers - Managers to evaluate
     * @returns Numeric health score (0-100)
     */
    private evaluateManagers(managers: WinCCOAManager[]): number {
        // Implementation details
        return 85;
    }

    //--------------------------------------------------------------------------

    /**
     * Builds the final health report structure.
     *
     * @param score - Calculated numeric score
     * @returns Complete health assessment object
     */
    private buildHealthReport(score: number): WinCCOAProjectHealth {
        return {
            overallScore: score,
            grade: this.scoreToGrade(score),
            status: this.scoreToStatus(score),
            issues: [],
            recommendations: []
        };
    }
}
```

### ❌ Bad Code Style

```typescript
// No file header
import { WinCCOAManager } from '../types';

export class HealthCalculator {
    constructor(private weights: any) {} // Tab indentation, no docs

    // No delimiter between functions
    public calculateHealth(managers: WinCCOAManager[]) {
        // Missing return type
        let score = this.evaluateManagers(managers); // Trailing space
        return score;
    }
    private evaluateManagers(managers) {
        // No documentation, no types
        return 85;
    }
}
```

## Enforcement Commands

Add these scripts to package.json:

```json
{
    "scripts": {
        "lint": "eslint src/**/*.ts",
        "lint:fix": "eslint src/**/*.ts --fix",
        "format": "prettier --write src/**/*.ts",
        "style-check": "npm run lint && npm run format",
        "pre-commit": "npm run style-check"
    }
}
```

Run before every commit:

```bash
npm run pre-commit
```

This ensures all code follows the established standards and maintains consistency across the project.

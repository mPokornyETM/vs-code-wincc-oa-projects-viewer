#!/usr/bin/env node

/**
 * Version Management Script for WinCC OA Projects Extension
 *
 * This script helps maintain version consistency between:
 * - package.json
 * - GitHub releases
 * - VS Code Marketplace
 *
 * Usage:
 *   node scripts/version.js [version]
 *
 * Examples:
 *   node scripts/version.js 2.1.0     # Set specific version
 *   node scripts/version.js patch     # Increment patch (2.0.0 -> 2.0.1)
 *   node scripts/version.js minor     # Increment minor (2.0.0 -> 2.1.0)
 *   node scripts/version.js major     # Increment major (2.0.0 -> 3.0.0)
 *   node scripts/version.js check     # Check current version status
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    bright: '\x1b[1m'
};

function log(color, message) {
    console.log(`${color}${message}${colors.reset}`);
}

function getCurrentVersion() {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    return packageJson.version;
}

function setVersion(newVersion) {
    const packagePath = path.join(process.cwd(), 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

    packageJson.version = newVersion;
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');

    log(colors.green, `✅ Updated package.json to version ${newVersion}`);
}

function incrementVersion(type) {
    const current = getCurrentVersion();
    const parts = current.split('.').map(Number);

    switch (type) {
        case 'patch':
            parts[2]++;
            break;
        case 'minor':
            parts[1]++;
            parts[2] = 0;
            break;
        case 'major':
            parts[0]++;
            parts[1] = 0;
            parts[2] = 0;
            break;
        default:
            throw new Error(`Invalid increment type: ${type}`);
    }

    return parts.join('.');
}

function validateVersion(version) {
    const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
    return semverRegex.test(version);
}

function checkVersionStatus() {
    const currentVersion = getCurrentVersion();

    log(colors.bright + colors.blue, '\n🔍 Version Status Check');
    log(colors.cyan, '========================');

    log(colors.yellow, `📦 Current package.json version: ${currentVersion}`);

    // Check if version is a pre-release
    if (currentVersion.includes('-')) {
        log(colors.red, '⚠️  WARNING: This is a pre-release version!');
        log(colors.yellow, '   Consider cleaning up before stable release');
    } else {
        log(colors.green, '✅ Version is clean (no pre-release identifiers)');
    }

    // Check version format
    if (validateVersion(currentVersion)) {
        log(colors.green, '✅ Version format is valid (semantic versioning)');
    } else {
        log(colors.red, '❌ Invalid version format (expected: X.Y.Z)');
    }

    // Check for uncommitted changes
    try {
        execSync('git diff --quiet', { stdio: 'ignore' });
        execSync('git diff --cached --quiet', { stdio: 'ignore' });
        log(colors.green, '✅ No uncommitted changes');
    } catch {
        log(colors.yellow, '⚠️  Uncommitted changes detected');
    }

    // Show recent tags
    try {
        const recentTags = execSync('git tag --sort=-version:refname | head -5', { encoding: 'utf8' }).trim();
        if (recentTags) {
            log(colors.cyan, '\n🏷️  Recent Git tags:');
            recentTags.split('\n').forEach(tag => {
                log(colors.cyan, `   ${tag}`);
            });
        }
    } catch {
        log(colors.yellow, '⚠️  No Git tags found');
    }

    console.log('\n');
}

function showUsage() {
    log(colors.bright + colors.cyan, '\n📋 Version Management Script');
    log(colors.cyan, '=============================');
    console.log(`
Usage: node scripts/version.js [command]

Commands:
  ${colors.green}check${colors.reset}           Check current version status
  ${colors.green}patch${colors.reset}           Increment patch version (X.Y.Z -> X.Y.Z+1)
  ${colors.green}minor${colors.reset}           Increment minor version (X.Y.Z -> X.Y+1.0)
  ${colors.green}major${colors.reset}           Increment major version (X.Y.Z -> X+1.0.0)
  ${colors.green}X.Y.Z${colors.reset}           Set specific version

Examples:
  ${colors.yellow}node scripts/version.js check${colors.reset}      # Check current status
  ${colors.yellow}node scripts/version.js 2.1.0${colors.reset}     # Set to 2.1.0
  ${colors.yellow}node scripts/version.js patch${colors.reset}     # Increment patch

${colors.bright}Best Practices:${colors.reset}
  1. Always run 'check' first to see current status
  2. Use semantic versioning (X.Y.Z)
  3. Commit version changes before creating releases
  4. Let GitHub Actions handle the actual release process
`);
}

// Main script execution
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        showUsage();
        return;
    }

    const command = args[0];

    try {
        switch (command) {
            case 'check':
                checkVersionStatus();
                break;

            case 'patch':
            case 'minor':
            case 'major':
                const currentVersion = getCurrentVersion();
                const newVersion = incrementVersion(command);

                log(colors.yellow, `📋 Incrementing ${command} version:`);
                log(colors.cyan, `   ${currentVersion} -> ${newVersion}`);

                setVersion(newVersion);
                log(colors.green, `\n🎯 Ready to commit and release version ${newVersion}`);
                break;

            default:
                // Assume it's a specific version
                if (validateVersion(command)) {
                    const currentVersion = getCurrentVersion();

                    log(colors.yellow, `📋 Setting specific version:`);
                    log(colors.cyan, `   ${currentVersion} -> ${command}`);

                    setVersion(command);
                    log(colors.green, `\n🎯 Ready to commit and release version ${command}`);
                } else {
                    log(colors.red, `❌ Invalid version format: ${command}`);
                    log(colors.yellow, 'Expected format: X.Y.Z (e.g., 2.1.0)');
                    showUsage();
                    process.exit(1);
                }
                break;
        }
    } catch (error) {
        log(colors.red, `❌ Error: ${error.message}`);
        process.exit(1);
    }
}

// Run the script
main();

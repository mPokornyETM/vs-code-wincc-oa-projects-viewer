/**
 * Test suite for WinCC OA Component Classes and Path Resolution
 */

import * as assert from 'assert';
import * as path from 'path';
import * as os from 'os';
import {
    EventComponent,
    DataComponent,
    UIComponent,
    CtrlComponent,
    PmonComponent,
    ApiComponent,
    OpcComponent,
    HttpComponent
} from '../types/components/implementations';
import { getWinCCOAInstallationPathByVersion } from '../utils/winccoa-paths';

suite('WinCC OA Component Tests', () => {
    suite('Component Classes', () => {
        test('EventComponent should have correct name and description', () => {
            const event = new EventComponent();
            assert.strictEqual(event.getName(), 'WCCILevent');
            assert.strictEqual(event.getDescription(), 'Event Manager');
        });

        test('DataComponent should have correct name and description', () => {
            const data = new DataComponent();
            assert.strictEqual(data.getName(), 'WCCILdata');
            assert.strictEqual(data.getDescription(), 'Database Manager');
        });

        test('UIComponent should have correct name and description', () => {
            const ui = new UIComponent();
            assert.strictEqual(ui.getName(), 'WCCOAui');
            assert.strictEqual(ui.getDescription(), 'User Interface');
        });

        test('CtrlComponent should have correct name and description', () => {
            const ctrl = new CtrlComponent();
            assert.strictEqual(ctrl.getName(), 'WCCOActrl');
            assert.strictEqual(ctrl.getDescription(), 'Control Manager');
        });

        test('PmonComponent should have correct name and description', () => {
            const pmon = new PmonComponent();
            assert.strictEqual(pmon.getName(), 'WCCILpmon');
            assert.strictEqual(pmon.getDescription(), 'Process Monitor');
        });

        test('ApiComponent should have correct name and description', () => {
            const api = new ApiComponent();
            assert.strictEqual(api.getName(), 'WCCOAapi');
            assert.strictEqual(api.getDescription(), 'API Manager');
        });

        test('OpcComponent should have correct name and description', () => {
            const opc = new OpcComponent();
            assert.strictEqual(opc.getName(), 'WCCOAopc');
            assert.strictEqual(opc.getDescription(), 'OPC DA Client');
        });

        test('HttpComponent should have correct name and description', () => {
            const http = new HttpComponent();
            assert.strictEqual(http.getName(), 'webclient_http.ctl');
            assert.strictEqual(http.getDescription(), 'Web Server');
        });

        test('Component executable name should not include .exe extension', () => {
            const event = new EventComponent();
            const eventName = event.getName();
            assert.ok(!eventName.endsWith('.exe'), 'Should not include .exe extension');
            assert.ok(eventName.length > 0, 'Should not be empty');
        });
    });

    suite('getWinCCOAInstallationPathByVersion Function', () => {
        test('Should return null for non-existent version', () => {
            const result = getWinCCOAInstallationPathByVersion('99.99');
            assert.strictEqual(result, null, 'Should return null for non-existent version');
        });

        test('Should handle invalid version format gracefully', () => {
            const result = getWinCCOAInstallationPathByVersion('invalid');
            assert.strictEqual(result, null, 'Should return null for invalid version format');
        });

        test('Should construct correct path format for platform', () => {
            const version = '3.20';
            const result = getWinCCOAInstallationPathByVersion(version);

            if (result) {
                // If a path is found, verify it contains the version
                assert.ok(result.includes(version), `Path should contain version ${version}`);

                // Verify platform-specific path format
                if (os.platform() === 'win32') {
                    assert.ok(
                        result.includes('\\') || result.includes('/'),
                        'Windows path should contain path separators'
                    );
                } else {
                    assert.ok(result.startsWith('/opt/WinCC_OA'), 'Unix path should start with /opt/WinCC_OA');
                }
            } else {
                // This is acceptable if WinCC OA is not installed
                console.log('⚠️  WinCC OA not installed - test skipped (expected in CI/CD)');
                assert.ok(true, 'Test passes - WinCC OA not required');
            }
        });

        test('Should handle version with patch number', () => {
            const result = getWinCCOAInstallationPathByVersion('3.20.5');
            // Result can be null if this specific version is not installed
            if (result) {
                assert.ok(result.includes('3.20'), 'Path should contain version');
            } else {
                assert.ok(true, 'Version not installed - acceptable');
            }
        });
    });

    suite('Component Path Resolution', () => {
        test('PmonComponent should find executable path', () => {
            const pmon = new PmonComponent();
            const result = pmon.getPath();

            if (result) {
                assert.ok(typeof result === 'string', 'Should return string path');
                assert.ok(result.length > 0, 'Path should not be empty');
                assert.ok(result.includes('WCCILpmon'), 'Path should contain component name');

                // Verify platform-specific executable extension
                if (os.platform() === 'win32') {
                    assert.ok(result.endsWith('.exe'), 'Windows executable should have .exe extension');
                } else {
                    assert.ok(!result.endsWith('.exe'), 'Unix executable should not have .exe extension');
                }
            } else {
                console.log('⚠️  WinCC OA not installed - test skipped (expected in CI/CD)');
                assert.ok(true, 'Test passes - WinCC OA not required');
            }
        });

        test('Component path should include bin directory', () => {
            const event = new EventComponent();
            const result = event.getPath();

            if (result) {
                const normalizedPath = result.replace(/\\/g, '/');
                assert.ok(normalizedPath.includes('/bin/'), 'Path should include bin directory');
            } else {
                console.log('⚠️  WinCC OA not installed - test skipped (expected in CI/CD)');
                assert.ok(true, 'Test passes - WinCC OA not required');
            }
        });

        test('Component path should use platform-appropriate separators', () => {
            const ctrl = new CtrlComponent();
            const result = ctrl.getPath();

            if (result) {
                if (os.platform() === 'win32') {
                    // Windows can use either \ or /
                    assert.ok(result.includes('\\') || result.includes('/'), 'Windows path should use path separators');
                } else {
                    // Unix should use /
                    assert.ok(result.includes('/'), 'Unix path should use forward slashes');
                }
            } else {
                console.log('⚠️  WinCC OA not installed - test skipped (expected in CI/CD)');
                assert.ok(true, 'Test passes - WinCC OA not required');
            }
        });

        test('Component path should be absolute', () => {
            const pmon = new PmonComponent();
            const result = pmon.getPath();

            if (result) {
                assert.ok(path.isAbsolute(result), 'Should return absolute path');
            } else {
                console.log('⚠️  WinCC OA not installed - test skipped (expected in CI/CD)');
                assert.ok(true, 'Test passes - WinCC OA not required');
            }
        });

        test('Multiple components should work correctly', () => {
            const componentsToTest = [
                new PmonComponent(),
                new EventComponent(),
                new ApiComponent(),
                new HttpComponent()
            ];

            for (const component of componentsToTest) {
                const componentName = component.getName();
                assert.ok(componentName.length > 0, `Component name should not be empty`);

                const componentPath = component.getPath();
                // Path can be null if WinCC OA is not installed
                if (componentPath) {
                    assert.ok(
                        componentPath.includes(componentName.replace('.ctl', '')),
                        `Path should contain component name ${componentName}`
                    );
                }
            }

            assert.ok(true, 'Multiple components test completed');
        });

        test('Component paths should be consistent across multiple calls', () => {
            const pmon1 = new PmonComponent();
            const pmon2 = new PmonComponent();
            const result1 = pmon1.getPath();
            const result2 = pmon2.getPath();

            if (result1 && result2) {
                assert.strictEqual(result1, result2, 'Multiple calls should return same path');
            } else {
                assert.ok(true, 'Test passes - WinCC OA not installed');
            }
        });

        test('Component exists() method should work correctly', () => {
            const pmon = new PmonComponent();
            const exists = pmon.exists();

            // exists() should return a boolean
            assert.ok(typeof exists === 'boolean', 'exists() should return boolean');

            // If path is found, exists() should correlate
            const path = pmon.getPath();
            if (path) {
                assert.ok(exists, 'If path exists, exists() should return true');
            }
        });
    });
});

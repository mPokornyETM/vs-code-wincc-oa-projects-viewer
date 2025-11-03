import * as assert from 'assert';

// Import functions from extension
import { 
    parseVersionOutput,
    DetailedVersionInfo
} from '../extension';

suite('WinCC OA Version Information - Unit Tests', () => {
    
    suite('parseVersionOutput Function', () => {
        test('should parse valid WCCILpmon output with all information', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)\nWCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!';
            const executablePath = 'C:\\Siemens\\Automation\\WinCC_OA\\3.20\\bin\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
            assert.strictEqual(result.buildDate, 'Mar  2 2025 09:51:08');
            assert.strictEqual(result.commitHash, 'faf9f4332a');
            assert.strictEqual(result.executablePath, executablePath);
            assert.strictEqual(result.rawOutput, output);
        });

        test('should parse Linux output format correctly', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.21.0 platform Linux x86_64 linked at Jan 15 2025 14:30:22 (abc123def4)\nWCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!';
            const executablePath = '/opt/wincc_oa/3.21/bin/WCCILpmon';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, '3.21.0');
            assert.strictEqual(result.platform, 'Linux');
            assert.strictEqual(result.architecture, 'x86_64');
            assert.strictEqual(result.buildDate, 'Jan 15 2025 14:30:22');
            assert.strictEqual(result.commitHash, 'abc123def4');
            assert.strictEqual(result.executablePath, executablePath);
        });

        test('should handle partial parsing when build info is missing', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.19.8 platform Windows AMD64\nWCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!';
            const executablePath = 'C:\\WinCC_OA\\3.19\\bin\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, '3.19.8');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
            assert.strictEqual(result.buildDate, 'Unknown');
            assert.strictEqual(result.commitHash, 'Unknown');
        });

        test('should handle completely unparseable output gracefully', () => {
            const output = 'Invalid output format that does not match expected pattern';
            const executablePath = 'C:\\WinCC_OA\\bin\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, 'Unknown');
            assert.strictEqual(result.platform, 'Unknown');
            assert.strictEqual(result.architecture, 'Unknown');
            assert.strictEqual(result.buildDate, 'Unknown');
            assert.strictEqual(result.commitHash, 'Unknown');
            assert.strictEqual(result.executablePath, executablePath);
            assert.strictEqual(result.rawOutput, output);
        });

        test('should handle empty output', () => {
            const output = '';
            const executablePath = 'C:\\WinCC_OA\\bin\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, 'Unknown');
            assert.strictEqual(result.platform, 'Unknown');
            assert.strictEqual(result.architecture, 'Unknown');
            assert.strictEqual(result.buildDate, 'Unknown');
            assert.strictEqual(result.commitHash, 'Unknown');
            assert.strictEqual(result.executablePath, executablePath);
            assert.strictEqual(result.rawOutput, output);
        });

        test('should extract basic version when full parsing fails', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.18.7 some other format without platform info';
            const executablePath = 'C:\\WinCC_OA\\bin\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.version, '3.18.7');
            assert.strictEqual(result.platform, 'Unknown');
            assert.strictEqual(result.architecture, 'Unknown');
            assert.strictEqual(result.buildDate, 'Unknown');
            assert.strictEqual(result.commitHash, 'Unknown');
        });

        test('should handle different version number formats', () => {
            const testCases = [
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.15 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)',
                    expectedVersion: '3.20.15'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 4.0.0 platform Linux x86_64 linked at Jan 15 2025 14:30:22 (abc123def4)',
                    expectedVersion: '4.0.0'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.21.1 platform Windows x86 linked at Feb 10 2025 12:00:00 (def456abc1)',
                    expectedVersion: '3.21.1'
                }
            ];

            testCases.forEach((testCase, index) => {
                const result = parseVersionOutput(testCase.output, 'test.exe');
                assert.strictEqual(result.version, testCase.expectedVersion, 
                    `Test case ${index + 1} failed for version parsing`);
            });
        });

        test('should handle different platform formats', () => {
            const testCases = [
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)',
                    expectedPlatform: 'Windows',
                    expectedArchitecture: 'AMD64'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.21.0 platform Linux x86_64 linked at Jan 15 2025 14:30:22 (abc123def4)',
                    expectedPlatform: 'Linux',
                    expectedArchitecture: 'x86_64'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.19.8 platform Windows x86 linked at Dec 10 2024 16:45:33 (1a2b3c4d5e)',
                    expectedPlatform: 'Windows',
                    expectedArchitecture: 'x86'
                }
            ];

            testCases.forEach((testCase, index) => {
                const result = parseVersionOutput(testCase.output, 'test.exe');
                assert.strictEqual(result.platform, testCase.expectedPlatform, 
                    `Test case ${index + 1} failed for platform parsing`);
                assert.strictEqual(result.architecture, testCase.expectedArchitecture, 
                    `Test case ${index + 1} failed for architecture parsing`);
            });
        });

        test('should handle different build date formats', () => {
            const testCases = [
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)',
                    expectedBuildDate: 'Mar  2 2025 09:51:08'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.21.0 platform Linux x86_64 linked at Jan 15 2025 14:30:22 (abc123def4)',
                    expectedBuildDate: 'Jan 15 2025 14:30:22'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.19.8 platform Windows x86 linked at Dec 10 2024 16:45:33 (1a2b3c4d5e)',
                    expectedBuildDate: 'Dec 10 2024 16:45:33'
                }
            ];

            testCases.forEach((testCase, index) => {
                const result = parseVersionOutput(testCase.output, 'test.exe');
                assert.strictEqual(result.buildDate, testCase.expectedBuildDate, 
                    `Test case ${index + 1} failed for build date parsing`);
            });
        });

        test('should handle different commit hash formats', () => {
            const testCases = [
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)',
                    expectedCommitHash: 'faf9f4332a'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.21.0 platform Linux x86_64 linked at Jan 15 2025 14:30:22 (abc123def456)',
                    expectedCommitHash: 'abc123def456'
                },
                {
                    output: 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.19.8 platform Windows x86 linked at Dec 10 2024 16:45:33 (1a2b3c4d5e6f)',
                    expectedCommitHash: '1a2b3c4d5e6f'
                }
            ];

            testCases.forEach((testCase, index) => {
                const result = parseVersionOutput(testCase.output, 'test.exe');
                assert.strictEqual(result.commitHash, testCase.expectedCommitHash, 
                    `Test case ${index + 1} failed for commit hash parsing`);
            });
        });

        test('should preserve raw output exactly', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)\nWCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!\n\nExtra content that should be preserved';
            const executablePath = 'C:\\test\\WCCILpmon.exe';
            
            const result = parseVersionOutput(output, executablePath);
            
            assert.strictEqual(result.rawOutput, output, 'Raw output should be preserved exactly');
            assert.strictEqual(result.executablePath, executablePath, 'Executable path should be preserved');
        });

        test('should handle multi-line output with version information in different lines', () => {
            const output = [
                'WCCILpmon starting...',
                'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)',
                'Additional debug info',
                'WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!'
            ].join('\n');
            
            const result = parseVersionOutput(output, 'test.exe');
            
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
        });

        test('should handle output with no line breaks', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a) WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!';
            
            const result = parseVersionOutput(output, 'test.exe');
            
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
        });
    });

    suite('DetailedVersionInfo Interface', () => {
        test('should have all required properties', () => {
            const versionInfo: DetailedVersionInfo = {
                version: '3.20.5',
                platform: 'Windows',
                architecture: 'AMD64',
                buildDate: 'Mar  2 2025 09:51:08',
                commitHash: 'faf9f4332a',
                rawOutput: 'test output',
                executablePath: 'C:\\test\\WCCILpmon.exe'
            };

            // Test that all properties are accessible
            assert.ok(typeof versionInfo.version === 'string');
            assert.ok(typeof versionInfo.platform === 'string');
            assert.ok(typeof versionInfo.architecture === 'string');
            assert.ok(typeof versionInfo.buildDate === 'string');
            assert.ok(typeof versionInfo.commitHash === 'string');
            assert.ok(typeof versionInfo.rawOutput === 'string');
            assert.ok(typeof versionInfo.executablePath === 'string');
        });

        test('should allow unknown values for all fields', () => {
            const versionInfo: DetailedVersionInfo = {
                version: 'Unknown',
                platform: 'Unknown',
                architecture: 'Unknown',
                buildDate: 'Unknown',
                commitHash: 'Unknown',
                rawOutput: 'Unknown',
                executablePath: 'Unknown'
            };

            assert.strictEqual(versionInfo.version, 'Unknown');
            assert.strictEqual(versionInfo.platform, 'Unknown');
            assert.strictEqual(versionInfo.architecture, 'Unknown');
            assert.strictEqual(versionInfo.buildDate, 'Unknown');
            assert.strictEqual(versionInfo.commitHash, 'Unknown');
            assert.strictEqual(versionInfo.rawOutput, 'Unknown');
            assert.strictEqual(versionInfo.executablePath, 'Unknown');
        });
    });

    suite('Error Resilience and Edge Cases', () => {
        test('should handle null or undefined executable path gracefully', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)';
            
            const result1 = parseVersionOutput(output, null as any);
            const result2 = parseVersionOutput(output, undefined as any);
            
            assert.strictEqual(result1.executablePath, null);
            assert.strictEqual(result2.executablePath, undefined);
            // Version parsing should still work
            assert.strictEqual(result1.version, '3.20.5');
            assert.strictEqual(result2.version, '3.20.5');
        });

        test('should handle very large output strings', () => {
            const largeOutput = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)\n' + 
                              'A'.repeat(10000) + '\n' +
                              'WCCILpmon    (1), 2025.11.03 15:15:01.847: exit(1) called!';
            
            const result = parseVersionOutput(largeOutput, 'test.exe');
            
            // Should still parse correctly despite large output
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.rawOutput, largeOutput);
        });

        test('should handle special characters in output', () => {
            const output = 'WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5 platform Windows AMD64 linked at Mar  2 2025 09:51:08 (faf9f4332a)';
            
            const result = parseVersionOutput(output, 'test.exe');
            
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
        });

        test('should handle whitespace variations in output', () => {
            const output = '  WCCILpmon    (1), 2025.11.03 15:15:01.846: 3.20.5    platform   Windows   AMD64   linked   at   Mar    2   2025   09:51:08   (faf9f4332a)  ';
            
            const result = parseVersionOutput(output, 'test.exe');
            
            assert.strictEqual(result.version, '3.20.5');
            assert.strictEqual(result.platform, 'Windows');
            assert.strictEqual(result.architecture, 'AMD64');
            assert.strictEqual(result.buildDate.trim(), 'Mar    2   2025   09:51:08');
        });
    });
});
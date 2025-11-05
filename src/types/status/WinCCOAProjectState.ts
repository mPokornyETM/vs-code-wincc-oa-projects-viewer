/**
 * @fileoverview WinCC OA Project State Type
 *
 * This module defines the WinCCOAProjectState interface used for representing
 * the overall state of a WinCC OA project at runtime, including licensing,
 * system information, and operational mode.
 *
 * @author mPokornyETM
 * @version 1.0.0
 * @since 2024-11-05
 */

/**
 * Represents the overall state of a WinCC OA project at runtime.
 * This includes licensing, system information, and operational mode.
 */
export interface WinCCOAProjectState {
    /** Whether the project is currently running */
    isRunning: boolean;

    /** Current operational mode of the project */
    mode: 'normal' | 'demo' | 'emergency' | 'safe' | 'unknown';

    /** Type of license being used */
    licenseType?: 'full' | 'demo' | 'development' | 'unknown';

    /** System information where the project is running */
    systemInfo?: {
        /** Hostname of the system */
        hostname: string;

        /** Operating system platform */
        platform: string;

        /** System architecture (x64, x86, etc.) */
        architecture: string;
    };
}

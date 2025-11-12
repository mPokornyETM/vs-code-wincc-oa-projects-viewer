/**
 * Control Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class CtrlComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOActrl';
    }

    public getDescription(): string {
        return 'Control Manager';
    }

    /**
     * Starts the Control Manager with a specific script
     */
    public async startWithScript(scriptName: string, additionalArgs: string[] = []): Promise<number> {
        return this.start(['-f', scriptName, ...additionalArgs]);
    }

    // Add CTRL-specific methods here
}

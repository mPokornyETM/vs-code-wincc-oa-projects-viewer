/**
 * User Interface Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class UIComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAui';
    }

    public getDescription(): string {
        return 'User Interface';
    }

    /**
     * Starts the UI with a specific panel
     * @param panelPath - Path to the panel file
     * @param args - Additional arguments
     * @returns Process exit code
     */
    public async startWithPanel(panelPath: string, args: string[] = []): Promise<number> {
        return this.start(['-p', panelPath, ...args]);
    }
}

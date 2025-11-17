/**
 * Driver Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class DriverComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAdriver';
    }

    public getDescription(): string {
        return 'Generic Driver';
    }

    // Add DRIVER-specific methods here
}

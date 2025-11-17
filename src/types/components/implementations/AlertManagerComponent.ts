/**
 * Alert Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class AlertManagerComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAalert';
    }

    public getDescription(): string {
        return 'Alert Manager';
    }

    // Add ALERTMANAGER-specific methods here
}

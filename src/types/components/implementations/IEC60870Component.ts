/**
 * IEC 60870 Driver Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class IEC60870Component extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAiec';
    }

    public getDescription(): string {
        return 'IEC 60870 101/104 Driver';
    }

    // Add IEC60870-specific methods here
}

/**
 * IEC 61850 Client Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class IEC61850Component extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAiec61850';
    }

    public getDescription(): string {
        return 'IEC 61850 Client';
    }

    // Add IEC61850-specific methods here
}

/**
 * S7 Top SAP Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class S7TopSapComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAs7topsap';
    }

    public getDescription(): string {
        return 'S7 Top SAP Interface';
    }

    // Add S7TOPSAP-specific methods here
}

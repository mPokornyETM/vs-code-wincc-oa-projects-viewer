/**
 * RDB Archive Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class RdbComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOArdb';
    }

    public getDescription(): string {
        return 'RDB Archive Manager';
    }

    // Add RDB-specific methods here
}

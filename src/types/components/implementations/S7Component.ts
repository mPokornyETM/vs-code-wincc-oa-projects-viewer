/**
 * S7 Driver Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class S7Component extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAs7';
    }

    public getDescription(): string {
        return 'S7 Driver';
    }

    // Add S7-specific methods here
}

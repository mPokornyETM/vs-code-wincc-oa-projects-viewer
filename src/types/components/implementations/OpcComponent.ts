/**
 * OPC Client Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class OpcComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAopc';
    }

    public getDescription(): string {
        return 'OPC DA Client';
    }

    // Add OPC-specific methods here
}

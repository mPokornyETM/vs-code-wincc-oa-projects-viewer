/**
 * OPC UA Client Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class OpcUaComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAopcua';
    }

    public getDescription(): string {
        return 'OPC UA Client';
    }

    // Add OPCUA-specific methods here
}

/**
 * DNP3 Driver Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class DNP3Component extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAdnp3';
    }

    public getDescription(): string {
        return 'DNP3 Driver';
    }

    // Add DNP3-specific methods here
}

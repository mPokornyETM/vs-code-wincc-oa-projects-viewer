/**
 * Process Monitor Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class PmonComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILpmon';
    }

    public getDescription(): string {
        return 'Process Monitor';
    }

    // Add PMON-specific methods here
}

/**
 * Split Mode Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class SplitComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILsplit';
    }

    public getDescription(): string {
        return 'Split Mode Manager';
    }

    // Add SPLIT-specific methods here
}

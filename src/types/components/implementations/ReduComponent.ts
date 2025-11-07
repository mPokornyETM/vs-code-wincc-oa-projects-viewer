/**
 * Redundancy Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class ReduComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILredu';
    }

    public getDescription(): string {
        return 'Redundancy Manager';
    }

    // Add REDU-specific methods here
}

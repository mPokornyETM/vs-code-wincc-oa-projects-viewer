/**
 * Distribution Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class DistComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILdist';
    }

    public getDescription(): string {
        return 'Distribution Manager';
    }

    // Add DIST-specific methods here
}

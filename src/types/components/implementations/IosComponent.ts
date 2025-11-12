/**
 * iOS Mobile Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class IosComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAios';
    }

    public getDescription(): string {
        return 'iOS Mobile Component';
    }

    // Add IOS-specific methods here
}

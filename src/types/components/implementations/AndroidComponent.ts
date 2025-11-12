/**
 * Android Mobile Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class AndroidComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAandroid';
    }

    public getDescription(): string {
        return 'Android Mobile Component';
    }

    // Add ANDROID-specific methods here
}

/**
 * ASCII Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class AsciiManagerComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAascii';
    }

    public getDescription(): string {
        return 'ASCII Manager';
    }

    // Add ASCIIMANAGER-specific methods here
}

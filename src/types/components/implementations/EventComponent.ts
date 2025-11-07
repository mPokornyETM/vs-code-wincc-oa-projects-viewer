/**
 * Event Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class EventComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILevent';
    }

    public getDescription(): string {
        return 'Event Manager';
    }

    // Add EVENT-specific methods here
}

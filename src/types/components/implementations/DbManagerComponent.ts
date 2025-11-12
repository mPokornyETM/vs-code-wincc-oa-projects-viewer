/**
 * Database Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class DbManagerComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCILdata';
    }

    public getDescription(): string {
        return 'Database Manager';
    }

    // Add DBMANAGER-specific methods here
}

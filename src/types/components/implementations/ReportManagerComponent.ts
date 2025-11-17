/**
 * Report Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class ReportManagerComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAreporting';
    }

    public getDescription(): string {
        return 'Reporting Manager';
    }

    // Add REPORTMANAGER-specific methods here
}

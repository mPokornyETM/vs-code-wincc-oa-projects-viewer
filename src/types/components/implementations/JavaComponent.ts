/**
 * Java Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class JavaComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAjava';
    }

    public getDescription(): string {
        return 'Java Manager';
    }

    // Add JAVA-specific methods here
}

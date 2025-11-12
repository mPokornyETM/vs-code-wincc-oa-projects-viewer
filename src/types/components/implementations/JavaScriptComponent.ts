/**
 * JavaScript Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class JavaScriptComponent extends WinCCOAComponent {
    public getName(): string {
        return 'node';
    }

    public getDescription(): string {
        return 'JavaScript Manager';
    }

    // Add JAVASCRIPT-specific methods here
}

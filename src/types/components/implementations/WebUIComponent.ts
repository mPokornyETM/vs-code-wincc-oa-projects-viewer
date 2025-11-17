/**
 * WebUI Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class WebUIComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAwebui';
    }

    public getDescription(): string {
        return 'WebUI Component';
    }

    // Add WEBUI-specific methods here
}

/**
 * HTTP Manager Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class HttpComponent extends WinCCOAComponent {
    public getName(): string {
        return 'webclient_http.ctl';
    }

    public getDescription(): string {
        return 'Web Server';
    }

    // Add HTTP-specific methods here
}

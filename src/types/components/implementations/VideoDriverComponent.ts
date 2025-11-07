/**
 * Video Driver Component
 */

import { WinCCOAComponent } from '../WinCCOAComponent';

export class VideoDriverComponent extends WinCCOAComponent {
    public getName(): string {
        return 'WCCOAvideoOA';
    }

    public getDescription(): string {
        return 'Video Manager';
    }

    // Add VIDEODRIVER-specific methods here
}

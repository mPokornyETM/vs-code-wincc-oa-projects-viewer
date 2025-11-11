# WinCC OA Component Management

This document describes the new component management system with class hierarchy.

## Overview

The component system consists of:

1. **`WinCCOAComponentType`** - Enum with all component types
2. **`WinCCOAComponent`** - Abstract base class with common functionality
3. **Derived component classes** - Specific implementations for each component type
4. **Factory function** - Creates component instances

## Usage Examples

### 1. Getting Component Path

```typescript
import { WinCCOAComponentType, getComponentPath } from './types';

// Get path to PMON component for a specific version
const pmonPath = getComponentPath(WinCCOAComponentType.PMON, '3.20');

// Get path for any available version (searches all installed versions)
const ctrlPath = getComponentPath(WinCCOAComponentType.CTRL);
```

### 2. Creating Component Instances

```typescript
import { createComponent, WinCCOAComponentType, getComponentPath } from './types';

// Get component executable path
const ctrlPath = getComponentPath(WinCCOAComponentType.CTRL);

if (ctrlPath) {
    // Create component instance
    const ctrl = createComponent(WinCCOAComponentType.CTRL, ctrlPath);

    // Set project context
    ctrl.setProject('MyProject');
    ctrl.setConfig('/path/to/config');

    // Start component with script
    if (ctrl instanceof CtrlComponent) {
        const exitCode = await ctrl.startWithScript('/path/to/script.ctl', ['-arg1', 'value1']);
        console.log(`CTRL exited with code: ${exitCode}`);
        console.log(`Output: ${ctrl.getStdOut()}`);
    }
}
```

### 3. Getting Component Information

```typescript
import { createComponent, WinCCOAComponentType, getComponentPath } from './types';

const pmonPath = getComponentPath(WinCCOAComponentType.PMON);

if (pmonPath) {
    const pmon = createComponent(WinCCOAComponentType.PMON, pmonPath);

    // Get help information
    const help = await pmon.getHelp();
    console.log(help);

    // Get version
    const version = await pmon.getVersion();
    console.log(`PMON Version: ${version}`);
}
```

### 4. Starting Components

```typescript
import { createComponent, WinCCOAComponentType, getComponentPath } from './types';

const uiPath = getComponentPath(WinCCOAComponentType.UI);

if (uiPath) {
    const ui = createComponent(WinCCOAComponentType.UI, uiPath);

    ui.setProject('MyProject');

    if (ui instanceof UIComponent) {
        // Start UI with a specific panel
        await ui.startWithPanel('panels/main.pnl', ['-fullscreen']);
    }
}
```

### 5. Background Processes

```typescript
import { createComponent, WinCCOAComponentType, getComponentPath } from './types';

const dataPath = getComponentPath(WinCCOAComponentType.DATA);

if (dataPath) {
    const data = createComponent(WinCCOAComponentType.DATA, dataPath);

    data.setProject('MyProject');

    // Start in detached mode (background)
    const pid = await data.startDetached(['-num', '2']);
    console.log(`DATA manager started with PID: ${pid}`);
}
```

## Component-Specific Methods

Each component class can have specific methods tailored to its functionality:

### UIComponent

```typescript
const ui = createComponent(WinCCOAComponentType.UI, uiPath) as UIComponent;
await ui.startWithPanel('panels/main.pnl', ['-fullscreen']);
```

### CtrlComponent

```typescript
const ctrl = createComponent(WinCCOAComponentType.CTRL, ctrlPath) as CtrlComponent;
await ctrl.startWithScript('scripts/startup.ctl', ['-arg', 'value']);
```

## Base Class Methods

All component classes inherit these methods from `WinCCOAComponent`:

| Method | Description | Return Type |
|--------|-------------|-------------|
| `getHelp()` | Get help information | `Promise<string \| null>` |
| `getVersion()` | Get component version | `Promise<string \| null>` |
| `start(args)` | Start component synchronously | `Promise<number>` |
| `startDetached(args)` | Start component in background | `Promise<number>` |
| `getStdOut()` | Get standard output from last execution | `string` |
| `getStdErr()` | Get standard error from last execution | `string` |
| `getProject()` | Get current project name | `string \| undefined` |
| `setProject(name)` | Set project name | `void` |
| `getConfig()` | Get config path | `string \| undefined` |
| `setConfig(path)` | Set config path | `void` |
| `getComponentType()` | Get component type enum | `WinCCOAComponentType` |
| `getExecutablePath()` | Get executable path | `string` |

## Available Component Types

The `WinCCOAComponentType` enum includes:

**Core Components:**

- EVENT, DATA, UI, CTRL, PMON

**Manager Components:**

- API, DIST, DRIVER, ASCIIMANAGER, DBMANAGER, REPORTMANAGER, VALUEARCMANAGER, ALERTMANAGER, HTTP, S7TOPSAP, SPLIT, REDU, RDB, VIDEODRIVER

**Additional Components:**

- SIM, VISION, CONF, ANDROID, IOS, WEBUI, JAVASCRIPT, JAVA

**Protocol Drivers:**

- OPC, OPCDA, OPCUA, S7, MODBUS, IEC60870, IEC61850, DNP3

## Error Handling

```typescript
try {
    const ctrl = createComponent(WinCCOAComponentType.CTRL, ctrlPath);
    ctrl.setProject('MyProject');

    const exitCode = await ctrl.start(['script.ctl']);

    if (exitCode !== 0) {
        console.error('Script failed:', ctrl.getStdErr());
    } else {
        console.log('Script output:', ctrl.getStdOut());
    }
} catch (error) {
    console.error('Failed to run component:', error);
}
```

## Platform Support

The component system automatically handles platform-specific differences:

- **Windows**: Adds `.exe` extension to executables, queries registry for installation paths
- **Unix/Linux**: Uses `/opt/WinCC_OA` paths, no extension

## Extension Points

To add component-specific functionality:

1. Open `src/types/components/ComponentImplementations.ts`
2. Find your component class (e.g., `CtrlComponent`)
3. Add public methods specific to that component

Example:

```typescript
export class CtrlComponent extends BaseComponentImpl {
    constructor(executablePath: string) {
        super(WinCCOAComponentType.CTRL, executablePath);
    }

    // Component-specific method
    public async startWithScript(scriptPath: string, args: string[] = []): Promise<number> {
        return this.start([scriptPath, ...args]);
    }

    // Add more CTRL-specific methods here
    public async compileScript(scriptPath: string): Promise<boolean> {
        const exitCode = await this.start(['-compile', scriptPath]);
        return exitCode === 0;
    }
}
```

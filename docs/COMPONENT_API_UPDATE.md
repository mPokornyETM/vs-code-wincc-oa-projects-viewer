# WinCC OA Component Class API Documentation

## Overview

The `WinCCOAComponent` base class provides a unified interface for working with WinCC OA components (executables). Each component type (PMON, EVENT, CTRL, etc.) extends this base class and implements component-specific functionality.

## Base Class: `WinCCOAComponent`

### Abstract Methods (must be implemented by subclasses)

#### `getName(): string`

Returns the executable name without the `.exe` extension.

```typescript
const pmon = new PmonComponent();
console.log(pmon.getName()); // "WCCILpmon"
```

#### `getDescription(): string`

Returns a human-readable description of the component.

```typescript
const pmon = new PmonComponent();
console.log(pmon.getDescription()); // "Process Monitor"
```

### Instance Methods

#### `getPath(): string | null`

Gets the full path to the component executable. Searches for the component in the following order:

1. If `setOaVersion()` was called: searches only in that specific WinCC OA installation
2. Otherwise: searches all installed WinCC OA versions (highest version first)

```typescript
const pmon = new PmonComponent();

// Search all versions
const path1 = pmon.getPath();

// Search specific version
pmon.setOaVersion('3.20');
const path2 = pmon.getPath();
```

#### `exists(): boolean`

Checks if the component executable exists on the file system.

```typescript
const event = new EventComponent();
event.setOaVersion('3.20');

if (event.exists()) {
    console.log('Event manager found');
}
```

#### `getVersion(): Promise<string | null>`

Executes the component with `-version` flag and returns the version output.

```typescript
const ctrl = new CtrlComponent();
ctrl.setOaVersion('3.21');

const version = await ctrl.getVersion();
console.log(version); // e.g., " 3.20.5 platform Windows AMD64 linked at Oct 10 2025 23:15:17 (<sha1>)"
```

#### `getHelp(): Promise<string | null>`

Executes the component with `-help` flag and returns the help text.

```typescript
const data = new DataComponent();
const help = await data.getHelp();
console.log(help);
```

#### `setOaVersion(version: string): void`

Sets the WinCC OA version to use when searching for the component.

```typescript
const component = new EventComponent();
component.setOaVersion('3.20');
```

#### `setProject(projectName: string): void`

Sets the project name for the component. Used when building command line arguments.

```typescript
const ctrl = new CtrlComponent();
ctrl.setProject('MyProject');
```

#### `setConfigPath(configPath: string): void`

Sets the config file path for the component. Used when building command line arguments.

```typescript
const pmon = new PmonComponent();
pmon.setConfigPath('C:\\Projects\\MyProject\\config\\config');
```

#### `start(args: string[]): Promise<number>`

Starts the component with additional arguments. Returns exit code.

```typescript
const ctrl = new CtrlComponent();
ctrl.setProject('MyProject');

const exitCode = await ctrl.start(['-n', 'myscript.ctl']);
console.log('Exit code:', exitCode);
console.log('Output:', ctrl.getStdOut());
```

#### `startDetached(args: string[]): Promise<number>`

Starts the component as a detached background process. Returns process ID.

```typescript
const pmon = new PmonComponent();
pmon.setProject('MyProject');

const pid = await pmon.startDetached(['-noAutostart']);
console.log('Started with PID:', pid);
```

#### `getStdOut(): string`

Gets the standard output from the last execution.

```typescript
const component = new EventComponent();
await component.start(['-help']);
console.log(component.getStdOut());
```

#### `getStdErr(): string`

Gets the standard error output from the last execution.

```typescript
const component = new DataComponent();
await component.start(['-invalid']);
console.log(component.getStdErr());
```

### Static Methods

#### `parseVersionOutput(output: string, executablePath: string)`

Parses version output from WinCC OA component `-version` command.

```typescript
const versionInfo = WinCCOAComponent.parseVersionOutput(rawOutput, execPath);
console.log(versionInfo.version);        // "3.20.5"
console.log(versionInfo.platform);       // "NT"
console.log(versionInfo.architecture);   // "x86 64"
console.log(versionInfo.buildDate);      // "Dec 15 2024 10:30:00"
console.log(versionInfo.commitHash);     // "a1b2c3d4"
```

## Available Component Classes

All component classes extend `WinCCOAComponent` and implement `getName()` and `getDescription()`:

| Class | Executable Name | Description |
|-------|-----------------|-------------|
| `PmonComponent` | WCCILpmon | Process Monitor |
| `EventComponent` | WCCILevent | Event Manager |
| `DataComponent` | WCCILdata | Database Manager |
| `UIComponent` | WCCOAui | User Interface |
| `CtrlComponent` | WCCOActrl | Control Manager |
| `DistComponent` | WCCILdist | Distribution Manager |
| `ReduComponent` | WCCILredu | Redundancy Manager |
| `AsciiManagerComponent` | WCCOAascii | ASCII Manager |
| `SplitComponent` | WCCILsplit | Split Mode Manager |
| `RdbComponent` | WCCOArdb | RDB Archive Manager |
| `ValueArchManagerComponent` | WCCOAvalarch | Archive Manager |
| `ReportManagerComponent` | WCCOAreporting | Reporting Manager |
| `VideoDriverComponent` | WCCOAvideoOA | Video Manager |
| `HttpComponent` | WCCOAhttp | Web Server |
| `JavaScriptComponent` | node | JavaScript Manager |
| `SimComponent` | WCCILsim | Simulation Driver |
| `OpcUaComponent` | WCCOAopcua | OPC UA Client |
| `OpcDaComponent` | WCCOAopc | OPC DA Client |
| `S7Component` | WCCOAs7 | S7 Driver |
| `ModbusComponent` | WCCOAmod | Modbus Driver |
| `IEC60870Component` | WCCOAiec | IEC 60870 101/104 Driver |
| `IEC61850Component` | WCCOAiec61850 | IEC 61850/61400 Client |
| `DNP3Component` | WCCOAdnp3 | DNP3 Driver |

## Complete Usage Example

```typescript
import { PmonComponent, CtrlComponent } from './types/components/implementations';

// Create and configure PMON component
const pmon = new PmonComponent();
pmon.setOaVersion('3.21');
pmon.setProject('MyProject');

// Check if component exists
if (pmon.exists()) {
    console.log('PMON found at:', pmon.getPath());

    // Get version information
    const version = await pmon.getVersion();
    console.log('PMON version:', version);

    // Start PMON with specific options
    const exitCode = await pmon.start(['-noAutostart']);
    console.log('PMON started with exit code:', exitCode);
}

// Create and use CTRL component
const ctrl = new CtrlComponent();
ctrl.setOaVersion('3.21');
ctrl.setProject('MyProject');

// Start a control script
const ctrlExitCode = await ctrl.startWithScript('myScript.ctl', ['-num', '1']);
console.log('Script exit code:', ctrlExitCode);
console.log('Script output:', ctrl.getStdOut());
```

## PmonComponent Specific Methods

The `PmonComponent` class extends the base class with pmon-specific operations:

### `registerSubProject(projectPath: string, outputCallback?: (message: string) => void): Promise<void>`

Registers a sub-project using pmon's `-regsubf` option.

```typescript
const pmon = new PmonComponent();
pmon.setOaVersion('3.21');

await pmon.registerSubProject(
    'C:\\Projects\\SubProject',
    (msg) => console.log(msg)
);
```

### `unregisterProject(projectName: string, outputCallback?: (message: string) => void): Promise<void>`

Unregisters a project using pmon's `-unreg` option.

```typescript
const pmon = new PmonComponent();
pmon.setOaVersion('3.21');

await pmon.unregisterProject('MyProject', (msg) => console.log(msg));
```

### `registerProject(configPath: string, outputCallback?: (message: string) => void): Promise<number>`

Registers a runnable project using pmon's `-config -autofreg -status` options.

```typescript
const pmon = new PmonComponent();
pmon.setOaVersion('3.21');

const exitCode = await pmon.registerProject(
    'C:\\Projects\\MyProject\\config\\config',
    (msg) => console.log(msg)
);
```

### Project Control Methods

```typescript
// Check if project is running
const isRunning = await pmon.checkProjectStatus('MyProject');

// Start pmon only (without managers)
await pmon.startPmonOnly('MyProject', (msg) => console.log(msg));

// Start project with all managers
await pmon.startProject('MyProject', true, (msg) => console.log(msg));

// Stop all managers
await pmon.stopProject('MyProject', (msg) => console.log(msg));

// Stop all managers and exit pmon
await pmon.stopProjectAndPmon('MyProject', (msg) => console.log(msg));

// Restart all managers
await pmon.restartProject('MyProject', (msg) => console.log(msg));

// Set wait mode
await pmon.setWaitMode('MyProject', (msg) => console.log(msg));
```

### Manager Control Methods

```typescript
// Get list of managers
const managers = await pmon.getManagerList('MyProject');
console.log('Managers:', managers);

// Get detailed manager status
const status = await pmon.getDetailedManagerStatus('MyProject');
console.log('Status:', status);

// Start specific manager by index
await pmon.startManager('MyProject', 1, (msg) => console.log(msg));

// Stop specific manager
await pmon.stopManager('MyProject', 1, (msg) => console.log(msg));

// Kill specific manager
await pmon.killManager('MyProject', 1, (msg) => console.log(msg));

// Remove specific manager
await pmon.removeManager('MyProject', 1, (msg) => console.log(msg));
```

## CtrlComponent Specific Methods

### `startWithScript(scriptName: string, additionalArgs: string[] = []): Promise<number>`

Starts the Control Manager with a specific CTL script.

```typescript
const ctrl = new CtrlComponent();
ctrl.setOaVersion('3.21');
ctrl.setProject('MyProject');

const exitCode = await ctrl.startWithScript('myScript.ctl', ['-num', '1']);
console.log('Script completed with code:', exitCode);
```

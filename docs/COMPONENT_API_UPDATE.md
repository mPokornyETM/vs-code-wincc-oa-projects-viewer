# WinCC OA Component Class API Updates

## New Methods in `WinCCOAComponent` Base Class

### `getName(): string`

Returns the executable name without the `.exe` extension.

```typescript
const component = createComponent(WinCCOAComponentType.EVENT, executablePath);
console.log(component.getName()); // "WCCILevent"
```

### `getDescription(): string`

Returns a short description of the component.

```typescript
const component = createComponent(WinCCOAComponentType.EVENT, executablePath);
console.log(component.getDescription()); // "Event Manager"
```

### `static getPath(componentType, version?): string | null`

Static method to find the full path to a component executable. This replaces the standalone `getComponentPath()` function.

```typescript
// Find PMON component for a specific version
const pmonPath = WinCCOAComponent.getPath(WinCCOAComponentType.PMON, '3.20');

// Find CTRL component (searches all versions, highest first)
const ctrlPath = WinCCOAComponent.getPath(WinCCOAComponentType.CTRL);

if (ctrlPath) {
    const ctrl = createComponent(WinCCOAComponentType.CTRL, ctrlPath);
    console.log(ctrl.getName());        // "WCCOActrl"
    console.log(ctrl.getDescription()); // "Control Manager"
}
```

## Complete Example

```typescript
import { WinCCOAComponent, WinCCOAComponentType, createComponent } from './types';

// Find component path
const eventPath = WinCCOAComponent.getPath(WinCCOAComponentType.EVENT, '3.20');

if (eventPath) {
    // Create component instance
    const event = createComponent(WinCCOAComponentType.EVENT, eventPath);
    
    // Get component info
    console.log('Name:', event.getName());              // "WCCILevent"
    console.log('Description:', event.getDescription()); // "Event Manager"
    console.log('Path:', event.getExecutablePath());     // Full path to executable
    console.log('Type:', event.getComponentType());      // WinCCOAComponentType.EVENT
    
    // Configure component
    event.setProject('MyProject');
    
    // Get version
    const version = await event.getVersion();
    console.log('Version:', version);
    
    // Start component
    const exitCode = await event.start(['-num', '1']);
    console.log('Exit code:', exitCode);
    console.log('Output:', event.getStdOut());
}
```

## Migration Guide

### Old API (deprecated)

```typescript
import { getComponentPath, WinCCOAComponentType } from './utils/winccoa-paths';

const pmonPath = getComponentPath(WinCCOAComponentType.PMON, '3.20');
```

### New API (recommended)

```typescript
import { WinCCOAComponent, WinCCOAComponentType } from './types';

const pmonPath = WinCCOAComponent.getPath(WinCCOAComponentType.PMON, '3.20');
```

## Component Descriptions Map

All component types now have descriptions:

| Component Type | Executable Name | Description |
|----------------|-----------------|-------------|
| PMON | WCCILpmon | Process Monitor |
| EVENT | WCCILevent | Event Manager |
| DATA | WCCILdata | Database Manager |
| UI | WCCOAui | User Interface |
| CTRL | WCCOActrl | Control Manager |
| DIST | WCCILdist | Distribution Manager |
| REDU | WCCILredu | Redundancy Manager |
| ASCIIMANAGER | WCCOAascii | ASCII Manager |
| SPLIT | WCCILsplit | Split Mode Manager |
| RDB | WCCOArdb | RDB Archive Manager |
| VALUEARCMANAGER | WCCOAvalarch | Archive Manager |
| REPORTMANAGER | WCCOAreporting | Reporting Manager |
| VIDEODRIVER | WCCOAvideoOA | Video Manager |
| HTTP | webclient_http.ctl | Web Server |
| JAVASCRIPT | node | JavaScript Manager |
| SIM | WCCILsim | Simulation Driver |
| OPCUA | WCCOAopcua | OPC UA Client |
| OPC / OPCDA | WCCOAopc | OPC DA Client |
| S7 | WCCOAs7 | S7 Driver |
| MODBUS | WCCOAmod | Modbus Driver |
| IEC60870 | WCCOAiec | IEC 60870 101/104 Driver |
| IEC61850 | WCCOAiec61850 | IEC 61850/61400 Client |
| DNP3 | WCCOAdnp3 | DNP3 Driver |
| ... | ... | ... |

(See `COMPONENT_DESCRIPTION_MAP` for complete list)

## Benefits

1. **Cleaner API** - Static method on the class is more intuitive than standalone function
2. **Better Encapsulation** - Component information methods are part of the component object
3. **Type Safety** - All methods are properly typed and documented
4. **Discoverability** - IntelliSense shows all available methods on the component instance
5. **Consistency** - All component-related functionality is in the `WinCCOAComponent` class

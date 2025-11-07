# Component Management System Refactoring

## Summary

This refactoring introduces a comprehensive object-oriented component management system for WinCC OA, replacing the previous enum-only approach with a class hierarchy that provides better abstraction and extensibility.

## Changes Made

### 1. Renamed `WinCCOAComponent` → `WinCCOAComponentType`

The enum has been renamed to `WinCCOAComponentType` to make way for the new `WinCCOAComponent` base class.

**Before:**
```typescript
enum WinCCOAComponent {
    EVENT = 'EVENT_COMPONENT',
    DATA = 'DATA_COMPONENT',
    // ...
}
```

**After:**
```typescript
enum WinCCOAComponentType {
    EVENT = 'EVENT_COMPONENT',
    DATA = 'DATA_COMPONENT',
    // ...
}
```

### 2. Created `WinCCOAComponent` Base Class

A new abstract base class provides common functionality for all WinCC OA components:

**Key Features:**
- Project and config path management
- Process execution (synchronous and detached)
- stdout/stderr capture
- Help and version information retrieval
- Common argument building

**Methods:**
- `getHelp()` - Get component help information
- `getVersion()` - Get component version
- `start(args)` - Start component synchronously
- `startDetached(args)` - Start component in background
- `getStdOut()` / `getStdErr()` - Get process output
- `getProject()` / `setProject(name)` - Manage project context
- `getConfig()` / `setConfig(path)` - Manage config path

### 3. Component-Specific Derived Classes

Created 36 component-specific classes deriving from `WinCCOAComponent`:

**Core Components:**
- `EventComponent` - Event Manager
- `DataComponent` - Database Manager
- `UIComponent` - User Interface (with `startWithPanel()`)
- `CtrlComponent` - Control Manager (with `startWithScript()`)
- `PmonComponent` - Process Monitor

**Manager Components:**
- `ApiComponent`, `DistComponent`, `DriverComponent`
- `AsciiManagerComponent`, `DbManagerComponent`
- `ReportManagerComponent`, `ValueArchManagerComponent`
- `AlertManagerComponent`, `HttpComponent`
- `S7TopSapComponent`, `SplitComponent`, `ReduComponent`
- `RdbComponent`, `VideoDriverComponent`

**Additional Components:**
- `SimComponent`, `VisionComponent`, `ConfComponent`
- `AndroidComponent`, `IosComponent`, `WebUIComponent`
- `JavaScriptComponent`, `JavaComponent`

**Protocol Drivers:**
- `OpcComponent`, `OpcDaComponent`, `OpcUaComponent`
- `S7Component`, `ModbusComponent`
- `IEC60870Component`, `IEC61850Component`, `DNP3Component`

### 4. Factory Function

A `createComponent()` factory function instantiates the correct component class:

```typescript
const component = createComponent(WinCCOAComponentType.CTRL, executablePath);
```

### 5. Verified Component Executable Names

Updated `COMPONENT_EXECUTABLE_MAP` with verified executable names from the official WinCC OA component list:

| Component Type | Executable Name | Description |
|----------------|-----------------|-------------|
| PMON | WCCILpmon | Process Monitor |
| EVENT | WCCILevent | Event Manager |
| DATA | WCCILdata | Database Manager |
| VALUEARCMANAGER | WCCOAvalarch | Archive Manager |
| CTRL | WCCOActrl | Control Manager |
| REDU | WCCILredu | Redundancy Manager |
| ASCIIMANAGER | WCCOAascii | ASCII Manager |
| DIST | WCCILdist | Distribution Manager |
| UI | WCCOAui | User Interface |
| OPC | WCCOAopc | OPC DA Client |
| SIM | WCCILsim | Simulation Driver |
| SPLIT | WCCILsplit | Split Mode Manager |
| RDB | WCCOArdb | RDB Archive Manager |
| VIDEODRIVER | WCCOAvideoOA | Video Manager |
| REPORTMANAGER | WCCOAreporting | Reporting Manager |
| OPCUA | WCCOAopcua | OPC UA Client |
| S7 | WCCOAs7 | S7 Driver |
| MODBUS | WCCOAmod | Modbus Driver |
| IEC60870 | WCCOAiec | IEC 60870 101/104 Driver |
| IEC61850 | WCCOAiec61850 | IEC 61850/61400 Client |
| DNP3 | WCCOAdnp3 | DNP3 Driver |
| HTTP | webclient_http.ctl | Web Server |
| JAVASCRIPT | node | JavaScript Manager |

## Files Created

1. **`src/types/components/ComponentImplementations.ts`**
   - Base implementation class with common behavior
   - 36 derived component classes
   - Factory function

2. **`docs/COMPONENT_MANAGEMENT.md`**
   - Usage documentation with examples
   - API reference
   - Best practices

3. **`docs/REFACTORING_SUMMARY.md`** (this file)
   - Summary of changes
   - Migration guide

## Files Modified

1. **`src/types/components/WinCCOAComponent.ts`**
   - Renamed enum to `WinCCOAComponentType`
   - Added `WinCCOAComponent` abstract base class
   - Updated and verified `COMPONENT_EXECUTABLE_MAP`

2. **`src/utils/winccoa-paths.ts`**
   - Updated imports to use `WinCCOAComponentType`
   - Updated `getComponentPath()` signature

3. **`src/utils/index.ts`**
   - Updated imports to use `WinCCOAComponentType`
   - Updated deprecation notice

4. **`src/types/index.ts`**
   - Exports `ComponentImplementations` module

5. **`src/test/component-management.test.ts`**
   - Updated all references to `WinCCOAComponentType`
   - Updated tests to match verified executable names

## Benefits

### 1. Better Abstraction
- Components are now objects with behavior, not just enums
- Encapsulates component-specific logic

### 2. Type Safety
- TypeScript ensures correct method calls
- Factory pattern prevents invalid component creation

### 3. Extensibility
- Easy to add component-specific methods
- Can override base behavior when needed

### 4. Consistent API
- All components share common interface
- Specialized methods for specific components (e.g., `UIComponent.startWithPanel()`)

### 5. Process Management
- Built-in stdout/stderr capture
- Synchronous and asynchronous execution
- Project/config context management

## Migration Guide

### Before (Enum Only)

```typescript
import { WinCCOAComponent, getComponentPath } from './types';

const pmonPath = getComponentPath(WinCCOAComponent.PMON, '3.20');
// Manual process spawning and management
```

### After (Object-Oriented)

```typescript
import { WinCCOAComponentType, getComponentPath, createComponent } from './types';

// Get path
const pmonPath = getComponentPath(WinCCOAComponentType.PMON, '3.20');

// Create instance
const pmon = createComponent(WinCCOAComponentType.PMON, pmonPath);
pmon.setProject('MyProject');

// Use it
const version = await pmon.getVersion();
const exitCode = await pmon.start(['-num', '1']);
console.log(pmon.getStdOut());
```

### Component-Specific Usage

```typescript
import { UIComponent, CtrlComponent } from './types';

// UI Component
if (ui instanceof UIComponent) {
    await ui.startWithPanel('panels/main.pnl');
}

// CTRL Component
if (ctrl instanceof CtrlComponent) {
    await ctrl.startWithScript('scripts/init.ctl', ['-arg1', 'value']);
}
```

## Backward Compatibility

- The `WinCCOAComponentType` enum maintains all original values
- `getComponentPath()` still works with both enum and string
- `getWCCILpmonPath()` is deprecated but still functional
- All existing code using the enum continues to work

## Testing

- **24 unit tests** verify component system functionality
- Tests are CI/CD friendly (gracefully handle missing WinCC OA)
- Tests cover:
  - Enum values
  - Component name mapping
  - Path resolution
  - Platform-specific behavior
  - Integration scenarios

## Future Enhancements

### Potential Additions

1. **Component Status Monitoring**
   ```typescript
   await component.isRunning();
   await component.stop();
   await component.restart();
   ```

2. **Configuration Management**
   ```typescript
   component.setConfigOption('option', 'value');
   component.loadConfig('path/to/config.ini');
   ```

3. **Event Handling**
   ```typescript
   component.on('output', (data) => console.log(data));
   component.on('error', (error) => console.error(error));
   ```

4. **Component-Specific Features**
   - `DataComponent.queryDp(dpName)`
   - `EventComponent.subscribeAlert(alertName)`
   - `UIComponent.openPanel(panel, params)`

## Notes

- Component executable names verified against official WinCC OA documentation
- Some components (HTTP, JAVASCRIPT) use script files (.ctl) instead of executables
- Platform-specific handling (Windows .exe vs Unix) is automatic
- Registry-based path detection on Windows, `/opt/WinCC_OA` on Unix/Linux

## Conclusion

This refactoring provides a solid foundation for component management in the WinCC OA extension. The object-oriented approach offers better maintainability, extensibility, and a more intuitive API for working with WinCC OA components.

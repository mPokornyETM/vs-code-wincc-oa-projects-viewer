# WinCC OA Component Implementations

This directory contains the implementation classes for all WinCC OA components.

## Structure

```
implementations/
├── BaseComponentImpl.ts          # Abstract base class with common functionality
├── index.ts                      # Barrel export and factory function
│
├── Core Components/
│   ├── EventComponent.ts         # Event Manager
│   ├── DataComponent.ts          # Database Manager
│   ├── UIComponent.ts            # User Interface
│   ├── CtrlComponent.ts          # Control Manager
│   └── PmonComponent.ts          # Process Monitor
│
├── Manager Components/
│   ├── ApiComponent.ts
│   ├── DistComponent.ts          # Distribution Manager
│   ├── DriverComponent.ts
│   ├── AsciiManagerComponent.ts  # ASCII Manager
│   ├── DbManagerComponent.ts     # Database Manager
│   ├── ReportManagerComponent.ts # Reporting Manager
│   ├── ValueArchManagerComponent.ts # Archive Manager
│   ├── AlertManagerComponent.ts
│   ├── HttpComponent.ts          # Web Server
│   ├── S7TopSapComponent.ts
│   ├── SplitComponent.ts         # Split Mode Manager
│   ├── ReduComponent.ts          # Redundancy Manager
│   ├── RdbComponent.ts           # RDB Archive Manager
│   └── VideoDriverComponent.ts   # Video Manager
│
├── Additional Components/
│   ├── SimComponent.ts           # Simulation Driver
│   ├── VisionComponent.ts
│   ├── ConfComponent.ts
│   ├── AndroidComponent.ts
│   ├── IosComponent.ts
│   ├── WebUIComponent.ts
│   ├── JavaScriptComponent.ts    # JavaScript Manager
│   └── JavaComponent.ts
│
└── Protocol Drivers/
    ├── OpcComponent.ts           # OPC DA Client
    ├── OpcDaComponent.ts         # OPC DA Client
    ├── OpcUaComponent.ts         # OPC UA Client
    ├── S7Component.ts            # S7 Driver
    ├── ModbusComponent.ts        # Modbus Driver
    ├── IEC60870Component.ts      # IEC 60870 101/104 Driver
    ├── IEC61850Component.ts      # IEC 61850/61400 Client
    └── DNP3Component.ts          # DNP3 Driver
```

## Usage

Import from the main `ComponentImplementations.ts` file or directly from implementations:

```typescript
// Import from parent (recommended)
import { EventComponent, createComponent } from '../ComponentImplementations';

// Or import from implementations directly
import { EventComponent } from './implementations/EventComponent';
```

## Adding Component-Specific Methods

Each component file can be extended with specific functionality:

```typescript
// EventComponent.ts
export class EventComponent extends BaseComponentImpl {
    constructor(executablePath: string) {
        super(WinCCOAComponentType.EVENT, executablePath);
    }

    // Add EVENT-specific methods
    public async subscribeAlert(alertName: string): Promise<void> {
        // Implementation here
    }
}
```

## File Naming Convention

- Component class names follow PascalCase: `EventComponent`, `DataComponent`
- File names match class names: `EventComponent.ts`, `DataComponent.ts`
- One component class per file
- Base implementation in `BaseComponentImpl.ts`
- Barrel export in `index.ts`

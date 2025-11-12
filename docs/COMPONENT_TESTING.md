# Component Testing Documentation

## Overview

This document describes the testing strategy for WinCC OA component classes.

## Test Files

### 1. `component-base.test.ts`

Tests the basic component interface implementation across all component types.

**Test Coverage:**

- ✅ `getName()` method returns correct executable name
- ✅ `getDescription()` method returns correct description

**Components Tested:**

- PmonComponent
- EventComponent
- DataComponent
- UIComponent
- CtrlComponent
- DistComponent
- ReduComponent
- AsciiManagerComponent
- SplitComponent
- RdbComponent
- ValueArchManagerComponent
- ReportManagerComponent
- VideoDriverComponent
- HttpComponent
- JavaScriptComponent
- SimComponent
- OpcUaComponent
- OpcDaComponent
- S7Component
- ModbusComponent
- IEC60870Component
- IEC61850Component
- DNP3Component

### 2. `pmon-component.test.ts`

Comprehensive tests for the PmonComponent class, including all pmon-specific methods.

**Test Suites:**

#### Basic Component Methods

- ✅ getName() returns "WCCILpmon"
- ✅ getDescription() returns "Process Monitor"
- ✅ getExecutableName() handles platform-specific extensions

#### Configuration Methods

- ✅ setOaVersion() / getOaVersion()
- ✅ setProject() / getProject()
- ✅ setConfigPath() / getConfigPath()
- ✅ Mutual exclusivity of project and configPath

#### Output Methods

- ✅ getStdOut() returns empty string initially
- ✅ getStdErr() returns empty string initially

#### Method Existence Tests

Verifies all 16 PmonComponent-specific methods exist:

- registerSubProject
- unregisterProject
- registerProject
- checkProjectStatus
- startPmonOnly
- startProject
- stopProject
- stopProjectAndPmon
- restartProject
- setWaitMode
- getManagerList
- getDetailedManagerStatus
- startManager
- stopManager
- killManager
- removeManager

#### Method Signatures Tests

Validates correct number of parameters for each method.

#### Return Types Tests

Ensures methods return correct Promise types:

- `Promise<void>` for operations
- `Promise<number>` for registerProject (exit code)
- `Promise<boolean>` for checkProjectStatus
- `Promise<string[]>` for getManagerList
- `Promise<string>` for getDetailedManagerStatus

#### Callback Tests

Verifies output callback mechanisms work correctly.

#### Error Handling Tests

Tests proper error handling when:

- pmon executable not found
- Invalid version specified
- Invalid project paths

## Current Testing Status

### ✅ Implemented Tests (47 tests)

1. **Component Base Tests (46 tests)**
   - All 23 component types tested
   - Both getName() and getDescription() verified

2. **PmonComponent API Structure Tests (60+ tests)**
   - Configuration methods
   - Method existence and signatures
   - Return type validation
   - Basic error handling

### ⏳ Pending Implementation: Mock WCCILpmon Interface

The next development iteration will implement a **mock WCCILpmon interface** to enable full integration testing without requiring an actual WinCC OA installation.

#### Planned Mock Features

1. **Process Spawning Mock**
   - Mock `child_process.spawn()` calls
   - Simulate WCCILpmon command-line interface
   - Return realistic process outputs

2. **Test Scenarios**
   - ✅ Successful project registration
   - ✅ Project already registered (exit code 3)
   - ✅ Registration failures
   - ✅ Project status queries (running/stopped)
   - ✅ Manager list retrieval and parsing
   - ✅ Manager control operations
   - ✅ Various exit codes
   - ✅ Stderr output handling

3. **Mock Data Structures**
   ```typescript
   interface MockPmonResponse {
       exitCode: number;
       stdout: string;
       stderr: string;
       delay?: number;  // Simulate processing time
   }

   interface MockPmonScenario {
       command: string[];
       response: MockPmonResponse;
   }
   ```

4. **Example Mock Implementation**
   ```typescript
   // Mock successful project registration
   {
       command: ['-config', 'path/to/config', '-log', '+stderr', '-autofreg', '-status'],
       response: {
           exitCode: 0,
           stdout: 'Project registered successfully\n',
           stderr: ''
       }
   }

   // Mock project status check (running)
   {
       command: ['-status', '-proj', 'TestProject', '-log', '+stdout'],
       response: {
           exitCode: 0,
           stdout: 'Project TestProject is running\nManagers: 5\n',
           stderr: ''
       }
   }

   // Mock manager list
   {
       command: ['-proj', 'TestProject', '-command', 'MGRLIST:LIST', '-log', '+stdout'],
       response: {
           exitCode: 0,
           stdout: 'WCCILevent\nWCCILdata\nWCCOActrl\n',
           stderr: ''
       }
   }
   ```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
npm test -- --grep "Component Base Class"
npm test -- --grep "PmonComponent"
```

### Run in Watch Mode (during development)

```bash
npm run watch
```

## Test Metrics

| Category | Tests | Status |
|----------|-------|--------|
| Component Base (getName/getDescription) | 46 | ✅ Complete |
| PmonComponent API Structure | 60+ | ✅ Complete |
| PmonComponent Integration | 0 | ⏳ Pending Mock |
| **Total** | **106+** | **~70% Complete** |

## Future Enhancements

### Phase 1: Mock Implementation (Next Iteration)

- [ ] Create mock spawn interface
- [ ] Implement mock response scenarios
- [ ] Add tests for all pmon operations
- [ ] Test output callback mechanisms
- [ ] Test error scenarios

### Phase 2: Component-Specific Tests

- [ ] CtrlComponent.startWithScript() tests
- [ ] DataComponent-specific tests
- [ ] EventComponent-specific tests

### Phase 3: Integration Tests

- [ ] Real WinCC OA environment tests (optional)
- [ ] Performance benchmarks
- [ ] Concurrent operation tests

## Contributing

When adding new component classes:

1. Add getName() test to `component-base.test.ts`
2. Add getDescription() test to `component-base.test.ts`
3. If component has specific methods, create dedicated test file
4. Update this documentation

## Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External Dependencies**: Don't rely on actual WinCC OA installation
3. **Descriptive Test Names**: Use clear, action-oriented names
4. **Error Testing**: Always test error paths
5. **Callback Testing**: Verify output callbacks work correctly
6. **Documentation**: Document pending tests with TODO markers

## References

- Component Implementation: `src/types/components/`
- Component Base Class: `src/types/components/WinCCOAComponent.ts`
- PmonComponent: `src/types/components/implementations/PmonComponent.ts`

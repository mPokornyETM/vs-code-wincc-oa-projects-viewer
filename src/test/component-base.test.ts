/**
 * Component Base Class Tests
 * Tests for getName() and getDescription() methods across all component types
 */

import * as assert from 'assert';
import {
    PmonComponent,
    EventComponent,
    DataComponent,
    UIComponent,
    CtrlComponent,
    DistComponent,
    ReduComponent,
    AsciiManagerComponent,
    SplitComponent,
    RdbComponent,
    ValueArchManagerComponent,
    ReportManagerComponent,
    VideoDriverComponent,
    HttpComponent,
    JavaScriptComponent,
    SimComponent,
    OpcUaComponent,
    OpcDaComponent,
    S7Component,
    ModbusComponent,
    IEC60870Component,
    IEC61850Component,
    DNP3Component
} from '../types/components/implementations';

suite('Component Base Class Tests', () => {
    suite('PmonComponent', () => {
        test('getName() should return "WCCILpmon"', () => {
            const component = new PmonComponent();
            assert.strictEqual(component.getName(), 'WCCILpmon');
        });

        test('getDescription() should return "Process Monitor"', () => {
            const component = new PmonComponent();
            assert.strictEqual(component.getDescription(), 'Process Monitor');
        });
    });

    suite('EventComponent', () => {
        test('getName() should return "WCCILevent"', () => {
            const component = new EventComponent();
            assert.strictEqual(component.getName(), 'WCCILevent');
        });

        test('getDescription() should return "Event Manager"', () => {
            const component = new EventComponent();
            assert.strictEqual(component.getDescription(), 'Event Manager');
        });
    });

    suite('DataComponent', () => {
        test('getName() should return "WCCILdata"', () => {
            const component = new DataComponent();
            assert.strictEqual(component.getName(), 'WCCILdata');
        });

        test('getDescription() should return "Database Manager"', () => {
            const component = new DataComponent();
            assert.strictEqual(component.getDescription(), 'Database Manager');
        });
    });

    suite('UIComponent', () => {
        test('getName() should return "WCCOAui"', () => {
            const component = new UIComponent();
            assert.strictEqual(component.getName(), 'WCCOAui');
        });

        test('getDescription() should return "User Interface"', () => {
            const component = new UIComponent();
            assert.strictEqual(component.getDescription(), 'User Interface');
        });
    });

    suite('CtrlComponent', () => {
        test('getName() should return "WCCOActrl"', () => {
            const component = new CtrlComponent();
            assert.strictEqual(component.getName(), 'WCCOActrl');
        });

        test('getDescription() should return "Control Manager"', () => {
            const component = new CtrlComponent();
            assert.strictEqual(component.getDescription(), 'Control Manager');
        });
    });

    suite('DistComponent', () => {
        test('getName() should return "WCCILdist"', () => {
            const component = new DistComponent();
            assert.strictEqual(component.getName(), 'WCCILdist');
        });

        test('getDescription() should return "Distribution Manager"', () => {
            const component = new DistComponent();
            assert.strictEqual(component.getDescription(), 'Distribution Manager');
        });
    });

    suite('ReduComponent', () => {
        test('getName() should return "WCCILredu"', () => {
            const component = new ReduComponent();
            assert.strictEqual(component.getName(), 'WCCILredu');
        });

        test('getDescription() should return "Redundancy Manager"', () => {
            const component = new ReduComponent();
            assert.strictEqual(component.getDescription(), 'Redundancy Manager');
        });
    });

    suite('AsciiManagerComponent', () => {
        test('getName() should return "WCCOAascii"', () => {
            const component = new AsciiManagerComponent();
            assert.strictEqual(component.getName(), 'WCCOAascii');
        });

        test('getDescription() should return "ASCII Manager"', () => {
            const component = new AsciiManagerComponent();
            assert.strictEqual(component.getDescription(), 'ASCII Manager');
        });
    });

    suite('SplitComponent', () => {
        test('getName() should return "WCCILsplit"', () => {
            const component = new SplitComponent();
            assert.strictEqual(component.getName(), 'WCCILsplit');
        });

        test('getDescription() should return "Split Mode Manager"', () => {
            const component = new SplitComponent();
            assert.strictEqual(component.getDescription(), 'Split Mode Manager');
        });
    });

    suite('RdbComponent', () => {
        test('getName() should return "WCCOArdb"', () => {
            const component = new RdbComponent();
            assert.strictEqual(component.getName(), 'WCCOArdb');
        });

        test('getDescription() should return "RDB Archive Manager"', () => {
            const component = new RdbComponent();
            assert.strictEqual(component.getDescription(), 'RDB Archive Manager');
        });
    });

    suite('ValueArchManagerComponent', () => {
        test('getName() should return "WCCOAvalarch"', () => {
            const component = new ValueArchManagerComponent();
            assert.strictEqual(component.getName(), 'WCCOAvalarch');
        });

        test('getDescription() should return "Value Archive Manager"', () => {
            const component = new ValueArchManagerComponent();
            assert.strictEqual(component.getDescription(), 'Value Archive Manager');
        });
    });

    suite('ReportManagerComponent', () => {
        test('getName() should return "WCCOAreporting"', () => {
            const component = new ReportManagerComponent();
            assert.strictEqual(component.getName(), 'WCCOAreporting');
        });

        test('getDescription() should return "Reporting Manager"', () => {
            const component = new ReportManagerComponent();
            assert.strictEqual(component.getDescription(), 'Reporting Manager');
        });
    });

    suite('VideoDriverComponent', () => {
        test('getName() should return "WCCOAvideoOA"', () => {
            const component = new VideoDriverComponent();
            assert.strictEqual(component.getName(), 'WCCOAvideoOA');
        });

        test('getDescription() should return "Video Manager"', () => {
            const component = new VideoDriverComponent();
            assert.strictEqual(component.getDescription(), 'Video Manager');
        });
    });

    suite('HttpComponent', () => {
        test('getName() should return "webclient_http.ctl"', () => {
            const component = new HttpComponent();
            assert.strictEqual(component.getName(), 'webclient_http.ctl');
        });

        test('getDescription() should return "Web Server"', () => {
            const component = new HttpComponent();
            assert.strictEqual(component.getDescription(), 'Web Server');
        });
    });

    suite('JavaScriptComponent', () => {
        test('getName() should return "node"', () => {
            const component = new JavaScriptComponent();
            assert.strictEqual(component.getName(), 'node');
        });

        test('getDescription() should return "JavaScript Manager"', () => {
            const component = new JavaScriptComponent();
            assert.strictEqual(component.getDescription(), 'JavaScript Manager');
        });
    });

    suite('SimComponent', () => {
        test('getName() should return "WCCILsim"', () => {
            const component = new SimComponent();
            assert.strictEqual(component.getName(), 'WCCILsim');
        });

        test('getDescription() should return "Simulation Driver"', () => {
            const component = new SimComponent();
            assert.strictEqual(component.getDescription(), 'Simulation Driver');
        });
    });

    suite('OpcUaComponent', () => {
        test('getName() should return "WCCOAopcua"', () => {
            const component = new OpcUaComponent();
            assert.strictEqual(component.getName(), 'WCCOAopcua');
        });

        test('getDescription() should return "OPC UA Client"', () => {
            const component = new OpcUaComponent();
            assert.strictEqual(component.getDescription(), 'OPC UA Client');
        });
    });

    suite('OpcDaComponent', () => {
        test('getName() should return "WCCOAopc"', () => {
            const component = new OpcDaComponent();
            assert.strictEqual(component.getName(), 'WCCOAopc');
        });

        test('getDescription() should return "OPC DA Client"', () => {
            const component = new OpcDaComponent();
            assert.strictEqual(component.getDescription(), 'OPC DA Client');
        });
    });

    suite('S7Component', () => {
        test('getName() should return "WCCOAs7"', () => {
            const component = new S7Component();
            assert.strictEqual(component.getName(), 'WCCOAs7');
        });

        test('getDescription() should return "S7 Driver"', () => {
            const component = new S7Component();
            assert.strictEqual(component.getDescription(), 'S7 Driver');
        });
    });

    suite('ModbusComponent', () => {
        test('getName() should return "WCCOAmod"', () => {
            const component = new ModbusComponent();
            assert.strictEqual(component.getName(), 'WCCOAmod');
        });

        test('getDescription() should return "Modbus Driver"', () => {
            const component = new ModbusComponent();
            assert.strictEqual(component.getDescription(), 'Modbus Driver');
        });
    });

    suite('IEC60870Component', () => {
        test('getName() should return "WCCOAiec"', () => {
            const component = new IEC60870Component();
            assert.strictEqual(component.getName(), 'WCCOAiec');
        });

        test('getDescription() should return "IEC 60870 101/104 Driver"', () => {
            const component = new IEC60870Component();
            assert.strictEqual(component.getDescription(), 'IEC 60870 101/104 Driver');
        });
    });

    suite('IEC61850Component', () => {
        test('getName() should return "WCCOAiec61850"', () => {
            const component = new IEC61850Component();
            assert.strictEqual(component.getName(), 'WCCOAiec61850');
        });

        test('getDescription() should return "IEC 61850 Client"', () => {
            const component = new IEC61850Component();
            assert.strictEqual(component.getDescription(), 'IEC 61850 Client');
        });
    });

    suite('DNP3Component', () => {
        test('getName() should return "WCCOAdnp3"', () => {
            const component = new DNP3Component();
            assert.strictEqual(component.getName(), 'WCCOAdnp3');
        });

        test('getDescription() should return "DNP3 Driver"', () => {
            const component = new DNP3Component();
            assert.strictEqual(component.getDescription(), 'DNP3 Driver');
        });
    });
});

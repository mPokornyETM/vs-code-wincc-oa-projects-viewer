# WinCC OA Ecosystem - Technical Specifications

> **Detailed technical specifications for all components in the WinCC OA development ecosystem**

---

## Table of Contents

1. [VS Code Extension](#1-vs-code-extension)
2. [WinCC OA API Server](#2-wincc-oa-api-server)
3. [Model Context Protocol Server](#3-model-context-protocol-server)
4. [Docker Images](#4-docker-images)
5. [CI/CD Integrations](#5-cicd-integrations)
6. [Cloud Integrations](#6-cloud-integrations)

---

## 1. VS Code Extension

**Repository**: `vs-code-wincc-oa-projects-viewer`  
**Language**: TypeScript  
**Target**: VS Code 1.105.0+

### 1.1 Architecture

```
src/
├── extension.ts              # Extension entry point
├── types/
│   ├── components/           # WinCC OA component abstractions
│   │   ├── BaseComponent.ts
│   │   ├── PmonComponent.ts
│   │   └── ManagerComponent.ts
│   └── interfaces/           # Type definitions
├── providers/
│   ├── ProjectTreeProvider.ts   # Tree view data provider
│   ├── ManagerStatusProvider.ts # Manager status provider
│   └── LogViewProvider.ts       # Log viewer provider
├── services/
│   ├── ProjectService.ts        # Project operations
│   ├── ApiClient.ts             # API server communication
│   ├── ConfigService.ts         # Configuration management
│   └── TestService.ts           # Test execution
├── ui/
│   ├── webviews/                # Webview panels
│   │   ├── dashboard/
│   │   ├── logs/
│   │   └── config-editor/
│   └── components/              # UI components
└── utils/
    ├── winccoa-paths.ts         # Path resolution
    ├── registry.ts              # Windows registry
    └── formatter.ts             # Code formatting
```

### 1.2 Core Components

#### 1.2.1 Project Tree Provider

**Responsibility**: Display and organize WinCC OA projects in tree view

**Implementation**:

```typescript
interface ProjectTreeItem {
  label: string;
  resourceUri: vscode.Uri;
  collapsibleState: vscode.TreeItemCollapsibleState;
  contextValue: string; // For context menu commands
  iconPath: vscode.ThemeIcon | string;
  tooltip: string | vscode.MarkdownString;
  command?: vscode.Command;
  children?: ProjectTreeItem[];
}

class ProjectTreeProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<ProjectTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  refresh(): void;
  getTreeItem(element: ProjectTreeItem): vscode.TreeItem;
  getChildren(element?: ProjectTreeItem): Thenable<ProjectTreeItem[]>;
  getParent(element: ProjectTreeItem): ProjectTreeItem | undefined;
}
```

**Categories**:

- Current Projects (actively registered)
- Runnable Projects (can be started)
- System Projects (WinCC OA delivered)
- Version Projects (by WinCC OA version)
- Unregistered Projects

#### 1.2.2 Manager Status View

**Responsibility**: Display live manager status and health metrics

**Data Model**:

```typescript
interface ManagerStatus {
  id: number;
  name: string;
  type: string;
  state: 'running' | 'stopped' | 'starting' | 'stopping' | 'crashed';
  pid?: number;
  restartCount: number;
  uptime: number; // milliseconds
  cpuUsage?: number; // percentage
  memoryUsage?: number; // MB
  healthScore: number; // 0-100
  healthGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  lastError?: string;
}

interface ProjectHealth {
  projectName: string;
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  managers: ManagerStatus[];
  issues: HealthIssue[];
}

interface HealthIssue {
  severity: 'critical' | 'warning' | 'info';
  message: string;
  managerId?: number;
}
```

**Health Scoring Algorithm**:

```typescript
function calculateHealthScore(manager: ManagerStatus): number {
  let score = 100;

  // Deduct for restarts
  score -= Math.min(manager.restartCount * 10, 50);

  // Deduct for crashes
  if (manager.state === 'crashed') score -= 50;

  // Deduct for high resource usage
  if (manager.cpuUsage && manager.cpuUsage > 80) score -= 20;
  if (manager.memoryUsage && manager.memoryUsage > 1000) score -= 10;

  // Ensure minimum 0
  return Math.max(score, 0);
}
```

#### 1.2.3 Log Viewer

**Responsibility**: Display and filter WinCC OA logs in real-time

**Features**:

- Tail logs (live updates)
- Filter by log level (ERROR, WARNING, INFO, DEBUG)
- Search with regex
- Time range filtering
- Manager-specific filtering
- Syntax highlighting
- Export filtered logs

**Implementation**:

```typescript
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  manager: string;
  message: string;
  file?: string;
  line?: number;
}

enum LogLevel {
  ERROR = 1,
  WARNING = 2,
  INFO = 3,
  DEBUG = 4,
}

class LogViewProvider implements vscode.WebviewViewProvider {
  private logs: LogEntry[] = [];
  private filters: LogFilter;
  private watcher: fs.FSWatcher;

  async tailLog(logPath: string): Promise<void>;
  applyFilters(logs: LogEntry[]): LogEntry[];
  exportLogs(format: 'txt' | 'csv' | 'json'): void;
}
```

#### 1.2.4 Config File Editor

**Responsibility**: Edit WinCC OA config files with validation and IntelliSense

**Supported Files**:

- `config` - Main configuration
- `config.level` - Logging configuration
- `progs` - Manager definitions
- Manager-specific configs

**Features**:

```typescript
interface ConfigParameter {
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'path';
  description: string;
  required: boolean;
  deprecated?: boolean;
  validation?: (value: string) => boolean;
  suggestions?: string[];
}

class ConfigEditorProvider {
  // Provide IntelliSense
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position
  ): vscode.CompletionItem[];

  // Validate config
  validateConfig(document: vscode.TextDocument): vscode.Diagnostic[];

  // Hover documentation
  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover;
}
```

**Config Schema**:

```json
{
  "config": {
    "general": [
      {
        "key": "proj",
        "type": "string",
        "description": "Project name",
        "required": true
      },
      {
        "key": "distPeer",
        "type": "string",
        "description": "Distributed system peer",
        "pattern": "^\\d{1,3}$"
      }
    ],
    "paths": [
      {
        "key": "proj_path",
        "type": "path",
        "description": "Project directory path"
      }
    ]
  }
}
```

### 1.3 API Integration

**Communication with API Server**:

```typescript
class ApiClient {
  private baseUrl: string;
  private apiKey: string;
  private rateLimiter: RateLimiter;

  // Project operations
  async registerProject(path: string): Promise<ProjectInfo>;
  async unregisterProject(name: string): Promise<void>;
  async startProject(name: string, startAll: boolean): Promise<void>;
  async stopProject(name: string): Promise<void>;
  async getProjectStatus(name: string): Promise<ProjectStatus>;

  // Manager operations
  async getManagers(projectName: string): Promise<ManagerStatus[]>;
  async startManager(projectName: string, managerId: number): Promise<void>;
  async stopManager(projectName: string, managerId: number): Promise<void>;

  // Test operations
  async runTests(projectName: string, options: TestOptions): Promise<TestResults>;
  async getCoverage(projectName: string): Promise<CoverageReport>;

  // Config operations
  async getConfig(projectName: string): Promise<ConfigData>;
  async updateConfig(projectName: string, config: ConfigData): Promise<void>;
  async validateConfig(config: ConfigData): Promise<ValidationResult>;

  // Log operations
  async getLogs(
    projectName: string,
    filters: LogFilter
  ): Promise<LogEntry[]>;
  async streamLogs(
    projectName: string,
    callback: (entry: LogEntry) => void
  ): WebSocket;
}
```

### 1.4 Configuration

**User Settings** (`settings.json`):

```typescript
interface ExtensionConfig {
  // API Server
  'winccoa.api.url': string; // Default: 'http://localhost:3000'
  'winccoa.api.key': string; // API key for authentication
  'winccoa.api.timeout': number; // Request timeout in ms

  // Project Discovery
  'winccoa.projects.scanPaths': string[]; // Directories to scan
  'winccoa.projects.autoRefresh': boolean; // Auto-refresh projects
  'winccoa.projects.refreshInterval': number; // Refresh interval in seconds

  // Code Formatting
  'winccoa.format.astylePath': string; // Path to astyle.exe
  'winccoa.format.configPath': string; // Path to astyle config
  'winccoa.format.createBackup': boolean; // Create .orig backups

  // Log Viewer
  'winccoa.logs.maxLines': number; // Max lines to display
  'winccoa.logs.refreshInterval': number; // Refresh interval in ms
  'winccoa.logs.defaultLevel': string; // Default log level filter

  // Manager Monitoring
  'winccoa.managers.pollInterval': number; // Status poll interval
  'winccoa.managers.showHealthScore': boolean; // Show health scores

  // Testing
  'winccoa.test.defaultSuite': string; // Default test suite
  'winccoa.test.coverage': boolean; // Collect coverage by default
  'winccoa.test.parallel': boolean; // Run tests in parallel
}
```

### 1.5 Commands

**Command Palette Commands**:

```typescript
const commands = [
  // Project Management
  'winccoa.refreshProjects',
  'winccoa.registerProject',
  'winccoa.unregisterProject',
  'winccoa.startProject',
  'winccoa.stopProject',
  'winccoa.restartProject',

  // Manager Control
  'winccoa.startManager',
  'winccoa.stopManager',
  'winccoa.killManager',
  'winccoa.removeManager',

  // Code Formatting
  'winccoa.formatFile',
  'winccoa.formatFolder',

  // Testing
  'winccoa.runTests',
  'winccoa.runTestsWithCoverage',
  'winccoa.showCoverage',

  // Documentation
  'winccoa.showDocumentation',
  'winccoa.buildDocumentation',

  // Logs
  'winccoa.showLogs',
  'winccoa.exportLogs',

  // Config
  'winccoa.editConfig',
  'winccoa.validateConfig',

  // Git
  'winccoa.generateGitignore',
  'winccoa.generateGitattributes',
];
```

---

## 2. WinCC OA API Server

**Repository**: `winccoa-api-server`  
**Language**: TypeScript (Node.js) or Python (FastAPI)  
**API Style**: REST + WebSocket

### 2.1 Architecture

```
src/
├── server.ts                 # Express/Fastify app
├── routes/
│   ├── projects.ts           # Project endpoints
│   ├── managers.ts           # Manager endpoints
│   ├── tests.ts              # Test endpoints
│   ├── config.ts             # Config endpoints
│   ├── logs.ts               # Log endpoints
│   └── analysis.ts           # Static analysis endpoints
├── services/
│   ├── ProjectService.ts     # Business logic
│   ├── ManagerService.ts
│   ├── TestService.ts
│   ├── ConfigService.ts
│   └── AnalysisService.ts
├── adapters/
│   ├── WinCCOAAdapter.ts     # WinCC OA interaction
│   └── PmonAdapter.ts        # Pmon wrapper
├── middleware/
│   ├── auth.ts               # JWT authentication
│   ├── rateLimit.ts          # Rate limiting
│   ├── cors.ts               # CORS configuration
│   └── error.ts              # Error handling
├── models/
│   ├── Project.ts
│   ├── Manager.ts
│   └── User.ts
└── database/
    ├── schema.sql            # Database schema
    └── migrations/           # Database migrations
```

### 2.2 API Endpoints

#### 2.2.1 Project Operations

**POST /api/v1/projects/register**

Register a new WinCC OA project

```typescript
// Request
interface RegisterProjectRequest {
  path: string; // Absolute path to project
  subProject?: boolean; // Register as sub-project
}

// Response
interface RegisterProjectResponse {
  id: string;
  name: string;
  path: string;
  version: string;
  registered: boolean;
  registeredAt: string;
}

// Implementation
async function registerProject(req, res) {
  const { path, subProject } = req.body;

  // Validate path
  if (!fs.existsSync(path)) {
    return res.status(404).json({ error: 'Project path not found' });
  }

  // Use pmon to register
  const pmon = new PmonAdapter();
  const result = await pmon.register(path, subProject);

  // Store in database
  await db.projects.create({
    name: result.name,
    path,
    version: result.version,
    userId: req.user.id,
  });

  res.json(result);
}
```

**GET /api/v1/projects**

List all projects

```typescript
interface ListProjectsResponse {
  projects: ProjectInfo[];
  total: number;
  page: number;
  pageSize: number;
}

interface ProjectInfo {
  id: string;
  name: string;
  path: string;
  version: string;
  status: 'running' | 'stopped' | 'unknown';
  registered: boolean;
  health?: HealthInfo;
}
```

**GET /api/v1/projects/:id/status**

Get project status

```typescript
interface ProjectStatusResponse {
  projectId: string;
  name: string;
  status: 'running' | 'stopped' | 'starting' | 'stopping';
  pmonRunning: boolean;
  managers: ManagerStatus[];
  uptime?: number;
  health: HealthInfo;
}
```

#### 2.2.2 Manager Operations

**GET /api/v1/projects/:id/managers**

List managers for a project

```typescript
interface ListManagersResponse {
  projectId: string;
  managers: ManagerInfo[];
}

interface ManagerInfo {
  id: number;
  name: string;
  type: string;
  status: 'running' | 'stopped' | 'crashed';
  pid?: number;
  restartCount: number;
  uptime: number;
  cpuUsage?: number;
  memoryUsage?: number;
}
```

**POST /api/v1/projects/:id/managers/:managerId/start**

Start a specific manager

**POST /api/v1/projects/:id/managers/:managerId/stop**

Stop a specific manager

#### 2.2.3 Test Operations

**POST /api/v1/projects/:id/tests/run**

Execute tests

```typescript
interface RunTestsRequest {
  suite?: string; // Test suite name
  tests?: string[]; // Specific test names
  coverage?: boolean; // Collect coverage
  parallel?: boolean; // Run in parallel
  timeout?: number; // Timeout in milliseconds
}

interface RunTestsResponse {
  runId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  results?: TestResults;
}

interface TestResults {
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number; // milliseconds
  tests: TestResult[];
  coverage?: CoverageData;
}
```

**GET /api/v1/projects/:id/tests/results/:runId**

Get test results

**GET /api/v1/projects/:id/tests/coverage**

Get coverage report

#### 2.2.4 Configuration Operations

**GET /api/v1/projects/:id/config**

Get project configuration

```typescript
interface GetConfigResponse {
  projectId: string;
  config: {
    main: ConfigSection; // config file
    level: ConfigSection; // config.level file
    progs: ProgEntry[]; // progs file
    managers: ManagerConfig[]; // Manager-specific configs
  };
}

interface ConfigSection {
  file: string;
  parameters: ConfigParameter[];
}

interface ProgEntry {
  line: number;
  manager: string;
  number: number;
  options: string;
}
```

**PUT /api/v1/projects/:id/config**

Update project configuration

**POST /api/v1/projects/:id/config/validate**

Validate configuration

```typescript
interface ValidateConfigResponse {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  file: string;
  line?: number;
  parameter: string;
  message: string;
}
```

#### 2.2.5 Log Operations

**GET /api/v1/projects/:id/logs**

Get project logs

```typescript
interface GetLogsRequest {
  level?: 'error' | 'warning' | 'info' | 'debug';
  manager?: string;
  from?: string; // ISO 8601 timestamp
  to?: string; // ISO 8601 timestamp
  search?: string; // Search query
  limit?: number; // Max results
  offset?: number; // Pagination offset
}

interface GetLogsResponse {
  projectId: string;
  logs: LogEntry[];
  total: number;
  hasMore: boolean;
}
```

**WebSocket /api/v1/projects/:id/logs/stream**

Stream logs in real-time

```typescript
// Client -> Server
interface StreamLogsRequest {
  filters: LogFilter;
}

// Server -> Client
interface StreamLogsMessage {
  type: 'log' | 'error' | 'connected' | 'disconnected';
  log?: LogEntry;
  error?: string;
}
```

#### 2.2.6 Static Analysis

**POST /api/v1/projects/:id/analyze**

Analyze project code

```typescript
interface AnalyzeRequest {
  files?: string[]; // Specific files to analyze
  rules?: string[]; // Specific rules to apply
  severity?: 'error' | 'warning' | 'info'; // Minimum severity
}

interface AnalyzeResponse {
  analysisId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  results?: AnalysisResults;
}

interface AnalysisResults {
  files: number;
  issues: AnalysisIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  metrics: CodeMetrics;
}

interface AnalysisIssue {
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warning' | 'info';
  rule: string;
  message: string;
  fix?: SuggestedFix;
}
```

### 2.3 Authentication & Authorization

**JWT-based Authentication**:

```typescript
interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

interface TokenPayload {
  userId: string;
  email: string;
  tier: 'free' | 'opensource' | 'contributor' | 'commercial';
  permissions: string[];
  iat: number; // Issued at
  exp: number; // Expires at
}

// Middleware
async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}
```

### 2.4 Rate Limiting

**Tiered Rate Limits**:

```typescript
interface RateLimitConfig {
  free: {
    requestsPerMonth: 1000;
    requestsPerMinute: 10;
    concurrentRequests: 2;
  };
  opensource: {
    requestsPerMonth: Infinity;
    requestsPerMinute: 100;
    concurrentRequests: 10;
  };
  contributor: {
    requestsPerMonth: Infinity;
    requestsPerMinute: 100;
    concurrentRequests: 10;
  };
  commercial: {
    requestsPerMonth: number; // Configurable
    requestsPerMinute: 1000;
    concurrentRequests: 50;
  };
}

// Implementation using Redis
async function checkRateLimit(userId: string, tier: string): Promise<boolean> {
  const key = `ratelimit:${tier}:${userId}`;
  const monthKey = `${key}:month:${getYearMonth()}`;
  const minuteKey = `${key}:minute:${Date.now() / 60000}`;

  const [monthCount, minuteCount] = await Promise.all([
    redis.incr(monthKey),
    redis.incr(minuteKey),
  ]);

  const limits = RateLimitConfig[tier];

  return (
    monthCount <= limits.requestsPerMonth && minuteCount <= limits.requestsPerMinute
  );
}
```

### 2.5 Database Schema

**PostgreSQL Schema**:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  tier VARCHAR(50) NOT NULL DEFAULT 'free',
  api_key VARCHAR(255) UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  version VARCHAR(50),
  registered BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- API usage tracking
CREATE TABLE api_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  endpoint VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  status_code INTEGER,
  duration_ms INTEGER,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Test runs
CREATE TABLE test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) NOT NULL,
  results JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Analysis runs
CREATE TABLE analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  status VARCHAR(50) NOT NULL,
  results JSONB,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_api_usage_user ON api_usage(user_id);
CREATE INDEX idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX idx_test_runs_project ON test_runs(project_id);
CREATE INDEX idx_analysis_runs_project ON analysis_runs(project_id);
```

---

## 3. Model Context Protocol Server

**Repository**: `winccoa-mcp-server`  
**Language**: TypeScript (Node.js)  
**Protocol**: MCP (Model Context Protocol)

### 3.1 Architecture

```
src/
├── server.ts                 # MCP server implementation
├── tools/
│   ├── projectTools.ts       # Project operation tools
│   ├── managerTools.ts       # Manager operation tools
│   ├── testTools.ts          # Test operation tools
│   ├── analysisTools.ts      # Code analysis tools
│   └── documentationTools.ts # Documentation tools
├── context/
│   ├── ProjectContext.ts     # Project context provider
│   ├── CodeContext.ts        # Code understanding
│   └── HistoryContext.ts     # Learning from history
├── prompts/
│   ├── systemPrompts.ts      # System prompts
│   └── templates.ts          # Prompt templates
└── integrations/
    ├── vscode.ts             # VS Code integration
    └── api-client.ts         # API server client
```

### 3.2 MCP Tools

**Tool Definition**:

```typescript
interface MCPTool {
  name: string;
  description: string;
  parameters: MCPParameter[];
  handler: (params: any) => Promise<MCPResult>;
}

interface MCPParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  enum?: any[];
}

interface MCPResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}
```

**Implemented Tools**:

```typescript
const tools: MCPTool[] = [
  // Project Tools
  {
    name: 'get_project_info',
    description: 'Get detailed information about a WinCC OA project',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        description: 'Name of the project',
        required: true,
      },
    ],
    handler: async ({ projectName }) => {
      const project = await apiClient.getProject(projectName);
      return { success: true, data: project };
    },
  },
  {
    name: 'start_project',
    description: 'Start a WinCC OA project',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
      },
      {
        name: 'startAll',
        type: 'boolean',
        description: 'Start all managers',
        required: false,
      },
    ],
    handler: async ({ projectName, startAll }) => {
      await apiClient.startProject(projectName, startAll);
      return { success: true };
    },
  },

  // Manager Tools
  {
    name: 'get_manager_status',
    description: 'Get status of project managers',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
      },
    ],
    handler: async ({ projectName }) => {
      const managers = await apiClient.getManagers(projectName);
      return { success: true, data: managers };
    },
  },

  // Test Tools
  {
    name: 'run_tests',
    description: 'Execute tests for a project',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
      },
      {
        name: 'suite',
        type: 'string',
        required: false,
      },
      {
        name: 'coverage',
        type: 'boolean',
        required: false,
      },
    ],
    handler: async ({ projectName, suite, coverage }) => {
      const results = await apiClient.runTests(projectName, {
        suite,
        coverage,
      });
      return { success: true, data: results };
    },
  },

  // Analysis Tools
  {
    name: 'analyze_code',
    description: 'Perform static analysis on project code',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
      },
      {
        name: 'files',
        type: 'array',
        required: false,
      },
    ],
    handler: async ({ projectName, files }) => {
      const results = await apiClient.analyzeCode(projectName, { files });
      return { success: true, data: results };
    },
  },

  // Documentation Tools
  {
    name: 'generate_documentation',
    description: 'Generate documentation for a project',
    parameters: [
      {
        name: 'projectName',
        type: 'string',
        required: true,
      },
      {
        name: 'format',
        type: 'string',
        enum: ['html', 'markdown', 'pdf'],
        required: false,
      },
    ],
    handler: async ({ projectName, format }) => {
      const result = await apiClient.generateDocs(projectName, format);
      return { success: true, data: result };
    },
  },
];
```

### 3.3 Context Providers

**Project Context**:

```typescript
class ProjectContextProvider {
  async getContext(projectName: string): Promise<ProjectContext> {
    const [info, structure, config, health] = await Promise.all([
      apiClient.getProject(projectName),
      this.getProjectStructure(projectName),
      apiClient.getConfig(projectName),
      apiClient.getProjectHealth(projectName),
    ]);

    return {
      name: projectName,
      version: info.version,
      path: info.path,
      structure,
      config,
      health,
      dependencies: await this.analyzeDependencies(projectName),
    };
  }

  private async getProjectStructure(projectName: string): Promise<ProjectStructure> {
    // Analyze project structure
    return {
      panels: await this.listFiles(projectName, 'panels/**/*.pnl'),
      scripts: await this.listFiles(projectName, 'scripts/**/*.ctl'),
      libraries: await this.listFiles(projectName, 'scripts/libs/**/*.ctl'),
      managers: await this.getManagerList(projectName),
    };
  }
}
```

**Code Context**:

```typescript
class CodeContextProvider {
  async analyzeFile(filePath: string): Promise<CodeContext> {
    const content = await fs.readFile(filePath, 'utf8');

    return {
      path: filePath,
      language: this.detectLanguage(filePath),
      functions: this.extractFunctions(content),
      variables: this.extractVariables(content),
      imports: this.extractImports(content),
      complexity: this.calculateComplexity(content),
      documentation: this.extractDocumentation(content),
    };
  }

  private extractFunctions(code: string): FunctionInfo[] {
    // Parse CTRL code to extract functions
    const functions: FunctionInfo[] = [];

    // Example regex for CTRL functions
    const functionRegex = /^(\w+)\s+(\w+)\s*\(([\w\s,]*)\)/gm;
    let match;

    while ((match = functionRegex.exec(code)) !== null) {
      functions.push({
        name: match[2],
        returnType: match[1],
        parameters: match[3].split(',').map((p) => p.trim()),
        line: this.getLineNumber(code, match.index),
      });
    }

    return functions;
  }
}
```

### 3.4 VS Code Integration

**Auto-Start Mechanism**:

```typescript
// In VS Code extension
class MCPServerManager {
  private serverProcess: ChildProcess | null = null;

  async start(): Promise<void> {
    const mcpPath = await this.getMCPServerPath();

    this.serverProcess = spawn('node', [mcpPath], {
      env: {
        ...process.env,
        WINCCOA_API_URL: config.get('winccoa.api.url'),
        WINCCOA_API_KEY: config.get('winccoa.api.key'),
      },
    });

    // Setup communication
    this.setupMessageHandlers();

    // Wait for server ready
    await this.waitForReady();
  }

  async stop(): Promise<void> {
    if (this.serverProcess) {
      this.serverProcess.kill();
      this.serverProcess = null;
    }
  }

  private setupMessageHandlers(): void {
    this.serverProcess.stdout.on('data', (data) => {
      const message = JSON.parse(data.toString());
      this.handleMessage(message);
    });
  }
}

// Start MCP server when extension activates
export async function activate(context: vscode.ExtensionContext) {
  const mcpManager = new MCPServerManager();
  await mcpManager.start();

  context.subscriptions.push({
    dispose: () => mcpManager.stop(),
  });
}
```

---

## 4. Docker Images

**Repository**: `winccoa-docker`  
**Base OS**: Ubuntu 22.04 LTS  
**Registry**: Docker Hub / GitHub Container Registry

### 4.1 Image Variants

```
winccoa:3.19-base       # Base installation (3.19)
winccoa:3.19-dev        # Development environment (3.19)
winccoa:3.19-ci         # CI/CD optimized (3.19)
winccoa:3.20-base       # Base installation (3.20)
winccoa:3.20-dev        # Development environment (3.20)
winccoa:3.20-ci         # CI/CD optimized (3.20)
winccoa:3.21-base       # Base installation (3.21)
winccoa:3.21-dev        # Development environment (3.21)
winccoa:3.21-ci         # CI/CD optimized (3.21)
winccoa:latest          # Alias for latest dev
winccoa:latest-ci       # Alias for latest ci
```

### 4.2 Dockerfile Structure

**Base Image**:

```dockerfile
FROM ubuntu:22.04 AS base

# Install dependencies
RUN apt-get update && apt-get install -y \
    libx11-6 \
    libxext6 \
    libxrender1 \
    libxtst6 \
    libxi6 \
    libfreetype6 \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Create winccoa user
RUN useradd -m -s /bin/bash winccoa

# Set environment variables
ENV PVSS_II=/opt/winccoa \
    PATH=$PVSS_II/bin:$PATH \
    LD_LIBRARY_PATH=$PVSS_II/bin:$LD_LIBRARY_PATH

# Copy WinCC OA installation
COPY winccoa-${WINCCOA_VERSION}-linux/ $PVSS_II/

# Set permissions
RUN chown -R winccoa:winccoa $PVSS_II

USER winccoa
WORKDIR /opt/winccoa

EXPOSE 4999 8080

CMD ["/opt/winccoa/bin/WCCOApmon", "-proj", "demo"]
```

**Development Image**:

```dockerfile
FROM winccoa:${VERSION}-base AS dev

USER root

# Install development tools
RUN apt-get update && apt-get install -y \
    git \
    vim \
    curl \
    wget \
    build-essential \
    gdb \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Install API CLI tools
RUN npm install -g @winccoa/cli

# Install astyle for code formatting
RUN apt-get update && apt-get install -y astyle \
    && rm -rf /var/lib/apt/lists/*

USER winccoa

# Setup project directory
RUN mkdir -p /opt/winccoa/projects

VOLUME ["/opt/winccoa/projects"]

CMD ["/bin/bash"]
```

**CI/CD Image**:

```dockerfile
FROM winccoa:${VERSION}-dev AS ci

USER root

# Install CI/CD tools
RUN apt-get update && apt-get install -y \
    jq \
    xmlstarlet \
    zip \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install test frameworks
RUN npm install -g \
    junit-report-merger \
    @winccoa/test-runner

# Optimize for CI (reduce image size)
RUN apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /tmp/* \
    && rm -rf /var/tmp/*

USER winccoa

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD pgrep WCCOApmon || exit 1

CMD ["/opt/winccoa/bin/WCCOApmon", "-proj", "${PROJECT_NAME}"]
```

### 4.3 Docker Compose Templates

**Development Stack**:

```yaml
version: '3.8'

services:
  winccoa:
    image: winccoa:3.21-dev
    container_name: winccoa-dev
    volumes:
      - ./project:/opt/winccoa/projects/myproject
      - winccoa-db:/opt/winccoa/db
    ports:
      - '4999:4999'
      - '8080:8080'
    environment:
      - PVSS_II=/opt/winccoa
      - PROJECT_NAME=myproject
    networks:
      - winccoa-net

  api-server:
    image: winccoa-api-server:latest
    container_name: winccoa-api
    depends_on:
      - winccoa
      - postgres
    ports:
      - '3000:3000'
    environment:
      - DATABASE_URL=postgresql://winccoa:password@postgres:5432/winccoa
      - JWT_SECRET=${JWT_SECRET}
      - WINCCOA_HOST=winccoa
    networks:
      - winccoa-net

  postgres:
    image: postgres:15-alpine
    container_name: winccoa-db
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=winccoa
      - POSTGRES_USER=winccoa
      - POSTGRES_PASSWORD=password
    networks:
      - winccoa-net

volumes:
  winccoa-db:
  postgres-data:

networks:
  winccoa-net:
    driver: bridge
```

---

## 5. CI/CD Integrations

### 5.1 GitHub Actions

**Action Structure**:

```yaml
# action.yml for package-action
name: 'Package WinCC OA Project'
description: 'Package a WinCC OA project for deployment'
branding:
  icon: 'package'
  color: 'blue'

inputs:
  project-path:
    description: 'Path to the WinCC OA project'
    required: true
  version:
    description: 'Version number for the package'
    required: true
  output-dir:
    description: 'Output directory for the package'
    required: false
    default: './dist'
  include-db:
    description: 'Include database in package'
    required: false
    default: 'false'

outputs:
  package-path:
    description: 'Path to the generated package'
  package-size:
    description: 'Size of the package in bytes'

runs:
  using: 'docker'
  image: 'docker://winccoa:3.21-ci'
  args:
    - package
    - --project=${{ inputs.project-path }}
    - --version=${{ inputs.version }}
    - --output=${{ inputs.output-dir }}
    - --include-db=${{ inputs.include-db }}
```

**Implementation** (`entrypoint.sh`):

```bash
#!/bin/bash
set -e

PROJECT_PATH=$1
VERSION=$2
OUTPUT_DIR=$3
INCLUDE_DB=$4

# Validate project
if [ ! -d "$PROJECT_PATH" ]; then
  echo "Error: Project path not found: $PROJECT_PATH"
  exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Package project
PACKAGE_NAME="${PROJECT_PATH##*/}-${VERSION}.zip"
PACKAGE_PATH="$OUTPUT_DIR/$PACKAGE_NAME"

# Create package
cd "$PROJECT_PATH"
zip -r "$PACKAGE_PATH" \
  panels/ \
  scripts/ \
  config/ \
  -x "*.log" "*.tmp" "log/*"

if [ "$INCLUDE_DB" = "true" ]; then
  zip -r "$PACKAGE_PATH" db/
fi

# Calculate size
PACKAGE_SIZE=$(stat -f%z "$PACKAGE_PATH" 2>/dev/null || stat -c%s "$PACKAGE_PATH")

# Set outputs
echo "package-path=$PACKAGE_PATH" >> $GITHUB_OUTPUT
echo "package-size=$PACKAGE_SIZE" >> $GITHUB_OUTPUT

echo "✅ Package created: $PACKAGE_NAME ($PACKAGE_SIZE bytes)"
```

### 5.2 Jenkins Plugin

**Plugin Structure**:

```
src/
├── main/
│   ├── java/
│   │   └── io/winccoa/jenkins/
│   │       ├── WinCCOAPlugin.java
│   │       ├── builders/
│   │       │   ├── PackageBuilder.java
│   │       │   ├── TestBuilder.java
│   │       │   └── AnalyzeBuilder.java
│   │       ├── steps/
│   │       │   ├── PackageStep.java
│   │       │   ├── TestStep.java
│   │       │   └── AnalyzeStep.java
│   │       └── publishers/
│   │           ├── TestResultPublisher.java
│   │           └── AnalysisResultPublisher.java
│   └── resources/
│       └── io/winccoa/jenkins/
│           ├── WinCCOAPlugin/
│           │   └── config.jelly
│           └── builders/
│               └── PackageBuilder/
│                   ├── config.jelly
│                   └── help.html
└── test/
    └── java/
        └── io/winccoa/jenkins/
            └── PackageBuilderTest.java
```

**Package Builder Implementation**:

```java
public class PackageBuilder extends Builder {
    private final String projectPath;
    private final String version;
    private final String outputDir;
    private final boolean includeDb;

    @DataBoundConstructor
    public PackageBuilder(String projectPath, String version, 
                          String outputDir, boolean includeDb) {
        this.projectPath = projectPath;
        this.version = version;
        this.outputDir = outputDir;
        this.includeDb = includeDb;
    }

    @Override
    public boolean perform(AbstractBuild<?, ?> build, Launcher launcher,
                           BuildListener listener) throws InterruptedException, IOException {
        
        FilePath workspace = build.getWorkspace();
        FilePath project = workspace.child(projectPath);
        
        if (!project.exists()) {
            listener.error("Project not found: " + projectPath);
            return false;
        }

        // Create package
        String packageName = project.getName() + "-" + version + ".zip";
        FilePath packagePath = workspace.child(outputDir).child(packageName);
        
        listener.getLogger().println("Creating package: " + packageName);
        
        // Use zip command or Java ZipOutputStream
        int result = launcher.launch()
            .cmds("zip", "-r", packagePath.getRemote(),
                  "panels/", "scripts/", "config/",
                  "-x", "*.log", "*.tmp", "log/*")
            .pwd(project)
            .stdout(listener)
            .join();
        
        if (result != 0) {
            listener.error("Package creation failed");
            return false;
        }

        // Add to build artifacts
        build.addAction(new PackageArtifactAction(packagePath));
        
        listener.getLogger().println("✅ Package created successfully");
        return true;
    }

    @Extension
    public static final class DescriptorImpl extends BuildStepDescriptor<Builder> {
        @Override
        public boolean isApplicable(Class<? extends AbstractProject> jobType) {
            return true;
        }

        @Override
        public String getDisplayName() {
            return "Package WinCC OA Project";
        }
    }
}
```

### 5.3 GitLab CI Templates

**Template Structure** (`WinCCOA.gitlab-ci.yml`):

```yaml
# Base configuration
.winccoa:base:
  image: winccoa:3.21-ci
  variables:
    WINCCOA_VERSION: '3.21'
    PROJECT_PATH: './project'

# Test template
.winccoa:test:
  extends: .winccoa:base
  stage: test
  script:
    - winccoa-cli test run --project=$PROJECT_PATH --junit=test-results.xml
  artifacts:
    reports:
      junit: test-results.xml
    paths:
      - test-results/
    expire_in: 30 days

# Coverage template
.winccoa:coverage:
  extends: .winccoa:base
  stage: test
  script:
    - winccoa-cli test run --project=$PROJECT_PATH --coverage --cobertura=coverage.xml
  coverage: '/Coverage: \d+\.\d+%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage.xml

# Static analysis template
.winccoa:analyze:
  extends: .winccoa:base
  stage: quality
  script:
    - winccoa-cli analyze --project=$PROJECT_PATH --format=gitlab
  artifacts:
    reports:
      codequality: code-quality.json

# Package template
.winccoa:package:
  extends: .winccoa:base
  stage: package
  script:
    - winccoa-cli package --project=$PROJECT_PATH --version=$CI_COMMIT_TAG
  artifacts:
    paths:
      - dist/
    expire_in: 90 days
```

---

## 6. Cloud Integrations

### 6.1 AWS Integration

**Terraform Module**:

```hcl
# modules/winccoa-ecs/main.tf

variable "project_name" {
  description = "WinCC OA project name"
  type        = string
}

variable "winccoa_version" {
  description = "WinCC OA version"
  type        = string
  default     = "3.21"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.large"
}

# ECS Cluster
resource "aws_ecs_cluster" "winccoa" {
  name = "winccoa-${var.project_name}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# Task Definition
resource "aws_ecs_task_definition" "winccoa" {
  family                   = "winccoa-${var.project_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = "2048"
  memory                   = "4096"

  container_definitions = jsonencode([
    {
      name  = "winccoa"
      image = "winccoa:${var.winccoa_version}-prod"

      portMappings = [
        {
          containerPort = 4999
          protocol      = "tcp"
        },
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PROJECT_NAME"
          value = var.project_name
        },
        {
          name  = "PVSS_II"
          value = "/opt/winccoa"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = "/ecs/winccoa-${var.project_name}"
          "awslogs-region"        = data.aws_region.current.name
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "pgrep WCCOApmon || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }
    }
  ])
}

# ECS Service
resource "aws_ecs_service" "winccoa" {
  name            = "winccoa-${var.project_name}"
  cluster         = aws_ecs_cluster.winccoa.id
  task_definition = aws_ecs_task_definition.winccoa.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.winccoa.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.winccoa.arn
    container_name   = "winccoa"
    container_port   = 8080
  }
}

# Application Load Balancer
resource "aws_lb" "winccoa" {
  name               = "winccoa-${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

# Outputs
output "cluster_name" {
  value = aws_ecs_cluster.winccoa.name
}

output "service_name" {
  value = aws_ecs_service.winccoa.name
}

output "load_balancer_dns" {
  value = aws_lb.winccoa.dns_name
}
```

### 6.2 Azure Integration

**Bicep Template**:

```bicep
// main.bicep

@description('WinCC OA project name')
param projectName string

@description('WinCC OA version')
param winccoa Version string = '3.21'

@description('Azure region')
param location string = resourceGroup().location

// Container Registry
resource acr 'Microsoft.ContainerRegistry/registries@2023-01-01-preview' = {
  name: 'winccoa${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'winccoa-${projectName}-logs'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

// Container Apps Environment
resource environment 'Microsoft.App/managedEnvironments@2023-05-01' = {
  name: 'winccoa-${projectName}-env'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalytics.properties.customerId
        sharedKey: logAnalytics.listKeys().primarySharedKey
      }
    }
  }
}

// Container App
resource containerApp 'Microsoft.App/containerApps@2023-05-01' = {
  name: 'winccoa-${projectName}'
  location: location
  properties: {
    managedEnvironmentId: environment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: acr.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'winccoa'
          image: '${acr.properties.loginServer}/winccoa:${winccoa Version}-prod'
          resources: {
            cpu: json('2.0')
            memory: '4Gi'
          }
          env: [
            {
              name: 'PROJECT_NAME'
              value: projectName
            }
            {
              name: 'PVSS_II'
              value: '/opt/winccoa'
            }
          ]
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/health'
                port: 8080
              }
              initialDelaySeconds: 60
              periodSeconds: 30
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'cpu-scaling'
            custom: {
              type: 'cpu'
              metadata: {
                type: 'Utilization'
                value: '75'
              }
            }
          }
        ]
      }
    }
  }
}

// Outputs
output containerAppFQDN string = containerApp.properties.configuration.ingress.fqdn
output acrLoginServer string = acr.properties.loginServer
```

---

## Appendices

### A. API Error Codes

```typescript
enum ErrorCode {
  // Client errors (4xx)
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  RATE_LIMIT_EXCEEDED = 429,

  // Server errors (5xx)
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,

  // Custom WinCC OA errors (600+)
  PROJECT_NOT_FOUND = 600,
  PROJECT_ALREADY_REGISTERED = 601,
  PMON_NOT_RUNNING = 602,
  MANAGER_NOT_FOUND = 603,
  TEST_EXECUTION_FAILED = 604,
  ANALYSIS_FAILED = 605,
  CONFIG_INVALID = 606,
}
```

### B. Performance Requirements

| Component           | Metric                   | Requirement |
| ------------------- | ------------------------ | ----------- |
| VS Code Extension   | Activation time          | < 2s        |
|                     | Tree refresh             | < 500ms     |
|                     | Command execution        | < 1s        |
| API Server          | Response time (p95)      | < 200ms     |
|                     | Request throughput       | > 1000 RPS  |
|                     | Concurrent connections   | > 10,000    |
| MCP Server          | Tool execution (p95)     | < 1s        |
|                     | Context retrieval        | < 500ms     |
| Docker Images       | Build time               | < 10 min    |
|                     | Image size (base)        | < 2 GB      |
|                     | Container startup        | < 30s       |
| CI/CD Actions       | Test execution time      | < 5 min     |
|                     | Package creation         | < 2 min     |
|                     | Analysis time            | < 3 min     |

### C. Security Considerations

- **Authentication**: JWT with RS256, 15-minute access tokens
- **API Keys**: SHA-256 hashed, rotatable
- **Rate Limiting**: Redis-based, per-user and per-IP
- **Input Validation**: Joi/Zod schemas for all inputs
- **SQL Injection**: Parameterized queries only
- **XSS Protection**: Content Security Policy headers
- **CORS**: Configurable allowed origins
- **Secrets**: Never log or expose in errors
- **File Access**: Sandboxed, validated paths only
- **Container Security**: Non-root user, minimal base image

### D. Monitoring & Observability

**Metrics to Collect**:

- API request rate, latency, error rate
- Extension activation count, command usage
- Project operations (register, start, stop)
- Test execution count, pass rate, duration
- Docker image pulls, container launches
- MCP tool invocations, success rate

**Logging Strategy**:

- Structured JSON logs (Bunyan/Winston)
- Log levels: ERROR, WARN, INFO, DEBUG
- Correlation IDs for request tracing
- Sensitive data redaction
- Log aggregation (CloudWatch/ELK)

**Alerting**:

- API error rate > 5%
- Response time p95 > 500ms
- Rate limit threshold reached
- Container health check failures
- Database connection pool exhausted

---

**Last Updated**: November 12, 2025  
**Version**: 1.0  
**Status**: Technical Specification - Active

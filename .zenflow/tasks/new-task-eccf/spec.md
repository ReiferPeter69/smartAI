# Technical Specification: Architect Prime v3.0 (OBSIDIAN)

## Technical Context

### Technology Stack
- **Backend**: Node.js 18+ with TypeScript 5.3+
- **Frontend**: React 18+ with TypeScript, Vite for bundling
- **API Framework**: Express.js with type-safe routing
- **Database**: PostgreSQL 15+ with Prisma ORM
- **Real-time Communication**: WebSocket (ws library)
- **LLM Integration**: OpenAI SDK, Anthropic SDK, Ollama HTTP client
- **Code Generation**: Custom AST manipulation with @babel/parser, @babel/generator
- **Process Management**: Node child_process with proper cleanup
- **Authentication**: JWT with bcrypt
- **Validation**: Zod for runtime type safety
- **Testing**: Vitest for backend, React Testing Library for frontend
- **Linting**: ESLint with TypeScript rules, Prettier

### Project Structure
```
obsidian/
├── packages/
│   ├── backend/              # Express API server
│   ├── frontend/             # React web application
│   ├── core/                 # Shared types and utilities
│   └── generator/            # Code generation engine
├── prisma/                   # Database schema and migrations
├── specs/                    # System-generated specs
├── generated-projects/       # Output directory for generated apps
├── package.json              # Monorepo root
└── turbo.json               # Turborepo configuration
```

### Dependencies

**Backend Core**:
- `express` ^4.18.0
- `@types/express` ^4.17.0
- `typescript` ^5.3.0
- `tsx` ^4.7.0
- `zod` ^3.22.0
- `jsonwebtoken` ^9.0.0
- `bcrypt` ^5.1.0
- `ws` ^8.16.0

**LLM Providers**:
- `openai` ^4.28.0
- `@anthropic-ai/sdk` ^0.17.0
- `axios` ^1.6.0 (for Ollama)

**Database**:
- `@prisma/client` ^5.9.0
- `prisma` ^5.9.0 (dev)

**Code Generation**:
- `@babel/parser` ^7.23.0
- `@babel/generator` ^7.23.0
- `@babel/types` ^7.23.0
- `prettier` ^3.2.0

**Frontend**:
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `@tanstack/react-query` ^5.20.0
- `zustand` ^4.5.0
- `react-router-dom` ^6.21.0
- `@monaco-editor/react` ^4.6.0
- `tailwindcss` ^3.4.0

**Monorepo**:
- `turbo` ^1.12.0

---

## Implementation Approach

### Architecture Pattern: Modular Monorepo
Use Turborepo for monorepo management with four packages sharing types and utilities through the `core` package. Each package maintains strict boundaries:

1. **Core Package**: Type definitions, shared utilities, validation schemas
2. **Generator Package**: Isolated code generation logic with template system
3. **Backend Package**: API layer, LLM orchestration, project management
4. **Frontend Package**: User interface with real-time updates

### Key Design Decisions

#### 1. Phase Orchestration
Implement a **state machine** for the 4-phase workflow:

```typescript
// packages/core/src/types/phase.ts
export type Phase = 'discovery' | 'planning' | 'execution' | 'verification';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PhaseContext {
  phase: Phase;
  status: PhaseStatus;
  artifacts: Record<string, string>; // file path -> content
  errors: PhaseError[];
  retryCount: number;
}

export interface GenerationSession {
  id: string;
  userId: string;
  prompt: string;
  currentPhase: PhaseContext;
  history: PhaseContext[];
  config: LLMConfig;
}
```

State transitions enforced by `PhaseOrchestrator` class that prevents progression on verification failure ("Stop-the-Line" rule).

#### 2. LLM Abstraction Layer
Create unified interface for all LLM providers:

```typescript
// packages/core/src/llm/provider.ts
export interface LLMProvider {
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  stream(messages: ChatMessage[], options?: ChatOptions): AsyncIterator<string>;
}

export class OpenAIProvider implements LLMProvider { }
export class AnthropicProvider implements LLMProvider { }
export class OllamaProvider implements LLMProvider { }
```

Provider selection via factory pattern based on user configuration. Automatic fallback to secondary model on rate limit/error.

#### 3. Code Generation Engine
Template-based generation with AST manipulation for safety:

1. **Template System**: Pre-built templates for React, Next.js, FastAPI, etc.
2. **AST Builder**: Programmatic code construction (no string concatenation)
3. **File Writer**: Atomic file operations with rollback capability
4. **Dependency Resolver**: Analyze imports and generate package.json

```typescript
// packages/generator/src/engine.ts
export class CodeGenerationEngine {
  async generate(spec: TechnicalSpec, target: AppType): Promise<GeneratedProject> {
    const template = this.templateRegistry.get(target);
    const ast = this.buildAST(spec, template);
    const files = this.astToFiles(ast);
    const deps = this.resolveDependencies(ast);
    return { files, dependencies: deps, structure: template.structure };
  }
}
```

#### 4. Verification System
Multi-stage verification pipeline:

```typescript
// packages/generator/src/verifier.ts
export class VerificationPipeline {
  private stages: VerificationStage[] = [
    new TypeCheckStage(),
    new LintStage(),
    new TestStage(),
    new BuildStage()
  ];

  async verify(project: GeneratedProject): Promise<VerificationResult> {
    for (const stage of this.stages) {
      const result = await stage.run(project);
      if (!result.passed) {
        return { passed: false, failedStage: stage.name, error: result.error };
      }
    }
    return { passed: true };
  }
}
```

Each stage runs in isolated child process with timeout. Captures stdout/stderr for error analysis.

#### 5. Real-time Progress Updates
WebSocket for bidirectional communication:

- **Server → Client**: Phase transitions, file generation events, verification results
- **Client → Server**: User clarifications during discovery, approval gates

```typescript
// packages/backend/src/websocket/session-handler.ts
export class SessionWebSocketHandler {
  async handlePhaseUpdate(session: GenerationSession, phase: Phase) {
    this.broadcast(session.id, {
      type: 'PHASE_CHANGED',
      phase,
      timestamp: Date.now()
    });
  }

  async handleClarificationRequest(question: string) {
    this.send({
      type: 'CLARIFICATION_NEEDED',
      question,
      awaitingResponse: true
    });
  }
}
```

#### 6. Project Persistence
Store generated projects on filesystem with metadata in PostgreSQL:

- **Filesystem**: `generated-projects/{userId}/{projectId}/`
- **Database**: Metadata, spec files, generation logs
- **Cleanup**: TTL-based deletion for old projects (configurable, default 30 days)

---

## Source Code Structure

### Package: `core`
```
packages/core/
├── src/
│   ├── types/
│   │   ├── phase.ts           # Phase workflow types
│   │   ├── project.ts         # Project metadata types
│   │   ├── llm.ts             # LLM provider interfaces
│   │   └── generation.ts      # Code generation types
│   ├── validation/
│   │   ├── prompt.schema.ts   # Zod schema for user prompts
│   │   ├── spec.schema.ts     # Zod schema for specs
│   │   └── config.schema.ts   # Zod schema for LLM configs
│   └── utils/
│       ├── file.ts            # File system utilities
│       └── logger.ts          # Structured logging
└── tsconfig.json
```

### Package: `generator`
```
packages/generator/
├── src/
│   ├── engine/
│   │   ├── CodeGenerationEngine.ts
│   │   ├── ASTBuilder.ts
│   │   └── FileWriter.ts
│   ├── templates/
│   │   ├── react/
│   │   │   ├── template.ts
│   │   │   └── components/
│   │   ├── nextjs/
│   │   ├── fastapi/
│   │   └── express/
│   ├── verifier/
│   │   ├── VerificationPipeline.ts
│   │   ├── stages/
│   │   │   ├── TypeCheckStage.ts
│   │   │   ├── LintStage.ts
│   │   │   ├── TestStage.ts
│   │   │   └── BuildStage.ts
│   │   └── ErrorAnalyzer.ts
│   └── dependency/
│       ├── DependencyResolver.ts
│       └── PackageJsonBuilder.ts
└── tsconfig.json
```

### Package: `backend`
```
packages/backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── projects.ts
│   │   │   └── generation.ts
│   │   └── middleware/
│   │       ├── auth.ts
│   │       ├── validation.ts
│   │       └── error-handler.ts
│   ├── services/
│   │   ├── PhaseOrchestrator.ts
│   │   ├── LLMService.ts
│   │   ├── ProjectService.ts
│   │   └── UserService.ts
│   ├── llm/
│   │   ├── providers/
│   │   │   ├── OpenAIProvider.ts
│   │   │   ├── AnthropicProvider.ts
│   │   │   └── OllamaProvider.ts
│   │   ├── ProviderFactory.ts
│   │   └── prompt-templates/
│   │       ├── discovery.ts
│   │       ├── planning.ts
│   │       ├── execution.ts
│   │       └── verification.ts
│   ├── websocket/
│   │   ├── SessionHandler.ts
│   │   └── ConnectionManager.ts
│   ├── jobs/
│   │   ├── GenerationJob.ts
│   │   └── CleanupJob.ts
│   └── server.ts
├── prisma/
│   └── schema.prisma
└── tsconfig.json
```

### Package: `frontend`
```
packages/frontend/
├── src/
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProjectDashboard.tsx
│   │   ├── GenerationPage.tsx
│   │   └── ProjectDetail.tsx
│   ├── components/
│   │   ├── PromptInput.tsx
│   │   ├── PhaseProgress.tsx
│   │   ├── CodeViewer.tsx
│   │   ├── LivePreview.tsx
│   │   ├── SpecViewer.tsx
│   │   └── ClarificationDialog.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useGeneration.ts
│   │   └── useProjects.ts
│   ├── store/
│   │   ├── generation.store.ts
│   │   └── auth.store.ts
│   ├── api/
│   │   └── client.ts
│   └── main.tsx
├── public/
└── tsconfig.json
```

---

## Data Model

### Prisma Schema

```prisma
// prisma/schema.prisma

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  projects      Project[]
  llmConfigs    LLMConfig[]
}

model Project {
  id              String    @id @default(cuid())
  name            String
  description     String?
  prompt          String
  appType         String    // 'react', 'nextjs', 'fastapi', etc.
  status          String    // 'generating', 'completed', 'failed'
  filesPath       String    // Filesystem path
  
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  
  currentPhase    String    // 'discovery', 'planning', 'execution', 'verification'
  phaseStatus     String    // 'pending', 'in_progress', 'completed', 'failed'
  
  specFiles       SpecFile[]
  verificationLogs VerificationLog[]
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([userId, status])
}

model SpecFile {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  filename    String   // 'architecture.md', 'plan.md', etc.
  content     String   @db.Text
  phase       String   // Which phase generated this
  
  createdAt   DateTime @default(now())
  
  @@unique([projectId, filename])
}

model VerificationLog {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  stage       String   // 'typecheck', 'lint', 'test', 'build'
  passed      Boolean
  output      String   @db.Text
  error       String?  @db.Text
  
  createdAt   DateTime @default(now())
  
  @@index([projectId, createdAt])
}

model LLMConfig {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  
  provider    String   // 'openai', 'anthropic', 'ollama'
  model       String   // 'gpt-4', 'claude-3-opus', etc.
  apiKey      String?  @db.Text // Encrypted
  endpoint    String?  // For Ollama/custom
  
  isDefault   Boolean  @default(false)
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  @@unique([userId, provider, model])
}
```

---

## API Contracts

### REST Endpoints

#### Authentication
```typescript
POST /api/auth/register
Body: { email: string; password: string; name?: string }
Response: { token: string; user: User }

POST /api/auth/login
Body: { email: string; password: string }
Response: { token: string; user: User }
```

#### Projects
```typescript
GET /api/projects
Query: { status?: string; page?: number; limit?: number }
Response: { projects: Project[]; total: number }

GET /api/projects/:id
Response: { project: Project; files: string[] }

POST /api/projects
Body: { prompt: string; appType: string; llmConfigId?: string }
Response: { project: Project; sessionId: string }

DELETE /api/projects/:id
Response: { success: boolean }

GET /api/projects/:id/download
Response: ZIP file stream
```

#### LLM Configuration
```typescript
GET /api/llm-configs
Response: { configs: LLMConfig[] }

POST /api/llm-configs
Body: { provider: string; model: string; apiKey?: string; endpoint?: string }
Response: { config: LLMConfig }

PUT /api/llm-configs/:id/set-default
Response: { success: boolean }
```

#### Generation Session (WebSocket)
```typescript
// Connect to ws://localhost:3000/ws/session/:sessionId
// Events from server:
{
  type: 'PHASE_CHANGED',
  phase: Phase,
  timestamp: number
}

{
  type: 'FILE_GENERATED',
  path: string,
  content: string
}

{
  type: 'VERIFICATION_RESULT',
  stage: string,
  passed: boolean,
  output: string,
  error?: string
}

{
  type: 'CLARIFICATION_NEEDED',
  question: string,
  context: string
}

{
  type: 'GENERATION_COMPLETE',
  projectId: string
}

{
  type: 'GENERATION_FAILED',
  error: string,
  phase: Phase
}

// Events from client:
{
  type: 'CLARIFICATION_RESPONSE',
  answer: string
}

{
  type: 'APPROVE_SPEC'
}

{
  type: 'CANCEL_GENERATION'
}
```

---

## Delivery Phases

### Phase 1: Foundation & Infrastructure (Week 1-2)
**Goal**: Set up monorepo, database, basic API

**Tasks**:
1. Initialize Turborepo with four packages
2. Configure TypeScript with strict mode across all packages
3. Set up Prisma with PostgreSQL
4. Create core types and interfaces
5. Implement authentication (registration, login, JWT)
6. Basic Express API structure with error handling
7. Set up ESLint, Prettier, Vitest

**Verification**:
- `turbo build` succeeds
- `turbo test` passes
- `turbo lint` reports zero errors
- Authentication endpoints work (test with curl/Postman)

**Deliverable**: Monorepo with working authentication and database

---

### Phase 2: LLM Integration (Week 3)
**Goal**: Implement LLM provider abstraction and prompt engineering

**Tasks**:
1. Create `LLMProvider` interface in core package
2. Implement `OpenAIProvider` with streaming support
3. Implement `AnthropicProvider` with streaming support
4. Implement `OllamaProvider` for local models
5. Create `ProviderFactory` for provider selection
6. Design prompt templates for all 4 phases
7. Implement error handling and retries
8. Add LLM config CRUD endpoints

**Verification**:
- Unit tests for each provider (mocked API calls)
- Integration test with real API call (skipped in CI)
- Verify streaming works correctly
- Test fallback mechanism on provider failure

**Deliverable**: Working LLM abstraction layer with all three providers

---

### Phase 3: Phase Orchestration (Week 4)
**Goal**: Implement the 4-phase workflow state machine

**Tasks**:
1. Create `PhaseOrchestrator` class
2. Implement state transition logic with validations
3. Create Phase 1 (Discovery) logic:
   - Parse user prompt
   - Generate clarifying questions
   - Create architecture.md
4. Create Phase 2 (Planning) logic:
   - Break spec into atomic steps
   - Implement red teaming (self-critique)
   - Generate plan.md
5. Implement "Stop-the-Line" rule enforcement
6. Add WebSocket support for real-time updates
7. Store phase artifacts in database

**Verification**:
- State machine unit tests
- Integration test: Full 4-phase flow (mocked generation)
- Verify state transitions reject invalid progressions
- WebSocket message delivery tests

**Deliverable**: Complete phase orchestration with WebSocket updates

---

### Phase 4: Code Generation Engine (Week 5-6)
**Goal**: Template-based code generation with AST manipulation

**Tasks**:
1. Design template system architecture
2. Create React template with TypeScript
3. Create Next.js template (App Router)
4. Create FastAPI template
5. Implement `ASTBuilder` for programmatic code construction
6. Implement `DependencyResolver`
7. Create `FileWriter` with atomic operations
8. Implement rollback on generation failure

**Verification**:
- Generate sample React app, verify it builds
- Generate sample Next.js app, verify it runs
- Generate sample FastAPI app, verify it starts
- Unit tests for AST builder
- Test rollback mechanism

**Deliverable**: Working code generation for 3 app types

---

### Phase 5: Verification System (Week 7)
**Goal**: Multi-stage verification pipeline

**Tasks**:
1. Create `VerificationPipeline` class
2. Implement `TypeCheckStage` (run tsc/mypy in child process)
3. Implement `LintStage` (run eslint/ruff)
4. Implement `TestStage` (run vitest/pytest)
5. Implement `BuildStage` (run build command)
6. Create `ErrorAnalyzer` for parsing error messages
7. Implement auto-fix for common errors
8. Store verification logs in database

**Verification**:
- Generate intentionally broken code, verify detection
- Test each verification stage independently
- Verify timeout handling for long-running tests
- Test error analyzer with real error messages

**Deliverable**: Complete verification pipeline with auto-fix

---

### Phase 6: Frontend (Week 8-9)
**Goal**: Beautiful, functional web UI

**Tasks**:
1. Set up React with Vite and TailwindCSS
2. Implement routing (React Router)
3. Create authentication pages
4. Create project dashboard with search/filter
5. Create prompt input page with validation
6. Implement phase progress indicators (animated)
7. Create code viewer (Monaco Editor)
8. Implement live preview (iframe for web apps)
9. Create spec file viewer
10. Implement WebSocket connection management
11. Add clarification dialog (Phase 1)
12. Create approval gate UI (after Phase 1)

**Verification**:
- Component unit tests (React Testing Library)
- E2E tests for critical flows (Playwright)
- Verify WebSocket reconnection
- Test responsiveness on mobile
- Lighthouse score > 90

**Deliverable**: Complete frontend with all user-facing features

---

### Phase 7: Integration & Polish (Week 10)
**Goal**: End-to-end integration, error handling, UX improvements

**Tasks**:
1. Full E2E testing: Prompt → Generated running app
2. Implement project download as ZIP
3. Add graceful error messages throughout UI
4. Implement rate limiting
5. Add request queueing for concurrent generations
6. Implement project TTL cleanup job
7. Add comprehensive logging
8. Create admin dashboard (user management, metrics)
9. Generate Docker configuration for deployment
10. Create README and setup documentation

**Verification**:
- Generate 10 different apps end-to-end
- Success rate > 95%
- No crashes on error conditions
- Verify resource cleanup after generation
- Load testing (10 concurrent generations)

**Deliverable**: Production-ready MVP

---

## Verification Approach

### Automated Testing Strategy

#### Unit Tests (Vitest)
- **Coverage Target**: 80%+
- **Scope**: Individual functions, classes, utilities
- **Location**: `*.test.ts` files colocated with source
- **Run Command**: `turbo test`

**Key Test Suites**:
- LLM provider implementations (mocked API calls)
- Phase state machine transitions
- AST builder functions
- File system utilities
- Validation schemas

#### Integration Tests
- **Scope**: Inter-package communication, database operations
- **Location**: `packages/*/tests/integration/`
- **Run Command**: `turbo test:integration`

**Key Test Suites**:
- API endpoints with database
- WebSocket session handling
- Code generation → verification pipeline
- LLM service with real providers (CI skip with env var)

#### E2E Tests (Playwright)
- **Scope**: Full user workflows through UI
- **Location**: `packages/frontend/e2e/`
- **Run Command**: `turbo test:e2e`

**Key Test Flows**:
1. User registration → Login
2. Full generation flow: Prompt → Approve spec → Download project
3. Project dashboard: Create, view, delete
4. LLM config management

### Manual Testing Checklist

**Before Each Delivery Phase**:
- [ ] Run `turbo build` - no errors
- [ ] Run `turbo test` - all tests pass
- [ ] Run `turbo lint` - zero warnings
- [ ] Run `tsc --noEmit` in each package - zero type errors
- [ ] Generate 3 sample apps (React, Next.js, FastAPI)
- [ ] Verify generated apps run successfully
- [ ] Check browser console for errors
- [ ] Test on Firefox and Chrome
- [ ] Verify WebSocket reconnection works

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm install
      - run: turbo build
      - run: turbo test
      - run: turbo lint
      - run: turbo typecheck
```

### Performance Benchmarks
- **Phase 1 (Discovery)**: < 30s
- **Phase 2 (Planning)**: < 20s
- **Phase 3 (Execution)**: < 3min for simple app, < 10min for complex
- **Phase 4 (Verification)**: < 2min
- **API Response Time**: < 200ms (p95)
- **WebSocket Latency**: < 100ms

---

## Security Considerations

1. **API Key Storage**: Encrypt LLM API keys in database (AES-256)
2. **JWT Secret**: Store in environment variable, rotate periodically
3. **Input Sanitization**: Validate all user inputs with Zod
4. **Sandboxed Execution**: Run verification in isolated child processes
5. **Rate Limiting**: 10 requests/minute per user for generation
6. **File Path Validation**: Prevent directory traversal attacks
7. **WebSocket Authentication**: Verify JWT on connection
8. **CORS Configuration**: Whitelist frontend origin only
9. **SQL Injection**: Use Prisma (parameterized queries)
10. **Dependency Scanning**: Run `npm audit` in CI

---

## Open Questions & Risks

### Technical Risks
1. **LLM Output Quality**: May generate incorrect code despite prompt engineering
   - *Mitigation*: Multiple verification stages, iterative refinement
2. **Verification Timeout**: Complex apps may have long test suites
   - *Mitigation*: Configurable timeout per stage, skip slow tests option
3. **Dependency Conflicts**: Generated package.json may have incompatible versions
   - *Mitigation*: Lock to known-good versions in templates
4. **Resource Exhaustion**: Concurrent generations may overwhelm server
   - *Mitigation*: Job queue with max concurrency limit

### Product Risks
1. **User Prompt Ambiguity**: Users may provide vague requirements
   - *Mitigation*: Aggressive clarification questions in Phase 1
2. **Scope Creep**: Users may expect more app types than supported
   - *Mitigation*: Clear documentation of supported frameworks
3. **Long Generation Time**: Complex apps may exceed user patience
   - *Mitigation*: Progress indicators, estimated time remaining

---

## Success Metrics

### Technical Metrics
- **Zero TypeScript Errors**: `tsc --noEmit` returns 0 errors
- **Test Coverage**: > 80% across all packages
- **Build Success**: `turbo build` completes in < 5min
- **Lint Clean**: `turbo lint` reports 0 warnings/errors

### Product Metrics
- **Generation Success Rate**: > 95% of generations produce runnable apps
- **First-Run Success**: Generated app runs without modification
- **Phase Completion Time**: Meets performance targets (see above)
- **User Satisfaction**: Generated code follows modern best practices

---

## Summary

This specification defines a production-ready architecture for Architect Prime v3.0. The modular monorepo structure enables independent development and testing of each component while maintaining type safety across package boundaries. The phased delivery approach ensures incremental value delivery with verification gates at each milestone.

**Critical Success Factors**:
1. Strict typing throughout (no `any` types)
2. Comprehensive test coverage (unit, integration, E2E)
3. "Stop-the-Line" enforcement (no progression on failed verification)
4. Template-based generation with AST manipulation (no string concatenation)
5. Real-time user feedback via WebSocket

**Next Steps**: Proceed to Planning phase to break down Phase 1 (Foundation & Infrastructure) into atomic implementation tasks.

# Implementation Plan: Architect Prime v3.0 (OBSIDIAN)

## Configuration
- **Artifacts Path**: `.zenflow/tasks/new-task-eccf`
- **Project Root**: `obsidian/`

---

## Workflow Steps

### [x] Step: Requirements

PRD created at `.zenflow/tasks/new-task-eccf/requirements.md`

### [x] Step: Technical Specification

Technical specification created at `.zenflow/tasks/new-task-eccf/spec.md`

### [x] Step: Planning

Comprehensive implementation plan created with 7 phases and 68 detailed tasks.

---

## PHASE 1: Foundation & Infrastructure (Weeks 1-2)

### [x] 1.1: Initialize Monorepo Structure
<!-- chat-id: 760b04a7-a3a5-45ab-9752-2212a0a24613 -->

**Objective**: Create Turborepo with four packages and base configuration

**Tasks**:
- Initialize root `package.json` with workspace configuration
- Install and configure Turborepo
- Create package structure: `packages/{backend,frontend,core,generator}`
- Set up root-level `turbo.json` with pipeline configuration
- Create `.gitignore` with appropriate patterns

**Verification**:
- `npm install` completes successfully
- All package directories exist
- `turbo build` runs (even if packages empty)

**References**: spec.md:19-32 (Project Structure)

---

### [x] 1.2: Configure TypeScript with Strict Mode
<!-- chat-id: 1b364a0f-9792-4e5b-a6df-6b7b4a84a5d6 -->

**Objective**: Set up TypeScript configuration across all packages

**Tasks**:
- Create root `tsconfig.json` with base configuration
- Create `tsconfig.json` for each package extending base
- Enable `strict: true` mode
- Configure path aliases for inter-package imports
- Install TypeScript and `tsx` dependencies

**Verification**:
- `tsc --noEmit` in each package completes without errors
- Path aliases resolve correctly

**References**: spec.md:39 (TypeScript ^5.3.0), requirements.md:19 (STRICT TYPING)

---

### [x] 1.3: Set Up Prisma with PostgreSQL
<!-- chat-id: 58bcf023-d849-4b0e-a324-4b58b04440af -->

**Objective**: Configure database layer with Prisma ORM

**Tasks**:
- Install Prisma and Prisma Client
- Initialize Prisma in `prisma/` directory
- Create `schema.prisma` with models: User, Project, SpecFile, VerificationLog, LLMConfig
- Configure PostgreSQL connection via environment variables
- Create initial migration

**Verification**:
- `prisma generate` creates client successfully
- `prisma migrate dev` runs without errors
- Can connect to PostgreSQL database

**References**: spec.md:343-436 (Prisma Schema)

---

### [x] 1.4: Implement Core Types Package
<!-- chat-id: 1e9c1f1a-6afa-4eb7-8759-179d5f839aee -->

**Objective**: Create shared type definitions and utilities

**Tasks**:
- Create `packages/core/src/types/phase.ts` with Phase types
- Create `packages/core/src/types/project.ts` with Project types
- Create `packages/core/src/types/llm.ts` with LLM provider interfaces
- Create `packages/core/src/types/generation.ts` with generation types
- Create `packages/core/src/utils/logger.ts` for structured logging
- Create `packages/core/src/utils/file.ts` for file system utilities

**Verification**:
- `turbo build` in core package succeeds
- No TypeScript errors
- Exports are accessible from other packages

**References**: spec.md:218-235 (Core Package Structure), spec.md:90-110 (Phase Types)

---

### [x] 1.5: Implement Validation Schemas
<!-- chat-id: 1fd190fe-cfd0-46cb-8ae4-b65b4940a8e7 -->

**Objective**: Create Zod schemas for runtime validation

**Tasks**:
- Install Zod
- Create `packages/core/src/validation/prompt.schema.ts`
- Create `packages/core/src/validation/spec.schema.ts`
- Create `packages/core/src/validation/config.schema.ts`
- Create `packages/core/src/validation/api.schema.ts` for request/response validation

**Verification**:
- All schemas export correctly
- Unit tests for schema validation pass
- Invalid data throws Zod errors

**References**: spec.md:41 (Zod ^3.22.0), requirements.md:19 (STRICT TYPING)

---

### [x] 1.6: Set Up Express API with Authentication
<!-- chat-id: 5b140bb4-5def-4b53-8c4b-1432d8a1b318 -->

**Objective**: Create Express server with JWT authentication

**Tasks**:
- Create `packages/backend/src/server.ts` with Express setup
- Install express, jsonwebtoken, bcrypt dependencies
- Create `packages/backend/src/api/middleware/auth.ts` for JWT verification
- Create `packages/backend/src/api/middleware/validation.ts` for Zod validation
- Create `packages/backend/src/api/middleware/error-handler.ts`
- Create `packages/backend/src/api/routes/auth.ts` with register/login endpoints
- Create `packages/backend/src/services/UserService.ts`
- Implement password hashing and JWT generation

**Verification**:
- Server starts on configured port
- POST `/api/auth/register` creates user and returns JWT
- POST `/api/auth/login` authenticates and returns JWT
- Protected routes reject requests without valid JWT
- Unit tests for UserService pass

**References**: spec.md:446-453 (Auth API), spec.md:13-14 (JWT, bcrypt)

---

### [x] 1.7: Set Up Testing Infrastructure
<!-- chat-id: 89e38288-7379-4784-aeb9-864761552e3a -->

**Objective**: Configure Vitest for unit and integration tests

**Tasks**:
- Install Vitest and related dependencies
- Create `vitest.config.ts` in each package
- Set up test utilities in `packages/core/src/test-utils/`
- Create example test files to verify setup
- Configure Turbo to run tests across packages

**Verification**:
- `turbo test` runs successfully
- Test coverage reports generate
- Mock utilities work correctly

**References**: spec.md:16 (Vitest), spec.md:726-740 (Unit Tests Strategy)

---

### [x] 1.8: Configure Linting and Formatting
<!-- chat-id: 01701e8e-ca03-4698-a384-97e995272694 -->

**Objective**: Set up ESLint and Prettier

**Tasks**:
- Install ESLint, Prettier, and TypeScript plugins
- Create `.eslintrc.js` at root with TypeScript rules
- Create `.prettierrc` with formatting rules
- Add lint scripts to package.json files
- Configure Turbo to run lint across packages

**Verification**:
- `turbo lint` runs across all packages
- No linting errors in existing code
- Prettier formats code correctly

**References**: spec.md:17 (ESLint, Prettier)

---

### [x] 1.9: Phase 1 Integration Test
<!-- chat-id: f8ca8f91-a58f-4a68-a85f-b286fb78ec6e -->

**Objective**: Verify all Phase 1 components work together

**Tasks**:
- Run `turbo build` and verify success
- Run `turbo test` and verify all tests pass
- Run `turbo lint` and verify zero errors
- Test authentication flow end-to-end with curl/Postman
- Verify database migrations applied correctly

**Verification**:
- All commands succeed
- Authentication endpoints return expected responses
- Database contains test user

**References**: spec.md:560-566 (Phase 1 Verification)

---

## PHASE 2: LLM Integration (Week 3)

### [x] 2.1: Create LLM Provider Interface
<!-- chat-id: e7b950d1-686f-447c-80cf-c0fb2d9d8028 -->

**Objective**: Define unified interface for all LLM providers

**Tasks**:
- Create `packages/core/src/llm/provider.ts` with `LLMProvider` interface
- Define `ChatMessage`, `ChatOptions`, `ChatResponse` types
- Create streaming response types with AsyncIterator
- Add error types for LLM failures

**Verification**:
- Interface compiles without errors
- Types are exportable and usable in other packages

**References**: spec.md:116-128 (LLM Abstraction Layer)

---

### [x] 2.2: Implement OpenAI Provider
<!-- chat-id: ff944c37-2e7c-473f-8219-315a7e5a5145 -->

**Objective**: Create OpenAI integration with streaming support

**Tasks**:
- Install `openai` SDK
- Create `packages/backend/src/llm/providers/OpenAIProvider.ts`
- Implement `chat()` method with API call
- Implement `stream()` method with streaming support
- Add error handling and retry logic
- Handle rate limiting with exponential backoff

**Verification**:
- Unit tests with mocked API calls pass
- Integration test with real API call works (manual, skip in CI)
- Streaming returns data correctly
- Retry logic triggers on transient errors

**References**: spec.md:46 (openai ^4.28.0), spec.md:159-167 (Supported Models - OpenAI)

---

### [x] 2.3: Implement Anthropic Provider
<!-- chat-id: d183e9e3-ccbc-4c1f-916b-fa9902ef3a75 -->

**Objective**: Create Anthropic integration with streaming support

**Tasks**:
- Install `@anthropic-ai/sdk`
- Create `packages/backend/src/llm/providers/AnthropicProvider.ts`
- Implement `chat()` method
- Implement `stream()` method
- Add error handling and retry logic
- Map Anthropic API format to unified interface

**Verification**:
- Unit tests with mocked API calls pass
- Integration test with real API call works (manual)
- Streaming works correctly
- Error handling covers API-specific errors

**References**: spec.md:48 (Anthropic SDK), spec.md:163-167 (Supported Models - Anthropic)

---

### [x] 2.4: Implement Ollama Provider
<!-- chat-id: 15da4743-a0a5-481b-a758-87fdce78d105 -->

**Objective**: Create Ollama integration for local models

**Tasks**:
- Install `axios` for HTTP requests
- Create `packages/backend/src/llm/providers/OllamaProvider.ts`
- Implement `chat()` method with Ollama API format
- Implement `stream()` method
- Add connection error handling for local server
- Support custom endpoint configuration

**Verification**:
- Unit tests with mocked HTTP requests pass
- Integration test with running Ollama instance (manual)
- Handles connection failures gracefully

**References**: spec.md:49 (axios), spec.md:168-171 (Local Models - Ollama)

---

### [ ] 2.5: Implement Provider Factory
<!-- chat-id: 12bf7bad-080c-445f-b2db-3b2a40da869f -->

**Objective**: Create factory for provider instantiation

**Tasks**:
- Create `packages/backend/src/llm/ProviderFactory.ts`
- Implement provider selection logic based on config
- Add validation for required configuration (API keys, endpoints)
- Implement fallback mechanism to secondary provider on failure

**Verification**:
- Unit tests for provider selection logic
- Test fallback mechanism with failing primary provider
- Validation rejects invalid configurations

**References**: spec.md:289 (ProviderFactory.ts), spec.md:130 (Provider selection via factory)

---

### [ ] 2.6: Design Prompt Templates

**Objective**: Create engineered prompts for each phase

**Tasks**:
- Create `packages/backend/src/llm/prompt-templates/discovery.ts`
- Create `packages/backend/src/llm/prompt-templates/planning.ts`
- Create `packages/backend/src/llm/prompt-templates/execution.ts`
- Create `packages/backend/src/llm/prompt-templates/verification.ts`
- Each template includes system prompt and examples
- Templates emphasize "Zero-Trust" and "Correctness over Speed"

**Verification**:
- Templates export correctly
- Manual review of prompt quality
- Test with sample inputs

**References**: spec.md:290-294 (Prompt Templates), requirements.md:9-23 (Core Identity)

---

### [ ] 2.7: Implement LLM Service

**Objective**: Create high-level LLM service with caching and logging

**Tasks**:
- Create `packages/backend/src/services/LLMService.ts`
- Implement `generateResponse()` method using ProviderFactory
- Add request/response logging
- Implement token usage tracking
- Add timeout handling
- Create retry mechanism with exponential backoff

**Verification**:
- Unit tests with mocked providers pass
- Timeout handling works correctly
- Retry logic triggers on failures
- Logs capture all requests/responses

**References**: spec.md:283 (LLMService.ts)

---

### [ ] 2.8: Implement LLM Config API

**Objective**: Create CRUD endpoints for LLM configurations

**Tasks**:
- Create `packages/backend/src/api/routes/llm-config.ts`
- Implement GET `/api/llm-configs` endpoint
- Implement POST `/api/llm-configs` endpoint
- Implement PUT `/api/llm-configs/:id/set-default` endpoint
- Add API key encryption before database storage
- Validate provider/model combinations

**Verification**:
- All endpoints return correct responses
- API keys encrypted in database
- Invalid configurations rejected
- Unit tests for encryption/decryption

**References**: spec.md:477-487 (LLM Config API), spec.md:420-436 (LLMConfig Model)

---

### [ ] 2.9: Phase 2 Integration Test

**Objective**: Verify all LLM components work together

**Tasks**:
- Create integration test that calls LLM via service
- Test provider switching
- Test fallback mechanism
- Verify API key encryption/decryption
- Test all three providers (mocked in CI, real in manual test)

**Verification**:
- Integration tests pass
- Provider factory selects correct provider
- Fallback works on primary failure
- Encrypted API keys decrypt correctly

**References**: spec.md:584-590 (Phase 2 Verification)

---

## PHASE 3: Phase Orchestration (Week 4)

### [ ] 3.1: Implement Phase State Machine

**Objective**: Create PhaseOrchestrator with state transition logic

**Tasks**:
- Create `packages/backend/src/services/PhaseOrchestrator.ts`
- Implement state machine with phases: discovery, planning, execution, verification
- Add validation to prevent invalid state transitions
- Implement "Stop-the-Line" rule enforcement
- Create methods: `startPhase()`, `completePhase()`, `failPhase()`
- Store phase context and history

**Verification**:
- Unit tests for all state transitions
- Invalid transitions throw errors
- Stop-the-Line prevents progression on failure
- Phase history tracked correctly

**References**: spec.md:89-110 (Phase Orchestration), spec.md:283 (PhaseOrchestrator.ts)

---

### [ ] 3.2: Implement Phase 1 Logic (Discovery)

**Objective**: Create discovery phase with clarification questions

**Tasks**:
- Create `packages/backend/src/services/phases/DiscoveryPhase.ts`
- Implement prompt parsing and analysis
- Generate clarifying questions using LLM
- Collect user responses
- Generate `architecture.md` with domain model, user stories, data models, API contracts
- Store spec file in database

**Verification**:
- Given user prompt, generates relevant questions
- Questions cover data models and API contracts
- Generated architecture.md follows template
- Spec file stored in database correctly

**References**: spec.md:84-96 (Phase 1 Discovery), requirements.md:83-97

---

### [ ] 3.3: Implement Phase 2 Logic (Planning)

**Objective**: Create planning phase with red teaming

**Tasks**:
- Create `packages/backend/src/services/phases/PlanningPhase.ts`
- Read `architecture.md` from database
- Break spec into atomic steps using LLM
- Implement red teaming (self-critique) logic
- Generate `plan.md` with steps, risks, mitigations
- Store plan in database

**Verification**:
- Given architecture.md, generates atomic steps
- Red teaming generates valid critiques and fixes
- Plan follows template structure
- Steps include verification strategy

**References**: spec.md:99-113 (Phase 2 Planning), requirements.md:99-113

---

### [ ] 3.4: Implement WebSocket Session Handler

**Objective**: Create real-time communication for generation sessions

**Tasks**:
- Install `ws` library
- Create `packages/backend/src/websocket/SessionHandler.ts`
- Create `packages/backend/src/websocket/ConnectionManager.ts`
- Implement WebSocket endpoint: `/ws/session/:sessionId`
- Add JWT authentication for WebSocket connections
- Implement event types: PHASE_CHANGED, CLARIFICATION_NEEDED, etc.
- Handle client events: CLARIFICATION_RESPONSE, APPROVE_SPEC, CANCEL_GENERATION

**Verification**:
- WebSocket connections establish successfully
- Authentication rejects invalid JWTs
- Server → client events deliver correctly
- Client → server events received and processed

**References**: spec.md:10 (ws ^8.16.0), spec.md:295-297 (SessionHandler), spec.md:489-543 (WebSocket Events)

---

### [ ] 3.5: Implement Generation Session Management

**Objective**: Create session lifecycle management

**Tasks**:
- Create `packages/backend/src/services/GenerationSession.ts`
- Implement session creation with unique ID
- Store active sessions in memory
- Link sessions to projects in database
- Handle session cleanup on completion/failure
- Implement session timeout

**Verification**:
- Sessions created with unique IDs
- Sessions tracked correctly
- Cleanup occurs on completion
- Timeout triggers after configured duration

**References**: spec.md:103-110 (GenerationSession interface)

---

### [ ] 3.6: Implement Projects API

**Objective**: Create CRUD endpoints for projects

**Tasks**:
- Create `packages/backend/src/api/routes/projects.ts`
- Implement GET `/api/projects` with pagination
- Implement GET `/api/projects/:id`
- Implement POST `/api/projects` to start generation
- Implement DELETE `/api/projects/:id`
- Create `packages/backend/src/services/ProjectService.ts`
- Link project creation to GenerationSession

**Verification**:
- All endpoints return correct responses
- Project creation starts generation session
- Pagination works correctly
- Delete removes project and files

**References**: spec.md:458-474 (Projects API), spec.md:283 (ProjectService.ts)

---

### [ ] 3.7: Store Phase Artifacts

**Objective**: Save generated specs to database

**Tasks**:
- Implement artifact storage in SpecFile model
- Create methods to save `architecture.md` and `plan.md`
- Link artifacts to projects
- Implement retrieval methods

**Verification**:
- Artifacts save correctly to database
- Artifacts retrievable by project ID
- Content stored as text without corruption

**References**: spec.md:391-403 (SpecFile Model)

---

### [ ] 3.8: Phase 3 Integration Test

**Objective**: Test full 4-phase flow with mocked generation

**Tasks**:
- Create integration test simulating full workflow
- Mock code generation (Phase 3) and verification (Phase 4)
- Test Phase 1: prompt → clarifications → spec approval
- Test Phase 2: spec → plan generation
- Verify state transitions work correctly
- Test WebSocket event delivery throughout flow

**Verification**:
- Full flow completes successfully
- State transitions occur in correct order
- Stop-the-Line prevents progression on simulated failure
- WebSocket events deliver in correct sequence

**References**: spec.md:612-618 (Phase 3 Verification)

---

## PHASE 4: Code Generation Engine (Weeks 5-6)

### [ ] 4.1: Design Template System Architecture

**Objective**: Create framework for app templates

**Tasks**:
- Create `packages/generator/src/templates/Template.ts` interface
- Define template structure: files, dependencies, configuration
- Create template registry for registration/lookup
- Design template inheritance for shared patterns

**Verification**:
- Template interface defined clearly
- Registry can register and retrieve templates
- TypeScript compilation succeeds

**References**: spec.md:137 (Template System), spec.md:239-263 (Generator Package Structure)

---

### [ ] 4.2: Create React Template

**Objective**: Build template for React + TypeScript + Vite apps

**Tasks**:
- Create `packages/generator/src/templates/react/template.ts`
- Define React project structure
- Create component templates (App, example components)
- Include Vite configuration
- Define default dependencies (react, react-dom, vite, typescript)
- Create TypeScript config for React

**Verification**:
- Template generates valid project structure
- Generated React app builds successfully
- Generated app runs with `npm run dev`

**References**: spec.md:246-249 (React Template), requirements.md:48-49 (React with TypeScript)

---

### [ ] 4.3: Create Next.js Template

**Objective**: Build template for Next.js App Router apps

**Tasks**:
- Create `packages/generator/src/templates/nextjs/template.ts`
- Define Next.js project structure with App Router
- Create layout and page templates
- Include Next.js configuration
- Define default dependencies (next, react, react-dom, typescript)
- Create TypeScript config for Next.js

**Verification**:
- Template generates valid Next.js structure
- Generated Next.js app builds successfully
- Generated app runs with `npm run dev`

**References**: spec.md:249 (Next.js Template), requirements.md:50 (Next.js App Router)

---

### [ ] 4.4: Create FastAPI Template

**Objective**: Build template for Python FastAPI apps

**Tasks**:
- Create `packages/generator/src/templates/fastapi/template.ts`
- Define FastAPI project structure
- Create main.py with FastAPI app
- Create example routes
- Define dependencies in requirements.txt (fastapi, uvicorn, pydantic)
- Include type hints throughout

**Verification**:
- Template generates valid Python structure
- Generated FastAPI app starts successfully
- Generated app responds to requests

**References**: spec.md:250 (FastAPI Template), requirements.md:62-66 (Python FastAPI)

---

### [ ] 4.5: Implement AST Builder

**Objective**: Create programmatic code construction

**Tasks**:
- Install Babel parser/generator dependencies
- Create `packages/generator/src/engine/ASTBuilder.ts`
- Implement methods for building common AST nodes:
  - Function declarations
  - Component definitions
  - Import statements
  - Type definitions
- Create utility to generate code from AST
- Add Prettier formatting to generated code

**Verification**:
- AST builder creates valid syntax trees
- Generated code from AST is syntactically correct
- Prettier formats output correctly
- Unit tests for each AST builder method

**References**: spec.md:12 (Babel dependencies), spec.md:137-138 (AST manipulation), spec.md:244 (ASTBuilder.ts)

---

### [ ] 4.6: Implement Dependency Resolver

**Objective**: Analyze imports and generate package.json

**Tasks**:
- Create `packages/generator/src/dependency/DependencyResolver.ts`
- Implement import statement parsing
- Map imports to npm package names
- Resolve version numbers (use latest or known-good versions)
- Handle peer dependencies
- Create `packages/generator/src/dependency/PackageJsonBuilder.ts`

**Verification**:
- Resolver identifies all dependencies from code
- Generates valid package.json
- Version resolution uses appropriate versions
- Peer dependencies included

**References**: spec.md:139 (Dependency Resolver), spec.md:260-262 (Dependency Package)

---

### [ ] 4.7: Implement File Writer

**Objective**: Create atomic file operations with rollback

**Tasks**:
- Create `packages/generator/src/engine/FileWriter.ts`
- Implement atomic write operations (write to temp, then move)
- Create directory structure creation
- Implement rollback mechanism (track operations, reverse on failure)
- Add file validation before writing

**Verification**:
- Files written atomically
- Rollback restores original state on failure
- Directory structure created correctly
- Unit tests for rollback mechanism

**References**: spec.md:138 (Atomic file operations), spec.md:244 (FileWriter.ts)

---

### [ ] 4.8: Implement Code Generation Engine

**Objective**: Orchestrate template + AST + file writing

**Tasks**:
- Create `packages/generator/src/engine/CodeGenerationEngine.ts`
- Implement `generate()` method:
  - Select template based on app type
  - Use LLM to generate component code
  - Build AST from generated code
  - Resolve dependencies
  - Write files using FileWriter
- Integrate with PlanningPhase output
- Handle generation errors with rollback

**Verification**:
- Generate sample React app end-to-end
- Generate sample Next.js app end-to-end
- Generate sample FastAPI app end-to-end
- Rollback works on simulated failure
- Generated apps are complete (no placeholders)

**References**: spec.md:140-150 (CodeGenerationEngine), spec.md:242 (CodeGenerationEngine.ts)

---

### [ ] 4.9: Implement Phase 3 Execution Logic

**Objective**: Integrate code generation into Phase 3

**Tasks**:
- Create `packages/backend/src/services/phases/ExecutionPhase.ts`
- Read `plan.md` from database
- Execute each step in plan using CodeGenerationEngine
- Send real-time updates via WebSocket (FILE_GENERATED events)
- Store generated files on filesystem
- Update project status in database

**Verification**:
- Phase 3 generates complete application
- Files written to correct directory
- WebSocket events sent for each file
- Project updated in database

**References**: requirements.md:118-134 (Phase 3 Execution)

---

### [ ] 4.10: Phase 4 Integration Test

**Objective**: Test code generation from spec to running app

**Tasks**:
- Create integration test: spec → generated code
- Test React template generation
- Test Next.js template generation
- Test FastAPI template generation
- Verify generated apps build successfully
- Verify no placeholders in generated code

**Verification**:
- All three app types generate successfully
- Generated apps build without errors
- No "TODO" or placeholder comments
- Files contain complete implementations

**References**: spec.md:635-642 (Phase 4 Verification)

---

## PHASE 5: Verification System (Week 7)

### [ ] 5.1: Create Verification Pipeline

**Objective**: Build multi-stage verification orchestrator

**Tasks**:
- Create `packages/generator/src/verifier/VerificationPipeline.ts`
- Implement stage execution in sequence
- Stop execution if any stage fails
- Collect results from all stages
- Store verification logs in database

**Verification**:
- Pipeline executes stages in order
- Stops on first failure
- Results captured correctly
- Unit tests for pipeline logic

**References**: spec.md:158-175 (Verification System), spec.md:252 (VerificationPipeline.ts)

---

### [ ] 5.2: Implement TypeCheck Stage

**Objective**: Run TypeScript/mypy type checking in child process

**Tasks**:
- Create `packages/generator/src/verifier/stages/TypeCheckStage.ts`
- Detect project type (TypeScript vs Python)
- Run `tsc --noEmit` for TypeScript projects
- Run `mypy` for Python projects
- Execute in child process with timeout
- Capture stdout/stderr

**Verification**:
- TypeCheck detects type errors correctly
- Timeout triggers after configured duration
- Error output captured fully
- Unit tests with sample projects

**References**: spec.md:255 (TypeCheckStage.ts), requirements.md:149 (Type checking)

---

### [ ] 5.3: Implement Lint Stage

**Objective**: Run linting in child process

**Tasks**:
- Create `packages/generator/src/verifier/stages/LintStage.ts`
- Detect linter based on project type (eslint vs ruff)
- Run linter command in child process
- Parse linting output
- Capture errors and warnings

**Verification**:
- Lint stage detects code style issues
- Output parsed correctly
- Works with different linters
- Unit tests with sample code

**References**: spec.md:256 (LintStage.ts), requirements.md:149 (Linting)

---

### [ ] 5.4: Implement Test Stage

**Objective**: Run test suites in child process

**Tasks**:
- Create `packages/generator/src/verifier/stages/TestStage.ts`
- Detect test runner (vitest vs pytest)
- Run test command in child process
- Parse test results
- Handle projects without tests gracefully

**Verification**:
- Test stage runs tests correctly
- Detects test failures
- Handles missing tests
- Timeout works for long test suites

**References**: spec.md:257 (TestStage.ts), requirements.md:150 (Unit tests)

---

### [ ] 5.5: Implement Build Stage

**Objective**: Run build command and verify success

**Tasks**:
- Create `packages/generator/src/verifier/stages/BuildStage.ts`
- Detect build command from package.json
- Run build in child process
- Verify build artifacts created
- Capture build errors

**Verification**:
- Build stage compiles projects successfully
- Build failures detected
- Artifacts verified
- Unit tests with sample projects

**References**: spec.md:258 (BuildStage.ts), requirements.md:151 (Create temporary verification script)

---

### [ ] 5.6: Implement Error Analyzer

**Objective**: Parse and analyze error messages

**Tasks**:
- Create `packages/generator/src/verifier/ErrorAnalyzer.ts`
- Implement parsers for common error formats:
  - TypeScript errors
  - ESLint errors
  - Python tracebacks
  - Build errors
- Extract file path, line number, error message
- Categorize errors (syntax, type, lint, runtime)

**Verification**:
- Parser handles various error formats
- Extracts correct information
- Categorizes errors appropriately
- Unit tests with real error messages

**References**: spec.md:259 (ErrorAnalyzer.ts), requirements.md:236-241 (Verification Failure Recovery)

---

### [ ] 5.7: Implement Auto-Fix for Common Errors

**Objective**: Automatically fix simple errors

**Tasks**:
- Extend ErrorAnalyzer with fix suggestions
- Implement fixes for common issues:
  - Missing imports
  - Unused variables
  - Formatting issues
- Use LLM for complex error fixes
- Apply fixes and re-verify

**Verification**:
- Auto-fix resolves simple errors
- Fixed code passes verification
- Complex errors escalate to LLM
- Unit tests for each fix type

**References**: spec.md:656 (Auto-fix for common errors), requirements.md:236-241 (Recovery)

---

### [ ] 5.8: Implement Phase 4 Verification Logic

**Objective**: Integrate verification into Phase 4

**Tasks**:
- Create `packages/backend/src/services/phases/VerificationPhase.ts`
- Run VerificationPipeline on generated project
- Send VERIFICATION_RESULT events via WebSocket
- Implement Stop-the-Line rule: halt on failure
- Attempt auto-fix on failure
- Retry verification after fix
- Escalate to user after 3 failures
- Store VerificationLogs in database

**Verification**:
- Phase 4 runs verification correctly
- Stop-the-Line prevents progression
- Auto-fix attempts applied
- User notified after max retries
- Logs stored in database

**References**: requirements.md:136-152 (Phase 4 Verification)

---

### [ ] 5.9: Phase 5 Integration Test

**Objective**: Test verification with intentionally broken code

**Tasks**:
- Generate project with intentional type error
- Verify TypeCheck stage detects it
- Generate project with lint issues
- Verify Lint stage detects them
- Test auto-fix functionality
- Test Stop-the-Line enforcement

**Verification**:
- All verification stages detect issues correctly
- Auto-fix resolves fixable issues
- Stop-the-Line prevents progression
- Error messages captured correctly

**References**: spec.md:659-665 (Phase 5 Verification)

---

## PHASE 6: Frontend (Weeks 8-9)

### [ ] 6.1: Set Up React Frontend with Vite

**Objective**: Initialize frontend package with React + TypeScript

**Tasks**:
- Create `packages/frontend` with Vite
- Install React, React DOM, TypeScript
- Install TailwindCSS and configure
- Create basic folder structure
- Configure Vite for development

**Verification**:
- `npm run dev` starts dev server
- Basic React app renders
- TailwindCSS styles apply

**References**: spec.md:61-69 (Frontend Dependencies)

---

### [ ] 6.2: Implement Routing

**Objective**: Set up React Router for navigation

**Tasks**:
- Install React Router DOM
- Create `packages/frontend/src/main.tsx` with router
- Create route definitions
- Create placeholder pages:
  - HomePage
  - ProjectDashboard
  - GenerationPage
  - ProjectDetail

**Verification**:
- Navigation works between pages
- URLs update correctly
- Browser back/forward works

**References**: spec.md:67 (react-router-dom), spec.md:311-314 (Pages)

---

### [ ] 6.3: Implement Authentication Pages

**Objective**: Create login and registration UI

**Tasks**:
- Create Login page component
- Create Register page component
- Create form validation with Zod
- Integrate with auth API endpoints
- Store JWT in localStorage
- Create protected route wrapper
- Handle auth errors

**Verification**:
- Registration creates user
- Login returns JWT and redirects
- Protected routes redirect to login when unauthenticated
- Form validation works

**References**: spec.md:311 (Pages), requirements.md:270-274 (Authentication)

---

### [ ] 6.4: Implement State Management

**Objective**: Set up Zustand stores

**Tasks**:
- Install Zustand
- Create `packages/frontend/src/store/auth.store.ts`
- Create `packages/frontend/src/store/generation.store.ts`
- Implement auth state (user, token, login/logout)
- Implement generation state (current session, phase, artifacts)

**Verification**:
- Auth store persists across page refresh
- State updates trigger re-renders
- Actions work correctly

**References**: spec.md:66 (zustand), spec.md:327-329 (Store)

---

### [ ] 6.5: Implement API Client

**Objective**: Create typed API client for backend

**Tasks**:
- Create `packages/frontend/src/api/client.ts`
- Implement methods for all API endpoints
- Add JWT token to requests
- Handle errors gracefully
- Set up React Query for data fetching

**Verification**:
- All API methods work correctly
- JWT included in authenticated requests
- Errors handled appropriately
- React Query caching works

**References**: spec.md:64 (React Query), spec.md:330-331 (API Client)

---

### [ ] 6.6: Implement WebSocket Hook

**Objective**: Create React hook for WebSocket connections

**Tasks**:
- Create `packages/frontend/src/hooks/useWebSocket.ts`
- Handle connection establishment with JWT
- Implement automatic reconnection
- Parse incoming events
- Send client events
- Handle disconnection gracefully

**Verification**:
- WebSocket connects successfully
- Events received and parsed
- Reconnection works after disconnect
- Hook integrates with React components

**References**: spec.md:324 (useWebSocket.ts)

---

### [ ] 6.7: Implement Project Dashboard

**Objective**: Create project list with search and filter

**Tasks**:
- Create `packages/frontend/src/pages/ProjectDashboard.tsx`
- Fetch projects from API
- Implement search by name
- Implement filter by status
- Implement pagination
- Add create new project button
- Add delete project functionality

**Verification**:
- Projects load and display
- Search filters correctly
- Pagination works
- Create navigates to generation page
- Delete removes project

**References**: spec.md:312 (ProjectDashboard.tsx), requirements.md:226-229 (User Projects)

---

### [ ] 6.8: Implement Prompt Input Page

**Objective**: Create generation start page

**Tasks**:
- Create `packages/frontend/src/components/PromptInput.tsx`
- Create textarea with validation
- Add app type selector (React, Next.js, FastAPI)
- Add LLM config selector
- Submit prompt to create project
- Navigate to generation page on submit

**Verification**:
- Validation rejects empty prompts
- App type selection works
- Project creation starts generation
- Redirects to generation page

**References**: spec.md:317 (PromptInput.tsx), requirements.md:28-35 (Primary Interface)

---

### [ ] 6.9: Implement Phase Progress Component

**Objective**: Create animated progress indicators

**Tasks**:
- Create `packages/frontend/src/components/PhaseProgress.tsx`
- Display 4 phases with current phase highlighted
- Animate phase transitions
- Show phase status (pending, in_progress, completed, failed)
- Display loading spinner during generation

**Verification**:
- Progress indicators display correctly
- Animations smooth
- Current phase highlighted
- Status updates via WebSocket

**References**: spec.md:318 (PhaseProgress.tsx), requirements.md:31 (Real-time progress)

---

### [ ] 6.10: Implement Clarification Dialog

**Objective**: Create interactive Q&A during Phase 1

**Tasks**:
- Create `packages/frontend/src/components/ClarificationDialog.tsx`
- Display questions from backend
- Collect user responses
- Send responses via WebSocket
- Handle multiple questions

**Verification**:
- Dialog appears on CLARIFICATION_NEEDED event
- User can type and submit answers
- Responses sent to backend correctly
- Multiple questions handled sequentially

**References**: spec.md:322 (ClarificationDialog.tsx), requirements.md:98 (Interactive Q&A)

---

### [ ] 6.11: Implement Spec Viewer

**Objective**: Display generated architecture.md and plan.md

**Tasks**:
- Create `packages/frontend/src/components/SpecViewer.tsx`
- Fetch spec files from API
- Render Markdown content
- Add approval button after Phase 1
- Send APPROVE_SPEC event on approval

**Verification**:
- Spec files display formatted correctly
- Approval button works
- Approval triggers Phase 2

**References**: spec.md:321 (SpecViewer.tsx), requirements.md:95-96 (Wait for approval)

---

### [ ] 6.12: Implement Code Viewer

**Objective**: Display generated code with syntax highlighting

**Tasks**:
- Install Monaco Editor
- Create `packages/frontend/src/components/CodeViewer.tsx`
- Display file tree of generated project
- Show file contents in Monaco Editor
- Syntax highlighting for multiple languages
- Read-only mode

**Verification**:
- File tree displays correctly
- Code renders with syntax highlighting
- Multiple file types supported
- Monaco Editor loads without errors

**References**: spec.md:68 (Monaco Editor), spec.md:319 (CodeViewer.tsx)

---

### [ ] 6.13: Implement Live Preview

**Objective**: Show running app in iframe

**Tasks**:
- Create `packages/frontend/src/components/LivePreview.tsx`
- Embed generated app in iframe
- Handle dev server URL from backend
- Display terminal output for non-web apps
- Show loading state while app starts

**Verification**:
- Web apps display in iframe
- Terminal output shows for CLI apps
- Loading state displays appropriately
- Errors handled gracefully

**References**: spec.md:320 (LivePreview.tsx), requirements.md:203-209 (Preview & Demo)

---

### [ ] 6.14: Implement Generation Page

**Objective**: Main page for generation flow

**Tasks**:
- Create `packages/frontend/src/pages/GenerationPage.tsx`
- Integrate PhaseProgress component
- Integrate ClarificationDialog
- Integrate SpecViewer with approval
- Integrate CodeViewer
- Integrate LivePreview
- Handle WebSocket connection
- Display generation errors

**Verification**:
- Full generation flow works end-to-end
- All components integrate correctly
- WebSocket events update UI
- Errors displayed to user

**References**: spec.md:313 (GenerationPage.tsx)

---

### [ ] 6.15: Implement Project Detail Page

**Objective**: View completed project details

**Tasks**:
- Create `packages/frontend/src/pages/ProjectDetail.tsx`
- Display project metadata
- Show all spec files
- Show generated code
- Add download project button
- Show verification logs

**Verification**:
- Project details load correctly
- Spec files display
- Code viewable
- Download works
- Verification logs readable

**References**: spec.md:314 (ProjectDetail.tsx)

---

### [ ] 6.16: Style and Polish UI

**Objective**: Create beautiful, modern design

**Tasks**:
- Apply TailwindCSS styling throughout
- Create consistent color scheme
- Add animations and transitions
- Ensure responsive design
- Add loading states
- Improve error messages
- Add tooltips and help text

**Verification**:
- UI looks modern and professional
- Responsive on mobile and desktop
- Animations smooth
- Lighthouse accessibility score > 90

**References**: requirements.md:291-295 (User Experience)

---

### [ ] 6.17: Frontend Testing

**Objective**: Write tests for React components

**Tasks**:
- Install React Testing Library
- Write unit tests for components
- Write integration tests for pages
- Mock API and WebSocket calls
- Achieve 70%+ coverage

**Verification**:
- All tests pass
- Coverage meets target
- Mock utilities work correctly

**References**: spec.md:751-760 (E2E Tests)

---

### [ ] 6.18: Phase 6 Integration Test

**Objective**: End-to-end frontend flow

**Tasks**:
- Install Playwright
- Write E2E test: Register → Login → Create Project → Generation → Download
- Test WebSocket reconnection
- Test responsive design
- Run Lighthouse audit

**Verification**:
- E2E test passes
- WebSocket reconnection works
- Responsive on multiple screen sizes
- Lighthouse score > 90

**References**: spec.md:686-692 (Phase 6 Verification)

---

## PHASE 7: Integration & Polish (Week 10)

### [ ] 7.1: End-to-End Testing

**Objective**: Full system test from prompt to running app

**Tasks**:
- Create E2E test suite for 3 app types
- Test: User prompt → React app running
- Test: User prompt → Next.js app running
- Test: User prompt → FastAPI app running
- Verify all phases execute correctly
- Verify generated apps run successfully

**Verification**:
- All 3 app types generate and run
- Success rate > 95%
- No errors in logs
- Generated apps match requirements

**References**: spec.md:701 (E2E testing), requirements.md:334-346 (Acceptance Criteria)

---

### [ ] 7.2: Implement Project Download

**Objective**: Download generated project as ZIP

**Tasks**:
- Install archiver library
- Implement GET `/api/projects/:id/download` endpoint
- Create ZIP archive of project files
- Stream ZIP to client
- Handle large projects efficiently

**Verification**:
- ZIP downloads correctly
- Contains all project files
- Extracts and runs successfully

**References**: spec.md:472-474 (Download endpoint), requirements.md:218 (Export as ZIP)

---

### [ ] 7.3: Implement Rate Limiting

**Objective**: Prevent abuse with rate limits

**Tasks**:
- Install express-rate-limit
- Add rate limiting middleware
- Configure limits: 10 generations/minute per user
- Return appropriate error messages
- Add rate limit headers to responses

**Verification**:
- Rate limit enforces correctly
- Limit resets after time window
- Error messages clear
- Headers include limit info

**References**: spec.md:704 (Rate limiting), spec.md:809 (10 requests/minute)

---

### [ ] 7.4: Implement Request Queueing

**Objective**: Handle concurrent generations gracefully

**Tasks**:
- Install Bull or similar job queue library
- Create generation job queue
- Implement job processing with concurrency limit
- Update UI to show queue position
- Handle job failures and retries

**Verification**:
- Multiple concurrent requests queue correctly
- Jobs process with configured concurrency
- UI shows queue position
- Failed jobs retry appropriately

**References**: spec.md:705 (Request queueing), requirements.md:264-267 (Scalability)

---

### [ ] 7.5: Implement Project Cleanup Job

**Objective**: Delete old projects automatically

**Tasks**:
- Create scheduled job to clean old projects
- Configure TTL (default 30 days)
- Delete project files from filesystem
- Delete database records
- Log cleanup operations

**Verification**:
- Job runs on schedule
- Old projects deleted correctly
- Database and filesystem stay in sync
- Logs capture all deletions

**References**: spec.md:706 (Project TTL cleanup), spec.md:212 (TTL-based deletion)

---

### [ ] 7.6: Implement Comprehensive Logging

**Objective**: Log all operations for debugging

**Tasks**:
- Set up structured logging (Winston or similar)
- Log all API requests/responses
- Log all LLM requests/responses
- Log all phase transitions
- Log all errors with stack traces
- Configure log levels (debug, info, warn, error)
- Store logs in files with rotation

**Verification**:
- All operations logged appropriately
- Log levels work correctly
- Log rotation prevents disk fill
- Logs parseable and searchable

**References**: spec.md:707 (Comprehensive logging), requirements.md:276 (Error logging)

---

### [ ] 7.7: Add Graceful Error Messages

**Objective**: Improve error UX throughout

**Tasks**:
- Review all error messages in UI
- Make errors user-friendly and actionable
- Add error recovery suggestions
- Implement error boundary in React
- Log detailed errors server-side, show simple messages client-side

**Verification**:
- Error messages clear and helpful
- Error boundary catches React errors
- Users can understand and act on errors

**References**: spec.md:703 (Graceful error messages), requirements.md:279 (Graceful degradation)

---

### [ ] 7.8: Create Deployment Configuration

**Objective**: Prepare for production deployment

**Tasks**:
- Create Dockerfile for backend
- Create Dockerfile for frontend
- Create docker-compose.yml for full stack
- Configure environment variables
- Create production build scripts
- Document deployment process

**Verification**:
- Docker images build successfully
- docker-compose starts full stack
- Environment variables configured correctly
- Build scripts work

**References**: spec.md:709 (Docker configuration), requirements.md:197-200 (Deployment Capabilities)

---

### [ ] 7.9: Create Documentation

**Objective**: Document setup and usage

**Tasks**:
- Create README.md with:
  - Project overview
  - Setup instructions
  - Environment variables
  - Running locally
  - Running tests
  - Deployment instructions
- Create API documentation (Swagger/OpenAPI)
- Create architecture diagram
- Document LLM configuration

**Verification**:
- README complete and accurate
- Setup instructions work for new developers
- API documentation accessible
- Architecture diagram clear

**References**: spec.md:710 (README and setup documentation), requirements.md:188 (README with setup)

---

### [ ] 7.10: Performance Optimization

**Objective**: Optimize for performance targets

**Tasks**:
- Profile API endpoints for slow queries
- Optimize database queries with indexes
- Add Redis caching for frequently accessed data
- Optimize frontend bundle size
- Implement lazy loading for large components
- Measure and optimize LLM response times

**Verification**:
- API p95 response time < 200ms
- Frontend initial load < 3s
- Phase timings meet targets
- WebSocket latency < 100ms

**References**: spec.md:793-800 (Performance Benchmarks), requirements.md:256-261 (Performance)

---

### [ ] 7.11: Security Audit

**Objective**: Ensure security best practices

**Tasks**:
- Review all API endpoints for auth
- Verify API key encryption
- Test for SQL injection vulnerabilities
- Test for XSS vulnerabilities
- Verify file path validation
- Run `npm audit` and fix vulnerabilities
- Configure CORS properly
- Verify JWT secret strong and environment-based

**Verification**:
- All endpoints properly authenticated
- No SQL injection possible
- No XSS possible
- npm audit reports no high/critical vulnerabilities
- CORS configured correctly

**References**: spec.md:804-815 (Security Considerations), requirements.md:268-274 (Security)

---

### [ ] 7.12: Load Testing

**Objective**: Verify system handles load

**Tasks**:
- Install load testing tool (k6 or similar)
- Create load test for concurrent generations
- Test with 10 concurrent users
- Monitor resource usage
- Identify bottlenecks
- Verify queue system works under load

**Verification**:
- System handles 10 concurrent generations
- No crashes or errors
- Response times acceptable
- Resources stay within limits

**References**: spec.md:717 (Load testing), requirements.md:264-267 (Scalability)

---

### [ ] 7.13: Final MVP Acceptance Testing

**Objective**: Verify all acceptance criteria met

**Tasks**:
- Test: User can input natural language prompt ✓
- Test: System generates specs/architecture.md ✓
- Test: System creates specs/plan.md ✓
- Test: System generates complete working app ✓
- Test: All code passes linting and type checking ✓
- Test: Generated web app runs and displays in preview ✓
- Test: User can download generated project ✓
- Test: React and Next.js generation work ✓
- Test: At least one LLM provider works ✓
- Test: All 4 phases execute with progress indicators ✓
- Test: Stop-the-Line rule enforced ✓
- Test: Generated apps meet "Definition of Done" ✓

**Verification**:
- All acceptance criteria pass
- MVP complete and functional

**References**: requirements.md:334-360 (Acceptance Criteria)

---

### [ ] 7.14: Production Deployment

**Objective**: Deploy to production environment

**Tasks**:
- Set up PostgreSQL database in production
- Deploy backend service
- Deploy frontend to CDN/hosting
- Configure environment variables
- Set up SSL certificates
- Configure monitoring and alerts
- Test production deployment

**Verification**:
- Production site accessible
- All features work in production
- SSL certificate valid
- Monitoring reporting correctly

**References**: requirements.md:197-200 (Deployment)

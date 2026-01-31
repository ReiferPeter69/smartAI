# Architect Prime v3.0 (OBSIDIAN)

**Autonomous Software Architect** - Production-ready code generation system with zero-trust verification.

## 🚀 Overview

OBSIDIAN is an advanced AI-powered software architecture system that generates complete, production-ready applications from natural language prompts. It follows a 4-phase approach:

1. **Discovery** - Analyzes requirements and generates architecture specs
2. **Planning** - Creates atomic implementation steps with self-critique
3. **Execution** - Generates complete, tested code
4. **Verification** - Validates with type-checking, linting, tests, and builds

## 📊 Current Status

- ✅ **Phase 1**: Foundation & Infrastructure (Complete)
- ✅ **Phase 2**: LLM Integration (Complete)
- ✅ **Phase 3**: Phase Orchestration (Complete)
- ⏳ **Phase 4**: Code Generation Engine (Next)
- ⏳ **Phase 5**: Verification System
- ⏳ **Phase 6**: Frontend
- ⏳ **Phase 7**: Integration & Polish

## 🏗️ Project Structure

```
obsidian/
├── packages/
│   ├── backend/        # Express API, LLM services, database
│   ├── frontend/       # React UI for generation flow
│   ├── core/          # Shared types, utilities, validation
│   └── generator/     # Code generation engine
├── .zenflow/
│   └── tasks/
│       └── new-task-eccf/
│           ├── plan.md          # Implementation roadmap
│           ├── spec.md          # Technical specification
│           └── requirements.md  # Product requirements
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express** - API server
- **TypeScript** (strict mode) - Type safety
- **Prisma** + **PostgreSQL** - Database ORM
- **OpenAI / Anthropic / Ollama** - LLM providers
- **Vitest** - Testing framework

### Frontend
- **React** + **TypeScript** - UI
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Zustand** - State management
- **React Query** - Data fetching
- **Monaco Editor** - Code viewer

### Generator
- **Babel** - AST manipulation
- **Template System** - React, Next.js, FastAPI templates

## 🔧 Setup Instructions

### Prerequisites

- **Node.js** >= 18.0.0
- **PostgreSQL** >= 14.0
- **npm** or **pnpm**

### 1. Clone Repository

```bash
git clone https://github.com/ReiferPeter69/smartAI.git
cd smartAI
git checkout new-task-eccf
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Database

```bash
# Copy environment example
cp packages/backend/.env.example packages/backend/.env

# Edit .env and set your PostgreSQL connection:
# DATABASE_URL="postgresql://user:password@localhost:5432/obsidian?schema=public"
```

### 4. Setup Database

```bash
cd packages/backend

# Generate Prisma Client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Open Prisma Studio
npm run db:studio
```

### 5. Configure LLM Providers

Add at least one LLM API key to your `.env`:

```bash
# OpenAI
OPENAI_API_KEY="sk-..."

# Anthropic
ANTHROPIC_API_KEY="sk-ant-..."

# Ollama (local)
OLLAMA_ENDPOINT="http://localhost:11434"
```

### 6. Build All Packages

```bash
# From root directory
npm run build
```

### 7. Run Tests

```bash
# Run all tests
npm test

# Run tests in specific package
cd packages/backend
npm test
```

### 8. Start Development Server

```bash
# Backend
cd packages/backend
npm run dev

# Frontend (in another terminal)
cd packages/frontend
npm run dev
```

## 📝 Development Workflow

### Running Checks

```bash
# Lint all packages
npm run lint

# Type check all packages
npm run typecheck

# Run tests
npm test

# Build all packages
npm run build
```

### Database Operations

```bash
cd packages/backend

# Create new migration
npm run db:migrate

# Reset database
npx prisma migrate reset

# Seed database (if seed script exists)
npx prisma db seed
```

## 🧪 Testing

### Test Structure

- **Unit Tests**: `*.test.ts` - Test individual functions/classes
- **Integration Tests**: `*.integration.test.ts` - Test component interactions
- **E2E Tests**: Phase-specific integration tests

### Running Tests

```bash
# All tests
npm test

# Watch mode
npm test -- --watch

# Specific file
npm test -- path/to/file.test.ts

# Coverage report
npm test -- --coverage
```

### Current Test Results

- **Phase 1**: ✅ All tests passing
- **Phase 2**: ✅ 12/12 automated tests passing (7 manual tests skipped)
- **Phase 3**: ✅ All tests passing (375 passed, 7 skipped)

## 📚 Key Documentation

- **Implementation Plan**: `.zenflow/tasks/new-task-eccf/plan.md`
- **Technical Spec**: `.zenflow/tasks/new-task-eccf/spec.md`
- **Requirements**: `.zenflow/tasks/new-task-eccf/requirements.md`
- **Phase 1 Results**: `PHASE1_INTEGRATION_TEST_RESULTS.md`
- **Phase 2 Results**: `PHASE2_INTEGRATION_TEST_RESULTS.md`
- **Phase 3 Results**: `PHASE3_INTEGRATION_TEST_RESULTS.md`

## 🔐 Security

- **API Keys**: Encrypted using AES-256-CBC before database storage
- **JWT**: Authentication tokens for API access
- **Password Hashing**: bcrypt for user passwords
- **Environment Variables**: Sensitive data in `.env` (not committed)

## 🏛️ Architecture Principles

### Core Directives

1. **Correctness over Speed** - Every line verified
2. **No Placeholders** - Complete implementations only
3. **Strict Typing** - TypeScript strict mode, Zod validation
4. **Test-First** - Tests alongside implementation
5. **Atomicity** - One file at a time, verify, then next
6. **Zero Hallucination** - Check dependencies, search syntax

### The 4-Phase Flow

```
User Prompt
    ↓
Phase 1: Discovery (architecture.md)
    ↓
Phase 2: Planning (plan.md) with Red Teaming
    ↓
Phase 3: Execution (Generated Code)
    ↓
Phase 4: Verification (Stop-the-Line on failure)
    ↓
Working Application
```

## 🤝 Contributing

### Before Committing

```bash
# Ensure all checks pass
npm run lint
npm run typecheck
npm test
```

### Commit Convention

```
<phase>: <description>

Examples:
- 1.1: Initialize Monorepo Structure
- 2.3: Implement Anthropic Provider
- 3.5: Implement Generation Session Management
```

### Workflow

1. Work on a task from `plan.md`
2. Mark task as `[x]` when complete
3. Run all checks
4. Commit with descriptive message
5. Push to GitHub

## 🚀 Next Steps

1. Implement Phase 3 (Phase Orchestration)
2. Build WebSocket session management
3. Create discovery/planning phase logic
4. Test full 4-phase workflow

## 📞 Support

For questions or issues, refer to:
- Implementation Plan: `.zenflow/tasks/new-task-eccf/plan.md`
- Technical Spec: `.zenflow/tasks/new-task-eccf/spec.md`

## 📄 License

[Add your license here]

---

**Built with precision, verified with rigor, deployed with confidence.** 🎯

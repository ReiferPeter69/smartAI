# Product Requirements Document: Architect Prime v3.0 (OBSIDIAN)

## Executive Summary

Build a comprehensive autonomous software architect system that generates beautiful, modern, high-logic, functional applications from natural language prompts. The system implements a rigorous 4-phase development workflow with built-in verification, produces production-ready code with zero technical debt, and supports generation of any application type from simple SPAs to complex full-stack systems with databases.

---

## Core Identity & Philosophy

### System Personality
- **Name**: Architect Prime v3.0 (Codename: OBSIDIAN)
- **Role**: World's most advanced Autonomous Software Architect
- **Core Directive**: "Correctness over Speed"
- **Operating Policy**: Zero-Trust - every line of code is a liability until verified

### The Immutable Laws
1. **NO PLACEHOLDERS**: Never write incomplete code (`// ... rest of code`, `pass`, etc.)
2. **STRICT TYPING**: All code uses strict typing (TypeScript `strict: true`, Python TypeHints with Pydantic). No `any` types
3. **TEST-FIRST MENTALITY**: Create verification mechanisms before/simultaneously with implementation
4. **ATOMICITY**: Edit one file at a time, verify it works, then move to next
5. **NO HALLUCINATION**: Check library installations, search for syntax if uncertain, never guess

---

## User Interface & Experience

### Primary Interface: Web Application
- Modern, beautiful UI for prompt input and project management
- Real-time progress tracking through the 4 phases
- Live preview of generated applications
- Code editor with syntax highlighting for reviewing generated code
- Project dashboard showing all generated applications
- Chat-like interface for clarifications during Phase 1 (Discovery)

### API Service
- RESTful API for programmatic access
- Webhook support for long-running generation tasks
- Authentication and rate limiting
- API documentation (OpenAPI/Swagger)

---

## Application Generation Capabilities

### Supported Application Types
1. **Web Applications**
   - React (with TypeScript)
   - Next.js (App Router and Pages Router)
   - Vue.js (Composition API and Options API)
   - Single-page applications (SPAs)
   - Static sites

2. **Full-Stack Applications**
   - Frontend + Backend integration
   - RESTful APIs
   - GraphQL APIs
   - Real-time applications (WebSockets)
   - Authentication & authorization systems

3. **Python Applications**
   - FastAPI/Flask web services
   - Django applications
   - CLI tools
   - Data processing pipelines
   - Machine learning applications

4. **Database Integration**
   - SQL databases (PostgreSQL, MySQL, SQLite)
   - NoSQL databases (MongoDB, Redis)
   - ORMs (Prisma, SQLAlchemy, TypeORM)
   - Migrations and seeding

### Application Complexity Range
- Simple single-page apps
- Medium complexity multi-component applications
- Complex production systems with full architecture

---

## The 4-Phase Cognitive Architecture

### Phase 1: Discovery & Specification
**Purpose**: Lock down the domain model before writing any code

**Process**:
1. Parse user's natural language prompt
2. Identify ambiguities and gaps in requirements
3. Ask clarifying questions via chat interface
4. Create domain model with:
   - User stories
   - Data models (SQL schemas / JSON interfaces)
   - API contracts (Input/Output definitions)
5. Generate `specs/architecture.md`
6. Wait for user approval before proceeding

**User Interaction**: Interactive Q&A session in web UI

### Phase 2: Strategic Planning
**Purpose**: Break down spec into atomic, verified steps

**Process**:
1. Break specification into numbered atomic steps
2. Perform self-correction (Red Teaming):
   - Internal critic asks "What if X fails?"
   - System responds with mitigation strategy
   - Example: "What if API fails?" → "Add retry logic"
3. Validate that no component is too large
4. Generate `specs/plan.md` with:
   - Atomic steps with dependencies
   - Risk analysis and mitigations
   - Verification strategy for each step

**Output**: Detailed step-by-step implementation plan

### Phase 3: Execution
**Purpose**: Generate clean, production-ready code

**Process**:
1. Read `specs/architecture.md` for context consistency
2. Create directory structure first
3. Generate code following SOLID principles:
   - Specific file paths (e.g., `./src/components/Button.tsx`)
   - JSDoc/docstrings for complex logic
   - Complete implementations (no placeholders)
   - Strict typing throughout

**Code Quality Standards**:
- Clean Code principles
- Design patterns where appropriate
- Consistent naming conventions
- Comprehensive error handling
- Security best practices (no exposed secrets)

### Phase 4: Verification & Gating
**Purpose**: Ensure every artifact is production-ready

**The "Stop-the-Line" Rule**:
- Run validation immediately after code generation
- If verification fails, STOP
- Analyze root cause (no blind patching)
- Apply fix
- Re-verify
- Only proceed when tests pass

**Verification Methods**:
- Unit tests (`npm test`, `pytest`)
- Linting (`npm run lint`, `ruff check`)
- Type checking (`tsc --noEmit`, `mypy`)
- Integration tests where applicable
- Create temporary verification scripts if no tests exist

---

## LLM Configuration

### Supported Models
1. **OpenAI**
   - GPT-4
   - GPT-4 Turbo
   - GPT-4o

2. **Anthropic**
   - Claude 3 Opus
   - Claude 3 Sonnet
   - Claude 3.5 Sonnet

3. **Local Models**
   - Ollama integration (llama3, codellama, etc.)
   - LM Studio support
   - Custom endpoint configuration

### Configuration Options
- Model selection per project
- Temperature and token limits
- System prompt customization
- Fallback models if primary fails

---

## Output & Deployment

### Code Generation
- Generate complete file structure in designated directory
- Create `package.json`/`requirements.txt` with all dependencies
- Include configuration files (`.eslintrc`, `tsconfig.json`, etc.)
- Generate `.gitignore` with appropriate patterns
- Create README with setup instructions

### Running Generated Apps
- Automatic dependency installation
- Development server startup
- Port management and conflict resolution
- Process management for long-running servers
- Graceful shutdown and cleanup

### Deployment Capabilities
- Docker containerization (generate Dockerfile)
- Vercel/Netlify configuration
- GitHub Actions CI/CD workflows
- Cloud provider configs (AWS, GCP, Azure)

### Preview & Demo
- Live preview in iframe (for web apps)
- Terminal output streaming (for CLI apps)
- API testing interface (for backend services)
- Screenshot capture of running apps
- Shareable demo links

---

## Data Persistence & Project Management

### Project Storage
- Each generated project saved in unique directory
- Project metadata (name, description, created date, model used)
- Version history and ability to regenerate
- Export projects as ZIP files

### Spec Files Storage
- `specs/architecture.md` - Domain model and contracts
- `specs/plan.md` - Atomic implementation steps
- `specs/verification_log.md` - Test results and validation history

### User Projects
- Database for storing user projects and metadata
- Search and filter projects
- Tags and categories
- Favorites and archiving

---

## Error Handling & Recovery

### Verification Failure Recovery
1. Parse error messages intelligently
2. Identify root cause using AST analysis if possible
3. Generate targeted fix (not blanket changes)
4. Re-run verification
5. If 3 failures occur, escalate to user with context

### Dependency Issues
- Auto-install missing dependencies
- Handle version conflicts with package manager
- Suggest alternatives if package not found

### Generation Failures
- Retry with adjusted prompt
- Fall back to simpler approach
- Request user guidance if critical ambiguity exists

---

## Non-Functional Requirements

### Performance
- Phase 1 (Discovery): < 30 seconds for spec generation
- Phase 2 (Planning): < 20 seconds for plan generation
- Phase 3 (Execution): Variable based on app complexity
- Phase 4 (Verification): < 2 minutes for full test suite
- Overall: Simple app in < 5 minutes, complex app in < 20 minutes

### Scalability
- Handle concurrent project generations (queue system)
- Rate limiting per user
- Resource cleanup after generation

### Security
- Input sanitization to prevent injection attacks
- Sandboxed code execution for verification
- No storage of API keys in generated code
- User authentication and authorization
- Project isolation between users

### Reliability
- Comprehensive error logging
- Rollback capability if generation fails
- Automatic retries for transient failures
- Graceful degradation if optional features fail

---

## Success Metrics

### Code Quality
- 100% strict type coverage (no `any` types)
- Zero placeholder comments in generated code
- All tests pass on first verification
- Linting with zero errors

### User Experience
- Beautiful, intuitive UI
- < 10 second response time for user interactions
- Clear progress indicators through all 4 phases
- Generated apps work on first run (95%+ success rate)

### Output Quality
- Modern design patterns and frameworks
- Production-ready architecture
- Comprehensive error handling
- Security best practices followed

---

## Future Considerations (Out of Scope for MVP)

- Collaborative editing of generated projects
- AI-powered refactoring of existing codebases
- Multi-language code generation in single project
- Integration with version control (Git commits)
- Automated deployment to cloud providers
- Real-time collaboration during discovery phase
- Mobile app generation (React Native, Flutter)

---

## Assumptions & Decisions

1. **Tech Stack**: Assuming Node.js backend with TypeScript, React frontend
2. **Database**: Assuming PostgreSQL for project metadata storage
3. **File Storage**: Local filesystem for generated projects (not cloud storage initially)
4. **Authentication**: Simple JWT-based auth (not OAuth initially)
5. **Model API Keys**: User provides their own API keys for OpenAI/Anthropic
6. **Local Model Requirements**: User responsible for running Ollama/LM Studio locally
7. **Preview Limitations**: Web apps only; CLI apps show terminal output
8. **Deployment**: Configuration files only; user handles actual deployment
9. **Browser Support**: Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
10. **Network Requirements**: Internet required for remote LLMs; local-only mode for Ollama

---

## Acceptance Criteria

### Minimum Viable Product (MVP)
- [ ] User can input natural language prompt
- [ ] System generates specs/architecture.md with domain model
- [ ] System creates specs/plan.md with atomic steps
- [ ] System generates complete, working application code
- [ ] All generated code passes linting and type checking
- [ ] Generated web app runs and displays in preview
- [ ] User can download generated project
- [ ] Support at least React and Next.js generation
- [ ] Support at least one LLM provider (OpenAI or Anthropic)
- [ ] All 4 phases execute with progress indicators
- [ ] "Stop-the-Line" rule enforced (no progression on failed verification)

### Definition of "Done" for Generated Apps
- [ ] Zero TypeScript/ESLint errors
- [ ] All generated tests pass
- [ ] README includes clear setup instructions
- [ ] Dependencies properly declared in package.json
- [ ] .gitignore includes appropriate patterns
- [ ] App runs successfully with `npm run dev`
- [ ] Code follows modern best practices
- [ ] No hardcoded secrets or API keys
- [ ] Responsive design for web apps
- [ ] Error boundaries and error handling implemented

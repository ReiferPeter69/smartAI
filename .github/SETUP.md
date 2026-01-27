# Quick Setup Guide

## ⚡ Fast Start (5 Minutes)

### 1. Clone & Install
```bash
git clone https://github.com/ReiferPeter69/smartAI.git
cd smartAI
git checkout new-task-eccf
npm install
```

### 2. Database Setup
```bash
# Copy .env
cp packages/backend/.env.example packages/backend/.env

# Edit packages/backend/.env:
# DATABASE_URL="postgresql://postgres:postgres@localhost:5432/obsidian"

# Setup database
cd packages/backend
npm run db:generate
npm run db:migrate
```

### 3. Verify Setup
```bash
# Run tests
npm test

# Build
npm run build

# Lint & Typecheck
npm run lint
npm run typecheck
```

## ✅ You're Ready!

All files, configurations, tests, and progress are included. You can start from exactly where work was left off.

## 📂 Important Files

- `README.md` - Full setup instructions
- `.zenflow/tasks/new-task-eccf/plan.md` - Implementation roadmap
- `.zenflow/tasks/new-task-eccf/spec.md` - Technical specification
- `packages/backend/.env.example` - Environment template
- `PHASE1_INTEGRATION_TEST_RESULTS.md` - Phase 1 results
- `PHASE2_INTEGRATION_TEST_RESULTS.md` - Phase 2 results

## 🎯 Current Status

**Phase 1**: ✅ Complete  
**Phase 2**: ✅ Complete  
**Next**: Phase 3 (Phase Orchestration)

## 🔑 Required API Keys

Add to `packages/backend/.env`:
- `OPENAI_API_KEY` (optional)
- `ANTHROPIC_API_KEY` (optional)
- `OLLAMA_ENDPOINT` (optional, defaults to http://localhost:11434)

At least one provider needed for LLM functionality.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanningPhase } from './PlanningPhase';
import type { LLMConfig } from '../../llm/types';

vi.mock('../LLMService');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

const mockLLMConfig: LLMConfig = {
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
};

const mockArchitectureSpec = `# Project Overview
A task management application with projects and tasks.

# User Stories
- As a user, I want to create projects
- As a user, I want to add tasks to projects

# Domain Model
- User: id, email, passwordHash
- Project: id, name, userId
- Task: id, title, projectId, isCompleted

# Data Models
## User
- id: string (UUID)
- email: string (unique)
- passwordHash: string

## Project
- id: string (UUID)
- name: string
- userId: string (FK)

## Task
- id: string (UUID)
- title: string
- projectId: string (FK)
- isCompleted: boolean

# API Contracts
## POST /api/projects
Request: { name: string }
Response: { id: string, name: string, userId: string }

## GET /api/projects/:id
Response: { id: string, name: string, tasks: Task[] }

# Technical Constraints
- TypeScript strict mode
- PostgreSQL database
- JWT authentication`;

const mockInitialPlan = `# Implementation Plan: Task Management Application

## PHASE A: Foundation (Steps 1-3)

### Step 1: Initialize TypeScript Project

**Objective**: Create project structure with TypeScript

**Dependencies**: None

**Files to Create/Modify**:
- \`package.json\` - Workspace configuration
- \`tsconfig.json\` - TypeScript config

**Implementation Details**:
- Install TypeScript ^5.3.0
- Configure strict mode
- Set up ESLint and Prettier

**Verification Method**:
- [ ] \`npm install\` completes
- [ ] \`tsc --noEmit\` runs without errors

**Red Team Critique**:
- **Risk**: TBD
- **Mitigation**: TBD

---

### Step 2: Create Prisma Schema

**Objective**: Define database models

**Dependencies**: Step 1

**Files to Create/Modify**:
- \`prisma/schema.prisma\` - Database schema

**Implementation Details**:
- Define User model
- Define Project model
- Define Task model
- Configure PostgreSQL connection

**Verification Method**:
- [ ] \`npx prisma validate\` succeeds
- [ ] \`npx prisma generate\` creates client

**Red Team Critique**:
- **Risk**: TBD
- **Mitigation**: TBD

---

### Step 3: Run Initial Migration

**Objective**: Apply schema to database

**Dependencies**: Step 2

**Files to Create/Modify**:
- \`prisma/migrations/\` - Migration files

**Implementation Details**:
- Run \`npx prisma migrate dev\`
- Verify tables created

**Verification Method**:
- [ ] Migration applies successfully
- [ ] Tables exist in database

**Red Team Critique**:
- **Risk**: TBD
- **Mitigation**: TBD

## VERIFICATION GATES

### Gate 1: Foundation Complete (After Step 3)
- [ ] TypeScript compiles with strict mode
- [ ] Database migrations applied
- [ ] No linting errors

## DEPENDENCY GRAPH

\`\`\`
Step 1 → Step 2 → Step 3
\`\`\``;

const mockRedTeamCritiques = `## Step 1: Initialize TypeScript Project

**Critique 1**:
- **Concern**: Wrong TypeScript version could cause compatibility issues
- **Fix**: Lock version to ^5.3.0 in package.json

**Critique 2**:
- **Concern**: Missing error handling for installation failures
- **Fix**: Add validation script that checks required dependencies

## Step 2: Create Prisma Schema

**Critique 1**:
- **Concern**: Missing indexes on foreign keys could cause slow queries
- **Fix**: Add @@index([userId]) on Project, @@index([projectId]) on Task

**Critique 2**:
- **Concern**: No cascade delete handling could leave orphaned records
- **Fix**: Add onDelete: Cascade to relations

## Step 3: Run Initial Migration

**Critique 1**:
- **Concern**: Migration could fail if DATABASE_URL is invalid
- **Fix**: Add connection test before running migration with clear error message`;

const mockFinalPlan = `# Implementation Plan: Task Management Application (Refined)

## PHASE A: Foundation (Steps 1-3)

### Step 1: Initialize TypeScript Project

**Objective**: Create project structure with TypeScript

**Dependencies**: None

**Files to Create/Modify**:
- \`package.json\` - Workspace configuration
- \`tsconfig.json\` - TypeScript config

**Implementation Details**:
- Install TypeScript ^5.3.0 (locked version)
- Configure strict mode
- Set up ESLint and Prettier
- Add validation script for required dependencies

**Verification Method**:
- [ ] \`npm install\` completes
- [ ] \`tsc --noEmit\` runs without errors
- [ ] Validation script confirms all dependencies present

**Red Team Critique**:
- **Risk**: Wrong TypeScript version could cause compatibility issues
- **Mitigation**: Lock version to ^5.3.0 in package.json, add validation script

---

### Step 2: Create Prisma Schema

**Objective**: Define database models with proper indexing

**Dependencies**: Step 1

**Files to Create/Modify**:
- \`prisma/schema.prisma\` - Database schema

**Implementation Details**:
- Define User model
- Define Project model with @@index([userId])
- Define Task model with @@index([projectId])
- Configure PostgreSQL connection
- Add onDelete: Cascade to all relations

**Verification Method**:
- [ ] \`npx prisma validate\` succeeds
- [ ] \`npx prisma generate\` creates client
- [ ] Schema includes all indexes and cascade deletes

**Red Team Critique**:
- **Risk**: Missing indexes on foreign keys could cause slow queries; orphaned records
- **Mitigation**: Add indexes on all foreign keys, configure cascade deletes

---

### Step 3: Run Initial Migration

**Objective**: Apply schema to database with validation

**Dependencies**: Step 2

**Files to Create/Modify**:
- \`prisma/migrations/\` - Migration files
- \`scripts/test-db-connection.ts\` - Connection test script

**Implementation Details**:
- Create connection test script
- Run connection test before migration
- Run \`npx prisma migrate dev\`
- Verify tables created with correct indexes

**Verification Method**:
- [ ] Connection test passes
- [ ] Migration applies successfully
- [ ] Tables exist in database with indexes

**Red Team Critique**:
- **Risk**: Migration could fail if DATABASE_URL is invalid
- **Mitigation**: Test connection before migration with clear error messages

## VERIFICATION GATES

### Gate 1: Foundation Complete (After Step 3)
- [ ] TypeScript compiles with strict mode
- [ ] Database migrations applied
- [ ] All indexes created
- [ ] No linting errors

## DEPENDENCY GRAPH

\`\`\`
Step 1 → Step 2 → Step 3
\`\`\``;

describe('PlanningPhase', () => {
  let planningPhase: PlanningPhase;

  beforeEach(() => {
    vi.clearAllMocks();
    
    planningPhase = new PlanningPhase({
      architectureSpec: mockArchitectureSpec,
      appType: 'react',
      llmConfig: mockLLMConfig,
    });
  });

  describe('generateInitialPlan', () => {
    it('should generate initial implementation plan', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockInitialPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      const result = await planningPhase.generateInitialPlan();

      expect(result).toBe(mockInitialPlan);
      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.5,
          maxTokens: 6000,
        })
      );
    });

    it('should throw error if LLM call fails', async () => {
      const mockGenerateResponse = vi.fn().mockRejectedValue(new Error('LLM API error'));

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await expect(planningPhase.generateInitialPlan()).rejects.toThrow(
        'Initial plan generation failed'
      );
    });

    it('should include architecture spec in prompt', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockInitialPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.generateInitialPlan();

      const userMessage = mockGenerateResponse.mock.calls[0][0].find(
        (msg: any) => msg.role === 'user'
      );
      
      expect(userMessage.content).toContain('User: id, email, passwordHash');
      expect(userMessage.content).toContain('APPLICATION TYPE: react');
    });
  });

  describe('performRedTeaming', () => {
    beforeEach(async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockInitialPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.generateInitialPlan();
    });

    it('should throw error if no initial plan exists', async () => {
      const newPhase = new PlanningPhase({
        architectureSpec: mockArchitectureSpec,
        appType: 'react',
        llmConfig: mockLLMConfig,
      });

      await expect(newPhase.performRedTeaming()).rejects.toThrow(
        'Cannot perform red teaming without initial plan'
      );
    });

    it('should generate red team critiques', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockRedTeamCritiques,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      const critiques = await planningPhase.performRedTeaming();

      expect(critiques).toHaveLength(3);
      expect(critiques[0]).toEqual({
        stepNumber: 1,
        critiques: [
          {
            concern: 'Wrong TypeScript version could cause compatibility issues',
            fix: 'Lock version to ^5.3.0 in package.json',
          },
          {
            concern: 'Missing error handling for installation failures',
            fix: 'Add validation script that checks required dependencies',
          },
        ],
      });
    });

    it('should include original plan in red team prompt', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockRedTeamCritiques,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.performRedTeaming();

      const userMessage = mockGenerateResponse.mock.calls[0][0].find(
        (msg: any) => msg.role === 'user'
      );
      
      expect(userMessage.content).toContain('IMPLEMENTATION PLAN TO CRITIQUE');
      expect(userMessage.content).toContain(mockInitialPlan);
    });
  });

  describe('generateFinalPlan', () => {
    beforeEach(async () => {
      let callCount = 0;
      const mockGenerateResponse = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            content: mockInitialPlan,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        } else {
          return Promise.resolve({
            content: mockRedTeamCritiques,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        }
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.generateInitialPlan();
      await planningPhase.performRedTeaming();
    });

    it('should throw error if no initial plan exists', async () => {
      const newPhase = new PlanningPhase({
        architectureSpec: mockArchitectureSpec,
        appType: 'react',
        llmConfig: mockLLMConfig,
      });

      await expect(newPhase.generateFinalPlan()).rejects.toThrow(
        'Cannot generate final plan without initial plan'
      );
    });

    it('should generate final plan with red team improvements', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockFinalPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService.generateResponse = mockGenerateResponse;

      const finalPlan = await planningPhase.generateFinalPlan();

      expect(finalPlan).toBeDefined();
      expect(finalPlan.fullMarkdown).toBe(mockFinalPlan);
      expect(finalPlan.phases.length).toBeGreaterThan(0);
      expect(finalPlan.verificationGates.length).toBeGreaterThan(0);
    });

    it('should include critiques in refinement prompt', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockFinalPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService.generateResponse = mockGenerateResponse;

      await planningPhase.generateFinalPlan();

      const userMessage = mockGenerateResponse.mock.calls[0][0].find(
        (msg: any) => msg.role === 'user'
      );
      
      expect(userMessage.content).toContain('RED TEAM CRITIQUES AND FIXES');
      expect(userMessage.content).toContain('TypeScript version could cause compatibility');
      expect(userMessage.content).toContain('Lock version to ^5.3.0');
    });
  });

  describe('runFullPlanning', () => {
    it('should execute full planning workflow', async () => {
      let callCount = 0;
      const mockGenerateResponse = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            content: mockInitialPlan,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            content: mockRedTeamCritiques,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        } else {
          return Promise.resolve({
            content: mockFinalPlan,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        }
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      const result = await planningPhase.runFullPlanning();

      expect(mockGenerateResponse).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
      expect(result.fullMarkdown).toBe(mockFinalPlan);
      expect(result.phases.length).toBeGreaterThan(0);
    });

    it('should return critiques via getCritiques', async () => {
      let callCount = 0;
      const mockGenerateResponse = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            content: mockInitialPlan,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            content: mockRedTeamCritiques,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        } else {
          return Promise.resolve({
            content: mockFinalPlan,
            provider: 'openai',
            model: 'gpt-4',
            usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
          });
        }
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.runFullPlanning();

      const critiques = planningPhase.getCritiques();
      
      expect(critiques).toHaveLength(3);
      expect(critiques[0].stepNumber).toBe(1);
    });
  });

  describe('parseRedTeamCritiques', () => {
    it('should parse critiques with multiple concerns per step', () => {
      const input = `## Step 1: Test Step

**Critique 1**:
- **Concern**: First concern
- **Fix**: First fix

**Critique 2**:
- **Concern**: Second concern
- **Fix**: Second fix

## Step 2: Another Step

**Critique 1**:
- **Concern**: Third concern
- **Fix**: Third fix`;

      const result = (planningPhase as any).parseRedTeamCritiques(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stepNumber: 1,
        critiques: [
          { concern: 'First concern', fix: 'First fix' },
          { concern: 'Second concern', fix: 'Second fix' },
        ],
      });
      expect(result[1]).toEqual({
        stepNumber: 2,
        critiques: [{ concern: 'Third concern', fix: 'Third fix' }],
      });
    });

    it('should handle alternate formatting with asterisks', () => {
      const input = `## Step 5: Database Step

* **Concern**: Database connection could fail
* **Fix**: Add retry logic with exponential backoff`;

      const result = (planningPhase as any).parseRedTeamCritiques(input);

      expect(result).toHaveLength(1);
      expect(result[0].critiques[0]).toEqual({
        concern: 'Database connection could fail',
        fix: 'Add retry logic with exponential backoff',
      });
    });
  });

  describe('getters', () => {
    it('should return initial plan after generation', async () => {
      const mockGenerateResponse = vi.fn().mockResolvedValue({
        content: mockInitialPlan,
        provider: 'openai',
        model: 'gpt-4',
        usage: { promptTokens: 100, completionTokens: 500, totalTokens: 600 },
      });

      (planningPhase as any).llmService = {
        generateResponse: mockGenerateResponse,
      };

      await planningPhase.generateInitialPlan();

      expect(planningPhase.getInitialPlan()).toBe(mockInitialPlan);
    });

    it('should return undefined for initial plan before generation', () => {
      expect(planningPhase.getInitialPlan()).toBeUndefined();
    });

    it('should return empty array for critiques before red teaming', () => {
      expect(planningPhase.getCritiques()).toEqual([]);
    });
  });
});

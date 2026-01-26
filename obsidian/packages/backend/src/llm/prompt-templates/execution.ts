export interface ExecutionPromptOptions {
  architectureSpec: string;
  implementationPlan: string;
  currentStep: {
    stepNumber: number;
    stepName: string;
    objective: string;
    filesToCreate: string[];
    implementationDetails: string;
  };
  appType: string;
  existingFiles?: Record<string, string>;
}

export const EXECUTION_SYSTEM_PROMPT = `# SYSTEM IDENTITY: Architect Prime v3.0 - Code Execution Specialist

You are the Execution Phase component of the world's most advanced Autonomous Software Architect. Your role is to generate production-ready, zero-defect code following the implementation plan.

## CORE DIRECTIVE
"Correctness over Speed" - Code that works is better than code that ships fast and breaks.

## YOUR RESPONSIBILITIES
1. **Generate Complete Code**: Every function fully implemented, no placeholders, no "TODO" comments
2. **Strict Typing**: All code uses strict type checking (TypeScript strict mode, Python type hints)
3. **Follow the Plan**: Implement exactly what the current step specifies, nothing more, nothing less
4. **Context Awareness**: Read architecture.md and existing code to maintain consistency

## IMMUTABLE LAWS (Violations cause immediate failure)
1. **NO PLACEHOLDERS**: Never write \`// ... rest of code\`, \`// TODO: implement\`, or \`pass\`. Complete every function.
2. **NO ANY TYPES**: In TypeScript, \`any\` is forbidden. Use proper types or \`unknown\` with type guards.
3. **NO HALLUCINATION**: Only import libraries that exist. If unsure, use standard library or ask for clarification.
4. **COMPLETE IMPLEMENTATIONS**: Every function must have a body. Every component must be fully rendered.
5. **CONSISTENT STYLE**: Match the code style of existing files in the project.

## CODE GENERATION PRINCIPLES

### 1. Type Safety First
TypeScript:
- Enable \`strict: true\` mode
- Define interfaces for all data structures
- Use enums for fixed value sets
- Properly type function parameters and return values
- Use generics where appropriate
- Never use \`any\` - use \`unknown\` with type narrowing if needed

Python:
- Use type hints for all function signatures
- Use Pydantic models for data validation
- Import types from \`typing\` module
- Use \`Optional[T]\` instead of \`T | None\`

### 2. Error Handling
- Every external call (API, database, file system) must have error handling
- Use try-catch blocks for operations that can fail
- Return meaningful error messages with context
- Never swallow errors silently
- Log errors before re-throwing

### 3. Security Best Practices
- Never hardcode API keys, passwords, or secrets
- Always use environment variables for sensitive config
- Sanitize user input before using in queries
- Use parameterized queries (Prisma, SQLAlchemy) to prevent SQL injection
- Hash passwords with bcrypt (min 10 rounds)
- Validate JWT tokens before trusting payload

### 4. Code Organization
- One responsibility per function
- Max function length: 50 lines (split if longer)
- Max file length: 300 lines (split into multiple files if longer)
- Group related functions in service classes
- Keep business logic separate from API routes

### 5. Modern Patterns
React:
- Use functional components with hooks
- Implement proper TypeScript types for props
- Use React Query for data fetching
- Implement error boundaries
- Use proper key props in lists

Express:
- Middleware for reusable logic (auth, validation, error handling)
- Async route handlers with try-catch
- Zod for request validation
- Separate routes, controllers, and services

Python:
- Use FastAPI dependency injection
- Pydantic models for request/response validation
- Async functions for I/O operations
- Type-safe database operations

## OUTPUT FORMAT

For each file to create/modify, provide:

\`\`\`typescript
// filepath: packages/backend/src/services/UserService.ts

[COMPLETE FILE CONTENTS]
\`\`\`

Rules for file output:
1. **File Path Comment**: First line must be \`// filepath: <full/path/to/file>\`
2. **Complete File**: Include all imports, types, and implementations
3. **No Omissions**: Do not use "... rest of file unchanged" or similar. Provide full file contents.
4. **Proper Formatting**: Use consistent indentation (2 spaces for TS/JS, 4 for Python)

## CONTEXT INTEGRATION

Before generating code:
1. Read the architecture.md to understand domain model and API contracts
2. Read the current step details from plan.md
3. Review any existing files to match their style and patterns
4. Identify dependencies (types, utilities) from other files

## EXAMPLE QUALITY BAR

✅ GOOD:
\`\`\`typescript
// filepath: src/services/AuthService.ts
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().max(50),
});

export type RegisterInput = z.infer<typeof RegisterSchema>;

export class AuthService {
  async register(input: RegisterInput): Promise<{ userId: string; token: string }> {
    const validated = RegisterSchema.parse(input);
    
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email },
    });
    
    if (existingUser) {
      throw new Error('Email already registered');
    }
    
    const passwordHash = await bcrypt.hash(validated.password, 10);
    
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        passwordHash,
        displayName: validated.displayName,
      },
    });
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    return { userId: user.id, token };
  }

  async login(email: string, password: string): Promise<{ userId: string; token: string }> {
    const user = await prisma.user.findUnique({ where: { email } });
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('Invalid credentials');
    }
    
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' }
    );
    
    return { userId: user.id, token };
  }
}
\`\`\`

❌ BAD:
\`\`\`typescript
// Missing types, uses any, incomplete error handling
export class AuthService {
  async register(data: any) {
    // TODO: Implement validation
    const user = await prisma.user.create({ data });
    // TODO: Generate JWT
    return user;
  }
  
  async login(email, password) {
    // ... implementation
  }
}
\`\`\`

## VERIFICATION SELF-CHECK

Before outputting code, verify:
- [ ] All functions have complete implementations
- [ ] All types are explicitly defined (no implicit any)
- [ ] All imports are from libraries that exist
- [ ] Error handling is present for external operations
- [ ] No hardcoded secrets or API keys
- [ ] Code matches style of existing project files
- [ ] File paths are correct and consistent

## TONE
Precise, disciplined, uncompromising on quality. You are a senior engineer who takes pride in writing perfect code the first time.`;

export const EXECUTION_USER_TEMPLATE = (options: ExecutionPromptOptions) => {
  const existingFilesContext = options.existingFiles
    ? `\n\nEXISTING FILES FOR CONTEXT:\n${Object.entries(options.existingFiles)
        .map(([path, content]) => `\n--- ${path} ---\n${content}`)
        .join('\n')}`
    : '';

  return `ARCHITECTURE SPECIFICATION (for context):
${options.architectureSpec}

IMPLEMENTATION PLAN STEP:
Step ${options.currentStep.stepNumber}: ${options.currentStep.stepName}

Objective: ${options.currentStep.objective}

Files to Create/Modify:
${options.currentStep.filesToCreate.map((f) => `- ${f}`).join('\n')}

Implementation Details:
${options.currentStep.implementationDetails}

APPLICATION TYPE: ${options.appType}${existingFilesContext}

INSTRUCTIONS:
1. Review the architecture specification to understand data models and API contracts
2. Review the step objective and implementation details carefully
3. If existing files are provided, match their code style and patterns
4. Generate COMPLETE implementations for all files listed in "Files to Create/Modify"
5. Ensure all code follows the Immutable Laws and Code Generation Principles from the system prompt
6. Output each file with the format: // filepath: <path> followed by complete file contents

CRITICAL REMINDERS:
- NO PLACEHOLDERS: Every function must be fully implemented
- NO ANY TYPES: Use proper TypeScript types or Python type hints
- COMPLETE FILES: Provide full file contents, not partial updates
- ERROR HANDLING: Add try-catch for database/API calls
- SECURITY: Use environment variables for secrets, validate all inputs

Generate production-ready code now.`;
};

export const EXECUTION_EXAMPLES = `
## EXAMPLE 1: Creating User Registration API Route

STEP INPUT:
Step 10: Implement POST /api/auth/register endpoint
Objective: Create user registration with email validation and password hashing
Files to Create: packages/backend/src/api/routes/auth.ts

OUTPUT:
\`\`\`typescript
// filepath: packages/backend/src/api/routes/auth.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../../services/AuthService';

const router = Router();
const authService = new AuthService();

const RegisterSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be at most 50 characters'),
});

router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = RegisterSchema.parse(req.body);

    const result = await authService.register(validatedData);

    res.status(201).json({
      user: {
        id: result.userId,
        email: validatedData.email,
        displayName: validatedData.displayName,
      },
      token: result.token,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    if (error instanceof Error && error.message === 'Email already registered') {
      return res.status(409).json({
        error: error.message,
      });
    }

    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await authService.login(email, password);

    res.status(200).json({
      user: {
        id: result.userId,
      },
      token: result.token,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return res.status(401).json({
        error: 'Invalid credentials',
      });
    }

    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
\`\`\`

---

## EXAMPLE 2: Creating React Component with TypeScript

STEP INPUT:
Step 25: Create TaskList component to display tasks
Objective: Display list of tasks with checkbox to mark complete
Files to Create: packages/frontend/src/components/TaskList.tsx

OUTPUT:
\`\`\`typescript
// filepath: packages/frontend/src/components/TaskList.tsx
import React from 'react';

interface Task {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate: Date | null;
  tags: string[];
}

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onDeleteTask,
}) => {
  const getPriorityColor = (priority: Task['priority']): string => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
    }
  };

  const formatDueDate = (date: Date | null): string => {
    if (!date) return 'No due date';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No tasks yet</p>
        <p className="text-sm">Create your first task to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div
          key={task.id}
          className={\`flex items-start gap-3 p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow \${
            task.isCompleted ? 'opacity-60' : ''
          }\`}
        >
          <input
            type="checkbox"
            checked={task.isCompleted}
            onChange={() => onToggleComplete(task.id)}
            className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />

          <div className="flex-1 min-w-0">
            <h3
              className={\`font-medium text-gray-900 \${
                task.isCompleted ? 'line-through' : ''
              }\`}
            >
              {task.title}
            </h3>

            {task.description && (
              <p className="mt-1 text-sm text-gray-600">{task.description}</p>
            )}

            <div className="mt-2 flex items-center gap-4 text-sm">
              <span className={\`font-medium \${getPriorityColor(task.priority)}\`}>
                {task.priority.toUpperCase()}
              </span>

              <span className="text-gray-500">{formatDueDate(task.dueDate)}</span>

              {task.tags.length > 0 && (
                <div className="flex gap-1">
                  {task.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => onDeleteTask(task.id)}
            className="text-red-600 hover:text-red-800 p-1"
            aria-label="Delete task"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
};
\`\`\`
`;

export function createExecutionPrompt(options: ExecutionPromptOptions): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: EXECUTION_SYSTEM_PROMPT,
    userPrompt: EXECUTION_USER_TEMPLATE(options),
  };
}

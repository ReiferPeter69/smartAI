# Enhancement Plan: Advanced LLM Integration & Quality Improvements

## 🎯 Ziele

1. **OpenRouter Integration** - Zugriff auf 300+ AI Modelle über unified API
2. **Antigravity Kit Integration** - Agent Templates, Skills & Workflows
3. **Multi-Provider Routing** - Intelligente Provider-Auswahl mit Fallback
4. **Kostenoptimierung** - Automatische Modellauswahl basierend auf Preis/Performance

---

## 📋 Feature 1: OpenRouter Integration

### Vorteile
- ✅ 300+ Modelle (OpenAI, Anthropic, Google, Meta, Mistral, etc.)
- ✅ Unified API (OpenAI-kompatibel)
- ✅ Intelligentes Provider Routing
- ✅ Automatisches Fallback bei Ausfällen
- ✅ Kostenoptimierung
- ✅ Load Balancing

### Implementierung

#### 1.1 OpenRouter Provider erstellen

**Datei**: `packages/backend/src/llm/providers/OpenRouterProvider.ts`

```typescript
import type { LLMProvider, ChatMessage, ChatOptions, ChatResponse } from '@obsidian/core';

export interface OpenRouterConfig {
  apiKey: string;
  baseURL?: string;
  defaultModel?: string;
  siteUrl?: string;
  siteName?: string;
  // Provider routing preferences
  providerPreferences?: {
    allow_fallbacks?: boolean;
    require_parameters?: boolean;
    data_collection?: 'allow' | 'deny';
    order?: string[];
  };
}

export class OpenRouterProvider implements LLMProvider {
  private readonly apiKey: string;
  private readonly baseURL: string;
  private readonly defaultModel: string;
  private readonly siteUrl?: string;
  private readonly siteName?: string;
  private readonly providerPreferences?: OpenRouterConfig['providerPreferences'];

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL ?? 'https://openrouter.ai/api/v1';
    this.defaultModel = config.defaultModel ?? 'openai/gpt-4o';
    this.siteUrl = config.siteUrl;
    this.siteName = config.siteName;
    this.providerPreferences = config.providerPreferences;
  }

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
    if (this.siteName) headers['X-Title'] = this.siteName;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options?.model ?? this.defaultModel,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stop: options?.stopSequences,
        provider: this.providerPreferences,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenRouter API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content,
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens: data.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason,
      metadata: {
        model: data.model,
        cost: data.usage?.cost,
        nativeFinishReason: choice.native_finish_reason,
      },
    };
  }

  async stream(messages: ChatMessage[], options?: ChatOptions): Promise<AsyncIterable<string>> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };

    if (this.siteUrl) headers['HTTP-Referer'] = this.siteUrl;
    if (this.siteName) headers['X-Title'] = this.siteName;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: options?.model ?? this.defaultModel,
        messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
        temperature: options?.temperature,
        max_tokens: options?.maxTokens,
        stop: options?.stopSequences,
        stream: true,
        provider: this.providerPreferences,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter stream error: ${response.statusText}`);
    }

    return this.parseSSEStream(response.body!);
  }

  private async *parseSSEStream(body: ReadableStream<Uint8Array>): AsyncIterable<string> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') return;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content;
              if (content) yield content;
            } catch (e) {
              // Ignore parse errors for comments
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
```

#### 1.2 Type Definitions erweitern

**Datei**: `packages/core/src/types/llm.ts`

```typescript
export type LLMProviderName = 'openai' | 'anthropic' | 'ollama' | 'openrouter';

export interface ChatResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason?: string;
  metadata?: {
    model?: string;
    cost?: number;
    nativeFinishReason?: string;
    [key: string]: unknown;
  };
}
```

#### 1.3 ProviderFactory erweitern

**Datei**: `packages/backend/src/llm/ProviderFactory.ts`

```typescript
case 'openrouter': {
  const { OpenRouterProvider } = await import('./providers/OpenRouterProvider');
  if (!config.apiKey) {
    throw new ProviderConfigurationError('OpenRouter requires an API key');
  }
  return new OpenRouterProvider({
    apiKey: config.apiKey,
    baseURL: config.endpoint,
    defaultModel: config.model,
    siteUrl: process.env.SITE_URL,
    siteName: 'OBSIDIAN',
    providerPreferences: {
      allow_fallbacks: true,
      require_parameters: false,
    },
  });
}
```

#### 1.4 Prisma Schema erweitern

**Datei**: `packages/backend/prisma/schema.prisma`

```prisma
model LLMConfig {
  id                String   @id @default(cuid())
  userId            String
  provider          String   // 'openai' | 'anthropic' | 'ollama' | 'openrouter'
  model             String
  apiKey            String?  @db.Text
  endpoint          String?
  isDefault         Boolean  @default(false)
  
  // OpenRouter specific
  siteUrl           String?
  providerOrder     String[] // ['openai', 'anthropic', 'google']
  allowFallbacks    Boolean  @default(true)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId])
}
```

---

## 📋 Feature 2: Intelligente Provider-Auswahl

### Implementierung

#### 2.1 Model Router Service

**Datei**: `packages/backend/src/services/ModelRouter.ts`

```typescript
export interface ModelMetrics {
  provider: string;
  model: string;
  costPer1kTokens: number;
  quality: number; // 1-10
  speed: number; // tokens/sec
  reliability: number; // 0-1
}

export interface RoutingStrategy {
  priority: 'cost' | 'quality' | 'speed' | 'balanced';
  maxCostPer1kTokens?: number;
  minQuality?: number;
  requireFallback?: boolean;
}

export class ModelRouter {
  private metrics: Map<string, ModelMetrics> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    // GPT-4 models
    this.metrics.set('openai/gpt-4o', {
      provider: 'openai',
      model: 'gpt-4o',
      costPer1kTokens: 0.005,
      quality: 9.5,
      speed: 150,
      reliability: 0.99,
    });

    // Claude models
    this.metrics.set('anthropic/claude-3.5-sonnet', {
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      costPer1kTokens: 0.003,
      quality: 9.8,
      speed: 120,
      reliability: 0.98,
    });

    // Cheaper alternatives
    this.metrics.set('openai/gpt-4o-mini', {
      provider: 'openai',
      model: 'gpt-4o-mini',
      costPer1kTokens: 0.00015,
      quality: 7.5,
      speed: 200,
      reliability: 0.99,
    });

    // Add more models...
  }

  selectModel(strategy: RoutingStrategy): string {
    const candidates = Array.from(this.metrics.values()).filter(m => {
      if (strategy.maxCostPer1kTokens && m.costPer1kTokens > strategy.maxCostPer1kTokens) {
        return false;
      }
      if (strategy.minQuality && m.quality < strategy.minQuality) {
        return false;
      }
      return true;
    });

    if (candidates.length === 0) {
      throw new Error('No models match the routing criteria');
    }

    // Score based on strategy
    const scored = candidates.map(m => {
      let score = 0;
      switch (strategy.priority) {
        case 'cost':
          score = 1 / m.costPer1kTokens;
          break;
        case 'quality':
          score = m.quality;
          break;
        case 'speed':
          score = m.speed;
          break;
        case 'balanced':
          score = (m.quality * 0.4) + ((1 / m.costPer1kTokens) * 100 * 0.3) + (m.speed / 10 * 0.3);
          break;
      }
      return { model: `${m.provider}/${m.model}`, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }

  getFallbackModel(primaryModel: string): string | undefined {
    const metrics = this.metrics.get(primaryModel);
    if (!metrics) return undefined;

    // Find similar quality model from different provider
    const alternatives = Array.from(this.metrics.values())
      .filter(m => 
        m.provider !== metrics.provider &&
        Math.abs(m.quality - metrics.quality) < 1.5
      )
      .sort((a, b) => b.reliability - a.reliability);

    return alternatives[0] ? `${alternatives[0].provider}/${alternatives[0].model}` : undefined;
  }
}
```

---

## 📋 Feature 3: Antigravity Kit Integration

### Übersicht

Antigravity Kit bietet:
- **Agents**: Spezialisierte AI Agents (Frontend, Backend, Security, etc.)
- **Skills**: Domain-Wissen (React, Next.js, Testing, etc.)
- **Workflows**: Wiederverwendbare Prozesse

### Implementierung

#### 3.1 Agent Template System

**Datei**: `packages/backend/src/agents/AgentTemplate.ts`

```typescript
export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  skills: string[];
  capabilities: string[];
  examples: ConversationExample[];
}

export interface ConversationExample {
  user: string;
  assistant: string;
}

export const AGENT_TEMPLATES: Record<string, AgentTemplate> = {
  'frontend-expert': {
    id: 'frontend-expert',
    name: 'Frontend Development Expert',
    description: 'Specialized in React, TypeScript, and modern frontend development',
    systemPrompt: `You are a senior frontend developer expert specializing in:
- React 18+ with TypeScript
- Modern state management (Zustand, React Query)
- Performance optimization and best practices
- Accessibility (WCAG 2.1)
- Responsive design and CSS-in-JS

When generating code:
- Use TypeScript strict mode
- Follow React best practices (hooks, composition)
- Include proper error boundaries
- Add accessibility attributes
- Write maintainable, self-documenting code`,
    skills: ['react', 'typescript', 'css', 'accessibility', 'performance'],
    capabilities: [
      'Component architecture design',
      'State management implementation',
      'Performance optimization',
      'Responsive layouts',
      'Testing strategies',
    ],
    examples: [
      {
        user: 'Create a reusable Button component with loading state',
        assistant: 'I\'ll create a type-safe Button component with loading state, proper accessibility, and variant support...',
      },
    ],
  },

  'backend-architect': {
    id: 'backend-architect',
    name: 'Backend Architecture Expert',
    description: 'Specialized in Node.js, databases, and API design',
    systemPrompt: `You are a senior backend architect specializing in:
- Node.js with TypeScript
- RESTful and GraphQL API design
- Database design (SQL and NoSQL)
- Authentication and authorization
- Microservices architecture
- Performance and scalability

When designing systems:
- Consider scalability and performance
- Implement proper error handling
- Use dependency injection
- Follow SOLID principles
- Include comprehensive logging`,
    skills: ['nodejs', 'typescript', 'databases', 'api-design', 'security'],
    capabilities: [
      'API architecture design',
      'Database schema design',
      'Authentication systems',
      'Caching strategies',
      'Error handling patterns',
    ],
    examples: [],
  },

  'security-auditor': {
    id: 'security-auditor',
    name: 'Security & Code Auditor',
    description: 'Specialized in security vulnerabilities and code quality',
    systemPrompt: `You are a security expert specializing in:
- OWASP Top 10 vulnerabilities
- Authentication and authorization
- Data encryption and privacy
- Input validation and sanitization
- Dependency security
- Code quality and best practices

When reviewing code:
- Identify security vulnerabilities
- Check for common anti-patterns
- Validate input handling
- Review authentication logic
- Check for dependency vulnerabilities`,
    skills: ['security', 'auditing', 'owasp', 'encryption', 'compliance'],
    capabilities: [
      'Security vulnerability detection',
      'Code review and quality assessment',
      'Dependency audit',
      'Compliance checking',
      'Threat modeling',
    ],
    examples: [],
  },

  'devops-specialist': {
    id: 'devops-specialist',
    name: 'DevOps & Infrastructure Specialist',
    description: 'Specialized in CI/CD, containerization, and cloud infrastructure',
    systemPrompt: `You are a DevOps specialist specializing in:
- Docker and Kubernetes
- CI/CD pipelines (GitHub Actions, Jenkins)
- Cloud platforms (AWS, GCP, Azure)
- Infrastructure as Code (Terraform, CDK)
- Monitoring and logging
- Performance optimization

When designing infrastructure:
- Consider cost optimization
- Implement high availability
- Use infrastructure as code
- Include comprehensive monitoring
- Follow security best practices`,
    skills: ['docker', 'kubernetes', 'ci-cd', 'terraform', 'monitoring'],
    capabilities: [
      'CI/CD pipeline design',
      'Container orchestration',
      'Cloud architecture',
      'Monitoring setup',
      'Cost optimization',
    ],
    examples: [],
  },
};
```

#### 3.2 Skill System

**Datei**: `packages/backend/src/agents/SkillLibrary.ts`

```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  context: string;
  examples: string[];
  bestPractices: string[];
}

export const SKILL_LIBRARY: Record<string, Skill> = {
  'react': {
    id: 'react',
    name: 'React Development',
    description: 'Modern React development with hooks and TypeScript',
    context: `React 18+ conventions:
- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript for type safety
- Implement proper error boundaries
- Follow React naming conventions (PascalCase for components)`,
    examples: [
      'useState for local state',
      'useEffect for side effects',
      'useCallback for memoized callbacks',
      'useMemo for expensive computations',
      'Custom hooks for reusable logic',
    ],
    bestPractices: [
      'Keep components small and focused',
      'Extract reusable logic into custom hooks',
      'Use React.memo for performance optimization',
      'Implement proper loading and error states',
      'Write accessible components (ARIA attributes)',
    ],
  },

  'typescript': {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Type-safe TypeScript development',
    context: `TypeScript best practices:
- Enable strict mode
- Use interfaces for object shapes
- Use type aliases for unions
- Leverage utility types (Partial, Pick, Omit)
- Avoid 'any' type`,
    examples: [
      'interface Props { ... }',
      'type Status = "pending" | "success" | "error"',
      'Generic types: Array<T>',
      'Utility types: Partial<User>',
    ],
    bestPractices: [
      'Use strict null checks',
      'Prefer interfaces over type aliases for objects',
      'Use readonly for immutable properties',
      'Leverage discriminated unions',
      'Document complex types with JSDoc',
    ],
  },

  'api-design': {
    id: 'api-design',
    name: 'RESTful API Design',
    description: 'RESTful API design principles and best practices',
    context: `REST API conventions:
- Use proper HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Return appropriate status codes
- Implement versioning (/api/v1/)
- Use consistent naming (kebab-case for URLs)
- Include proper error responses`,
    examples: [
      'GET /api/v1/users - List users',
      'GET /api/v1/users/:id - Get user',
      'POST /api/v1/users - Create user',
      'PUT /api/v1/users/:id - Update user',
      'DELETE /api/v1/users/:id - Delete user',
    ],
    bestPractices: [
      'Use plural nouns for resources',
      'Implement pagination for lists',
      'Include rate limiting',
      'Return consistent error format',
      'Document with OpenAPI/Swagger',
    ],
  },

  'security': {
    id: 'security',
    name: 'Application Security',
    description: 'Security best practices and vulnerability prevention',
    context: `Security essentials:
- Input validation and sanitization
- Authentication and authorization
- HTTPS/TLS encryption
- CSRF protection
- XSS prevention
- SQL injection prevention`,
    examples: [
      'Validate all user inputs',
      'Use parameterized queries',
      'Implement JWT authentication',
      'Add CORS headers',
      'Use helmet.js for security headers',
    ],
    bestPractices: [
      'Never trust user input',
      'Hash passwords with bcrypt',
      'Use HTTPS everywhere',
      'Implement rate limiting',
      'Keep dependencies updated',
      'Use security linters',
    ],
  },
};
```

#### 3.3 Workflow System

**Datei**: `packages/backend/src/agents/WorkflowEngine.ts`

```typescript
export interface WorkflowStep {
  id: string;
  agentId: string;
  prompt: string;
  inputs?: string[];
  outputs?: string[];
  validation?: (result: string) => boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export const WORKFLOWS: Record<string, Workflow> = {
  'create-fullstack-app': {
    id: 'create-fullstack-app',
    name: 'Create Full-Stack Application',
    description: 'End-to-end workflow for creating a full-stack application',
    steps: [
      {
        id: 'analyze-requirements',
        agentId: 'product-manager',
        prompt: 'Analyze the user requirements and create a technical specification',
        outputs: ['technical-spec'],
      },
      {
        id: 'design-database',
        agentId: 'backend-architect',
        prompt: 'Design the database schema based on the technical specification',
        inputs: ['technical-spec'],
        outputs: ['database-schema'],
      },
      {
        id: 'design-api',
        agentId: 'backend-architect',
        prompt: 'Design the REST API endpoints',
        inputs: ['technical-spec', 'database-schema'],
        outputs: ['api-spec'],
      },
      {
        id: 'create-backend',
        agentId: 'backend-architect',
        prompt: 'Implement the backend service',
        inputs: ['database-schema', 'api-spec'],
        outputs: ['backend-code'],
      },
      {
        id: 'create-frontend',
        agentId: 'frontend-expert',
        prompt: 'Implement the frontend application',
        inputs: ['api-spec'],
        outputs: ['frontend-code'],
      },
      {
        id: 'security-audit',
        agentId: 'security-auditor',
        prompt: 'Perform security audit on the code',
        inputs: ['backend-code', 'frontend-code'],
        outputs: ['security-report'],
      },
      {
        id: 'setup-deployment',
        agentId: 'devops-specialist',
        prompt: 'Create deployment configuration',
        inputs: ['backend-code', 'frontend-code'],
        outputs: ['deployment-config'],
      },
    ],
  },

  'refactor-legacy-code': {
    id: 'refactor-legacy-code',
    name: 'Refactor Legacy Code',
    description: 'Systematic approach to refactoring legacy code',
    steps: [
      {
        id: 'analyze-code',
        agentId: 'code-analyzer',
        prompt: 'Analyze the legacy code and identify issues',
        outputs: ['analysis-report'],
      },
      {
        id: 'security-check',
        agentId: 'security-auditor',
        prompt: 'Identify security vulnerabilities',
        inputs: ['analysis-report'],
        outputs: ['security-issues'],
      },
      {
        id: 'create-tests',
        agentId: 'test-specialist',
        prompt: 'Create comprehensive tests before refactoring',
        inputs: ['analysis-report'],
        outputs: ['test-suite'],
      },
      {
        id: 'refactor',
        agentId: 'code-architect',
        prompt: 'Refactor the code while maintaining functionality',
        inputs: ['analysis-report', 'security-issues', 'test-suite'],
        outputs: ['refactored-code'],
      },
      {
        id: 'verify',
        agentId: 'test-specialist',
        prompt: 'Run tests and verify refactoring',
        inputs: ['refactored-code', 'test-suite'],
        outputs: ['verification-report'],
      },
    ],
  },
};
```

#### 3.4 Integration in PhaseOrchestrator

**Datei**: `packages/backend/src/services/PhaseOrchestrator.ts` (Erweiterung)

```typescript
import { ModelRouter, RoutingStrategy } from './ModelRouter';
import { AGENT_TEMPLATES } from '../agents/AgentTemplate';
import { SKILL_LIBRARY } from '../agents/SkillLibrary';

export class PhaseOrchestrator {
  private modelRouter: ModelRouter;

  constructor(
    private session: GenerationSession,
    private prisma?: PrismaClient,
    private eventEmitter?: GenerationEventEmitter
  ) {
    this.modelRouter = new ModelRouter();
  }

  async selectOptimalModel(phase: Phase): Promise<string> {
    const strategy: RoutingStrategy = {
      priority: 'balanced',
      requireFallback: true,
    };

    // Discovery and Planning need higher quality
    if (phase === 'discovery' || phase === 'planning') {
      strategy.priority = 'quality';
      strategy.minQuality = 8.0;
    }

    // Execution can use faster/cheaper models
    if (phase === 'execution') {
      strategy.priority = 'cost';
      strategy.maxCostPer1kTokens = 0.001;
    }

    return this.modelRouter.selectModel(strategy);
  }

  async enhancePromptWithSkills(prompt: string, skills: string[]): Promise<string> {
    let enhancedPrompt = prompt;

    for (const skillId of skills) {
      const skill = SKILL_LIBRARY[skillId];
      if (skill) {
        enhancedPrompt += `\n\n## ${skill.name}\n${skill.context}\n\nBest Practices:\n`;
        skill.bestPractices.forEach(bp => {
          enhancedPrompt += `- ${bp}\n`;
        });
      }
    }

    return enhancedPrompt;
  }
}
```

---

## 📋 Feature 4: Erweiterte Konfiguration

### 4.1 Environment Variables

**Datei**: `packages/backend/.env.example`

```bash
# OpenRouter
OPENROUTER_API_KEY=your-openrouter-key
OPENROUTER_SITE_URL=https://your-site.com
OPENROUTER_SITE_NAME=OBSIDIAN

# Model Routing
DEFAULT_ROUTING_STRATEGY=balanced # cost | quality | speed | balanced
ENABLE_AUTO_FALLBACK=true
MAX_COST_PER_1K_TOKENS=0.01

# Agent System
ENABLE_AGENT_TEMPLATES=true
ENABLE_SKILL_LIBRARY=true
ENABLE_WORKFLOWS=true
```

---

## 🧪 Testing Strategy

### Test Files

1. **OpenRouterProvider.test.ts** - Unit tests
2. **OpenRouterProvider.integration.test.ts** - Integration tests
3. **ModelRouter.test.ts** - Routing logic tests
4. **AgentTemplate.test.ts** - Agent system tests
5. **WorkflowEngine.test.ts** - Workflow execution tests

---

## 📊 Migration Plan

### Phase 1: OpenRouter Integration (2-3 Tage)
- [ ] OpenRouterProvider implementieren
- [ ] Type definitions erweitern
- [ ] ProviderFactory erweitern
- [ ] Tests schreiben
- [ ] Dokumentation

### Phase 2: Model Router (1-2 Tage)
- [ ] ModelRouter Service
- [ ] Routing Strategien
- [ ] Metrics System
- [ ] Integration in PhaseOrchestrator
- [ ] Tests

### Phase 3: Agent Templates (2-3 Tage)
- [ ] Agent Template System
- [ ] Skill Library
- [ ] Integration in Discovery Phase
- [ ] Tests
- [ ] Dokumentation

### Phase 4: Workflows (2-3 Tage)
- [ ] Workflow Engine
- [ ] Standard Workflows
- [ ] Workflow Execution
- [ ] Integration in GenerationService
- [ ] Tests

### Phase 5: Integration & Testing (2 Tage)
- [ ] End-to-End Tests
- [ ] Performance Testing
- [ ] Dokumentation
- [ ] Migration Guide

---

## 💰 Kostenoptimierung

### Modellauswahl nach Phase

| Phase | Priorität | Empfohlene Modelle | Kosten/1M Tokens |
|-------|-----------|-------------------|------------------|
| Discovery | Quality | claude-3.5-sonnet, gpt-4o | $3-5 |
| Planning | Quality | claude-3.5-sonnet | $3 |
| Execution | Balanced | gpt-4o-mini, claude-haiku | $0.15-0.60 |
| Verification | Speed | gpt-4o-mini | $0.15 |

### Geschätzte Kostenersparnis
- **Aktuell**: ~$5-10 pro generierter App
- **Mit OpenRouter**: ~$2-4 pro generierter App
- **Ersparnis**: 50-60%

---

## 📈 Qualitätsverbesserungen

### Durch OpenRouter
1. **Redundanz**: Automatisches Fallback bei Ausfällen
2. **Auswahl**: 300+ Modelle zur Verfügung
3. **Optimierung**: Automatische Modellauswahl
4. **Kosten**: Bis zu 60% günstiger

### Durch Agent Templates
1. **Spezialisierung**: Optimierte Prompts für jeden Bereich
2. **Konsistenz**: Standardisierte Ausgaben
3. **Qualität**: Domain-spezifisches Wissen
4. **Wartbarkeit**: Wiederverwendbare Templates

### Durch Workflows
1. **Struktur**: Systematischer Prozess
2. **Validierung**: Checks zwischen Steps
3. **Nachvollziehbarkeit**: Klare Schritte
4. **Fehlerbehandlung**: Retry-Logic pro Step

---

## 🎯 Erwartete Verbesserungen

### Qualität
- **+30%** Code-Qualität durch spezialisierte Agents
- **+50%** Konsistenz durch Templates
- **+40%** Sicherheit durch Security Agent

### Performance
- **+50%** Verfügbarkeit durch Fallbacks
- **+25%** Geschwindigkeit durch optimale Modellwahl
- **-60%** Kosten durch intelligentes Routing

### Entwickler-Erfahrung
- **+70%** Konfigurierbarkeit
- **+50%** Transparenz (welches Modell wurde verwendet)
- **+80%** Flexibilität (300+ Modelle)

---

## 📝 Nächste Schritte

1. **Review dieses Plans**
2. **Priorisierung der Features**
3. **Start mit OpenRouter Integration**
4. **Iterative Implementierung**
5. **Continuous Testing**

---

## 🔗 Ressourcen

- [OpenRouter Dokumentation](https://openrouter.ai/docs)
- [OpenRouter Models](https://openrouter.ai/models)
- [Antigravity Kit Docs](https://antigravity-kit.vercel.app/docs)
- [OpenRouter SDK](https://openrouter.ai/sdk)

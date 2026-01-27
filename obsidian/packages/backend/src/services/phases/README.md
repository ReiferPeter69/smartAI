# Phase Services

This directory contains the implementation of the 4-phase Architect Prime workflow.

## Phase 1: Discovery Phase

**Location**: `DiscoveryPhase.ts`

### Purpose
The Discovery Phase transforms vague user ideas into precise, production-ready specifications by:
1. Parsing user prompts to identify ambiguities
2. Generating clarifying questions using LLM
3. Collecting user responses
4. Generating comprehensive architecture.md specification

### Key Features
- **Intelligent Question Generation**: Uses LLM to identify gaps in requirements
- **Question Categorization**: Automatically categorizes questions (data-model, api-contract, business-logic, technical-constraint)
- **Structured Output**: Generates architecture.md with 6 required sections
- **Type Safety**: Full TypeScript typing for all interfaces
- **Error Handling**: Comprehensive error handling with logging

### Usage

#### Basic Flow
```typescript
import { DiscoveryPhase } from './phases/DiscoveryPhase';

const discoveryPhase = new DiscoveryPhase({
  userPrompt: 'Build a task management app',
  appType: 'react',
  llmConfig: {
    id: 'config-1',
    provider: 'openai',
    model: 'gpt-4',
    apiKey: 'your-key',
    isDefault: true,
  },
});

// Step 1: Generate clarification questions
const questions = await discoveryPhase.generateClarificationQuestions();

// Step 2: User provides responses
const responses = [
  { questionId: 'q1', answer: 'Multi-user with accounts' },
  { questionId: 'q2', answer: 'Tasks have title, due date, priority' },
];

// Step 3: Generate architecture specification
const spec = await discoveryPhase.completeDiscoveryWithResponses(responses);

// Access the generated spec
console.log(spec.fullMarkdown); // Complete architecture.md content
console.log(spec.projectOverview); // Just the overview section
console.log(spec.dataModels); // Just the data models section
```

#### Alternative: Two-Step Flow
```typescript
// Start discovery and get questions
const result = await discoveryPhase.runFullDiscovery();
console.log(result.clarificationQuestions);

// Later, after getting user responses:
const spec = await discoveryPhase.completeDiscoveryWithResponses(responses);
```

### Interfaces

#### DiscoveryPhaseOptions
```typescript
interface DiscoveryPhaseOptions {
  userPrompt: string;                    // User's natural language requirement
  appType?: 'react' | 'nextjs' | 'fastapi'; // Optional app type for context
  llmConfig: LLMConfig;                  // LLM provider configuration
}
```

#### ClarificationQuestion
```typescript
interface ClarificationQuestion {
  id: string;                            // e.g., 'q1', 'q2'
  question: string;                      // The clarification question text
  category: 'data-model' | 'api-contract' | 'business-logic' | 'technical-constraint';
}
```

#### ClarificationResponse
```typescript
interface ClarificationResponse {
  questionId: string;                    // Reference to question.id
  answer: string;                        // User's answer
}
```

#### ArchitectureSpec
```typescript
interface ArchitectureSpec {
  projectOverview: string;               // Project summary, users, success criteria
  userStories: string;                   // User stories with acceptance criteria
  domainModel: string;                   // Core entities and relationships
  dataModels: string;                    // Database schemas and TypeScript interfaces
  apiContracts: string;                  // API endpoints with request/response schemas
  technicalConstraints: string;          // Performance, security, browser support
  fullMarkdown: string;                  // Complete architecture.md content
}
```

### Architecture.md Structure

The generated specification follows this structure:

```markdown
# Project Overview
- Clear summary of application purpose
- Target users and use cases
- Success criteria

# User Stories
- Format: "As a [role], I want [feature] so that [benefit]"
- Acceptance criteria for each story
- Priority ranking (P0/P1/P2)

# Domain Model
- Core entities with typed properties
- Relationships (one-to-one, one-to-many, many-to-many)
- Business rules and constraints
- Validation rules

# Data Models
- Database schema for each entity
- TypeScript interfaces
- Python Pydantic models (if applicable)
- Field types, required/optional, constraints

# API Contracts
- HTTP method and path for each endpoint
- Request schema (headers, body, query params)
- Response schema with status codes
- Error responses
- Authentication requirements

# Technical Constraints
- Performance requirements (response times, throughput)
- Security requirements (auth, authorization, encryption)
- Browser/platform support
- Third-party integrations
- Compliance needs
```

### Question Categorization

Questions are automatically categorized based on content:

- **data-model**: Contains keywords like "data", "entity", "model", "field", "property"
- **api-contract**: Contains keywords like "api", "endpoint", "request", "response"
- **technical-constraint**: Contains keywords like "performance", "security", "authentication", "deployment", "scale"
- **business-logic**: Default category for other questions

### Error Handling

```typescript
try {
  const questions = await discoveryPhase.generateClarificationQuestions();
} catch (error) {
  // Error types:
  // - LLMError: LLM provider failure
  // - LLMTimeoutError: Request timeout
  // - LLMRateLimitError: Rate limit exceeded
  // - Error: General errors with descriptive messages
  console.error('Discovery failed:', error.message);
}
```

### Logging

All operations are logged with structured metadata:

```typescript
// Logs include:
// - Request/response timing
// - LLM token usage
// - Question counts
// - Spec section sizes
// - Errors with stack traces
```

### Testing

Run tests:
```bash
npm test -- DiscoveryPhase.test.ts
```

Test coverage includes:
- Question generation with various prompts
- Question categorization logic
- Response collection
- Architecture spec generation
- Error handling
- Edge cases (malformed LLM responses, missing data)

### Integration with WebSocket

For real-time UI updates:

```typescript
// Emit clarification questions to client
socket.emit('CLARIFICATION_NEEDED', {
  sessionId: 'session-123',
  questions: questions,
});

// Listen for user responses
socket.on('CLARIFICATION_RESPONSE', async (data) => {
  const { responses } = data;
  const spec = await discoveryPhase.completeDiscoveryWithResponses(responses);
  
  // Emit spec for approval
  socket.emit('SPEC_GENERATED', {
    sessionId: 'session-123',
    spec: spec.fullMarkdown,
  });
});
```

### Best Practices

1. **Validate Responses**: Ensure all questions have corresponding responses before generating spec
2. **Store Specs**: Save generated architecture.md to database/filesystem for later phases
3. **Handle Timeouts**: Set appropriate LLM timeouts (default: 60s)
4. **Retry Logic**: LLMService automatically retries transient failures
5. **Temperature Settings**: 
   - Questions: 0.7 (more creative)
   - Spec: 0.3 (more deterministic)

### Example Output

See `example-usage.ts` for complete working examples.

## Future Phases

- **Phase 2**: Planning Phase (PlanningPhase.ts) - Coming soon
- **Phase 3**: Execution Phase (ExecutionPhase.ts) - Coming soon
- **Phase 4**: Verification Phase (VerificationPhase.ts) - Coming soon

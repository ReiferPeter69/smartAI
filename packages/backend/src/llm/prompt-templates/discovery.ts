export const DISCOVERY_SYSTEM_PROMPT = `You are a software architecture expert helping to clarify and document software project requirements.

Your goal is to analyze user prompts and create a comprehensive technical specification.

You should:
1. Identify ambiguities and gaps in the requirements
2. Generate relevant clarifying questions
3. Create detailed architecture specifications based on the user's answers

Focus on:
- User stories and use cases
- Data models (database schemas, types)
- API contracts (endpoints, input/output)
- Technology stack recommendations
- Non-functional requirements (performance, security)

Be concise but thorough. Ask specific, actionable questions.`;

export const CLARIFYING_QUESTIONS_PROMPT = (userPrompt: string) => `Analyze the following project request and generate 3-5 clarifying questions to help create a complete technical specification.

User Request:
"""
${userPrompt}
"""

Generate questions that cover:
- Data models and entities
- User interactions and workflows
- API requirements and integrations
- Authentication and authorization needs
- Deployment and hosting preferences

Return ONLY a JSON array of question strings, no additional text.
Example: ["What data should be stored for each user?", "Should users be able to edit their posts?"]`;

export const ARCHITECTURE_GENERATION_PROMPT = (
  userPrompt: string,
  answers: Record<string, string>
) => `Create a comprehensive technical architecture specification for the following project.

User Request:
"""
${userPrompt}
"""

Clarifications:
${Object.entries(answers)
  .map(([question, answer]) => `Q: ${question}\nA: ${answer}`)
  .join('\n\n')}

Generate a detailed architecture.md document with the following sections:

# Project Overview
[Brief description of the project and its goals]

# User Stories
[List of user stories in the format: "As a [role], I want to [action] so that [benefit]"]

# Data Models
[Define all entities/models with their fields and types]
[Include relationships between models]
[Specify primary keys, indexes, and constraints]

# API Contracts
[List all API endpoints with HTTP methods]
[Define request/response schemas]
[Include authentication requirements]

# Technology Stack
[Recommended frameworks, libraries, and tools]
[Justification for each choice]

# Non-Functional Requirements
[Performance targets]
[Security considerations]
[Scalability requirements]

Return ONLY the markdown content, no additional text or formatting.`;

export const ARCHITECTURE_TEMPLATE = `# Project Overview

## Description
[Project description]

## Goals
- [Goal 1]
- [Goal 2]

# User Stories

1. As a [role], I want to [action] so that [benefit]
2. As a [role], I want to [action] so that [benefit]

# Data Models

## Model 1
\`\`\`typescript
interface Model1 {
  id: string;
  field1: string;
  field2: number;
  createdAt: Date;
}
\`\`\`

# API Contracts

## Endpoint 1
- **Method**: GET/POST/PUT/DELETE
- **Path**: /api/resource
- **Request**:
  \`\`\`json
  {
    "field": "value"
  }
  \`\`\`
- **Response**:
  \`\`\`json
  {
    "field": "value"
  }
  \`\`\`

# Technology Stack

- **Frontend**: [Framework]
- **Backend**: [Framework]
- **Database**: [Database]
- **Deployment**: [Platform]

# Non-Functional Requirements

## Performance
- Target response time: < 200ms
- Concurrent users: 1000+

## Security
- Authentication: JWT/OAuth
- Data encryption at rest and in transit

## Scalability
- Horizontal scaling capability
- Database replication strategy
`;

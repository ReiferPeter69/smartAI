export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'devops' | 'testing' | 'security' | 'general';
  context: string;
  examples: string[];
  bestPractices: string[];
  commonPitfalls: string[];
}

export const SKILL_LIBRARY: Record<string, Skill> = {
  'react': {
    id: 'react',
    name: 'React Development',
    description: 'Modern React development with hooks and TypeScript',
    category: 'frontend',
    context: `React 18+ conventions:
- Use functional components with hooks
- Prefer composition over inheritance
- Use TypeScript for type safety
- Implement proper error boundaries
- Follow React naming conventions (PascalCase for components)
- Use React.StrictMode in development`,
    examples: [
      'useState for local state',
      'useEffect for side effects',
      'useCallback for memoized callbacks',
      'useMemo for expensive computations',
      'Custom hooks for reusable logic',
      'Context API for global state',
    ],
    bestPractices: [
      'Keep components small and focused (< 200 lines)',
      'Extract reusable logic into custom hooks',
      'Use React.memo for performance optimization',
      'Implement proper loading and error states',
      'Write accessible components (ARIA attributes)',
      'Avoid prop drilling - use Context or state management',
      'Use key prop correctly in lists',
    ],
    commonPitfalls: [
      'Forgetting dependencies in useEffect',
      'Not cleaning up side effects',
      'Mutating state directly',
      'Using index as key in dynamic lists',
      'Not handling loading and error states',
    ],
  },

  'typescript': {
    id: 'typescript',
    name: 'TypeScript',
    description: 'Type-safe TypeScript development',
    category: 'general',
    context: `TypeScript best practices:
- Enable strict mode in tsconfig.json
- Use interfaces for object shapes
- Use type aliases for unions and intersections
- Leverage utility types (Partial, Pick, Omit, Record)
- Avoid 'any' type - use 'unknown' when type is truly unknown`,
    examples: [
      'interface Props { name: string; age: number; }',
      'type Status = "pending" | "success" | "error"',
      'Generic types: Array<T>, Promise<T>',
      'Utility types: Partial<User>, Pick<User, "id" | "name">',
      'Type guards: typeof, instanceof, user-defined type guards',
    ],
    bestPractices: [
      'Use strict null checks',
      'Prefer interfaces over type aliases for objects',
      'Use readonly for immutable properties',
      'Leverage discriminated unions for state management',
      'Document complex types with JSDoc comments',
      'Use const assertions for literal types',
    ],
    commonPitfalls: [
      'Using any instead of proper types',
      'Not enabling strict mode',
      'Over-using type assertions',
      'Ignoring TypeScript errors',
      'Not leveraging utility types',
    ],
  },

  'api-design': {
    id: 'api-design',
    name: 'RESTful API Design',
    description: 'RESTful API design principles and best practices',
    category: 'backend',
    context: `REST API conventions:
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Return appropriate status codes
- Implement API versioning (/api/v1/)
- Use consistent naming (kebab-case for URLs, camelCase for JSON)
- Include proper error responses
- Support pagination for list endpoints`,
    examples: [
      'GET /api/v1/users - List users',
      'GET /api/v1/users/:id - Get user',
      'POST /api/v1/users - Create user',
      'PUT /api/v1/users/:id - Full update',
      'PATCH /api/v1/users/:id - Partial update',
      'DELETE /api/v1/users/:id - Delete user',
    ],
    bestPractices: [
      'Use plural nouns for resources',
      'Implement pagination with limit/offset or cursor',
      'Include rate limiting headers',
      'Return consistent error format',
      'Document with OpenAPI/Swagger',
      'Use HATEOAS for discoverability',
      'Version your API from the start',
    ],
    commonPitfalls: [
      'Using verbs in URLs',
      'Inconsistent naming conventions',
      'Not handling errors properly',
      'Missing rate limiting',
      'Poor documentation',
    ],
  },

  'security': {
    id: 'security',
    name: 'Application Security',
    description: 'Security best practices and vulnerability prevention',
    category: 'security',
    context: `Security essentials:
- Input validation and sanitization
- Authentication and authorization
- HTTPS/TLS encryption
- CSRF protection
- XSS prevention
- SQL injection prevention
- Secure password storage`,
    examples: [
      'Validate all user inputs with Zod/Joi',
      'Use parameterized queries (never string concatenation)',
      'Implement JWT authentication with refresh tokens',
      'Add CORS headers correctly',
      'Use helmet.js for security headers',
      'Hash passwords with bcrypt (cost factor >= 12)',
    ],
    bestPractices: [
      'Never trust user input',
      'Hash passwords with bcrypt or argon2',
      'Use HTTPS everywhere',
      'Implement rate limiting',
      'Keep dependencies updated',
      'Use security linters (ESLint security plugins)',
      'Store secrets in environment variables',
      'Implement proper session management',
    ],
    commonPitfalls: [
      'Storing passwords in plain text',
      'SQL injection vulnerabilities',
      'XSS vulnerabilities',
      'Hardcoding API keys',
      'Missing rate limiting',
      'Weak authentication',
    ],
  },

  'database-design': {
    id: 'database-design',
    name: 'Database Design',
    description: 'Relational and NoSQL database design principles',
    category: 'backend',
    context: `Database design principles:
- Normalize data to reduce redundancy (usually 3NF)
- Use proper indexes for query performance
- Define relationships with foreign keys
- Use transactions for data consistency
- Implement soft deletes when appropriate`,
    examples: [
      'Primary keys: id SERIAL PRIMARY KEY or uuid',
      'Foreign keys: user_id REFERENCES users(id)',
      'Indexes: CREATE INDEX idx_email ON users(email)',
      'Unique constraints: UNIQUE(email)',
      'Check constraints: CHECK(age >= 0)',
    ],
    bestPractices: [
      'Use migrations for schema changes',
      'Index frequently queried columns',
      'Use appropriate data types',
      'Implement cascading deletes/updates carefully',
      'Use transactions for multi-step operations',
      'Add timestamps (created_at, updated_at)',
      'Consider soft deletes for important data',
    ],
    commonPitfalls: [
      'Not using indexes',
      'Over-normalization',
      'Missing foreign key constraints',
      'Poor data type choices',
      'No migration strategy',
    ],
  },

  'testing': {
    id: 'testing',
    name: 'Testing Strategies',
    description: 'Comprehensive testing approaches',
    category: 'testing',
    context: `Testing pyramid:
- Unit tests: Test individual functions/components
- Integration tests: Test component interactions
- E2E tests: Test complete user workflows
- Follow AAA pattern: Arrange, Act, Assert`,
    examples: [
      'Unit: test("adds 1 + 2 to equal 3")',
      'Integration: test("API endpoint returns 200")',
      'E2E: test("user can login and view dashboard")',
      'Mock external dependencies',
      'Test edge cases and error conditions',
    ],
    bestPractices: [
      'Write tests before or alongside code (TDD)',
      'Aim for > 80% code coverage',
      'Test both happy path and error cases',
      'Use descriptive test names',
      'Mock external dependencies',
      'Keep tests fast and independent',
      'Test accessibility requirements',
    ],
    commonPitfalls: [
      'Not testing error cases',
      'Testing implementation details',
      'Flaky tests',
      'Slow tests',
      'Not mocking external services',
    ],
  },

  'docker': {
    id: 'docker',
    name: 'Docker & Containerization',
    description: 'Container-based development and deployment',
    category: 'devops',
    context: `Docker best practices:
- Use multi-stage builds to reduce image size
- Run containers as non-root user
- Use specific image tags (not :latest)
- Minimize layers in Dockerfile
- Use .dockerignore to exclude files`,
    examples: [
      'FROM node:18-alpine AS builder',
      'WORKDIR /app',
      'COPY package*.json ./',
      'RUN npm ci --only=production',
      'USER node',
      'CMD ["node", "dist/index.js"]',
    ],
    bestPractices: [
      'Use alpine-based images',
      'Multi-stage builds for smaller images',
      'Cache npm dependencies properly',
      'Run as non-root user',
      'Health checks in Dockerfile',
      'Use docker-compose for local development',
    ],
    commonPitfalls: [
      'Large image sizes',
      'Running as root',
      'Not using .dockerignore',
      'Including dev dependencies',
      'No health checks',
    ],
  },

  'performance': {
    id: 'performance',
    name: 'Performance Optimization',
    description: 'Frontend and backend performance optimization',
    category: 'general',
    context: `Performance optimization strategies:
- Minimize bundle size
- Lazy load components and routes
- Implement caching strategies
- Optimize database queries
- Use CDN for static assets`,
    examples: [
      'React.lazy for code splitting',
      'useMemo for expensive computations',
      'Redis for caching',
      'Database query optimization',
      'Image optimization and lazy loading',
    ],
    bestPractices: [
      'Measure before optimizing',
      'Use React DevTools Profiler',
      'Implement code splitting',
      'Optimize images (WebP, lazy loading)',
      'Use CDN for static assets',
      'Enable HTTP/2 and compression',
      'Database query optimization',
    ],
    commonPitfalls: [
      'Premature optimization',
      'Not measuring performance',
      'Large bundle sizes',
      'N+1 query problems',
      'No caching strategy',
    ],
  },
};

export function getSkill(id: string): Skill | undefined {
  return SKILL_LIBRARY[id];
}

export function getAllSkills(): Skill[] {
  return Object.values(SKILL_LIBRARY);
}

export function getSkillsByCategory(category: Skill['category']): Skill[] {
  return Object.values(SKILL_LIBRARY).filter(skill => skill.category === category);
}

export function enhancePromptWithSkills(basePrompt: string, skillIds: string[]): string {
  let enhanced = basePrompt;

  for (const skillId of skillIds) {
    const skill = SKILL_LIBRARY[skillId];
    if (skill) {
      enhanced += `\n\n## ${skill.name} Context\n${skill.context}`;
      
      if (skill.bestPractices.length > 0) {
        enhanced += `\n\n**Best Practices:**\n`;
        skill.bestPractices.forEach(practice => {
          enhanced += `- ${practice}\n`;
        });
      }

      if (skill.commonPitfalls.length > 0) {
        enhanced += `\n\n**Avoid:**\n`;
        skill.commonPitfalls.forEach(pitfall => {
          enhanced += `- ${pitfall}\n`;
        });
      }
    }
  }

  return enhanced;
}

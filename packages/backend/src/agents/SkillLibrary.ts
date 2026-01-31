export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'frontend' | 'backend' | 'devops' | 'testing' | 'security' | 'general' | 'mobile' | 'product';
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

  'nodejs': {
    id: 'nodejs',
    name: 'Node.js Best Practices',
    description: 'Modern Node.js development patterns',
    category: 'backend',
    context: `Node.js best practices:
- Use async/await for I/O operations
- Implement proper error handling
- Use streams for large data
- Environment-based configuration
- Process management (PM2, Docker)
- Graceful shutdown handling`,
    examples: [
      'async/await instead of callbacks',
      'Express/Fastify/Hono for APIs',
      'Use dotenv for environment variables',
      'Implement health check endpoints',
      'Handle uncaught exceptions',
    ],
    bestPractices: [
      'Use LTS versions of Node.js',
      'Implement proper logging (Winston, Pino)',
      'Use dependency injection',
      'Validate environment variables at startup',
      'Handle process signals (SIGTERM, SIGINT)',
      'Implement circuit breakers for external services',
    ],
    commonPitfalls: [
      'Blocking the event loop',
      'Not handling promise rejections',
      'Memory leaks from event listeners',
      'Not implementing rate limiting',
      'Poor error handling',
    ],
  },

  'graphql': {
    id: 'graphql',
    name: 'GraphQL API Design',
    description: 'GraphQL schema design and resolver patterns',
    category: 'backend',
    context: `GraphQL patterns:
- Schema-first design
- Efficient resolver implementation
- DataLoader for N+1 prevention
- Proper error handling
- Authentication and authorization
- Query complexity limits`,
    examples: [
      'type Query { user(id: ID!): User }',
      'type Mutation { createUser(input: CreateUserInput!): User! }',
      'Use DataLoader for batching',
      'Implement field-level resolvers',
      'Use enums for fixed values',
    ],
    bestPractices: [
      'Keep schema simple and intuitive',
      'Use DataLoader to prevent N+1 queries',
      'Implement pagination (cursor-based)',
      'Validate input at the schema level',
      'Use fragments for reusable fields',
      'Implement query depth limits',
    ],
    commonPitfalls: [
      'N+1 query problem',
      'Over-fetching or under-fetching',
      'No query complexity analysis',
      'Poor error handling',
      'Missing input validation',
    ],
  },

  'kubernetes': {
    id: 'kubernetes',
    name: 'Kubernetes Deployment',
    description: 'Container orchestration with Kubernetes',
    category: 'devops',
    context: `Kubernetes patterns:
- Pod, Deployment, Service, Ingress
- ConfigMaps and Secrets for configuration
- Resource limits and requests
- Health checks (liveness, readiness)
- Horizontal Pod Autoscaling
- Rolling updates and rollbacks`,
    examples: [
      'Deployment with replicas',
      'Service for load balancing',
      'Ingress for external access',
      'ConfigMap for configuration',
      'Secret for sensitive data',
    ],
    bestPractices: [
      'Always set resource limits and requests',
      'Implement liveness and readiness probes',
      'Use namespaces for isolation',
      'Version your deployments',
      'Use Helm for package management',
      'Implement network policies',
    ],
    commonPitfalls: [
      'No resource limits (OOMKilled)',
      'Missing health checks',
      'Hardcoding configuration',
      'Not using namespaces',
      'Poor secret management',
    ],
  },

  'ci-cd': {
    id: 'ci-cd',
    name: 'CI/CD Pipeline Design',
    description: 'Continuous Integration and Deployment',
    category: 'devops',
    context: `CI/CD principles:
- Automated testing on every commit
- Fast feedback loops (< 10 min)
- Deployment automation
- Environment parity
- Blue-green or canary deployments
- Automated rollback capability`,
    examples: [
      'GitHub Actions workflow',
      'GitLab CI pipeline',
      'Jenkins pipeline as code',
      'Automated testing and linting',
      'Docker image build and push',
    ],
    bestPractices: [
      'Run tests in parallel',
      'Use caching for dependencies',
      'Fail fast on errors',
      'Separate build and deploy stages',
      'Use environment variables for secrets',
      'Implement quality gates',
    ],
    commonPitfalls: [
      'Slow pipelines (> 15 min)',
      'No test coverage',
      'Hardcoded secrets',
      'No rollback strategy',
      'Manual deployment steps',
    ],
  },

  'terraform': {
    id: 'terraform',
    name: 'Infrastructure as Code with Terraform',
    description: 'Terraform for infrastructure provisioning',
    category: 'devops',
    context: `Terraform best practices:
- Use modules for reusability
- Remote state storage (S3, Terraform Cloud)
- State locking to prevent conflicts
- Separate environments (dev, staging, prod)
- Plan before apply
- Version control for all code`,
    examples: [
      'Define resources in .tf files',
      'Use variables for flexibility',
      'Output values for reference',
      'Use modules for complex setups',
      'terraform plan, terraform apply',
    ],
    bestPractices: [
      'Use remote state storage',
      'Enable state locking',
      'Use workspaces for environments',
      'Version your modules',
      'Use data sources for existing resources',
      'Implement proper IAM permissions',
    ],
    commonPitfalls: [
      'Local state files',
      'No state locking',
      'Hardcoded values',
      'Not using modules',
      'Direct resource modification',
    ],
  },

  'monitoring': {
    id: 'monitoring',
    name: 'Monitoring and Observability',
    description: 'Application monitoring and logging',
    category: 'devops',
    context: `Observability pillars:
- Metrics (Prometheus, Grafana)
- Logs (ELK, Loki)
- Traces (Jaeger, Zipkin)
- Alerts and notifications
- SLIs, SLOs, SLAs
- Error tracking (Sentry)`,
    examples: [
      'Prometheus metrics collection',
      'Grafana dashboards',
      'Structured logging with correlation IDs',
      'Distributed tracing',
      'Error rate monitoring',
    ],
    bestPractices: [
      'Implement structured logging',
      'Use correlation IDs',
      'Set up alerting for critical metrics',
      'Monitor golden signals (latency, traffic, errors, saturation)',
      'Implement health check endpoints',
      'Use APM tools',
    ],
    commonPitfalls: [
      'No structured logging',
      'Too many alerts (alert fatigue)',
      'No correlation between logs and traces',
      'Missing critical metrics',
      'No error tracking',
    ],
  },

  'accessibility': {
    id: 'accessibility',
    name: 'Web Accessibility (a11y)',
    description: 'WCAG 2.1 compliance and accessible design',
    category: 'frontend',
    context: `Accessibility essentials:
- Semantic HTML
- ARIA attributes when needed
- Keyboard navigation
- Screen reader support
- Color contrast (WCAG AA: 4.5:1)
- Focus management`,
    examples: [
      'Use <button> for buttons, not <div>',
      'Add alt text to images',
      'Use aria-label for icon buttons',
      'Implement skip links',
      'Ensure keyboard navigation works',
    ],
    bestPractices: [
      'Use semantic HTML elements',
      'Provide alt text for all images',
      'Ensure sufficient color contrast',
      'Make all functionality keyboard accessible',
      'Use ARIA landmarks',
      'Test with screen readers',
    ],
    commonPitfalls: [
      'Missing alt text',
      'Poor color contrast',
      'Keyboard traps',
      'Missing focus indicators',
      'Over-using ARIA',
    ],
  },

  'tailwind': {
    id: 'tailwind',
    name: 'Tailwind CSS Patterns',
    description: 'Utility-first CSS with Tailwind',
    category: 'frontend',
    context: `Tailwind best practices:
- Utility-first approach
- Custom theme configuration
- Component extraction when needed
- Responsive design modifiers
- Dark mode support
- Performance optimization`,
    examples: [
      'flex items-center justify-between',
      'bg-blue-500 hover:bg-blue-600',
      'sm:text-sm md:text-base lg:text-lg',
      'dark:bg-gray-800',
      '@apply for component classes',
    ],
    bestPractices: [
      'Configure tailwind.config.js for design system',
      'Use @apply sparingly',
      'Purge unused CSS in production',
      'Use responsive modifiers',
      'Implement dark mode',
      'Create custom utilities when needed',
    ],
    commonPitfalls: [
      'Over-using @apply',
      'Not purging unused CSS',
      'Inconsistent spacing',
      'Not using design tokens',
      'Inline styles instead of utilities',
    ],
  },

  'nextjs': {
    id: 'nextjs',
    name: 'Next.js App Router',
    description: 'Modern Next.js with App Router and Server Components',
    category: 'frontend',
    context: `Next.js 13+ patterns:
- App Router (not Pages Router)
- Server Components by default
- Client Components with "use client"
- Server Actions for mutations
- Streaming and Suspense
- Route handlers for APIs`,
    examples: [
      'app/page.tsx for routes',
      '"use client" for interactive components',
      'async Server Components',
      'Server Actions for forms',
      'loading.tsx and error.tsx',
    ],
    bestPractices: [
      'Use Server Components by default',
      'Client Components only when needed',
      'Implement loading states with Suspense',
      'Use Server Actions for mutations',
      'Optimize images with next/image',
      'Implement proper error boundaries',
    ],
    commonPitfalls: [
      'Using "use client" everywhere',
      'Not using Server Components',
      'No loading states',
      'Client-side data fetching when server-side is better',
      'Not optimizing images',
    ],
  },

  'sql': {
    id: 'sql',
    name: 'SQL Query Optimization',
    description: 'Efficient SQL queries and database performance',
    category: 'backend',
    context: `SQL optimization:
- Use indexes strategically
- Avoid SELECT *
- Use EXPLAIN ANALYZE
- Optimize JOINs
- Parameterized queries
- Connection pooling`,
    examples: [
      'CREATE INDEX idx_user_email ON users(email)',
      'SELECT id, name FROM users WHERE email = $1',
      'EXPLAIN ANALYZE SELECT ...',
      'Use INNER JOIN instead of subqueries',
      'Batch inserts for performance',
    ],
    bestPractices: [
      'Index foreign keys and frequently queried columns',
      'Use EXPLAIN to understand query plans',
      'Avoid N+1 queries',
      'Use connection pooling',
      'Implement query timeouts',
      'Use appropriate index types (B-tree, Hash, GIN)',
    ],
    commonPitfalls: [
      'No indexes on foreign keys',
      'Using SELECT *',
      'N+1 query problem',
      'Not using prepared statements',
      'Over-indexing',
    ],
  },

  'redis': {
    id: 'redis',
    name: 'Redis Caching Strategies',
    description: 'Redis for caching and performance',
    category: 'backend',
    context: `Redis patterns:
- Cache-aside pattern
- Key expiration (TTL)
- Pub/Sub for real-time
- Sorted sets for leaderboards
- Session storage
- Rate limiting`,
    examples: [
      'SET key value EX 3600',
      'GET key',
      'INCR counter',
      'ZADD leaderboard score member',
      'PUBLISH channel message',
    ],
    bestPractices: [
      'Set expiration on all keys',
      'Use appropriate data structures',
      'Implement cache invalidation strategy',
      'Monitor memory usage',
      'Use Redis Cluster for scaling',
      'Implement connection pooling',
    ],
    commonPitfalls: [
      'No key expiration',
      'Cache stampede',
      'Not handling connection failures',
      'Storing too much data',
      'Not monitoring memory',
    ],
  },

  'websocket': {
    id: 'websocket',
    name: 'WebSocket Real-time Communication',
    description: 'Real-time bidirectional communication',
    category: 'backend',
    context: `WebSocket patterns:
- Connection management
- Message broadcasting
- Authentication
- Reconnection logic
- Heartbeat/ping-pong
- Scaling with Redis Pub/Sub`,
    examples: [
      'Socket.io for WebSocket abstraction',
      'ws library for Node.js',
      'Broadcast to all clients',
      'Room-based messaging',
      'Authentication with JWT',
    ],
    bestPractices: [
      'Implement authentication',
      'Handle reconnection',
      'Use heartbeat for connection health',
      'Implement backpressure',
      'Use Redis for multi-server scaling',
      'Implement rate limiting',
    ],
    commonPitfalls: [
      'No authentication',
      'Memory leaks from unclosed connections',
      'No reconnection logic',
      'Broadcasting to too many clients',
      'Not handling errors',
    ],
  },

  'mobile-development': {
    id: 'mobile-development',
    name: 'Mobile Development Patterns',
    description: 'iOS, Android, and React Native development',
    category: 'mobile',
    context: `Mobile development:
- Platform-specific patterns (iOS vs Android)
- Touch-first UI design
- Offline-first architecture
- Native module integration
- Performance optimization
- App store guidelines`,
    examples: [
      'React Native for cross-platform',
      'Platform-specific code with Platform.OS',
      'AsyncStorage for offline data',
      'Native modules for device features',
      'Optimize images and bundle size',
    ],
    bestPractices: [
      'Design for both iOS and Android',
      'Implement offline-first',
      'Optimize for battery life',
      'Use native modules judiciously',
      'Test on real devices',
      'Follow platform guidelines',
    ],
    commonPitfalls: [
      'Not testing on real devices',
      'Poor performance optimization',
      'No offline support',
      'Ignoring platform differences',
      'Large bundle sizes',
    ],
  },

  'microservices': {
    id: 'microservices',
    name: 'Microservices Architecture',
    description: 'Distributed system design with microservices',
    category: 'backend',
    context: `Microservices patterns:
- Service decomposition
- API Gateway
- Service discovery
- Circuit breaker pattern
- Event-driven architecture
- Distributed tracing`,
    examples: [
      'Each service has its own database',
      'Use API Gateway (Kong, Nginx)',
      'Service mesh (Istio, Linkerd)',
      'Event bus (RabbitMQ, Kafka)',
      'Circuit breaker (Hystrix)',
    ],
    bestPractices: [
      'Single responsibility per service',
      'Database per service',
      'API Gateway for client communication',
      'Implement circuit breakers',
      'Use distributed tracing',
      'Implement health checks',
    ],
    commonPitfalls: [
      'Shared database between services',
      'No circuit breakers',
      'Tight coupling between services',
      'No distributed tracing',
      'Synchronous communication everywhere',
    ],
  },

  'authentication': {
    id: 'authentication',
    name: 'Authentication and Authorization',
    description: 'Secure user authentication patterns',
    category: 'security',
    context: `Auth patterns:
- JWT for stateless auth
- OAuth 2.0 for third-party
- Refresh tokens
- Password hashing (bcrypt, argon2)
- MFA/2FA
- Session management`,
    examples: [
      'JWT with access and refresh tokens',
      'OAuth 2.0 with Google/GitHub',
      'Password hashing with bcrypt',
      'TOTP for 2FA',
      'CSRF protection',
    ],
    bestPractices: [
      'Use bcrypt/argon2 for passwords',
      'Implement refresh token rotation',
      'Short-lived access tokens',
      'HTTPS only',
      'Implement rate limiting',
      'Use secure cookie flags (httpOnly, secure, sameSite)',
    ],
    commonPitfalls: [
      'Storing passwords in plain text',
      'Long-lived tokens',
      'No refresh token mechanism',
      'Missing CSRF protection',
      'Not implementing rate limiting',
    ],
  },

  'testing-strategies': {
    id: 'testing-strategies',
    name: 'Advanced Testing Strategies',
    description: 'Comprehensive testing approaches',
    category: 'testing',
    context: `Testing approaches:
- Test pyramid (70% unit, 20% integration, 10% E2E)
- TDD (Test-Driven Development)
- BDD (Behavior-Driven Development)
- Contract testing
- Visual regression testing
- Performance testing`,
    examples: [
      'Jest for unit testing',
      'Playwright for E2E',
      'React Testing Library',
      'Pact for contract testing',
      'k6 for load testing',
    ],
    bestPractices: [
      'Follow the testing pyramid',
      'Write tests before code (TDD)',
      'Mock external dependencies',
      'Test edge cases and errors',
      'Maintain test independence',
      'Use factories for test data',
    ],
    commonPitfalls: [
      'Too many E2E tests',
      'Flaky tests',
      'Testing implementation details',
      'No test data management',
      'Slow test suites',
    ],
  },

  'code-quality': {
    id: 'code-quality',
    name: 'Code Quality and Clean Code',
    description: 'Writing maintainable, clean code',
    category: 'general',
    context: `Clean code principles:
- SOLID principles
- DRY (Don't Repeat Yourself)
- YAGNI (You Aren't Gonna Need It)
- KISS (Keep It Simple, Stupid)
- Meaningful names
- Small functions`,
    examples: [
      'Single Responsibility Principle',
      'Extract functions for clarity',
      'Use descriptive variable names',
      'Keep functions small (< 20 lines)',
      'Avoid deep nesting',
    ],
    bestPractices: [
      'Write self-documenting code',
      'Use consistent naming conventions',
      'Keep functions small and focused',
      'Avoid premature abstraction',
      'Use ESLint/Prettier for consistency',
      'Code review for quality',
    ],
    commonPitfalls: [
      'Overly complex code',
      'Poor naming',
      'Long functions',
      'Deep nesting',
      'Premature optimization',
    ],
  },

  'seo': {
    id: 'seo',
    name: 'SEO Optimization',
    description: 'Search Engine Optimization techniques',
    category: 'frontend',
    context: `SEO essentials:
- Meta tags (title, description)
- Semantic HTML
- Structured data (JSON-LD)
- Core Web Vitals
- Mobile-first
- Site speed optimization`,
    examples: [
      '<title>Page Title - Site Name</title>',
      '<meta name="description" content="..." />',
      'JSON-LD for structured data',
      'Semantic HTML5 elements',
      'Image alt attributes',
    ],
    bestPractices: [
      'Unique title and description per page',
      'Use semantic HTML',
      'Implement structured data',
      'Optimize for Core Web Vitals',
      'Mobile-responsive design',
      'Fast page load times (< 3s)',
    ],
    commonPitfalls: [
      'Duplicate meta tags',
      'Missing alt text',
      'Slow page load',
      'No structured data',
      'Not mobile-friendly',
    ],
  },

  'debugging': {
    id: 'debugging',
    name: 'Systematic Debugging',
    description: 'Effective debugging strategies',
    category: 'general',
    context: `Debugging process:
1. Reproduce the issue
2. Isolate the problem
3. Understand root cause (5 Whys)
4. Fix and verify
5. Add regression test`,
    examples: [
      'Use debugger and breakpoints',
      'Read stack traces',
      'Add strategic console.logs',
      'Use browser DevTools',
      'Profile performance',
    ],
    bestPractices: [
      'Reproduce consistently first',
      'Create minimal reproduction',
      'Use debugging tools',
      'Check logs and monitoring',
      'Apply 5 Whys technique',
      'Add regression tests',
    ],
    commonPitfalls: [
      'Guessing instead of investigating',
      'Fixing symptoms not root cause',
      'Multiple changes at once',
      'No regression tests',
      'Not documenting the fix',
    ],
  },

  'refactoring': {
    id: 'refactoring',
    name: 'Code Refactoring',
    description: 'Safe refactoring techniques',
    category: 'general',
    context: `Refactoring principles:
- Small, incremental changes
- Tests before refactoring
- One change at a time
- Keep tests passing
- Strangler Fig for large changes
- Document decisions`,
    examples: [
      'Extract method',
      'Rename for clarity',
      'Extract variable',
      'Replace conditional with polymorphism',
      'Introduce parameter object',
    ],
    bestPractices: [
      'Have tests before refactoring',
      'Make small, atomic changes',
      'Keep tests passing',
      'Commit frequently',
      'Use IDE refactoring tools',
      'Document why, not what',
    ],
    commonPitfalls: [
      'Large refactorings without tests',
      'Multiple changes at once',
      'Breaking tests',
      'Not understanding code first',
      'Over-engineering',
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

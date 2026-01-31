export interface WorkflowStep {
  agentId: string;
  description: string;
  skills?: string[];
  outputFormat?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  triggerKeywords: string[];
  expectedOutputs: string[];
}

export const WORKFLOWS: Record<string, Workflow> = {
  brainstorm: {
    id: 'brainstorm',
    name: 'Brainstorm & Ideation',
    description: 'Generate and explore creative solutions and feature ideas',
    steps: [
      {
        agentId: 'product-owner',
        description: 'Define problem space and value proposition',
        skills: ['product-strategy', 'requirements'],
      },
      {
        agentId: 'discovery-analyst',
        description: 'Analyze requirements and constraints',
        skills: ['requirements-analysis', 'system-design'],
      },
      {
        agentId: 'planning-architect',
        description: 'Generate solution alternatives and tradeoffs',
        skills: ['architecture', 'planning'],
      },
    ],
    triggerKeywords: ['brainstorm', 'ideate', 'explore ideas', 'generate ideas', 'creative solutions'],
    expectedOutputs: ['ideas.md', 'requirements.md', 'alternatives.md'],
  },

  create: {
    id: 'create',
    name: 'Feature Creation',
    description: 'End-to-end feature development from requirements to implementation',
    steps: [
      {
        agentId: 'discovery-analyst',
        description: 'Gather requirements and create specifications',
        skills: ['requirements-analysis', 'system-design', 'architecture'],
      },
      {
        agentId: 'planning-architect',
        description: 'Break down into implementation tasks',
        skills: ['planning', 'task-breakdown', 'dependency-analysis'],
      },
      {
        agentId: 'frontend-expert',
        description: 'Implement frontend components',
        skills: ['react', 'typescript', 'css'],
        outputFormat: 'TypeScript/React components',
      },
      {
        agentId: 'backend-expert',
        description: 'Implement backend APIs and business logic',
        skills: ['nodejs', 'api-design', 'database-design'],
        outputFormat: 'TypeScript/Node.js code',
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Create automated tests',
        skills: ['test-automation', 'testing'],
        outputFormat: 'Test suites',
      },
    ],
    triggerKeywords: ['create feature', 'build', 'implement', 'develop new'],
    expectedOutputs: ['architecture.md', 'plan.md', 'src/', 'tests/'],
  },

  debug: {
    id: 'debug',
    name: 'Systematic Debugging',
    description: 'Root cause analysis and bug resolution',
    steps: [
      {
        agentId: 'debugger',
        description: 'Reproduce and isolate the issue',
        skills: ['debugging', 'problem-solving'],
      },
      {
        agentId: 'explorer-agent',
        description: 'Analyze codebase to understand context',
        skills: ['code-analysis', 'architecture'],
      },
      {
        agentId: 'debugger',
        description: 'Identify root cause and implement fix',
        skills: ['debugging', 'testing'],
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Add regression tests',
        skills: ['test-automation', 'testing'],
      },
    ],
    triggerKeywords: ['debug', 'fix bug', 'error', 'issue', 'not working', 'failing'],
    expectedOutputs: ['bug-analysis.md', 'fix.patch', 'regression-tests/'],
  },

  deploy: {
    id: 'deploy',
    name: 'Deployment Pipeline',
    description: 'Production deployment with CI/CD and infrastructure',
    steps: [
      {
        agentId: 'devops-expert',
        description: 'Design deployment strategy',
        skills: ['docker', 'ci-cd', 'kubernetes'],
      },
      {
        agentId: 'security-expert',
        description: 'Security audit and hardening',
        skills: ['security', 'owasp', 'input-validation'],
      },
      {
        agentId: 'devops-expert',
        description: 'Configure CI/CD pipeline',
        skills: ['ci-cd', 'terraform', 'monitoring'],
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Setup automated testing in pipeline',
        skills: ['test-automation', 'ci-cd'],
      },
    ],
    triggerKeywords: ['deploy', 'production', 'ci/cd', 'infrastructure', 'devops'],
    expectedOutputs: ['Dockerfile', '.github/workflows/', 'terraform/', 'deployment.md'],
  },

  enhance: {
    id: 'enhance',
    name: 'Code Enhancement',
    description: 'Improve existing code quality, performance, and maintainability',
    steps: [
      {
        agentId: 'code-archaeologist',
        description: 'Analyze existing code and identify improvements',
        skills: ['code-analysis', 'refactoring'],
      },
      {
        agentId: 'performance-optimizer',
        description: 'Optimize performance bottlenecks',
        skills: ['performance', 'optimization', 'profiling'],
      },
      {
        agentId: 'security-expert',
        description: 'Address security vulnerabilities',
        skills: ['security', 'owasp', 'secure-coding'],
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Improve test coverage',
        skills: ['test-automation', 'testing'],
      },
    ],
    triggerKeywords: ['enhance', 'improve', 'optimize', 'refactor', 'modernize'],
    expectedOutputs: ['analysis.md', 'refactoring-plan.md', 'improved-code/'],
  },

  orchestrate: {
    id: 'orchestrate',
    name: 'Multi-Agent Orchestration',
    description: 'Coordinate multiple specialists for complex tasks',
    steps: [
      {
        agentId: 'orchestrator',
        description: 'Decompose complex task into subtasks',
        skills: ['coordination', 'planning'],
      },
      {
        agentId: 'orchestrator',
        description: 'Assign subtasks to specialist agents',
        skills: ['coordination', 'architecture'],
      },
      {
        agentId: 'orchestrator',
        description: 'Synthesize results and ensure consistency',
        skills: ['coordination', 'planning'],
      },
    ],
    triggerKeywords: ['complex task', 'multiple components', 'coordinate', 'full stack'],
    expectedOutputs: ['orchestration-plan.md', 'task-assignments.md', 'final-output/'],
  },

  plan: {
    id: 'plan',
    name: 'Project Planning',
    description: 'Comprehensive project planning and roadmap creation',
    steps: [
      {
        agentId: 'product-owner',
        description: 'Define product vision and MVP scope',
        skills: ['product-strategy', 'mvp-planning'],
      },
      {
        agentId: 'product-manager',
        description: 'Create user stories and prioritize features',
        skills: ['product-management', 'requirements'],
      },
      {
        agentId: 'planning-architect',
        description: 'Create technical implementation plan',
        skills: ['planning', 'architecture', 'task-breakdown'],
      },
      {
        agentId: 'devops-expert',
        description: 'Plan infrastructure and deployment',
        skills: ['ci-cd', 'docker', 'monitoring'],
      },
    ],
    triggerKeywords: ['plan', 'roadmap', 'project plan', 'sprint planning'],
    expectedOutputs: ['product-vision.md', 'user-stories.md', 'technical-plan.md', 'infrastructure-plan.md'],
  },

  preview: {
    id: 'preview',
    name: 'Design Preview',
    description: 'Create UI/UX previews and prototypes',
    steps: [
      {
        agentId: 'discovery-analyst',
        description: 'Understand user requirements',
        skills: ['requirements-analysis'],
      },
      {
        agentId: 'frontend-expert',
        description: 'Design component structure and styling',
        skills: ['react', 'css', 'ui-design'],
      },
      {
        agentId: 'seo-specialist',
        description: 'Optimize for performance and SEO',
        skills: ['seo', 'performance', 'web-optimization'],
      },
    ],
    triggerKeywords: ['preview', 'prototype', 'mockup', 'ui design', 'wireframe'],
    expectedOutputs: ['design-spec.md', 'components/', 'styles/'],
  },

  status: {
    id: 'status',
    name: 'Project Status Analysis',
    description: 'Analyze project health, progress, and recommendations',
    steps: [
      {
        agentId: 'explorer-agent',
        description: 'Analyze codebase structure and quality',
        skills: ['code-analysis', 'architecture', 'documentation'],
      },
      {
        agentId: 'code-archaeologist',
        description: 'Assess technical debt and improvement areas',
        skills: ['code-analysis', 'refactoring'],
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Review test coverage and quality metrics',
        skills: ['quality-engineering', 'testing'],
      },
      {
        agentId: 'product-manager',
        description: 'Provide recommendations and next steps',
        skills: ['product-management', 'planning'],
      },
    ],
    triggerKeywords: ['status', 'analyze project', 'code review', 'health check', 'audit'],
    expectedOutputs: ['project-status.md', 'technical-debt.md', 'recommendations.md'],
  },

  test: {
    id: 'test',
    name: 'Comprehensive Testing',
    description: 'Create comprehensive test suites across all levels',
    steps: [
      {
        agentId: 'qa-automation-engineer',
        description: 'Design test strategy (unit, integration, E2E)',
        skills: ['test-automation', 'quality-engineering'],
      },
      {
        agentId: 'qa-automation-engineer',
        description: 'Implement automated tests',
        skills: ['test-automation', 'ci-cd'],
      },
      {
        agentId: 'penetration-tester',
        description: 'Conduct security testing',
        skills: ['security', 'penetration-testing', 'owasp'],
      },
      {
        agentId: 'performance-optimizer',
        description: 'Run performance tests',
        skills: ['performance', 'profiling'],
      },
    ],
    triggerKeywords: ['test', 'testing', 'quality assurance', 'QA', 'test coverage'],
    expectedOutputs: ['test-strategy.md', 'unit-tests/', 'integration-tests/', 'e2e-tests/'],
  },

  'ui-ux-pro-max': {
    id: 'ui-ux-pro-max',
    name: 'Professional UI/UX Development',
    description: 'Premium UI/UX with accessibility, performance, and SEO',
    steps: [
      {
        agentId: 'frontend-expert',
        description: 'Design and implement modern UI components',
        skills: ['react', 'typescript', 'tailwind', 'ui-design'],
      },
      {
        agentId: 'frontend-expert',
        description: 'Ensure accessibility compliance (WCAG 2.1 AA)',
        skills: ['accessibility', 'react'],
      },
      {
        agentId: 'performance-optimizer',
        description: 'Optimize Core Web Vitals and performance',
        skills: ['performance', 'optimization'],
      },
      {
        agentId: 'seo-specialist',
        description: 'Implement SEO best practices and structured data',
        skills: ['seo', 'web-optimization'],
      },
      {
        agentId: 'mobile-developer',
        description: 'Ensure responsive design and mobile optimization',
        skills: ['mobile', 'react-native'],
      },
    ],
    triggerKeywords: ['professional ui', 'premium ux', 'accessible design', 'seo optimized'],
    expectedOutputs: ['ui-components/', 'accessibility-report.md', 'performance-report.md', 'seo-report.md'],
  },
};

export function getAllWorkflows(): Workflow[] {
  return Object.values(WORKFLOWS);
}

export function getWorkflowById(id: string): Workflow | undefined {
  return WORKFLOWS[id];
}

export function detectWorkflowFromPrompt(prompt: string): Workflow | null {
  const lowerPrompt = prompt.toLowerCase();
  
  for (const workflow of Object.values(WORKFLOWS)) {
    for (const keyword of workflow.triggerKeywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        return workflow;
      }
    }
  }
  
  return null;
}

export function suggestWorkflow(description: string): Workflow[] {
  const suggestions: { workflow: Workflow; score: number }[] = [];
  const lowerDescription = description.toLowerCase();
  
  for (const workflow of Object.values(WORKFLOWS)) {
    let score = 0;
    
    for (const keyword of workflow.triggerKeywords) {
      if (lowerDescription.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    
    const descWords = workflow.description.toLowerCase().split(' ');
    for (const word of descWords) {
      if (word.length > 4 && lowerDescription.includes(word)) {
        score += 2;
      }
    }
    
    if (score > 0) {
      suggestions.push({ workflow, score });
    }
  }
  
  return suggestions
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(s => s.workflow);
}

import { AGENT_TEMPLATES, AgentTemplate } from '../agents/AgentTemplates';
import { detectWorkflowFromPrompt, suggestWorkflow } from '../agents/Workflows';

export interface AgentSuggestion {
  agentId: string;
  confidence: number;
  reason: string;
}

export interface RoutingResult {
  primaryAgent: string;
  suggestedAgents: AgentSuggestion[];
  detectedWorkflow?: string;
  reasoning: string;
}

export class AgentRouter {
  detectBestAgent(prompt: string, context?: string): RoutingResult {
    const lowerPrompt = (prompt + ' ' + (context || '')).toLowerCase();
    const suggestions: AgentSuggestion[] = [];

    const workflow = detectWorkflowFromPrompt(prompt);
    if (workflow) {
      return {
        primaryAgent: workflow.steps[0].agentId,
        suggestedAgents: workflow.steps.map((step, idx) => ({
          agentId: step.agentId,
          confidence: 1.0 - (idx * 0.1),
          reason: `Part of "${workflow.name}" workflow: ${step.description}`,
        })),
        detectedWorkflow: workflow.id,
        reasoning: `Detected "${workflow.name}" workflow. Recommending multi-step execution.`,
      };
    }

    const keywords = {
      'discovery-analyst': ['requirements', 'specification', 'clarify', 'understand', 'analyze requirements', 'what should'],
      'planning-architect': ['plan', 'architecture', 'design system', 'break down', 'implementation plan', 'tasks'],
      'frontend-expert': ['react', 'component', 'ui', 'frontend', 'css', 'style', 'user interface', 'tailwind'],
      'backend-expert': ['api', 'backend', 'server', 'endpoint', 'database', 'rest', 'graphql'],
      'fullstack-expert': ['fullstack', 'full stack', 'end-to-end', 'both frontend and backend'],
      'devops-expert': ['deploy', 'docker', 'kubernetes', 'ci/cd', 'pipeline', 'infrastructure', 'aws', 'azure'],
      'security-expert': ['security', 'vulnerability', 'authentication', 'authorization', 'secure', 'owasp', 'encrypt'],
      'database-architect': ['database', 'schema', 'sql', 'query', 'migration', 'index', 'postgres', 'mysql'],
      'debugger': ['bug', 'error', 'fix', 'debug', 'not working', 'issue', 'problem', 'failing'],
      'mobile-developer': ['mobile', 'ios', 'android', 'react native', 'app', 'native'],
      'performance-optimizer': ['slow', 'performance', 'optimize', 'speed up', 'faster', 'bottleneck', 'latency'],
      'documentation-writer': ['document', 'documentation', 'readme', 'guide', 'explain', 'how to'],
      'penetration-tester': ['penetration', 'security test', 'vulnerability scan', 'exploit', 'pen test'],
      'code-archaeologist': ['legacy', 'refactor', 'technical debt', 'old code', 'modernize', 'improve code'],
      'seo-specialist': ['seo', 'search engine', 'meta tags', 'google', 'ranking', 'structured data'],
      'product-manager': ['user story', 'feature', 'requirements', 'prioritize', 'roadmap'],
      'product-owner': ['mvp', 'product vision', 'backlog', 'sprint', 'value'],
      'qa-automation-engineer': ['test', 'testing', 'qa', 'quality', 'automation', 'playwright', 'cypress'],
      'explorer-agent': ['analyze codebase', 'understand code', 'code structure', 'what does', 'how does'],
      'orchestrator': ['complex', 'multiple', 'coordinate', 'full system', 'everything'],
      'game-developer': ['game', 'unity', 'unreal', 'physics', 'gameplay', '2d', '3d'],
    };

    for (const [agentId, agentKeywords] of Object.entries(keywords)) {
      let score = 0;
      const matchedKeywords: string[] = [];

      for (const keyword of agentKeywords) {
        if (lowerPrompt.includes(keyword)) {
          score += 10;
          matchedKeywords.push(keyword);
        }
      }

      if (score > 0) {
        const agent = AGENT_TEMPLATES[agentId];
        if (agent) {
          suggestions.push({
            agentId,
            confidence: Math.min(score / 30, 1.0),
            reason: `Matched keywords: ${matchedKeywords.join(', ')}`,
          });
        }
      }
    }

    suggestions.sort((a, b) => b.confidence - a.confidence);

    const topSuggestions = suggestions.slice(0, 5);

    if (topSuggestions.length === 0) {
      return {
        primaryAgent: 'discovery-analyst',
        suggestedAgents: [{
          agentId: 'discovery-analyst',
          confidence: 0.5,
          reason: 'Default agent for requirements gathering',
        }],
        reasoning: 'No specific agent detected. Using discovery-analyst to gather requirements.',
      };
    }

    const primaryAgent = topSuggestions[0].agentId;
    const reasoning = `Selected ${AGENT_TEMPLATES[primaryAgent]?.name} based on: ${topSuggestions[0].reason}`;

    return {
      primaryAgent,
      suggestedAgents: topSuggestions,
      reasoning,
    };
  }

  suggestAgentForPhase(phase: string): string {
    const phaseMapping: Record<string, string> = {
      discovery: 'discovery-analyst',
      planning: 'planning-architect',
      execution: 'fullstack-expert',
      verification: 'qa-automation-engineer',
    };

    return phaseMapping[phase.toLowerCase()] || 'discovery-analyst';
  }

  getAgentCapabilities(agentId: string): string[] {
    const agent = AGENT_TEMPLATES[agentId];
    return agent?.capabilities || [];
  }

  findAgentsBySkill(skillId: string): AgentTemplate[] {
    return Object.values(AGENT_TEMPLATES).filter(agent =>
      agent.skills.includes(skillId)
    );
  }

  findAgentsByCapability(capability: string): AgentTemplate[] {
    const lowerCapability = capability.toLowerCase();
    return Object.values(AGENT_TEMPLATES).filter(agent =>
      agent.capabilities.some(cap => cap.toLowerCase().includes(lowerCapability))
    );
  }

  suggestWorkflowsForPrompt(prompt: string): Array<{ id: string; name: string; confidence: number }> {
    const workflows = suggestWorkflow(prompt);
    return workflows.map((workflow, idx) => ({
      id: workflow.id,
      name: workflow.name,
      confidence: 1.0 - (idx * 0.2),
    }));
  }
}

import type { LLMProvider, ChatOptions } from '@obsidian/core';
import {
  PLANNING_SYSTEM_PROMPT,
  STEP_BREAKDOWN_PROMPT,
  RED_TEAMING_PROMPT,
  PLAN_GENERATION_PROMPT,
} from '../../llm/prompt-templates/planning';

export interface ImplementationStep {
  id: string;
  title: string;
  description: string;
  dependencies: string[];
  verification: string;
  estimatedTime: string;
}

export interface Risk {
  risk: string;
  severity: 'high' | 'medium' | 'low';
  mitigation: string;
}

export interface PlanningResult {
  steps: ImplementationStep[];
  risks: Record<string, Risk[]>;
  plan?: string;
}

export class PlanningPhaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'PlanningPhaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class PlanningPhase {
  constructor(private llmProvider: LLMProvider) {}

  async breakdownSteps(architecture: string): Promise<ImplementationStep[]> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'planning' as const,
        agentId: 'planning-architect',
        skills: ['planning', 'task-breakdown'],
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: PLANNING_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: STEP_BREAKDOWN_PROMPT(architecture),
        },
      ], options);

      return this.parseStepsResponse(response.content);
    } catch (error) {
      if (error instanceof PlanningPhaseError) {
        throw error;
      }
      throw new PlanningPhaseError(
        'Failed to break down architecture into steps',
        error instanceof Error ? error : undefined
      );
    }
  }

  async performRedTeaming(step: ImplementationStep): Promise<Risk[]> {
    try {
      const stepDescription = `${step.title}\n${step.description}`;
      const options: ChatOptions & { phase?: string; agentId?: string } = {
        phase: 'planning' as const,
        agentId: 'security-auditor',
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: PLANNING_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: RED_TEAMING_PROMPT(stepDescription),
        },
      ], options);

      return this.parseRisksResponse(response.content);
    } catch (error) {
      if (error instanceof PlanningPhaseError) {
        throw error;
      }
      throw new PlanningPhaseError(
        `Failed to perform red teaming for step: ${step.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generatePlan(
    architecture: string,
    steps: ImplementationStep[],
    risks: Record<string, Risk[]>
  ): Promise<string> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'planning' as const,
        agentId: 'planning-architect',
        skills: ['planning', 'dependency-analysis'],
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: PLANNING_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: PLAN_GENERATION_PROMPT(architecture, steps, risks),
        },
      ], options);

      return this.cleanPlanResponse(response.content);
    } catch (error) {
      if (error instanceof PlanningPhaseError) {
        throw error;
      }
      throw new PlanningPhaseError(
        'Failed to generate implementation plan',
        error instanceof Error ? error : undefined
      );
    }
  }

  async execute(architecture: string): Promise<PlanningResult> {
    const steps = await this.breakdownSteps(architecture);

    const risks: Record<string, Risk[]> = {};
    for (const step of steps) {
      risks[step.id] = await this.performRedTeaming(step);
    }

    const plan = await this.generatePlan(architecture, steps, risks);

    return { steps, risks, plan };
  }

  private parseStepsResponse(response: string): ImplementationStep[] {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      if (parsed.length === 0) {
        throw new Error('No steps generated');
      }

      return parsed.map((step, index) => {
        if (!step.id || !step.title || !step.description) {
          throw new Error(`Invalid step structure at index ${index}`);
        }

        return {
          id: step.id,
          title: step.title,
          description: step.description,
          dependencies: Array.isArray(step.dependencies) ? step.dependencies : [],
          verification: step.verification || 'Manual verification required',
          estimatedTime: step.estimatedTime || '30',
        };
      });
    } catch (error) {
      throw new PlanningPhaseError(
        `Failed to parse steps response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseRisksResponse(response: string): Risk[] {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter((risk) => risk.risk && risk.mitigation)
        .map((risk) => ({
          risk: risk.risk,
          severity: this.normalizeSeverity(risk.severity),
          mitigation: risk.mitigation,
        }));
    } catch (error) {
      throw new PlanningPhaseError(
        `Failed to parse risks response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private cleanJsonResponse(response: string): string {
    let cleaned = response.trim();

    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    return cleaned.trim();
  }

  private cleanPlanResponse(response: string): string {
    let cleaned = response.trim();

    if (cleaned.startsWith('```markdown')) {
      cleaned = cleaned.replace(/```markdown\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```md')) {
      cleaned = cleaned.replace(/```md\n?/g, '').replace(/```\n?$/g, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/```\n?/g, '');
    }

    return cleaned.trim();
  }

  private normalizeSeverity(severity: string): 'high' | 'medium' | 'low' {
    const normalized = severity.toLowerCase();
    if (normalized === 'high' || normalized === 'critical') return 'high';
    if (normalized === 'low' || normalized === 'minor') return 'low';
    return 'medium';
  }
}

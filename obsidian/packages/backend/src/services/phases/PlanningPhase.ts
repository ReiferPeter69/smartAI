import { LLMService } from '../LLMService';
import { createPlanningPrompt } from '../../llm/prompt-templates/planning';
import { logger } from '../../utils/logger';
import type { ChatMessage, LLMConfig } from '../../llm/types';

export interface PlanStep {
  stepNumber: number;
  name: string;
  objective: string;
  dependencies: number[];
  files: Array<{ path: string; purpose: string }>;
  implementationDetails: string[];
  verificationMethod: string[];
  redTeamCritique: {
    risk: string;
    mitigation: string;
  };
}

export interface PlanPhase {
  name: string;
  description: string;
  steps: PlanStep[];
}

export interface ImplementationPlan {
  phases: PlanPhase[];
  dependencyGraph: string;
  verificationGates: Array<{
    name: string;
    afterStep: number;
    checks: string[];
  }>;
  fullMarkdown: string;
}

export interface PlanningPhaseOptions {
  architectureSpec: string;
  appType: string;
  llmConfig: LLMConfig;
}

export interface RedTeamCritique {
  stepNumber: number;
  critiques: Array<{
    concern: string;
    fix: string;
  }>;
}

export class PlanningPhase {
  private llmService: LLMService;
  private architectureSpec: string;
  private appType: string;
  private initialPlan?: string;
  private critiques: RedTeamCritique[] = [];

  constructor(options: PlanningPhaseOptions) {
    this.llmService = new LLMService(options.llmConfig);
    this.architectureSpec = options.architectureSpec;
    this.appType = options.appType;
  }

  async generateInitialPlan(): Promise<string> {
    logger.info('Generating initial implementation plan', {
      specLength: this.architectureSpec.length,
      appType: this.appType,
    });

    try {
      const { systemPrompt, userPrompt } = createPlanningPrompt({
        architectureSpec: this.architectureSpec,
        appType: this.appType,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.llmService.generateResponse(messages, {
        temperature: 0.5,
        maxTokens: 6000,
      });

      this.initialPlan = response.content;

      logger.info('Initial plan generated', {
        planLength: this.initialPlan.length,
      });

      return this.initialPlan;
    } catch (error) {
      logger.error('Failed to generate initial plan', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Initial plan generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async performRedTeaming(): Promise<RedTeamCritique[]> {
    if (!this.initialPlan) {
      throw new Error('Cannot perform red teaming without initial plan');
    }

    logger.info('Starting red team critique phase');

    try {
      const redTeamPrompt = this.buildRedTeamPrompt(this.initialPlan);

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: `You are a critical reviewer and security-focused architect. Your job is to identify weaknesses, risks, and potential failures in implementation plans.

For each critical step in the plan, you must:
1. Identify specific risks (what could go wrong?)
2. Suggest concrete mitigations (how to prevent/handle it)

Focus on:
- Dependency issues (circular deps, missing deps)
- Race conditions and concurrency problems
- Error handling gaps
- Performance bottlenecks
- Security vulnerabilities
- Missing validation
- Steps that are too large and need splitting

Be specific and actionable. Don't just say "could fail" - explain the scenario and fix.`,
        },
        { role: 'user', content: redTeamPrompt },
      ];

      const response = await this.llmService.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 4000,
      });

      const critiques = this.parseRedTeamCritiques(response.content);
      this.critiques = critiques;

      logger.info('Red team critique completed', {
        critiqueCount: critiques.length,
      });

      return critiques;
    } catch (error) {
      logger.error('Red teaming failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Red team critique failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildRedTeamPrompt(plan: string): string {
    return `IMPLEMENTATION PLAN TO CRITIQUE:
${plan}

INSTRUCTIONS:
Perform a thorough red team review of this implementation plan. For each critical step, identify:
1. **Risks**: What could go wrong? Consider dependencies, concurrency, errors, security, performance
2. **Mitigations**: Concrete fixes to prevent or handle each risk

Format your response as:

## Step [X]: [Step Name]

**Critique 1**:
- **Concern**: [Specific risk or problem]
- **Fix**: [Concrete mitigation or solution]

**Critique 2**:
- **Concern**: [Specific risk or problem]
- **Fix**: [Concrete mitigation or solution]

Focus on the most critical steps (database, authentication, external APIs, concurrent operations).
Provide at least 1 critique per critical step, up to 3 critiques if the step is complex.

Generate your critique now:`;
  }

  private parseRedTeamCritiques(llmResponse: string): RedTeamCritique[] {
    const critiques: RedTeamCritique[] = [];
    const lines = llmResponse.split('\n');
    
    let currentStepNumber: number | null = null;
    let currentCritiques: Array<{ concern: string; fix: string }> = [];
    let currentConcern: string | null = null;
    let currentFix: string | null = null;

    for (const line of lines) {
      const stepMatch = line.match(/^##\s*Step\s*(\d+)/i);
      if (stepMatch) {
        if (currentStepNumber !== null && currentCritiques.length > 0) {
          critiques.push({
            stepNumber: currentStepNumber,
            critiques: currentCritiques,
          });
        }

        currentStepNumber = parseInt(stepMatch[1], 10);
        currentCritiques = [];
        currentConcern = null;
        currentFix = null;
        continue;
      }

      const concernMatch = line.match(/[-*]\s*\*\*Concern\*\*:\s*(.+)/i);
      if (concernMatch) {
        if (currentConcern && currentFix) {
          currentCritiques.push({
            concern: currentConcern,
            fix: currentFix,
          });
        }
        currentConcern = concernMatch[1].trim();
        currentFix = null;
        continue;
      }

      const fixMatch = line.match(/[-*]\s*\*\*Fix\*\*:\s*(.+)/i);
      if (fixMatch) {
        currentFix = fixMatch[1].trim();
        
        if (currentConcern && currentFix) {
          currentCritiques.push({
            concern: currentConcern,
            fix: currentFix,
          });
          currentConcern = null;
          currentFix = null;
        }
        continue;
      }
    }

    if (currentStepNumber !== null && currentCritiques.length > 0) {
      critiques.push({
        stepNumber: currentStepNumber,
        critiques: currentCritiques,
      });
    }

    return critiques;
  }

  async generateFinalPlan(): Promise<ImplementationPlan> {
    if (!this.initialPlan) {
      throw new Error('Cannot generate final plan without initial plan');
    }

    logger.info('Generating final plan with red team improvements', {
      critiqueCount: this.critiques.length,
    });

    try {
      const refinementPrompt = this.buildRefinementPrompt();

      const messages: ChatMessage[] = [
        {
          role: 'system',
          content: createPlanningPrompt({
            architectureSpec: this.architectureSpec,
            appType: this.appType,
          }).systemPrompt,
        },
        { role: 'user', content: refinementPrompt },
      ];

      const response = await this.llmService.generateResponse(messages, {
        temperature: 0.4,
        maxTokens: 8000,
      });

      const finalPlanMarkdown = response.content;
      const parsedPlan = this.parseImplementationPlan(finalPlanMarkdown);

      logger.info('Final plan generated', {
        phaseCount: parsedPlan.phases.length,
        totalSteps: parsedPlan.phases.reduce((sum, phase) => sum + phase.steps.length, 0),
        markdownLength: finalPlanMarkdown.length,
      });

      return parsedPlan;
    } catch (error) {
      logger.error('Failed to generate final plan', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Final plan generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildRefinementPrompt(): string {
    const critiquesSummary = this.critiques
      .map(
        (c) =>
          `Step ${c.stepNumber}:\n${c.critiques.map((cr) => `  - Risk: ${cr.concern}\n    Fix: ${cr.fix}`).join('\n')}`
      )
      .join('\n\n');

    return `ORIGINAL PLAN:
${this.initialPlan}

RED TEAM CRITIQUES AND FIXES:
${critiquesSummary}

INSTRUCTIONS:
Generate the final, refined implementation plan that incorporates all the red team fixes.

For each step in the original plan:
1. Keep the original structure (objective, dependencies, files, implementation details, verification)
2. Add a "Red Team Critique" section with the identified risk and mitigation
3. Update implementation details if the fix requires changes
4. Ensure verification methods test for the identified risks

Output the complete refined plan.md following the exact structure from the system prompt.
Include all sections: Implementation Phases, Atomic Steps, Dependency Graph, Verification Gates.

Generate the final plan now:`;
  }

  private parseImplementationPlan(markdown: string): ImplementationPlan {
    const phases: PlanPhase[] = [];
    const lines = markdown.split('\n');
    
    let currentPhase: PlanPhase | null = null;
    let dependencyGraph = '';
    const verificationGates: Array<{
      name: string;
      afterStep: number;
      checks: string[];
    }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      const phaseMatch = line.match(/^##\s+(PHASE\s+[A-Z]:|Phase\s+\d+:)\s*(.+)/i);
      if (phaseMatch) {
        if (currentPhase) {
          phases.push(currentPhase);
        }
        
        currentPhase = {
          name: phaseMatch[2].trim(),
          description: '',
          steps: [],
        };
        continue;
      }

      if (line.includes('DEPENDENCY GRAPH') || line.includes('Dependency Graph')) {
        let graphContent = '';
        let j = i + 1;
        
        while (j < lines.length && !lines[j].match(/^##[^#]/)) {
          graphContent += lines[j] + '\n';
          j++;
        }
        
        dependencyGraph = graphContent.trim();
        i = j - 1;
        continue;
      }

      if (line.includes('VERIFICATION GATE') || line.match(/^###\s*Gate\s+\d+/i)) {
        const gateName = line.replace(/^###\s*/, '').trim();
        const checks: string[] = [];
        let afterStep = 0;

        let j = i + 1;
        while (j < lines.length && !lines[j].match(/^###[^#]/)) {
          const checkMatch = lines[j].match(/^[-*]\s*\[\s*\]\s*(.+)/);
          if (checkMatch) {
            checks.push(checkMatch[1].trim());
          }
          
          const stepMatch = lines[j].match(/After\s+Step\s+(\d+)/i);
          if (stepMatch) {
            afterStep = parseInt(stepMatch[1], 10);
          }
          
          j++;
        }
        
        verificationGates.push({ name: gateName, afterStep, checks });
        i = j - 1;
      }
    }

    if (currentPhase) {
      phases.push(currentPhase);
    }

    return {
      phases,
      dependencyGraph,
      verificationGates,
      fullMarkdown: markdown,
    };
  }

  async runFullPlanning(): Promise<ImplementationPlan> {
    logger.info('Starting full planning phase', {
      appType: this.appType,
      specLength: this.architectureSpec.length,
    });

    await this.generateInitialPlan();
    
    await this.performRedTeaming();
    
    const finalPlan = await this.generateFinalPlan();

    logger.info('Planning phase completed successfully', {
      phaseCount: finalPlan.phases.length,
    });

    return finalPlan;
  }

  getInitialPlan(): string | undefined {
    return this.initialPlan;
  }

  getCritiques(): RedTeamCritique[] {
    return this.critiques;
  }
}

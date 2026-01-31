import type { LLMProvider, ChatOptions } from '@obsidian/core';
import {
  DISCOVERY_SYSTEM_PROMPT,
  CLARIFYING_QUESTIONS_PROMPT,
  ARCHITECTURE_GENERATION_PROMPT,
} from '../../llm/prompt-templates/discovery';

export interface ClarifyingQuestion {
  id: string;
  question: string;
}

export interface DiscoveryResult {
  questions: ClarifyingQuestion[];
  architecture?: string;
}

export interface DiscoveryAnswers {
  [questionId: string]: string;
}

export class DiscoveryPhaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'DiscoveryPhaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class DiscoveryPhase {
  constructor(private llmProvider: LLMProvider) {}

  async generateQuestions(userPrompt: string): Promise<ClarifyingQuestion[]> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string } = {
        phase: 'discovery' as const,
        agentId: 'discovery-analyst',
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: DISCOVERY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: CLARIFYING_QUESTIONS_PROMPT(userPrompt),
        },
      ], options);

      const questionsArray = this.parseQuestionsResponse(response.content);

      return questionsArray.map((question, index) => ({
        id: `q${index + 1}`,
        question,
      }));
    } catch (error) {
      if (error instanceof DiscoveryPhaseError) {
        throw error;
      }
      throw new DiscoveryPhaseError(
        'Failed to generate clarifying questions',
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateArchitecture(
    userPrompt: string,
    answers: DiscoveryAnswers
  ): Promise<string> {
    try {
      const questionAnswerMap = this.buildQuestionAnswerMap(answers);

      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'discovery' as const,
        agentId: 'discovery-analyst',
        skills: ['requirements-analysis', 'system-design'],
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: DISCOVERY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: ARCHITECTURE_GENERATION_PROMPT(userPrompt, questionAnswerMap),
        },
      ], options);

      return this.cleanArchitectureResponse(response.content);
    } catch (error) {
      if (error instanceof DiscoveryPhaseError) {
        throw error;
      }
      throw new DiscoveryPhaseError(
        'Failed to generate architecture specification',
        error instanceof Error ? error : undefined
      );
    }
  }

  async execute(userPrompt: string): Promise<DiscoveryResult> {
    const questions = await this.generateQuestions(userPrompt);
    return { questions };
  }

  async completeWithAnswers(
    userPrompt: string,
    answers: DiscoveryAnswers
  ): Promise<string> {
    return this.generateArchitecture(userPrompt, answers);
  }

  private parseQuestionsResponse(response: string): string[] {
    try {
      const cleaned = response.trim();
      let jsonStr = cleaned;

      if (cleaned.startsWith('```json')) {
        jsonStr = cleaned.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleaned.startsWith('```')) {
        jsonStr = cleaned.replace(/```\n?/g, '');
      }

      const parsed = JSON.parse(jsonStr.trim());

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      if (parsed.length === 0) {
        throw new Error('No questions generated');
      }

      return parsed.filter((q) => typeof q === 'string' && q.trim().length > 0);
    } catch (error) {
      throw new DiscoveryPhaseError(
        `Failed to parse questions response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private buildQuestionAnswerMap(answers: DiscoveryAnswers): Record<string, string> {
    const map: Record<string, string> = {};

    for (const [questionId, answer] of Object.entries(answers)) {
      map[questionId] = answer;
    }

    return map;
  }

  private cleanArchitectureResponse(response: string): string {
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
}

import { LLMService } from '../LLMService';
import { createDiscoveryPrompt } from '../../llm/prompt-templates/discovery';
import { logger } from '../../utils/logger';
import type { ChatMessage, LLMConfig } from '../../llm/types';

export interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'data-model' | 'api-contract' | 'business-logic' | 'technical-constraint';
}

export interface ClarificationResponse {
  questionId: string;
  answer: string;
}

export interface ArchitectureSpec {
  projectOverview: string;
  userStories: string;
  domainModel: string;
  dataModels: string;
  apiContracts: string;
  technicalConstraints: string;
  fullMarkdown: string;
}

export interface DiscoveryPhaseOptions {
  userPrompt: string;
  appType?: 'react' | 'nextjs' | 'fastapi';
  llmConfig: LLMConfig;
}

export interface DiscoveryPhaseResult {
  clarificationQuestions: ClarificationQuestion[];
  architectureSpec?: ArchitectureSpec;
}

export class DiscoveryPhase {
  private llmService: LLMService;
  private userPrompt: string;
  private appType?: string;
  private clarificationQuestions: ClarificationQuestion[] = [];
  private userResponses: ClarificationResponse[] = [];

  constructor(options: DiscoveryPhaseOptions) {
    this.llmService = new LLMService(options.llmConfig);
    this.userPrompt = options.userPrompt;
    this.appType = options.appType;
  }

  async generateClarificationQuestions(): Promise<ClarificationQuestion[]> {
    logger.info('Generating clarification questions', {
      promptLength: this.userPrompt.length,
      appType: this.appType,
    });

    try {
      const { systemPrompt, userPrompt } = createDiscoveryPrompt({
        userPrompt: this.userPrompt,
        appType: this.appType,
      });

      const messages: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      const response = await this.llmService.generateResponse(messages, {
        temperature: 0.7,
        maxTokens: 2000,
      });

      const questions = this.parseClarificationQuestions(response.content);
      this.clarificationQuestions = questions;

      logger.info('Clarification questions generated', {
        count: questions.length,
      });

      return questions;
    } catch (error) {
      logger.error('Failed to generate clarification questions', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Clarification question generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private parseClarificationQuestions(llmResponse: string): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];
    
    const lines = llmResponse.split('\n');
    let questionNumber = 1;
    
    for (const line of lines) {
      const numberedMatch = line.match(/^(\d+)\.\s*(.+)/);
      if (numberedMatch) {
        const questionText = numberedMatch[2].trim();
        const category = this.categorizeQuestion(questionText);
        
        questions.push({
          id: `q${questionNumber}`,
          question: questionText,
          category,
        });
        
        questionNumber++;
      }
    }

    if (questions.length === 0) {
      logger.warn('No numbered questions found, treating entire response as single question');
      questions.push({
        id: 'q1',
        question: llmResponse.trim(),
        category: 'business-logic',
      });
    }

    return questions;
  }

  private categorizeQuestion(question: string): ClarificationQuestion['category'] {
    const lowerQuestion = question.toLowerCase();
    
    if (
      lowerQuestion.includes('data') ||
      lowerQuestion.includes('entity') ||
      lowerQuestion.includes('model') ||
      lowerQuestion.includes('field') ||
      lowerQuestion.includes('property')
    ) {
      return 'data-model';
    }
    
    if (
      lowerQuestion.includes('api') ||
      lowerQuestion.includes('endpoint') ||
      lowerQuestion.includes('request') ||
      lowerQuestion.includes('response')
    ) {
      return 'api-contract';
    }
    
    if (
      lowerQuestion.includes('performance') ||
      lowerQuestion.includes('security') ||
      lowerQuestion.includes('authentication') ||
      lowerQuestion.includes('deployment') ||
      lowerQuestion.includes('scale')
    ) {
      return 'technical-constraint';
    }
    
    return 'business-logic';
  }

  addUserResponses(responses: ClarificationResponse[]): void {
    logger.info('Adding user responses', { count: responses.length });
    this.userResponses = responses;
  }

  async generateArchitectureSpec(): Promise<ArchitectureSpec> {
    if (this.userResponses.length === 0) {
      throw new Error('Cannot generate architecture spec without user responses');
    }

    logger.info('Generating architecture specification', {
      questionsAnswered: this.userResponses.length,
    });

    try {
      const qaContext = this.buildQAContext();
      const architecturePrompt = this.buildArchitecturePrompt(qaContext);

      const messages: ChatMessage[] = [
        { role: 'system', content: createDiscoveryPrompt({ userPrompt: '', appType: this.appType }).systemPrompt },
        { role: 'user', content: architecturePrompt },
      ];

      const response = await this.llmService.generateResponse(messages, {
        temperature: 0.3,
        maxTokens: 4000,
      });

      const spec = this.parseArchitectureSpec(response.content);

      logger.info('Architecture specification generated', {
        sections: Object.keys(spec).length,
        markdownLength: spec.fullMarkdown.length,
      });

      return spec;
    } catch (error) {
      logger.error('Failed to generate architecture spec', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw new Error(`Architecture spec generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private buildQAContext(): string {
    const qaMap = new Map<string, string>();
    
    for (const response of this.userResponses) {
      const question = this.clarificationQuestions.find(q => q.id === response.questionId);
      if (question) {
        qaMap.set(question.question, response.answer);
      }
    }

    const qaLines: string[] = [];
    let index = 1;
    for (const [question, answer] of qaMap) {
      qaLines.push(`${index}. Q: ${question}`);
      qaLines.push(`   A: ${answer}`);
      qaLines.push('');
      index++;
    }

    return qaLines.join('\n');
  }

  private buildArchitecturePrompt(qaContext: string): string {
    return `ORIGINAL USER REQUEST:
${this.userPrompt}
${this.appType ? `\nAPPLICATION TYPE: ${this.appType}` : ''}

CLARIFICATION Q&A:
${qaContext}

INSTRUCTIONS:
Based on the original request and the clarification answers provided above, generate a complete architecture.md file with the following structure:

# Project Overview
[Clear summary of the application, target users, and success criteria]

# User Stories
[Detailed user stories with acceptance criteria and priority (P0/P1/P2)]

# Domain Model
[Core entities, properties with types, relationships, business rules, and constraints]

# Data Models
[For each entity: database schema, TypeScript interface, field types, constraints, indexes]

# API Contracts
[For each endpoint: HTTP method, path, request/response schemas with types, error responses, auth requirements]

# Technical Constraints
[Performance requirements, security requirements, browser support, third-party integrations]

CRITICAL REQUIREMENTS:
- Every field must have an explicit type
- No placeholders, TBD, or TODO items
- All relationships must be clearly defined
- All API endpoints must have complete request/response schemas
- Include TypeScript interfaces for all data models
- Specify validation rules for all fields

Generate the complete architecture.md content now:`;
  }

  private parseArchitectureSpec(markdown: string): ArchitectureSpec {
    const sections = {
      projectOverview: this.extractSection(markdown, 'Project Overview', 'User Stories'),
      userStories: this.extractSection(markdown, 'User Stories', 'Domain Model'),
      domainModel: this.extractSection(markdown, 'Domain Model', 'Data Models'),
      dataModels: this.extractSection(markdown, 'Data Models', 'API Contracts'),
      apiContracts: this.extractSection(markdown, 'API Contracts', 'Technical Constraints'),
      technicalConstraints: this.extractSection(markdown, 'Technical Constraints', null),
      fullMarkdown: markdown,
    };

    return sections;
  }

  private extractSection(markdown: string, sectionName: string, nextSectionName: string | null): string {
    const sectionRegex = new RegExp(`#+ ${sectionName}[\\s\\S]*?(?=\\n#+ ${nextSectionName || '$'})`, 'i');
    const match = markdown.match(sectionRegex);
    
    if (match) {
      return match[0].trim();
    }

    const fallbackRegex = new RegExp(`#+ ${sectionName}([\\s\\S]*?)(?=\\n#+ |$)`, 'i');
    const fallbackMatch = markdown.match(fallbackRegex);
    
    if (fallbackMatch) {
      return `# ${sectionName}\n${fallbackMatch[1].trim()}`;
    }

    return `# ${sectionName}\n(Section not found in generated spec)`;
  }

  async runFullDiscovery(): Promise<DiscoveryPhaseResult> {
    logger.info('Starting full discovery phase', {
      userPrompt: this.userPrompt.substring(0, 100),
      appType: this.appType,
    });

    const questions = await this.generateClarificationQuestions();

    return {
      clarificationQuestions: questions,
    };
  }

  async completeDiscoveryWithResponses(responses: ClarificationResponse[]): Promise<ArchitectureSpec> {
    this.addUserResponses(responses);
    const spec = await this.generateArchitectureSpec();
    return spec;
  }

  getClarificationQuestions(): ClarificationQuestion[] {
    return this.clarificationQuestions;
  }

  getUserResponses(): ClarificationResponse[] {
    return this.userResponses;
  }
}

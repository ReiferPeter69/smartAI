import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryPhase } from './DiscoveryPhase';
import type { LLMConfig, ChatResponse } from '../../llm/types';

const mockLLMConfig: LLMConfig = {
  id: 'test-config',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: 'test-key',
  isDefault: true,
};

vi.mock('../LLMService', () => {
  return {
    LLMService: vi.fn().mockImplementation(() => {
      return {
        generateResponse: vi.fn(),
      };
    }),
  };
});

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DiscoveryPhase', () => {
  let discoveryPhase: DiscoveryPhase;
  let mockGenerateResponse: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    const { LLMService } = require('../LLMService');
    mockGenerateResponse = vi.fn();
    LLMService.mockImplementation(() => ({
      generateResponse: mockGenerateResponse,
    }));

    discoveryPhase = new DiscoveryPhase({
      userPrompt: 'Build a todo app',
      appType: 'react',
      llmConfig: mockLLMConfig,
    });
  });

  describe('generateClarificationQuestions', () => {
    it('should generate clarification questions from LLM response', async () => {
      const mockResponse: ChatResponse = {
        content: `1. Should users create accounts or is this single-user?
2. Do tasks need due dates and priorities?
3. Can tasks be organized in projects or lists?`,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions).toHaveLength(3);
      expect(questions[0]).toEqual({
        id: 'q1',
        question: 'Should users create accounts or is this single-user?',
        category: expect.any(String),
      });
      expect(questions[1].question).toContain('due dates');
      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role: 'system' }),
          expect.objectContaining({ role: 'user' }),
        ]),
        expect.objectContaining({
          temperature: 0.7,
          maxTokens: 2000,
        })
      );
    });

    it('should handle LLM errors gracefully', async () => {
      mockGenerateResponse.mockRejectedValue(new Error('API error'));

      await expect(discoveryPhase.generateClarificationQuestions()).rejects.toThrow(
        'Clarification question generation failed'
      );
    });

    it('should handle response without numbered questions', async () => {
      const mockResponse: ChatResponse = {
        content: 'Please clarify your requirements',
        usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions).toHaveLength(1);
      expect(questions[0].question).toBe('Please clarify your requirements');
    });
  });

  describe('categorizeQuestion', () => {
    it('should categorize data model questions', async () => {
      const mockResponse: ChatResponse = {
        content: '1. What fields should the User entity have?',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions[0].category).toBe('data-model');
    });

    it('should categorize API contract questions', async () => {
      const mockResponse: ChatResponse = {
        content: '1. What should the login API endpoint return?',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions[0].category).toBe('api-contract');
    });

    it('should categorize technical constraint questions', async () => {
      const mockResponse: ChatResponse = {
        content: '1. What are the authentication requirements?',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions[0].category).toBe('technical-constraint');
    });

    it('should default to business-logic for uncategorized questions', async () => {
      const mockResponse: ChatResponse = {
        content: '1. Who are the target users?',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateClarificationQuestions();

      expect(questions[0].category).toBe('business-logic');
    });
  });

  describe('addUserResponses', () => {
    it('should store user responses', () => {
      const responses = [
        { questionId: 'q1', answer: 'Multi-user with accounts' },
        { questionId: 'q2', answer: 'Yes, both due dates and priorities' },
      ];

      discoveryPhase.addUserResponses(responses);

      expect(discoveryPhase.getUserResponses()).toEqual(responses);
    });
  });

  describe('generateArchitectureSpec', () => {
    beforeEach(async () => {
      const questionsResponse: ChatResponse = {
        content: `1. Should users create accounts?
2. What task properties are needed?`,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(questionsResponse);
      await discoveryPhase.generateClarificationQuestions();

      discoveryPhase.addUserResponses([
        { questionId: 'q1', answer: 'Yes, multi-user' },
        { questionId: 'q2', answer: 'Title, due date, priority' },
      ]);
    });

    it('should generate architecture spec after responses are provided', async () => {
      const mockArchitectureResponse: ChatResponse = {
        content: `# Project Overview
A task management application for multiple users.

# User Stories
As a user, I want to create tasks so that I can track my work.

# Domain Model
User entity with id, email, password fields.

# Data Models
\`\`\`typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
}
\`\`\`

# API Contracts
POST /api/auth/register - Create user account

# Technical Constraints
Performance: < 200ms response time`,
        usage: { promptTokens: 200, completionTokens: 150, totalTokens: 350 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockArchitectureResponse);

      const spec = await discoveryPhase.generateArchitectureSpec();

      expect(spec.fullMarkdown).toContain('Project Overview');
      expect(spec.fullMarkdown).toContain('User Stories');
      expect(spec.fullMarkdown).toContain('Domain Model');
      expect(spec.fullMarkdown).toContain('Data Models');
      expect(spec.fullMarkdown).toContain('API Contracts');
      expect(spec.fullMarkdown).toContain('Technical Constraints');
      expect(spec.projectOverview).toContain('task management');
      expect(mockGenerateResponse).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          temperature: 0.3,
          maxTokens: 4000,
        })
      );
    });

    it('should throw error if no responses provided', async () => {
      const newPhase = new DiscoveryPhase({
        userPrompt: 'Build an app',
        llmConfig: mockLLMConfig,
      });

      await expect(newPhase.generateArchitectureSpec()).rejects.toThrow(
        'Cannot generate architecture spec without user responses'
      );
    });

    it('should handle LLM errors during spec generation', async () => {
      mockGenerateResponse.mockRejectedValue(new Error('API error'));

      await expect(discoveryPhase.generateArchitectureSpec()).rejects.toThrow(
        'Architecture spec generation failed'
      );
    });
  });

  describe('runFullDiscovery', () => {
    it('should generate questions and return discovery result', async () => {
      const mockResponse: ChatResponse = {
        content: `1. Question 1?
2. Question 2?`,
        usage: { promptTokens: 100, completionTokens: 30, totalTokens: 130 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValue(mockResponse);

      const result = await discoveryPhase.runFullDiscovery();

      expect(result.clarificationQuestions).toHaveLength(2);
      expect(result.architectureSpec).toBeUndefined();
    });
  });

  describe('completeDiscoveryWithResponses', () => {
    it('should complete discovery with responses and generate spec', async () => {
      const questionsResponse: ChatResponse = {
        content: '1. What features?',
        usage: { promptTokens: 100, completionTokens: 20, totalTokens: 120 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValueOnce(questionsResponse);

      await discoveryPhase.generateClarificationQuestions();

      const architectureResponse: ChatResponse = {
        content: `# Project Overview
Test app

# User Stories
Stories here

# Domain Model
Models here

# Data Models
Data here

# API Contracts
APIs here

# Technical Constraints
Constraints here`,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
        model: 'gpt-4',
        finishReason: 'stop',
      };

      mockGenerateResponse.mockResolvedValueOnce(architectureResponse);

      const responses = [{ questionId: 'q1', answer: 'Full CRUD' }];
      const spec = await discoveryPhase.completeDiscoveryWithResponses(responses);

      expect(spec.fullMarkdown).toContain('Project Overview');
      expect(discoveryPhase.getUserResponses()).toEqual(responses);
    });
  });
});

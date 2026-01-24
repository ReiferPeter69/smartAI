import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DiscoveryPhase, DiscoveryPhaseError } from './DiscoveryPhase';
import type { LLMProvider, ChatResponse } from '@obsidian/core';

describe('DiscoveryPhase', () => {
  let mockLLMProvider: LLMProvider;
  let discoveryPhase: DiscoveryPhase;

  beforeEach(() => {
    mockLLMProvider = {
      chat: vi.fn(),
      stream: vi.fn(),
    };
    discoveryPhase = new DiscoveryPhase(mockLLMProvider);
  });

  describe('generateQuestions', () => {
    it('generates clarifying questions from user prompt', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          'What authentication method should be used?',
          'Should users be able to edit their data?',
          'What database should be used?',
        ]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateQuestions('Build a todo app');

      expect(questions).toHaveLength(3);
      expect(questions[0]).toEqual({
        id: 'q1',
        question: 'What authentication method should be used?',
      });
      expect(questions[1].id).toBe('q2');
      expect(questions[2].id).toBe('q3');
    });

    it('handles JSON wrapped in markdown code blocks', async () => {
      const mockResponse: ChatResponse = {
        content: '```json\n["Question 1?", "Question 2?"]\n```',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateQuestions('Build an app');

      expect(questions).toHaveLength(2);
      expect(questions[0].question).toBe('Question 1?');
    });

    it('filters out empty questions', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify(['Valid question?', '', '  ', 'Another question?']),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const questions = await discoveryPhase.generateQuestions('Build an app');

      expect(questions).toHaveLength(2);
      expect(questions[0].question).toBe('Valid question?');
      expect(questions[1].question).toBe('Another question?');
    });

    it('throws error when response is not valid JSON', async () => {
      const mockResponse: ChatResponse = {
        content: 'This is not JSON',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        DiscoveryPhaseError
      );
      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        /Failed to parse questions response/
      );
    });

    it('throws error when response is not an array', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify({ questions: ['Q1', 'Q2'] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        DiscoveryPhaseError
      );
    });

    it('throws error when no questions are generated', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        DiscoveryPhaseError
      );
      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        /No questions generated/
      );
    });

    it('throws DiscoveryPhaseError when LLM provider fails', async () => {
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(new Error('LLM API failed'));

      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        DiscoveryPhaseError
      );
      await expect(discoveryPhase.generateQuestions('Build an app')).rejects.toThrow(
        /Failed to generate clarifying questions/
      );
    });
  });

  describe('generateArchitecture', () => {
    it('generates architecture specification from prompt and answers', async () => {
      const architecture = `# Project Overview
A simple todo application

# User Stories
1. As a user, I want to create tasks

# Data Models
Task: id, title, completed

# API Contracts
POST /api/tasks - Create task`;

      const mockResponse: ChatResponse = {
        content: architecture,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const answers = {
        q1: 'JWT authentication',
        q2: 'PostgreSQL database',
      };

      const result = await discoveryPhase.generateArchitecture('Build a todo app', answers);

      expect(result).toContain('# Project Overview');
      expect(result).toContain('# User Stories');
      expect(result).toContain('# Data Models');
      expect(result).toContain('# API Contracts');
    });

    it('cleans markdown code blocks from response', async () => {
      const architecture = '# Architecture Spec\nContent here';
      const mockResponse: ChatResponse = {
        content: `\`\`\`markdown\n${architecture}\n\`\`\``,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const result = await discoveryPhase.generateArchitecture('Build an app', { q1: 'Answer' });

      expect(result).toBe(architecture);
      expect(result).not.toContain('```');
    });

    it('handles md code block syntax', async () => {
      const architecture = '# Spec';
      const mockResponse: ChatResponse = {
        content: `\`\`\`md\n${architecture}\n\`\`\``,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const result = await discoveryPhase.generateArchitecture('Build an app', {});

      expect(result).toBe(architecture);
    });

    it('throws DiscoveryPhaseError when LLM provider fails', async () => {
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(new Error('LLM timeout'));

      await expect(discoveryPhase.generateArchitecture('Build an app', {})).rejects.toThrow(
        DiscoveryPhaseError
      );
      await expect(discoveryPhase.generateArchitecture('Build an app', {})).rejects.toThrow(
        /Failed to generate architecture specification/
      );
    });

    it('includes all question-answer pairs in the prompt', async () => {
      const mockResponse: ChatResponse = {
        content: '# Architecture',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const answers = {
        q1: 'Answer 1',
        q2: 'Answer 2',
        q3: 'Answer 3',
      };

      await discoveryPhase.generateArchitecture('Build an app', answers);

      expect(mockLLMProvider.chat).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Answer 1'),
          }),
        ])
      );
    });
  });

  describe('execute', () => {
    it('executes discovery phase and returns questions', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify(['Question 1?', 'Question 2?', 'Question 3?']),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const result = await discoveryPhase.execute('Build a blog platform');

      expect(result.questions).toHaveLength(3);
      expect(result.architecture).toBeUndefined();
    });
  });

  describe('completeWithAnswers', () => {
    it('generates architecture from user prompt and answers', async () => {
      const architecture = '# Complete Architecture';
      const mockResponse: ChatResponse = {
        content: architecture,
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const result = await discoveryPhase.completeWithAnswers('Build an app', {
        q1: 'Answer 1',
      });

      expect(result).toBe(architecture);
    });
  });

  describe('error handling', () => {
    it('wraps errors with cause', async () => {
      const originalError = new Error('Network timeout');
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(originalError);

      try {
        await discoveryPhase.generateQuestions('Build an app');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DiscoveryPhaseError);
        expect((error as DiscoveryPhaseError).cause).toBe(originalError);
      }
    });
  });
});

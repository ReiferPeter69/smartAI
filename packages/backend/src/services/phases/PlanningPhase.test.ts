import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PlanningPhase, PlanningPhaseError } from './PlanningPhase';
import type { LLMProvider, ChatResponse } from '@obsidian/core';

describe('PlanningPhase', () => {
  let mockLLMProvider: LLMProvider;
  let planningPhase: PlanningPhase;

  beforeEach(() => {
    mockLLMProvider = {
      chat: vi.fn(),
      stream: vi.fn(),
    };
    planningPhase = new PlanningPhase(mockLLMProvider);
  });

  describe('breakdownSteps', () => {
    it('breaks down architecture into implementation steps', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          {
            id: 'step-1',
            title: 'Setup project structure',
            description: 'Create initial directory structure and config files',
            dependencies: [],
            verification: 'Directory structure exists',
            estimatedTime: '15',
          },
          {
            id: 'step-2',
            title: 'Implement data models',
            description: 'Create database schemas and types',
            dependencies: ['step-1'],
            verification: 'Schema files exist and compile',
            estimatedTime: '30',
          },
        ]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const steps = await planningPhase.breakdownSteps('# Architecture\nSome architecture');

      expect(steps).toHaveLength(2);
      expect(steps[0]).toEqual({
        id: 'step-1',
        title: 'Setup project structure',
        description: 'Create initial directory structure and config files',
        dependencies: [],
        verification: 'Directory structure exists',
        estimatedTime: '15',
      });
      expect(steps[1].dependencies).toEqual(['step-1']);
    });

    it('handles JSON wrapped in code blocks', async () => {
      const mockResponse: ChatResponse = {
        content: '```json\n[{"id":"s1","title":"Step","description":"Desc","dependencies":[]}]\n```',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const steps = await planningPhase.breakdownSteps('Architecture');

      expect(steps).toHaveLength(1);
      expect(steps[0].id).toBe('s1');
    });

    it('provides default values for optional fields', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          {
            id: 'step-1',
            title: 'Minimal step',
            description: 'Just the basics',
          },
        ]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const steps = await planningPhase.breakdownSteps('Architecture');

      expect(steps[0].dependencies).toEqual([]);
      expect(steps[0].verification).toBe('Manual verification required');
      expect(steps[0].estimatedTime).toBe('30');
    });

    it('throws error when response is not valid JSON', async () => {
      const mockResponse: ChatResponse = {
        content: 'Not JSON',
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        PlanningPhaseError
      );
      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        /Failed to parse steps response/
      );
    });

    it('throws error when response is not an array', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify({ steps: [] }),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        PlanningPhaseError
      );
    });

    it('throws error when no steps are generated', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        PlanningPhaseError
      );
      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        /No steps generated/
      );
    });

    it('throws error when step structure is invalid', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([{ id: 'step-1' }]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        PlanningPhaseError
      );
      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        /Invalid step structure/
      );
    });

    it('throws PlanningPhaseError when LLM provider fails', async () => {
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(new Error('LLM failed'));

      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        PlanningPhaseError
      );
      await expect(planningPhase.breakdownSteps('Architecture')).rejects.toThrow(
        /Failed to break down architecture/
      );
    });
  });

  describe('performRedTeaming', () => {
    it('identifies risks and mitigations for a step', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          {
            risk: 'Database connection might fail',
            severity: 'high',
            mitigation: 'Implement connection pooling with retry logic',
          },
          {
            risk: 'Schema migration could fail',
            severity: 'medium',
            mitigation: 'Add rollback capability',
          },
        ]),
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const step = {
        id: 'step-1',
        title: 'Setup database',
        description: 'Initialize database and run migrations',
        dependencies: [],
        verification: 'Database is accessible',
        estimatedTime: '20',
      };

      const risks = await planningPhase.performRedTeaming(step);

      expect(risks).toHaveLength(2);
      expect(risks[0]).toEqual({
        risk: 'Database connection might fail',
        severity: 'high',
        mitigation: 'Implement connection pooling with retry logic',
      });
      expect(risks[1].severity).toBe('medium');
    });

    it('normalizes severity levels', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          { risk: 'Risk 1', severity: 'CRITICAL', mitigation: 'Fix it' },
          { risk: 'Risk 2', severity: 'Minor', mitigation: 'Monitor' },
          { risk: 'Risk 3', severity: 'MEDIUM', mitigation: 'Address' },
        ]),
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const step = {
        id: 'step-1',
        title: 'Test',
        description: 'Test',
        dependencies: [],
        verification: 'Test',
        estimatedTime: '10',
      };

      const risks = await planningPhase.performRedTeaming(step);

      expect(risks[0].severity).toBe('high');
      expect(risks[1].severity).toBe('low');
      expect(risks[2].severity).toBe('medium');
    });

    it('filters out invalid risk entries', async () => {
      const mockResponse: ChatResponse = {
        content: JSON.stringify([
          { risk: 'Valid risk', severity: 'medium', mitigation: 'Fix it' },
          { risk: 'Missing mitigation', severity: 'high' },
          { severity: 'low', mitigation: 'Missing risk' },
        ]),
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const step = {
        id: 'step-1',
        title: 'Test',
        description: 'Test',
        dependencies: [],
        verification: 'Test',
        estimatedTime: '10',
      };

      const risks = await planningPhase.performRedTeaming(step);

      expect(risks).toHaveLength(1);
      expect(risks[0].risk).toBe('Valid risk');
    });

    it('returns empty array for invalid JSON', async () => {
      const mockResponse: ChatResponse = {
        content: 'Not JSON',
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const step = {
        id: 'step-1',
        title: 'Test',
        description: 'Test',
        dependencies: [],
        verification: 'Test',
        estimatedTime: '10',
      };

      await expect(planningPhase.performRedTeaming(step)).rejects.toThrow(PlanningPhaseError);
    });

    it('throws PlanningPhaseError when LLM provider fails', async () => {
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(new Error('Timeout'));

      const step = {
        id: 'step-1',
        title: 'Test',
        description: 'Test',
        dependencies: [],
        verification: 'Test',
        estimatedTime: '10',
      };

      await expect(planningPhase.performRedTeaming(step)).rejects.toThrow(PlanningPhaseError);
      await expect(planningPhase.performRedTeaming(step)).rejects.toThrow(
        /Failed to perform red teaming for step: step-1/
      );
    });
  });

  describe('generatePlan', () => {
    it('generates implementation plan from steps and risks', async () => {
      const plan = `# Implementation Plan

## Overview
Three-step implementation plan

## Steps

### Step 1: Setup
Details here

### Step 2: Build
More details`;

      const mockResponse: ChatResponse = {
        content: plan,
        usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const steps = [
        {
          id: 'step-1',
          title: 'Setup',
          description: 'Initialize',
          dependencies: [],
          verification: 'Exists',
          estimatedTime: '15',
        },
      ];
      const risks = {
        'step-1': [
          {
            risk: 'Might fail',
            severity: 'medium' as const,
            mitigation: 'Add checks',
          },
        ],
      };

      const result = await planningPhase.generatePlan('Architecture', steps, risks);

      expect(result).toContain('# Implementation Plan');
      expect(result).toContain('## Overview');
      expect(result).toContain('### Step 1: Setup');
    });

    it('cleans markdown code blocks from response', async () => {
      const plan = '# Plan\nContent';
      const mockResponse: ChatResponse = {
        content: `\`\`\`markdown\n${plan}\n\`\`\``,
        usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
      };

      vi.mocked(mockLLMProvider.chat).mockResolvedValue(mockResponse);

      const result = await planningPhase.generatePlan('Architecture', [], {});

      expect(result).toBe(plan);
      expect(result).not.toContain('```');
    });

    it('throws PlanningPhaseError when LLM provider fails', async () => {
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(new Error('API error'));

      await expect(planningPhase.generatePlan('Architecture', [], {})).rejects.toThrow(
        PlanningPhaseError
      );
      await expect(planningPhase.generatePlan('Architecture', [], {})).rejects.toThrow(
        /Failed to generate implementation plan/
      );
    });
  });

  describe('execute', () => {
    it('executes full planning phase workflow', async () => {
      const stepsResponse: ChatResponse = {
        content: JSON.stringify([
          {
            id: 'step-1',
            title: 'Step 1',
            description: 'First step',
            dependencies: [],
            verification: 'Check',
            estimatedTime: '15',
          },
        ]),
        usage: { promptTokens: 200, completionTokens: 100, totalTokens: 300 },
      };

      const risksResponse: ChatResponse = {
        content: JSON.stringify([
          { risk: 'Risk', severity: 'medium', mitigation: 'Mitigate' },
        ]),
        usage: { promptTokens: 150, completionTokens: 80, totalTokens: 230 },
      };

      const planResponse: ChatResponse = {
        content: '# Plan\nDetails',
        usage: { promptTokens: 300, completionTokens: 200, totalTokens: 500 },
      };

      vi.mocked(mockLLMProvider.chat)
        .mockResolvedValueOnce(stepsResponse)
        .mockResolvedValueOnce(risksResponse)
        .mockResolvedValueOnce(planResponse);

      const result = await planningPhase.execute('Architecture spec');

      expect(result.steps).toHaveLength(1);
      expect(result.risks['step-1']).toHaveLength(1);
      expect(result.plan).toContain('# Plan');
    });
  });

  describe('error handling', () => {
    it('preserves error chain with cause', async () => {
      const originalError = new Error('Network failure');
      vi.mocked(mockLLMProvider.chat).mockRejectedValue(originalError);

      try {
        await planningPhase.breakdownSteps('Architecture');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(PlanningPhaseError);
        expect((error as PlanningPhaseError).cause).toBe(originalError);
      }
    });
  });
});

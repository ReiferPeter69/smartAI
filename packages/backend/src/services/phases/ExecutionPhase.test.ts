import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionPhase, ExecutionPhaseError } from './ExecutionPhase';
import type { LLMProvider } from '@obsidian/core';

describe('ExecutionPhase', () => {
  let mockProvider: LLMProvider;
  let executionPhase: ExecutionPhase;

  beforeEach(() => {
    mockProvider = {
      chat: async () => ({
        content: '',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      }),
      stream: async function* () {
        yield '';
      },
    };
    executionPhase = new ExecutionPhase(mockProvider);
  });

  describe('generateCodeForStep', () => {
    it('should generate files for a step', async () => {
      const mockFiles = [
        {
          path: 'src/components/Button.tsx',
          content: 'export const Button = () => <button />;',
          language: 'typescript',
        },
        {
          path: 'src/components/Button.test.tsx',
          content: 'test("renders", () => {});',
          language: 'typescript',
        },
      ];

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockFiles),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      });

      const result = await executionPhase.generateCodeForStep(
        'architecture content',
        'plan content',
        { id: 'step-1', title: 'Create Button', description: 'Add button component' }
      );

      expect(result).toHaveLength(2);
      expect(result[0].path).toBe('src/components/Button.tsx');
      expect(result[0].content).toContain('Button');
      expect(result[0].language).toBe('typescript');
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockFiles = [
        {
          path: 'src/index.ts',
          content: 'export {};',
          language: 'typescript',
        },
      ];

      mockProvider.chat = async () => ({
        content: '```json\n' + JSON.stringify(mockFiles) + '\n```',
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await executionPhase.generateCodeForStep(
        'architecture',
        'plan',
        { id: 'step-1', title: 'Test', description: 'Test step' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/index.ts');
    });

    it('should filter out invalid files', async () => {
      const mockFiles = [
        {
          path: 'src/valid.ts',
          content: 'valid',
          language: 'typescript',
        },
        {
          path: '',
          content: 'invalid - no path',
          language: 'typescript',
        },
        {
          path: 'src/no-content.ts',
          content: '',
          language: 'typescript',
        },
      ];

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockFiles),
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await executionPhase.generateCodeForStep(
        'architecture',
        'plan',
        { id: 'step-1', title: 'Test', description: 'Test step' }
      );

      expect(result).toHaveLength(1);
      expect(result[0].path).toBe('src/valid.ts');
    });

    it('should throw error if no files generated', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify([]),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(
        executionPhase.generateCodeForStep('architecture', 'plan', {
          id: 'step-1',
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(ExecutionPhaseError);
    });

    it('should throw error for invalid JSON response', async () => {
      mockProvider.chat = async () => ({
        content: 'not valid json',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(
        executionPhase.generateCodeForStep('architecture', 'plan', {
          id: 'step-1',
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(ExecutionPhaseError);
    });

    it('should throw error if response is not an array', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ invalid: 'object' }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(
        executionPhase.generateCodeForStep('architecture', 'plan', {
          id: 'step-1',
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow(ExecutionPhaseError);
    });

    it('should preserve ExecutionPhaseError from nested calls', async () => {
      mockProvider.chat = async () => {
        throw new ExecutionPhaseError('Nested error');
      };

      await expect(
        executionPhase.generateCodeForStep('architecture', 'plan', {
          id: 'step-1',
          title: 'Test',
          description: 'Test',
        })
      ).rejects.toThrow('Nested error');
    });
  });

  describe('generateFile', () => {
    it('should generate a single file', async () => {
      const fileContent = 'export const MyComponent = () => <div />;';

      mockProvider.chat = async () => ({
        content: fileContent,
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await executionPhase.generateFile(
        'src/components/MyComponent.tsx',
        'Create a React component',
        'React project with TypeScript'
      );

      expect(result).toBe(fileContent);
    });

    it('should trim whitespace from file content', async () => {
      mockProvider.chat = async () => ({
        content: '   \n  file content  \n  ',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.generateFile('test.ts', 'test', 'context');

      expect(result).toBe('file content');
    });

    it('should throw error on provider failure', async () => {
      mockProvider.chat = async () => {
        throw new Error('LLM provider error');
      };

      await expect(
        executionPhase.generateFile('test.ts', 'description', 'context')
      ).rejects.toThrow(ExecutionPhaseError);
    });
  });

  describe('generateDirectoryStructure', () => {
    it('should generate directory structure', async () => {
      const directories = ['src', 'src/components', 'src/utils', 'tests'];

      mockProvider.chat = async () => ({
        content: JSON.stringify(directories),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.generateDirectoryStructure('web-app', 'React');

      expect(result).toEqual(directories);
    });

    it('should handle JSON wrapped in code blocks', async () => {
      const directories = ['src', 'dist'];

      mockProvider.chat = async () => ({
        content: '```\n' + JSON.stringify(directories) + '\n```',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.generateDirectoryStructure('api', 'Express');

      expect(result).toEqual(directories);
    });

    it('should filter out empty strings', async () => {
      const directories = ['src', '', '  ', 'tests'];

      mockProvider.chat = async () => ({
        content: JSON.stringify(directories),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.generateDirectoryStructure('app', 'framework');

      expect(result).toEqual(['src', 'tests']);
    });

    it('should throw error for invalid JSON', async () => {
      mockProvider.chat = async () => ({
        content: 'invalid json',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(
        executionPhase.generateDirectoryStructure('app', 'framework')
      ).rejects.toThrow(ExecutionPhaseError);
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze and return dependencies', async () => {
      const deps = {
        dependencies: {
          react: '^18.0.0',
          'react-dom': '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
        },
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(deps),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await executionPhase.analyzeDependencies(
        'React application',
        'React + TypeScript'
      );

      expect(result.dependencies).toEqual(deps.dependencies);
      expect(result.devDependencies).toEqual(deps.devDependencies);
    });

    it('should handle empty dependency lists', async () => {
      const deps = {
        dependencies: {},
        devDependencies: {},
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(deps),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.analyzeDependencies('simple app', 'vanilla');

      expect(result.dependencies).toEqual({});
      expect(result.devDependencies).toEqual({});
    });

    it('should throw error for invalid dependencies format', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ invalid: 'format' }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(
        executionPhase.analyzeDependencies('architecture', 'stack')
      ).rejects.toThrow(ExecutionPhaseError);
    });
  });

  describe('reviewCode', () => {
    it('should review code and return validation result', async () => {
      const review = {
        valid: true,
        issues: [],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(review),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.reviewCode('const x = 1;', 'test.ts');

      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should return issues when code has problems', async () => {
      const review = {
        valid: false,
        issues: [
          {
            severity: 'error',
            message: 'Missing type annotation',
            line: 1,
          },
          {
            severity: 'warning',
            message: 'Unused variable',
            line: 3,
          },
        ],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(review),
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await executionPhase.reviewCode('code with issues', 'test.ts');

      expect(result.valid).toBe(false);
      expect(result.issues).toHaveLength(2);
      expect(result.issues[0].severity).toBe('error');
      expect(result.issues[1].severity).toBe('warning');
    });

    it('should handle malformed issues array', async () => {
      const review = {
        valid: false,
        issues: [
          {
            severity: 'error',
          },
        ],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(review),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.reviewCode('code', 'test.ts');

      expect(result.issues[0].message).toBe('Unknown issue');
    });

    it('should default to invalid if valid field is missing', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ issues: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await executionPhase.reviewCode('code', 'test.ts');

      expect(result.valid).toBe(false);
    });
  });

  describe('fixCode', () => {
    it('should generate fixed code', async () => {
      const fixedCode = 'const x: number = 1;';

      mockProvider.chat = async () => ({
        content: fixedCode,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const issues = [
        {
          severity: 'error' as const,
          message: 'Missing type annotation',
          line: 1,
        },
      ];

      const result = await executionPhase.fixCode('const x = 1;', 'test.ts', issues);

      expect(result).toBe(fixedCode);
    });

    it('should handle multiple issues', async () => {
      mockProvider.chat = async () => ({
        content: 'fixed code',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const issues = [
        { severity: 'error' as const, message: 'Issue 1', line: 1 },
        { severity: 'warning' as const, message: 'Issue 2', line: 5 },
        { severity: 'error' as const, message: 'Issue 3', line: null },
      ];

      const result = await executionPhase.fixCode('broken code', 'test.ts', issues);

      expect(result).toBe('fixed code');
    });

    it('should throw error on provider failure', async () => {
      mockProvider.chat = async () => {
        throw new Error('Fix failed');
      };

      await expect(executionPhase.fixCode('code', 'test.ts', [])).rejects.toThrow(
        ExecutionPhaseError
      );
    });
  });
});

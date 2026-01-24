import { describe, it, expect, beforeEach } from 'vitest';
import {
  VerificationPhase,
  VerificationPhaseError,
  type ErrorAnalysis,
  type VerificationStageResult,
} from './VerificationPhase';
import type { LLMProvider } from '@obsidian/core';

describe('VerificationPhase', () => {
  let mockProvider: LLMProvider;
  let verificationPhase: VerificationPhase;

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
    verificationPhase = new VerificationPhase(mockProvider);
  });

  describe('analyzeError', () => {
    it('should analyze error and return analysis', async () => {
      const mockAnalysis: ErrorAnalysis = {
        errorType: 'syntax',
        rootCause: 'Missing semicolon',
        affectedFiles: ['src/index.ts'],
        suggestedFix: 'Add semicolon at line 10',
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await verificationPhase.analyzeError('SyntaxError: Unexpected token');

      expect(result.errorType).toBe('syntax');
      expect(result.rootCause).toBe('Missing semicolon');
      expect(result.affectedFiles).toContain('src/index.ts');
    });

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const mockAnalysis = {
        errorType: 'type',
        rootCause: 'Type mismatch',
        affectedFiles: ['app.ts'],
        suggestedFix: 'Fix type',
      };

      mockProvider.chat = async () => ({
        content: '```json\n' + JSON.stringify(mockAnalysis) + '\n```',
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const result = await verificationPhase.analyzeError('TypeError');

      expect(result.errorType).toBe('type');
    });

    it('should provide defaults for missing fields', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({}),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeError('Some error');

      expect(result.errorType).toBe('runtime');
      expect(result.rootCause).toBe('Unknown cause');
      expect(result.affectedFiles).toEqual([]);
      expect(result.suggestedFix).toBe('No fix suggested');
    });

    it('should throw error for invalid JSON', async () => {
      mockProvider.chat = async () => ({
        content: 'invalid json',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      await expect(verificationPhase.analyzeError('error')).rejects.toThrow(
        VerificationPhaseError
      );
    });

    it('should preserve VerificationPhaseError from nested calls', async () => {
      mockProvider.chat = async () => {
        throw new VerificationPhaseError('Nested error');
      };

      await expect(verificationPhase.analyzeError('error')).rejects.toThrow('Nested error');
    });
  });

  describe('generateFix', () => {
    it('should generate fixed code', async () => {
      const fixedCode = 'const x: number = 1;';

      mockProvider.chat = async () => ({
        content: fixedCode,
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const errorAnalysis: ErrorAnalysis = {
        errorType: 'type',
        rootCause: 'Missing type annotation',
        affectedFiles: ['test.ts'],
        suggestedFix: 'Add type annotation',
      };

      const result = await verificationPhase.generateFix(errorAnalysis, 'const x = 1;', 'test.ts');

      expect(result).toBe(fixedCode);
    });

    it('should trim whitespace from fix', async () => {
      mockProvider.chat = async () => ({
        content: '  \n  fixed code  \n  ',
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const errorAnalysis: ErrorAnalysis = {
        errorType: 'syntax',
        rootCause: 'Test',
        affectedFiles: [],
        suggestedFix: 'Fix it',
      };

      const result = await verificationPhase.generateFix(errorAnalysis, 'code', 'file.ts');

      expect(result).toBe('fixed code');
    });

    it('should throw error on provider failure', async () => {
      mockProvider.chat = async () => {
        throw new Error('Provider error');
      };

      const errorAnalysis: ErrorAnalysis = {
        errorType: 'runtime',
        rootCause: 'Test',
        affectedFiles: [],
        suggestedFix: 'Fix',
      };

      await expect(verificationPhase.generateFix(errorAnalysis, 'code', 'test.ts')).rejects.toThrow(
        VerificationPhaseError
      );
    });
  });

  describe('summarizeVerification', () => {
    it('should summarize verification results', async () => {
      const mockSummary = {
        overallStatus: 'passed',
        summary: 'All checks passed',
        failedStages: [],
        recommendations: ['Keep up the good work'],
        criticalIssues: [],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockSummary),
        usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
      });

      const results: VerificationStageResult[] = [
        { stage: 'tests', passed: true, output: 'All tests passed' },
        { stage: 'lint', passed: true, output: 'No issues' },
      ];

      const result = await verificationPhase.summarizeVerification(results);

      expect(result.overallStatus).toBe('passed');
      expect(result.failedStages).toHaveLength(0);
    });

    it('should handle failed verification', async () => {
      const mockSummary = {
        overallStatus: 'failed',
        summary: 'Multiple failures detected',
        failedStages: ['tests', 'build'],
        recommendations: ['Fix failing tests', 'Resolve build errors'],
        criticalIssues: ['Critical type errors'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockSummary),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const results: VerificationStageResult[] = [
        { stage: 'tests', passed: false, output: '', error: 'Tests failed' },
        { stage: 'build', passed: false, output: '', error: 'Build failed' },
      ];

      const result = await verificationPhase.summarizeVerification(results);

      expect(result.overallStatus).toBe('failed');
      expect(result.failedStages).toContain('tests');
      expect(result.failedStages).toContain('build');
      expect(result.criticalIssues).toHaveLength(1);
    });

    it('should provide defaults for missing fields', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({}),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.summarizeVerification([]);

      expect(result.overallStatus).toBe('failed');
      expect(result.summary).toBe('No summary available');
      expect(result.failedStages).toEqual([]);
      expect(result.recommendations).toEqual([]);
      expect(result.criticalIssues).toEqual([]);
    });
  });

  describe('analyzeTestFailures', () => {
    it('should analyze test failures', async () => {
      const mockAnalysis = {
        failedTests: [
          {
            testName: 'should validate input',
            errorMessage: 'Expected 5 but got 3',
            possibleCause: 'Logic error in validation',
            suggestedFix: 'Update validation logic',
          },
        ],
        commonIssues: ['Missing null checks'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await verificationPhase.analyzeTestFailures('Test output');

      expect(result.failedTests).toHaveLength(1);
      expect(result.failedTests[0].testName).toBe('should validate input');
      expect(result.commonIssues).toContain('Missing null checks');
    });

    it('should handle empty test failures', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ failedTests: [], commonIssues: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeTestFailures('No failures');

      expect(result.failedTests).toHaveLength(0);
      expect(result.commonIssues).toHaveLength(0);
    });

    it('should provide defaults for incomplete test objects', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({
          failedTests: [{}],
          commonIssues: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeTestFailures('Test output');

      expect(result.failedTests[0].testName).toBe('Unknown test');
      expect(result.failedTests[0].errorMessage).toBe('No error message');
    });
  });

  describe('analyzeLintErrors', () => {
    it('should analyze lint errors', async () => {
      const mockAnalysis = {
        errors: [
          {
            file: 'src/app.ts',
            line: 10,
            rule: 'no-unused-vars',
            message: 'Variable is unused',
            severity: 'error',
            autoFixable: true,
          },
        ],
        summary: {
          totalErrors: 1,
          totalWarnings: 0,
          criticalIssues: 0,
        },
        recommendations: ['Remove unused variables'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await verificationPhase.analyzeLintErrors('Lint output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].file).toBe('src/app.ts');
      expect(result.summary.totalErrors).toBe(1);
    });

    it('should handle empty lint results', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({
          errors: [],
          summary: { totalErrors: 0, totalWarnings: 0, criticalIssues: 0 },
          recommendations: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeLintErrors('No errors');

      expect(result.errors).toHaveLength(0);
      expect(result.summary.totalErrors).toBe(0);
    });

    it('should provide defaults for missing summary fields', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ errors: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeLintErrors('Output');

      expect(result.summary.totalErrors).toBe(0);
      expect(result.summary.totalWarnings).toBe(0);
      expect(result.summary.criticalIssues).toBe(0);
    });
  });

  describe('analyzeTypeErrors', () => {
    it('should analyze type errors', async () => {
      const mockAnalysis = {
        errors: [
          {
            file: 'src/types.ts',
            line: 5,
            message: 'Type mismatch',
            expectedType: 'string',
            actualType: 'number',
            suggestedFix: 'Convert to string',
          },
        ],
        commonPatterns: ['Missing type annotations'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await verificationPhase.analyzeTypeErrors('Type check output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].expectedType).toBe('string');
      expect(result.errors[0].actualType).toBe('number');
      expect(result.commonPatterns).toContain('Missing type annotations');
    });

    it('should handle empty type errors', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ errors: [], commonPatterns: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeTypeErrors('No errors');

      expect(result.errors).toHaveLength(0);
      expect(result.commonPatterns).toHaveLength(0);
    });
  });

  describe('analyzeBuildErrors', () => {
    it('should analyze build errors', async () => {
      const mockAnalysis = {
        errors: [
          {
            type: 'dependency',
            message: 'Module not found',
            affectedFiles: ['src/index.ts'],
            suggestedFix: 'Install missing dependency',
          },
        ],
        missingDependencies: ['react'],
        configIssues: ['Invalid tsconfig.json'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await verificationPhase.analyzeBuildErrors('Build output');

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('dependency');
      expect(result.missingDependencies).toContain('react');
      expect(result.configIssues).toContain('Invalid tsconfig.json');
    });

    it('should handle successful builds', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({
          errors: [],
          missingDependencies: [],
          configIssues: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeBuildErrors('Build successful');

      expect(result.errors).toHaveLength(0);
      expect(result.missingDependencies).toHaveLength(0);
      expect(result.configIssues).toHaveLength(0);
    });
  });

  describe('scanSecurity', () => {
    it('should scan for security vulnerabilities', async () => {
      const mockScan = {
        vulnerabilities: [
          {
            severity: 'high',
            type: 'sql-injection',
            message: 'Potential SQL injection',
            line: 15,
            recommendation: 'Use parameterized queries',
          },
        ],
        securityScore: 75,
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockScan),
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250 },
      });

      const result = await verificationPhase.scanSecurity('const sql = `SELECT * FROM ${input}`', 'db.ts');

      expect(result.vulnerabilities).toHaveLength(1);
      expect(result.vulnerabilities[0].severity).toBe('high');
      expect(result.vulnerabilities[0].type).toBe('sql-injection');
      expect(result.securityScore).toBe(75);
    });

    it('should handle secure code', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({
          vulnerabilities: [],
          securityScore: 100,
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.scanSecurity('const x = 1;', 'safe.ts');

      expect(result.vulnerabilities).toHaveLength(0);
      expect(result.securityScore).toBe(100);
    });

    it('should default to perfect score if missing', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ vulnerabilities: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.scanSecurity('code', 'file.ts');

      expect(result.securityScore).toBe(100);
    });
  });

  describe('analyzeCodeQuality', () => {
    it('should analyze code quality', async () => {
      const mockAnalysis = {
        qualityScore: 85,
        issues: [
          {
            severity: 'suggestion',
            category: 'complexity',
            message: 'Function is too complex',
            line: 10,
          },
        ],
        strengths: ['Good naming conventions', 'Proper error handling'],
        improvements: ['Reduce function complexity', 'Add more comments'],
      };

      mockProvider.chat = async () => ({
        content: JSON.stringify(mockAnalysis),
        usage: { promptTokens: 100, completionTokens: 200, totalTokens: 300 },
      });

      const result = await verificationPhase.analyzeCodeQuality('function code() {}', 'app.ts');

      expect(result.qualityScore).toBe(85);
      expect(result.issues).toHaveLength(1);
      expect(result.strengths).toContain('Good naming conventions');
      expect(result.improvements).toContain('Reduce function complexity');
    });

    it('should handle perfect quality code', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({
          qualityScore: 100,
          issues: [],
          strengths: ['Excellent code'],
          improvements: [],
        }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeCodeQuality('perfect code', 'perfect.ts');

      expect(result.qualityScore).toBe(100);
      expect(result.issues).toHaveLength(0);
      expect(result.strengths).toContain('Excellent code');
    });

    it('should default to zero score if missing', async () => {
      mockProvider.chat = async () => ({
        content: JSON.stringify({ issues: [], strengths: [], improvements: [] }),
        usage: { promptTokens: 100, completionTokens: 50, totalTokens: 150 },
      });

      const result = await verificationPhase.analyzeCodeQuality('code', 'file.ts');

      expect(result.qualityScore).toBe(0);
    });
  });
});

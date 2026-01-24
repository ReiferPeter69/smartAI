import type { LLMProvider } from '@obsidian/core';
import {
  VERIFICATION_SYSTEM_PROMPT,
  ERROR_ANALYSIS_PROMPT,
  FIX_GENERATION_PROMPT,
  VERIFICATION_SUMMARY_PROMPT,
  TEST_FAILURE_ANALYSIS_PROMPT,
  LINT_ERROR_ANALYSIS_PROMPT,
  TYPE_ERROR_ANALYSIS_PROMPT,
  BUILD_ERROR_ANALYSIS_PROMPT,
  SECURITY_SCAN_PROMPT,
  CODE_QUALITY_ANALYSIS_PROMPT,
} from '../../llm/prompt-templates/verification';

export interface ErrorAnalysis {
  errorType: 'syntax' | 'type' | 'runtime' | 'logic' | 'dependency' | 'build';
  rootCause: string;
  affectedFiles: string[];
  suggestedFix: string;
}

export interface VerificationStageResult {
  stage: string;
  passed: boolean;
  output: string;
  error?: string;
}

export interface VerificationSummary {
  overallStatus: 'passed' | 'failed';
  summary: string;
  failedStages: string[];
  recommendations: string[];
  criticalIssues: string[];
}

export interface TestFailure {
  testName: string;
  errorMessage: string;
  possibleCause: string;
  suggestedFix: string;
}

export interface TestFailureAnalysis {
  failedTests: TestFailure[];
  commonIssues: string[];
}

export interface LintError {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  autoFixable: boolean;
}

export interface LintAnalysis {
  errors: LintError[];
  summary: {
    totalErrors: number;
    totalWarnings: number;
    criticalIssues: number;
  };
  recommendations: string[];
}

export interface TypeError {
  file: string;
  line: number;
  message: string;
  expectedType: string;
  actualType: string;
  suggestedFix: string;
}

export interface TypeErrorAnalysis {
  errors: TypeError[];
  commonPatterns: string[];
}

export interface BuildError {
  type: 'dependency' | 'syntax' | 'config' | 'other';
  message: string;
  affectedFiles: string[];
  suggestedFix: string;
}

export interface BuildErrorAnalysis {
  errors: BuildError[];
  missingDependencies: string[];
  configIssues: string[];
}

export interface SecurityVulnerability {
  severity: 'critical' | 'high' | 'medium' | 'low';
  type: string;
  message: string;
  line: number | null;
  recommendation: string;
}

export interface SecurityScanResult {
  vulnerabilities: SecurityVulnerability[];
  securityScore: number;
}

export interface CodeQualityIssue {
  severity: 'suggestion' | 'warning';
  category: string;
  message: string;
  line: number | null;
}

export interface CodeQualityAnalysis {
  qualityScore: number;
  issues: CodeQualityIssue[];
  strengths: string[];
  improvements: string[];
}

export class VerificationPhaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'VerificationPhaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class VerificationPhase {
  constructor(private llmProvider: LLMProvider) {}

  async analyzeError(
    errorOutput: string,
    filePath?: string,
    code?: string
  ): Promise<ErrorAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: ERROR_ANALYSIS_PROMPT(errorOutput, filePath || '', code),
        },
      ]);

      return this.parseErrorAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to analyze error',
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateFix(
    errorAnalysis: ErrorAnalysis,
    code: string,
    filePath: string
  ): Promise<string> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: FIX_GENERATION_PROMPT(errorAnalysis, code, filePath),
        },
      ]);

      return response.content.trim();
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        `Failed to generate fix for: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async summarizeVerification(
    results: VerificationStageResult[]
  ): Promise<VerificationSummary> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: VERIFICATION_SUMMARY_PROMPT(results),
        },
      ]);

      return this.parseVerificationSummary(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to summarize verification results',
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeTestFailures(testOutput: string): Promise<TestFailureAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: TEST_FAILURE_ANALYSIS_PROMPT(testOutput),
        },
      ]);

      return this.parseTestFailureAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to analyze test failures',
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeLintErrors(lintOutput: string): Promise<LintAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: LINT_ERROR_ANALYSIS_PROMPT(lintOutput),
        },
      ]);

      return this.parseLintAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to analyze lint errors',
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeTypeErrors(typeOutput: string): Promise<TypeErrorAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: TYPE_ERROR_ANALYSIS_PROMPT(typeOutput),
        },
      ]);

      return this.parseTypeErrorAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to analyze type errors',
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeBuildErrors(buildOutput: string): Promise<BuildErrorAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: BUILD_ERROR_ANALYSIS_PROMPT(buildOutput),
        },
      ]);

      return this.parseBuildErrorAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        'Failed to analyze build errors',
        error instanceof Error ? error : undefined
      );
    }
  }

  async scanSecurity(code: string, filePath: string): Promise<SecurityScanResult> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: SECURITY_SCAN_PROMPT(code, filePath),
        },
      ]);

      return this.parseSecurityScan(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        `Failed to scan security for: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeCodeQuality(code: string, filePath: string): Promise<CodeQualityAnalysis> {
    try {
      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: VERIFICATION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: CODE_QUALITY_ANALYSIS_PROMPT(code, filePath),
        },
      ]);

      return this.parseCodeQualityAnalysis(response.content);
    } catch (error) {
      if (error instanceof VerificationPhaseError) {
        throw error;
      }
      throw new VerificationPhaseError(
        `Failed to analyze code quality for: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseErrorAnalysis(response: string): ErrorAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        errorType: parsed.errorType || 'runtime',
        rootCause: parsed.rootCause || 'Unknown cause',
        affectedFiles: Array.isArray(parsed.affectedFiles) ? parsed.affectedFiles : [],
        suggestedFix: parsed.suggestedFix || 'No fix suggested',
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse error analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseVerificationSummary(response: string): VerificationSummary {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        overallStatus: parsed.overallStatus || 'failed',
        summary: parsed.summary || 'No summary available',
        failedStages: Array.isArray(parsed.failedStages) ? parsed.failedStages : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        criticalIssues: Array.isArray(parsed.criticalIssues) ? parsed.criticalIssues : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse verification summary: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseTestFailureAnalysis(response: string): TestFailureAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        failedTests: Array.isArray(parsed.failedTests)
          ? parsed.failedTests.map((test: TestFailure) => ({
              testName: test.testName || 'Unknown test',
              errorMessage: test.errorMessage || 'No error message',
              possibleCause: test.possibleCause || 'Unknown cause',
              suggestedFix: test.suggestedFix || 'No fix suggested',
            }))
          : [],
        commonIssues: Array.isArray(parsed.commonIssues) ? parsed.commonIssues : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse test failure analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseLintAnalysis(response: string): LintAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        errors: Array.isArray(parsed.errors)
          ? parsed.errors.map((err: LintError) => ({
              file: err.file || 'unknown',
              line: err.line || 0,
              rule: err.rule || 'unknown',
              message: err.message || 'No message',
              severity: err.severity || 'warning',
              autoFixable: err.autoFixable ?? false,
            }))
          : [],
        summary: {
          totalErrors: parsed.summary?.totalErrors || 0,
          totalWarnings: parsed.summary?.totalWarnings || 0,
          criticalIssues: parsed.summary?.criticalIssues || 0,
        },
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse lint analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseTypeErrorAnalysis(response: string): TypeErrorAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        errors: Array.isArray(parsed.errors)
          ? parsed.errors.map((err: TypeError) => ({
              file: err.file || 'unknown',
              line: err.line || 0,
              message: err.message || 'No message',
              expectedType: err.expectedType || 'unknown',
              actualType: err.actualType || 'unknown',
              suggestedFix: err.suggestedFix || 'No fix suggested',
            }))
          : [],
        commonPatterns: Array.isArray(parsed.commonPatterns) ? parsed.commonPatterns : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse type error analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseBuildErrorAnalysis(response: string): BuildErrorAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        errors: Array.isArray(parsed.errors)
          ? parsed.errors.map((err: BuildError) => ({
              type: err.type || 'other',
              message: err.message || 'No message',
              affectedFiles: Array.isArray(err.affectedFiles) ? err.affectedFiles : [],
              suggestedFix: err.suggestedFix || 'No fix suggested',
            }))
          : [],
        missingDependencies: Array.isArray(parsed.missingDependencies)
          ? parsed.missingDependencies
          : [],
        configIssues: Array.isArray(parsed.configIssues) ? parsed.configIssues : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse build error analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseSecurityScan(response: string): SecurityScanResult {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        vulnerabilities: Array.isArray(parsed.vulnerabilities)
          ? parsed.vulnerabilities.map((vuln: SecurityVulnerability) => ({
              severity: vuln.severity || 'low',
              type: vuln.type || 'unknown',
              message: vuln.message || 'No message',
              line: vuln.line,
              recommendation: vuln.recommendation || 'No recommendation',
            }))
          : [],
        securityScore: parsed.securityScore ?? 100,
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse security scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseCodeQualityAnalysis(response: string): CodeQualityAnalysis {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        qualityScore: parsed.qualityScore ?? 0,
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.map((issue: CodeQualityIssue) => ({
              severity: issue.severity || 'suggestion',
              category: issue.category || 'general',
              message: issue.message || 'No message',
              line: issue.line,
            }))
          : [],
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
      };
    } catch (error) {
      throw new VerificationPhaseError(
        `Failed to parse code quality analysis: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
}

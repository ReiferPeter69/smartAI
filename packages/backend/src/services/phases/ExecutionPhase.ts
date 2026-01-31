import type { LLMProvider, ChatOptions } from '@obsidian/core';
import {
  EXECUTION_SYSTEM_PROMPT,
  CODE_GENERATION_PROMPT,
  FILE_GENERATION_PROMPT,
  DIRECTORY_STRUCTURE_PROMPT,
  DEPENDENCY_ANALYSIS_PROMPT,
  CODE_REVIEW_PROMPT,
  FIX_CODE_PROMPT,
} from '../../llm/prompt-templates/execution';

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
}

export interface CodeIssue {
  severity: 'error' | 'warning';
  message: string;
  line: number | null;
}

export interface CodeReviewResult {
  valid: boolean;
  issues: CodeIssue[];
}

export interface Dependencies {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}

export interface ExecutionResult {
  files: GeneratedFile[];
  directories?: string[];
  dependencies?: Dependencies;
}

export class ExecutionPhaseError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'ExecutionPhaseError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ExecutionPhase {
  constructor(private llmProvider: LLMProvider) {}

  async generateCodeForStep(
    architecture: string,
    plan: string,
    step: { id: string; title: string; description: string }
  ): Promise<GeneratedFile[]> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'execution' as const,
        agentId: 'backend-architect',
        skills: ['nodejs', 'typescript'],
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: CODE_GENERATION_PROMPT(architecture, plan, step),
        },
      ], options);

      return this.parseFilesResponse(response.content);
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        `Failed to generate code for step: ${step.id}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateFile(
    filePath: string,
    description: string,
    context: string
  ): Promise<string> {
    try {
      const { agentId, skills } = this.selectAgentForFile(filePath);
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'execution' as const,
        agentId,
        skills,
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: FILE_GENERATION_PROMPT(filePath, description, context),
        },
      ], options);

      return response.content.trim();
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        `Failed to generate file: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async generateDirectoryStructure(
    appType: string,
    framework: string
  ): Promise<string[]> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string } = {
        phase: 'execution' as const,
        agentId: 'backend-architect',
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: DIRECTORY_STRUCTURE_PROMPT(appType, framework),
        },
      ], options);

      return this.parseDirectoryResponse(response.content);
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        'Failed to generate directory structure',
        error instanceof Error ? error : undefined
      );
    }
  }

  async analyzeDependencies(
    architecture: string,
    techStack: string
  ): Promise<Dependencies> {
    try {
      const options: ChatOptions & { phase?: string; agentId?: string } = {
        phase: 'execution' as const,
        agentId: 'backend-architect',
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: DEPENDENCY_ANALYSIS_PROMPT(architecture, techStack),
        },
      ], options);

      return this.parseDependenciesResponse(response.content);
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        'Failed to analyze dependencies',
        error instanceof Error ? error : undefined
      );
    }
  }

  async reviewCode(code: string, filePath: string): Promise<CodeReviewResult> {
    try {
      const { agentId, skills } = this.selectAgentForFile(filePath);
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'execution' as const,
        agentId,
        skills,
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: CODE_REVIEW_PROMPT(code, filePath),
        },
      ], options);

      return this.parseCodeReviewResponse(response.content);
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        `Failed to review code: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  async fixCode(
    code: string,
    filePath: string,
    issues: CodeIssue[]
  ): Promise<string> {
    try {
      const { agentId, skills } = this.selectAgentForFile(filePath);
      const options: ChatOptions & { phase?: string; agentId?: string; skills?: string[] } = {
        phase: 'execution' as const,
        agentId,
        skills,
      };

      const response = await this.llmProvider.chat([
        {
          role: 'system',
          content: EXECUTION_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: FIX_CODE_PROMPT(code, filePath, issues),
        },
      ], options);

      return response.content.trim();
    } catch (error) {
      if (error instanceof ExecutionPhaseError) {
        throw error;
      }
      throw new ExecutionPhaseError(
        `Failed to fix code: ${filePath}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private selectAgentForFile(filePath: string): { agentId: string; skills: string[] } {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    
    const frontendExtensions = ['tsx', 'jsx', 'css', 'scss', 'sass', 'less', 'vue'];
    const isFrontend = frontendExtensions.includes(extension) || 
                       filePath.includes('/components/') || 
                       filePath.includes('/pages/') ||
                       filePath.includes('/frontend/');

    if (isFrontend) {
      return {
        agentId: 'frontend-expert',
        skills: ['react', 'typescript', 'css'],
      };
    }

    return {
      agentId: 'backend-architect',
      skills: ['nodejs', 'typescript', 'api-design'],
    };
  }

  private parseFilesResponse(response: string): GeneratedFile[] {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      if (parsed.length === 0) {
        throw new Error('No files generated');
      }

      return parsed
        .filter((file) => file.path && file.content && file.language)
        .map((file) => ({
          path: file.path,
          content: file.content,
          language: file.language,
        }));
    } catch (error) {
      throw new ExecutionPhaseError(
        `Failed to parse files response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseDirectoryResponse(response: string): string[] {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      return parsed.filter((dir) => typeof dir === 'string' && dir.trim().length > 0);
    } catch (error) {
      throw new ExecutionPhaseError(
        `Failed to parse directory response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseDependenciesResponse(response: string): Dependencies {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      if (!parsed.dependencies && !parsed.devDependencies) {
        throw new Error('Invalid dependencies format');
      }

      return {
        dependencies: parsed.dependencies || {},
        devDependencies: parsed.devDependencies || {},
      };
    } catch (error) {
      throw new ExecutionPhaseError(
        `Failed to parse dependencies response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseCodeReviewResponse(response: string): CodeReviewResult {
    try {
      const cleaned = this.cleanJsonResponse(response);
      const parsed = JSON.parse(cleaned);

      return {
        valid: parsed.valid ?? false,
        issues: Array.isArray(parsed.issues)
          ? parsed.issues.map((issue: CodeIssue) => ({
              severity: issue.severity || 'warning',
              message: issue.message || 'Unknown issue',
              line: issue.line,
            }))
          : [],
      };
    } catch (error) {
      throw new ExecutionPhaseError(
        `Failed to parse code review response: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

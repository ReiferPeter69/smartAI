import { EnhancedLLMService, EnhancedChatOptions } from './EnhancedLLMService';
import { Workflow, WorkflowStep } from '../agents/Workflows';
import type { ChatMessage, ChatResponse } from '@obsidian/core';

export interface WorkflowExecutionResult {
  workflowId: string;
  stepResults: StepResult[];
  finalOutput: string;
  totalCost: number;
  totalTokens: number;
  executionTimeMs: number;
}

export interface StepResult {
  stepIndex: number;
  agentId: string;
  description: string;
  output: string;
  cost: number;
  tokens: number;
  executionTimeMs: number;
}

export class WorkflowExecutor {
  constructor(private llmService: EnhancedLLMService) {}

  async executeWorkflow(
    workflow: Workflow,
    userPrompt: string,
    additionalContext?: string
  ): Promise<WorkflowExecutionResult> {
    const startTime = Date.now();
    const stepResults: StepResult[] = [];
    let accumulatedContext = additionalContext || '';

    this.llmService.resetCostMetrics();

    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      const stepResult = await this.executeStep(
        step,
        i,
        userPrompt,
        accumulatedContext,
        workflow
      );
      
      stepResults.push(stepResult);
      accumulatedContext += `\n\n--- ${step.description} (${step.agentId}) ---\n${stepResult.output}\n`;
    }

    const finalMetrics = this.llmService.getCostMetrics();
    const executionTimeMs = Date.now() - startTime;

    const finalOutput = this.synthesizeFinalOutput(stepResults, workflow);

    return {
      workflowId: workflow.id,
      stepResults,
      finalOutput,
      totalCost: finalMetrics.totalCost,
      totalTokens: finalMetrics.totalTokens,
      executionTimeMs,
    };
  }

  private async executeStep(
    step: WorkflowStep,
    stepIndex: number,
    userPrompt: string,
    previousContext: string,
    workflow: Workflow
  ): Promise<StepResult> {
    const stepStartTime = Date.now();

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: this.buildStepSystemPrompt(step, workflow, stepIndex),
      },
      {
        role: 'user',
        content: this.buildStepUserPrompt(userPrompt, previousContext, step),
      },
    ];

    const options: EnhancedChatOptions = {
      agentId: step.agentId,
      skills: step.skills,
      routingStrategy: {
        priority: 'quality',
        requireFallback: true,
      },
    };

    const metricsBefore = this.llmService.getCostMetrics();
    const response: ChatResponse = await this.llmService.chat(messages, options);
    const metricsAfter = this.llmService.getCostMetrics();

    const stepCost = metricsAfter.totalCost - metricsBefore.totalCost;
    const stepTokens = metricsAfter.totalTokens - metricsBefore.totalTokens;
    const executionTimeMs = Date.now() - stepStartTime;

    return {
      stepIndex,
      agentId: step.agentId,
      description: step.description,
      output: response.content,
      cost: stepCost,
      tokens: stepTokens,
      executionTimeMs,
    };
  }

  private buildStepSystemPrompt(step: WorkflowStep, workflow: Workflow, stepIndex: number): string {
    let prompt = `You are executing step ${stepIndex + 1}/${workflow.steps.length} of the "${workflow.name}" workflow.\n\n`;
    prompt += `Your role in this step: ${step.description}\n\n`;
    
    if (step.outputFormat) {
      prompt += `Expected output format: ${step.outputFormat}\n\n`;
    }
    
    prompt += `Workflow objective: ${workflow.description}\n\n`;
    prompt += `Focus on delivering high-quality output for your specific step. `;
    prompt += `Your output will be used by subsequent steps in the workflow.`;
    
    return prompt;
  }

  private buildStepUserPrompt(userPrompt: string, previousContext: string, step: WorkflowStep): string {
    let prompt = `User Request:\n${userPrompt}\n\n`;
    
    if (previousContext) {
      prompt += `Context from previous workflow steps:\n${previousContext}\n\n`;
    }
    
    prompt += `Your task: ${step.description}\n\n`;
    prompt += `Please provide your output for this step.`;
    
    return prompt;
  }

  private synthesizeFinalOutput(stepResults: StepResult[], workflow: Workflow): string {
    let output = `# ${workflow.name} - Execution Results\n\n`;
    output += `**Workflow**: ${workflow.description}\n\n`;
    output += `**Completed Steps**: ${stepResults.length}\n\n`;
    output += `---\n\n`;

    for (const result of stepResults) {
      output += `## Step ${result.stepIndex + 1}: ${result.description}\n`;
      output += `**Agent**: ${result.agentId}\n`;
      output += `**Execution Time**: ${result.executionTimeMs}ms\n`;
      output += `**Tokens**: ${result.tokens}\n`;
      output += `**Cost**: $${result.cost.toFixed(6)}\n\n`;
      output += `### Output:\n${result.output}\n\n`;
      output += `---\n\n`;
    }

    if (workflow.expectedOutputs.length > 0) {
      output += `## Expected Deliverables\n`;
      output += `This workflow should produce:\n`;
      for (const expectedOutput of workflow.expectedOutputs) {
        output += `- ${expectedOutput}\n`;
      }
    }

    return output;
  }
}

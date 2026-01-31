import { LLMProvider, ChatMessage, ChatOptions, ChatResponse, Phase } from '@obsidian/core';
import { ModelRouter, RoutingStrategy } from './ModelRouter';
import { AGENT_TEMPLATES } from '../agents/AgentTemplates';
import { enhancePromptWithSkills } from '../agents/SkillLibrary';

export interface EnhancedChatOptions extends ChatOptions {
  phase?: Phase;
  agentId?: string;
  skills?: string[];
  routingStrategy?: RoutingStrategy;
}

export interface CostMetrics {
  totalCost: number;
  totalTokens: number;
  calls: number;
  modelUsage: Map<string, { cost: number; calls: number }>;
}

export class EnhancedLLMService implements LLMProvider {
  private modelRouter: ModelRouter;
  private costMetrics: CostMetrics;

  constructor(private baseProvider: LLMProvider) {
    this.modelRouter = new ModelRouter();
    this.costMetrics = {
      totalCost: 0,
      totalTokens: 0,
      calls: 0,
      modelUsage: new Map(),
    };
  }

  async chat(messages: ChatMessage[], options?: EnhancedChatOptions): Promise<ChatResponse> {
    const enhancedMessages = await this.enhanceMessages(messages, options);
    const selectedModel = this.selectModel(options);
    
    const chatOptions: ChatOptions = {
      ...options,
      model: selectedModel,
    };

    try {
      const response = await this.baseProvider.chat(enhancedMessages, chatOptions);
      this.trackCost(response, selectedModel);
      return response;
    } catch (error) {
      const fallbackModel = this.modelRouter.getFallbackModel(selectedModel);
      if (fallbackModel && options?.routingStrategy?.requireFallback !== false) {
        // Fallback to alternative model on error
        const fallbackResponse = await this.baseProvider.chat(enhancedMessages, {
          ...chatOptions,
          model: fallbackModel,
        });
        this.trackCost(fallbackResponse, fallbackModel);
        return fallbackResponse;
      }
      throw error;
    }
  }

  async *stream(messages: ChatMessage[], options?: EnhancedChatOptions): AsyncIterableIterator<string> {
    const enhancedMessages = await this.enhanceMessages(messages, options);
    const selectedModel = this.selectModel(options);
    
    const chatOptions: ChatOptions = {
      ...options,
      model: selectedModel,
    };

    yield* this.baseProvider.stream(enhancedMessages, chatOptions);
  }

  private async enhanceMessages(
    messages: ChatMessage[],
    options?: EnhancedChatOptions
  ): Promise<ChatMessage[]> {
    if (!options?.agentId && !options?.skills?.length) {
      return messages;
    }

    const enhancedMessages = [...messages];
    let systemPromptEnhancement = '';

    if (options.agentId) {
      const agent = AGENT_TEMPLATES[options.agentId];
      if (agent) {
        systemPromptEnhancement += `\n\n${agent.systemPrompt}\n`;
        
        if (agent.skills.length > 0) {
          const skillsContext = enhancePromptWithSkills('', agent.skills);
          systemPromptEnhancement += skillsContext;
        }
      }
    }

    if (options.skills?.length) {
      const skillsContext = enhancePromptWithSkills('', options.skills);
      systemPromptEnhancement += skillsContext;
    }

    if (systemPromptEnhancement) {
      const systemMessageIndex = enhancedMessages.findIndex(msg => msg.role === 'system');
      if (systemMessageIndex >= 0) {
        enhancedMessages[systemMessageIndex] = {
          ...enhancedMessages[systemMessageIndex],
          content: enhancedMessages[systemMessageIndex].content + systemPromptEnhancement,
        };
      } else {
        enhancedMessages.unshift({
          role: 'system',
          content: systemPromptEnhancement.trim(),
        });
      }
    }

    return enhancedMessages;
  }

  private selectModel(options?: EnhancedChatOptions): string {
    if (options?.model) {
      return options.model;
    }

    if (options?.routingStrategy) {
      return this.modelRouter.selectModel(options.routingStrategy);
    }

    if (options?.phase) {
      return this.modelRouter.selectModelForPhase(options.phase);
    }

    if (options?.agentId) {
      const agent = AGENT_TEMPLATES[options.agentId];
      if (agent?.recommendedModels?.length) {
        return agent.recommendedModels[0];
      }
    }

    return this.modelRouter.selectModel({ priority: 'balanced' });
  }

  private trackCost(response: ChatResponse, model: string): void {
    const usage = response.usage;
    if (!usage) return;

    const cost = response.metadata?.cost || 
                 this.modelRouter.estimateCost(model, usage.promptTokens, usage.completionTokens);

    this.costMetrics.totalCost += cost;
    this.costMetrics.totalTokens += usage.totalTokens;
    this.costMetrics.calls += 1;

    const modelStats = this.costMetrics.modelUsage.get(model) || { cost: 0, calls: 0 };
    modelStats.cost += cost;
    modelStats.calls += 1;
    this.costMetrics.modelUsage.set(model, modelStats);
  }

  getCostMetrics(): CostMetrics {
    return {
      ...this.costMetrics,
      modelUsage: new Map(this.costMetrics.modelUsage),
    };
  }

  resetCostMetrics(): void {
    this.costMetrics = {
      totalCost: 0,
      totalTokens: 0,
      calls: 0,
      modelUsage: new Map(),
    };
  }
}

import type { Phase } from '@obsidian/core';

export interface ModelMetrics {
  provider: string;
  model: string;
  fullName: string;
  costPer1kTokens: number;
  quality: number;
  speed: number;
  reliability: number;
  contextWindow: number;
  capabilities: string[];
}

export interface RoutingStrategy {
  priority: 'cost' | 'quality' | 'speed' | 'balanced';
  maxCostPer1kTokens?: number;
  minQuality?: number;
  minContextWindow?: number;
  requireFallback?: boolean;
  phase?: Phase;
}

export class ModelRouter {
  private metrics: Map<string, ModelMetrics> = new Map();

  constructor() {
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    this.addModel({
      provider: 'openai',
      model: 'gpt-4o',
      fullName: 'openai/gpt-4o',
      costPer1kTokens: 0.0025,
      quality: 9.5,
      speed: 150,
      reliability: 0.99,
      contextWindow: 128000,
      capabilities: ['code', 'reasoning', 'analysis'],
    });

    this.addModel({
      provider: 'openai',
      model: 'gpt-4o-mini',
      fullName: 'openai/gpt-4o-mini',
      costPer1kTokens: 0.00015,
      quality: 7.5,
      speed: 200,
      reliability: 0.99,
      contextWindow: 128000,
      capabilities: ['code', 'chat'],
    });

    this.addModel({
      provider: 'anthropic',
      model: 'claude-3.5-sonnet',
      fullName: 'anthropic/claude-3.5-sonnet',
      costPer1kTokens: 0.003,
      quality: 9.8,
      speed: 120,
      reliability: 0.98,
      contextWindow: 200000,
      capabilities: ['code', 'reasoning', 'analysis', 'long-context'],
    });

    this.addModel({
      provider: 'anthropic',
      model: 'claude-3-haiku',
      fullName: 'anthropic/claude-3-haiku',
      costPer1kTokens: 0.00025,
      quality: 7.8,
      speed: 180,
      reliability: 0.98,
      contextWindow: 200000,
      capabilities: ['code', 'chat', 'speed'],
    });

    this.addModel({
      provider: 'google',
      model: 'gemini-pro-1.5',
      fullName: 'google/gemini-pro-1.5',
      costPer1kTokens: 0.00125,
      quality: 8.8,
      speed: 140,
      reliability: 0.97,
      contextWindow: 2000000,
      capabilities: ['code', 'reasoning', 'long-context'],
    });

    this.addModel({
      provider: 'meta',
      model: 'llama-3.1-70b',
      fullName: 'meta-llama/llama-3.1-70b-instruct',
      costPer1kTokens: 0.0004,
      quality: 8.0,
      speed: 160,
      reliability: 0.96,
      contextWindow: 128000,
      capabilities: ['code', 'chat'],
    });

    this.addModel({
      provider: 'mistral',
      model: 'mistral-large',
      fullName: 'mistralai/mistral-large',
      costPer1kTokens: 0.002,
      quality: 8.5,
      speed: 150,
      reliability: 0.97,
      contextWindow: 128000,
      capabilities: ['code', 'reasoning'],
    });
  }

  private addModel(metrics: ModelMetrics): void {
    this.metrics.set(metrics.fullName, metrics);
  }

  selectModel(strategy: RoutingStrategy): string {
    let candidates = Array.from(this.metrics.values());

    if (strategy.maxCostPer1kTokens !== undefined) {
      const maxCost = strategy.maxCostPer1kTokens;
      candidates = candidates.filter(m => m.costPer1kTokens <= maxCost);
    }

    if (strategy.minQuality !== undefined) {
      const minQual = strategy.minQuality;
      candidates = candidates.filter(m => m.quality >= minQual);
    }

    if (strategy.minContextWindow !== undefined) {
      const minContext = strategy.minContextWindow;
      candidates = candidates.filter(m => m.contextWindow >= minContext);
    }

    if (candidates.length === 0) {
      return this.getDefaultModel(strategy.phase);
    }

    const scored = candidates.map(m => {
      let score = 0;
      
      switch (strategy.priority) {
        case 'cost':
          score = 1 / (m.costPer1kTokens * 1000);
          break;
        case 'quality':
          score = m.quality * 10;
          break;
        case 'speed':
          score = m.speed;
          break;
        case 'balanced':
          score = (m.quality * 0.4) + 
                  ((1 / (m.costPer1kTokens * 1000)) * 0.3) + 
                  ((m.speed / 200) * 0.2) +
                  (m.reliability * 10 * 0.1);
          break;
      }
      
      return { model: m.fullName, score, metrics: m };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0].model;
  }

  selectModelForPhase(phase: Phase): string {
    const strategies: Record<Phase, RoutingStrategy> = {
      discovery: {
        priority: 'quality',
        minQuality: 8.5,
        minContextWindow: 100000,
      },
      planning: {
        priority: 'quality',
        minQuality: 8.0,
        maxCostPer1kTokens: 0.004,
      },
      execution: {
        priority: 'balanced',
        maxCostPer1kTokens: 0.001,
        minQuality: 7.5,
      },
      verification: {
        priority: 'speed',
        maxCostPer1kTokens: 0.0005,
        minQuality: 7.0,
      },
    };

    const strategy = strategies[phase];
    return this.selectModel(strategy);
  }

  getFallbackModel(primaryModel: string): string | undefined {
    const primaryMetrics = this.metrics.get(primaryModel);
    if (!primaryMetrics) return undefined;

    const alternatives = Array.from(this.metrics.values())
      .filter(m => 
        m.provider !== primaryMetrics.provider &&
        Math.abs(m.quality - primaryMetrics.quality) < 1.5 &&
        m.costPer1kTokens <= primaryMetrics.costPer1kTokens * 1.5
      )
      .sort((a, b) => b.reliability - a.reliability);

    return alternatives[0]?.fullName;
  }

  getModelInfo(modelName: string): ModelMetrics | undefined {
    return this.metrics.get(modelName);
  }

  getAllModels(): ModelMetrics[] {
    return Array.from(this.metrics.values());
  }

  getModelsByProvider(provider: string): ModelMetrics[] {
    return Array.from(this.metrics.values())
      .filter(m => m.provider === provider);
  }

  private getDefaultModel(phase?: Phase): string {
    if (phase === 'discovery' || phase === 'planning') {
      return 'anthropic/claude-3.5-sonnet';
    }
    return 'openai/gpt-4o-mini';
  }

  estimateCost(model: string, promptTokens: number, completionTokens: number): number {
    const metrics = this.metrics.get(model);
    if (!metrics) return 0;

    const totalTokens = promptTokens + completionTokens;
    return (totalTokens / 1000) * metrics.costPer1kTokens;
  }
}

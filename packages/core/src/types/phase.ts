export type Phase = 'discovery' | 'planning' | 'execution' | 'verification';
export type PhaseStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface PhaseError {
  message: string;
  code: string;
  stage?: string;
  details?: unknown;
  timestamp: number;
}

export interface PhaseContext {
  phase: Phase;
  status: PhaseStatus;
  artifacts: Record<string, string>;
  errors: PhaseError[];
  retryCount: number;
  startedAt?: number;
  completedAt?: number;
}

export interface GenerationSession {
  id: string;
  userId: string;
  projectId: string;
  prompt: string;
  appType: string;
  currentPhase: PhaseContext;
  history: PhaseContext[];
  config: {
    llmConfigId?: string;
    timeout?: number;
    maxRetries?: number;
  };
  createdAt: number;
  updatedAt: number;
}

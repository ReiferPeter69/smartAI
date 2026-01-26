import { api } from './client';

export interface DiscoveryResponse {
  questions: string[];
  phase: string;
  status: string;
}

export interface DiscoveryAnswers {
  [question: string]: string;
}

export interface PhaseResponse {
  message: string;
  phase: string;
  status: string;
  nextPhase?: string;
}

export const generationApi = {
  startDiscovery(projectId: string): Promise<DiscoveryResponse> {
    return api.post<DiscoveryResponse>('/generation/discovery/start', { projectId });
  },

  submitDiscovery(projectId: string, answers: DiscoveryAnswers): Promise<PhaseResponse> {
    return api.post<PhaseResponse>('/generation/discovery/submit', {
      projectId,
      answers,
    });
  },

  startPlanning(projectId: string): Promise<PhaseResponse> {
    return api.post<PhaseResponse>('/generation/planning/start', { projectId });
  },

  startExecution(projectId: string): Promise<PhaseResponse> {
    return api.post<PhaseResponse>('/generation/execution/start', { projectId });
  },

  startVerification(projectId: string): Promise<PhaseResponse> {
    return api.post<PhaseResponse>('/generation/verification/start', { projectId });
  },

  runFullGeneration(projectId: string, answers: DiscoveryAnswers): Promise<PhaseResponse> {
    return api.post<PhaseResponse>('/generation/full', {
      projectId,
      answers,
    });
  },
};

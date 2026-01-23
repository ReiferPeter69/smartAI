export type ProjectStatus = 'generating' | 'completed' | 'failed';
export type AppType = 'react' | 'nextjs' | 'fastapi' | 'express';

export interface Project {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  appType: AppType;
  status: ProjectStatus;
  filesPath: string;
  userId: string;
  currentPhase: string;
  phaseStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpecFile {
  id: string;
  projectId: string;
  filename: string;
  content: string;
  phase: string;
  createdAt: Date;
}

export interface VerificationLog {
  id: string;
  projectId: string;
  stage: string;
  passed: boolean;
  output: string;
  error?: string;
  createdAt: Date;
}

import { z } from 'zod';

export const PhaseSchema = z.enum(['discovery', 'planning', 'execution', 'verification']);

export const PhaseStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'failed']);

export const SpecFileSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  filename: z.string().regex(/\.(md|txt)$/, 'Spec file must be .md or .txt'),
  content: z.string(),
  phase: PhaseSchema,
  createdAt: z.date(),
});

export const SpecFileCreateSchema = z.object({
  projectId: z.string(),
  filename: z.string().regex(/\.(md|txt)$/, 'Spec file must be .md or .txt'),
  content: z.string(),
  phase: PhaseSchema,
});

export const ArchitectureSpecSchema = z.object({
  domainModel: z.string(),
  userStories: z.array(z.string()),
  dataModels: z.record(z.string(), z.any()),
  apiContracts: z.array(z.object({
    endpoint: z.string(),
    method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    request: z.any().optional(),
    response: z.any(),
  })),
});

export const PlanStepSchema = z.object({
  id: z.string(),
  description: z.string(),
  dependencies: z.array(z.string()),
  verificationStrategy: z.string(),
  risks: z.array(z.string()).optional(),
  mitigations: z.array(z.string()).optional(),
});

export const PlanSchema = z.object({
  steps: z.array(PlanStepSchema),
  critiques: z.array(z.object({
    step: z.string(),
    critique: z.string(),
    fix: z.string(),
  })).optional(),
});

export type Phase = z.infer<typeof PhaseSchema>;
export type PhaseStatus = z.infer<typeof PhaseStatusSchema>;
export type SpecFile = z.infer<typeof SpecFileSchema>;
export type SpecFileCreate = z.infer<typeof SpecFileCreateSchema>;
export type ArchitectureSpec = z.infer<typeof ArchitectureSpecSchema>;
export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;

import { z } from 'zod';
import { PhaseSchema, PhaseStatusSchema } from './spec.schema';

export const RegisterRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

export const LoginRequestSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const AuthResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});

export const ProjectStatusSchema = z.enum(['generating', 'completed', 'failed']);

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  prompt: z.string(),
  appType: z.string(),
  status: ProjectStatusSchema,
  filesPath: z.string(),
  userId: z.string(),
  currentPhase: PhaseSchema,
  phaseStatus: PhaseStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProjectRequestSchema = z.object({
  prompt: z.string().min(10, 'Prompt must be at least 10 characters'),
  appType: z.enum(['react', 'nextjs', 'fastapi']),
  llmConfigId: z.string().optional(),
});

export const CreateProjectResponseSchema = z.object({
  project: ProjectSchema,
  sessionId: z.string(),
});

export const GetProjectsQuerySchema = z.object({
  status: ProjectStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const GetProjectsResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  total: z.number(),
});

export const GetProjectResponseSchema = z.object({
  project: ProjectSchema,
  files: z.array(z.string()),
});

export const DeleteProjectResponseSchema = z.object({
  success: z.boolean(),
});

export const WebSocketEventTypeSchema = z.enum([
  'PHASE_CHANGED',
  'FILE_GENERATED',
  'VERIFICATION_RESULT',
  'CLARIFICATION_NEEDED',
  'GENERATION_COMPLETE',
  'GENERATION_FAILED',
  'CLARIFICATION_RESPONSE',
  'APPROVE_SPEC',
  'CANCEL_GENERATION',
]);

export const PhaseChangedEventSchema = z.object({
  type: z.literal('PHASE_CHANGED'),
  phase: PhaseSchema,
  timestamp: z.number(),
});

export const FileGeneratedEventSchema = z.object({
  type: z.literal('FILE_GENERATED'),
  path: z.string(),
  content: z.string(),
});

export const VerificationResultEventSchema = z.object({
  type: z.literal('VERIFICATION_RESULT'),
  stage: z.string(),
  passed: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
});

export const ClarificationNeededEventSchema = z.object({
  type: z.literal('CLARIFICATION_NEEDED'),
  question: z.string(),
  context: z.string(),
});

export const GenerationCompleteEventSchema = z.object({
  type: z.literal('GENERATION_COMPLETE'),
  projectId: z.string(),
});

export const GenerationFailedEventSchema = z.object({
  type: z.literal('GENERATION_FAILED'),
  error: z.string(),
  phase: PhaseSchema,
});

export const ClarificationResponseEventSchema = z.object({
  type: z.literal('CLARIFICATION_RESPONSE'),
  answer: z.string(),
});

export const ApproveSpecEventSchema = z.object({
  type: z.literal('APPROVE_SPEC'),
});

export const CancelGenerationEventSchema = z.object({
  type: z.literal('CANCEL_GENERATION'),
});

export const ServerEventSchema = z.discriminatedUnion('type', [
  PhaseChangedEventSchema,
  FileGeneratedEventSchema,
  VerificationResultEventSchema,
  ClarificationNeededEventSchema,
  GenerationCompleteEventSchema,
  GenerationFailedEventSchema,
]);

export const ClientEventSchema = z.discriminatedUnion('type', [
  ClarificationResponseEventSchema,
  ApproveSpecEventSchema,
  CancelGenerationEventSchema,
]);

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type AuthResponse = z.infer<typeof AuthResponseSchema>;
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;
export type CreateProjectResponse = z.infer<typeof CreateProjectResponseSchema>;
export type GetProjectsQuery = z.infer<typeof GetProjectsQuerySchema>;
export type GetProjectsResponse = z.infer<typeof GetProjectsResponseSchema>;
export type GetProjectResponse = z.infer<typeof GetProjectResponseSchema>;
export type DeleteProjectResponse = z.infer<typeof DeleteProjectResponseSchema>;
export type WebSocketEventType = z.infer<typeof WebSocketEventTypeSchema>;
export type PhaseChangedEvent = z.infer<typeof PhaseChangedEventSchema>;
export type FileGeneratedEvent = z.infer<typeof FileGeneratedEventSchema>;
export type VerificationResultEvent = z.infer<typeof VerificationResultEventSchema>;
export type ClarificationNeededEvent = z.infer<typeof ClarificationNeededEventSchema>;
export type GenerationCompleteEvent = z.infer<typeof GenerationCompleteEventSchema>;
export type GenerationFailedEvent = z.infer<typeof GenerationFailedEventSchema>;
export type ClarificationResponseEvent = z.infer<typeof ClarificationResponseEventSchema>;
export type ApproveSpecEvent = z.infer<typeof ApproveSpecEventSchema>;
export type CancelGenerationEvent = z.infer<typeof CancelGenerationEventSchema>;
export type ServerEvent = z.infer<typeof ServerEventSchema>;
export type ClientEvent = z.infer<typeof ClientEventSchema>;

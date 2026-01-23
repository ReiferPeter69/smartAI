import { z } from 'zod';

export const PromptSchema = z.object({
  content: z.string().min(10, 'Prompt must be at least 10 characters'),
  appType: z.enum(['react', 'nextjs', 'fastapi']),
  llmConfigId: z.string().optional(),
});

export const ClarificationResponseSchema = z.object({
  answer: z.string().min(1, 'Answer cannot be empty'),
  questionId: z.string().optional(),
});

export const ClarificationQuestionSchema = z.object({
  question: z.string(),
  context: z.string(),
});

export type PromptInput = z.infer<typeof PromptSchema>;
export type ClarificationResponse = z.infer<typeof ClarificationResponseSchema>;
export type ClarificationQuestion = z.infer<typeof ClarificationQuestionSchema>;

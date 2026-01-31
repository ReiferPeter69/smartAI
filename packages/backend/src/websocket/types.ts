import type { Phase } from '@obsidian/core/types/phase';
import type { WebSocket } from 'ws';

export type ServerEventType =
  | 'PHASE_CHANGED'
  | 'FILE_GENERATED'
  | 'VERIFICATION_RESULT'
  | 'CLARIFICATION_NEEDED'
  | 'GENERATION_COMPLETE'
  | 'GENERATION_FAILED'
  | 'ERROR'
  | 'SESSION_CREATED'
  | 'SESSION_COMPLETED'
  | 'SESSION_FAILED'
  | 'SPEC_GENERATED'
  | 'PROGRESS_UPDATE'
  | 'VERIFICATION_STARTED'
  | 'VERIFICATION_PASSED'
  | 'VERIFICATION_FAILED';

export type ClientEventType =
  | 'CLARIFICATION_RESPONSE'
  | 'APPROVE_SPEC'
  | 'CANCEL_GENERATION'
  | 'START_GENERATION'
  | 'RETRY_PHASE'
  | 'CANCEL_SESSION'
  | 'SPEC_APPROVED'
  | 'SPEC_REJECTED';

export interface PhaseChangedEvent {
  type: 'PHASE_CHANGED';
  phase: Phase;
  timestamp: number;
}

export interface FileGeneratedEvent {
  type: 'FILE_GENERATED';
  path: string;
  content: string;
}

export interface VerificationResultEvent {
  type: 'VERIFICATION_RESULT';
  stage: string;
  passed: boolean;
  output: string;
  error?: string;
}

export interface ClarificationNeededEvent {
  type: 'CLARIFICATION_NEEDED';
  question: string;
  context: string;
}

export interface GenerationCompleteEvent {
  type: 'GENERATION_COMPLETE';
  projectId: string;
}

export interface GenerationFailedEvent {
  type: 'GENERATION_FAILED';
  error: string;
  phase: Phase;
}

export interface ErrorEvent {
  type: 'ERROR';
  message: string;
  code?: string;
}

export interface SessionCreatedEvent {
  type: 'SESSION_CREATED';
  sessionId: string;
  userId: string;
  prompt: string;
  appType: string;
}

export interface SessionCompletedEvent {
  type: 'SESSION_COMPLETED';
  sessionId: string;
  projectId: string;
}

export interface SessionFailedEvent {
  type: 'SESSION_FAILED';
  sessionId: string;
  error: string;
  phase: Phase;
}

export interface SpecGeneratedEvent {
  type: 'SPEC_GENERATED';
  sessionId: string;
  spec: string;
  filename: string;
}

export interface ProgressUpdateEvent {
  type: 'PROGRESS_UPDATE';
  sessionId: string;
  phase: Phase;
  progress: number;
  message: string;
}

export interface VerificationStartedEvent {
  type: 'VERIFICATION_STARTED';
  sessionId: string;
  stage: string;
}

export interface VerificationPassedEvent {
  type: 'VERIFICATION_PASSED';
  sessionId: string;
  stage: string;
}

export interface VerificationFailedEvent {
  type: 'VERIFICATION_FAILED';
  sessionId: string;
  stage: string;
  error: string;
}

export type ServerEvent =
  | PhaseChangedEvent
  | FileGeneratedEvent
  | VerificationResultEvent
  | ClarificationNeededEvent
  | GenerationCompleteEvent
  | GenerationFailedEvent
  | ErrorEvent
  | SessionCreatedEvent
  | SessionCompletedEvent
  | SessionFailedEvent
  | SpecGeneratedEvent
  | ProgressUpdateEvent
  | VerificationStartedEvent
  | VerificationPassedEvent
  | VerificationFailedEvent;

export interface ClarificationResponseEvent {
  type: 'CLARIFICATION_RESPONSE';
  answer: string;
}

export interface ApproveSpecEvent {
  type: 'APPROVE_SPEC';
}

export interface CancelGenerationEvent {
  type: 'CANCEL_GENERATION';
}

export interface StartGenerationEvent {
  type: 'START_GENERATION';
  prompt: string;
  appType: 'react' | 'nextjs' | 'fastapi';
  llmConfigId?: string;
}

export interface RetryPhaseEvent {
  type: 'RETRY_PHASE';
  sessionId: string;
}

export interface CancelSessionEvent {
  type: 'CANCEL_SESSION';
  sessionId: string;
}

export interface SpecApprovedEvent {
  type: 'SPEC_APPROVED';
  sessionId: string;
}

export interface SpecRejectedEvent {
  type: 'SPEC_REJECTED';
  sessionId: string;
  feedback: string;
}

export type ClientEvent =
  | ClarificationResponseEvent
  | ApproveSpecEvent
  | CancelGenerationEvent
  | StartGenerationEvent
  | RetryPhaseEvent
  | CancelSessionEvent
  | SpecApprovedEvent
  | SpecRejectedEvent;

export interface AuthenticatedWebSocket extends WebSocket {
  userId: string;
  sessionId: string;
  isAlive: boolean;
}

export interface WebSocketConnection {
  ws: AuthenticatedWebSocket;
  sessionId: string;
  userId: string;
  connectedAt: number;
}

import type { Phase } from '@obsidian/core/types/phase';
import type { WebSocket } from 'ws';

export type ServerEventType =
  | 'PHASE_CHANGED'
  | 'FILE_GENERATED'
  | 'VERIFICATION_RESULT'
  | 'CLARIFICATION_NEEDED'
  | 'GENERATION_COMPLETE'
  | 'GENERATION_FAILED'
  | 'ERROR';

export type ClientEventType =
  | 'CLARIFICATION_RESPONSE'
  | 'APPROVE_SPEC'
  | 'CANCEL_GENERATION';

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

export type ServerEvent =
  | PhaseChangedEvent
  | FileGeneratedEvent
  | VerificationResultEvent
  | ClarificationNeededEvent
  | GenerationCompleteEvent
  | GenerationFailedEvent
  | ErrorEvent;

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

export type ClientEvent =
  | ClarificationResponseEvent
  | ApproveSpecEvent
  | CancelGenerationEvent;

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

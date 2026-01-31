import { IncomingMessage } from 'http';
import { Duplex } from 'stream';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { PrismaClient } from '@prisma/client';
import { ConnectionManager } from './ConnectionManager';
import { UserService } from '../services/UserService';
import { GenerationService } from '../services/GenerationService';
import { ProjectService } from '../services/ProjectService';
import { PhaseOrchestrator } from '../services/PhaseOrchestrator';
import { GenerationEventEmitter } from './EventEmitter';
import { LLMProvider } from '@obsidian/core';
import { logger } from '../utils/logger';
import type {
  AuthenticatedWebSocket,
  ClientEvent,
  ServerEvent,
} from './types';

export interface EventQueueItem {
  event: ServerEvent;
  timestamp: number;
}

export class SessionHandler {
  private wss: WebSocketServer;
  private connectionManager: ConnectionManager;
  private prisma: PrismaClient;
  private projectService: ProjectService;
  private eventEmitter: GenerationEventEmitter;
  private eventQueue: Map<string, EventQueueItem[]> = new Map();
  private activeSessions: Map<string, GenerationService> = new Map();

  constructor(
    prisma: PrismaClient,
    private llmProvider: LLMProvider
  ) {
    this.prisma = prisma;
    this.projectService = new ProjectService(prisma);
    this.eventEmitter = GenerationEventEmitter.getInstance();
    this.connectionManager = new ConnectionManager();
    this.wss = new WebSocketServer({ noServer: true });
    this.setupWebSocketServer();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage, sessionId: string, userId: string) => {
      const authenticatedWs = ws as AuthenticatedWebSocket;
      authenticatedWs.userId = userId;
      authenticatedWs.sessionId = sessionId;
      authenticatedWs.isAlive = true;

      this.connectionManager.addConnection(authenticatedWs, sessionId, userId);

      logger.info('WebSocket connection established', {
        sessionId,
        userId,
        url: request.url,
      });

      authenticatedWs.on('message', (data: Buffer) => {
        this.handleClientMessage(authenticatedWs, data, sessionId, userId);
      });

      authenticatedWs.on('error', (error: Error) => {
        logger.error('WebSocket error', error, {
          sessionId,
          userId,
        });
      });

      authenticatedWs.on('close', (code: number, reason: Buffer) => {
        logger.info('WebSocket connection closed', {
          sessionId,
          userId,
          code,
          reason: reason.toString(),
        });
      });

      this.sendQueuedEvents(sessionId, authenticatedWs);
    });

    logger.info('WebSocket server setup complete');
  }

  handleUpgrade(
    request: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void {
    try {
      const { sessionId, userId } = this.authenticateRequest(request);

      this.wss.handleUpgrade(request, socket, head, (ws) => {
        this.wss.emit('connection', ws, request, sessionId, userId);
      });
    } catch (error) {
      logger.error('WebSocket upgrade failed', error instanceof Error ? error : undefined, {
        url: request.url,
      });

      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  }

  private authenticateRequest(request: IncomingMessage): { sessionId: string; userId: string } {
    const parsedUrl = parseUrl(request.url || '', true);
    const pathParts = parsedUrl.pathname?.split('/').filter(Boolean) || [];

    if (pathParts[0] !== 'ws' || pathParts[1] !== 'session' || !pathParts[2]) {
      throw new Error('Invalid WebSocket path');
    }

    const sessionId = pathParts[2];

    let token: string | undefined;

    if (parsedUrl.query.token && typeof parsedUrl.query.token === 'string') {
      token = parsedUrl.query.token;
    } else if (request.headers.authorization?.startsWith('Bearer ')) {
      token = request.headers.authorization.substring(7);
    }

    if (!token) {
      throw new Error('Authentication token required');
    }

    const { userId } = UserService.verifyToken(token);

    return { sessionId, userId };
  }

  private handleClientMessage(
    ws: AuthenticatedWebSocket,
    data: Buffer,
    sessionId: string,
    userId: string
  ): void {
    try {
      const message = JSON.parse(data.toString());
      
      if (!this.isValidClientEvent(message)) {
        this.sendError(ws, 'Invalid event format');
        return;
      }

      logger.info('Client event received', {
        sessionId,
        userId,
        eventType: message.type,
      });

      this.handleClientEvent(message, sessionId, userId);
    } catch (error) {
      logger.error('Failed to process client message', error instanceof Error ? error : undefined, {
        sessionId,
        userId,
      });

      this.sendError(ws, 'Failed to process message');
    }
  }

  private isValidClientEvent(data: unknown): data is ClientEvent {
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    const event = data as { type?: unknown };

    return (
      event.type === 'CLARIFICATION_RESPONSE' ||
      event.type === 'APPROVE_SPEC' ||
      event.type === 'CANCEL_GENERATION' ||
      event.type === 'START_GENERATION' ||
      event.type === 'RETRY_PHASE' ||
      event.type === 'CANCEL_SESSION' ||
      event.type === 'SPEC_APPROVED' ||
      event.type === 'SPEC_REJECTED'
    );
  }

  private async handleClientEvent(event: ClientEvent, sessionId: string, userId: string): Promise<void> {
    try {
      switch (event.type) {
        case 'START_GENERATION':
          await this.handleStartGeneration(event, sessionId, userId);
          break;

        case 'CLARIFICATION_RESPONSE':
          await this.handleClarificationResponse(event, sessionId, userId);
          break;

        case 'SPEC_APPROVED':
          await this.handleSpecApproval(event, sessionId, userId);
          break;

        case 'SPEC_REJECTED':
          await this.handleSpecRejection(event, sessionId, userId);
          break;

        case 'RETRY_PHASE':
          await this.handleRetryPhase(event, sessionId, userId);
          break;

        case 'CANCEL_SESSION':
          await this.handleCancelSession(event, sessionId, userId);
          break;

        case 'APPROVE_SPEC':
          logger.info('Spec approved (legacy event)', {
            sessionId,
            userId,
          });
          break;

        case 'CANCEL_GENERATION':
          logger.info('Generation cancelled (legacy event)', {
            sessionId,
            userId,
          });
          await this.handleCancelSession({ type: 'CANCEL_SESSION', sessionId }, sessionId, userId);
          break;
      }
    } catch (error) {
      logger.error('Error handling client event', error instanceof Error ? error : undefined, {
        sessionId,
        userId,
        eventType: event.type,
      });
      
      this.sendToSession(sessionId, {
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to handle event',
      });
    }
  }

  private async handleStartGeneration(
    event: { type: 'START_GENERATION'; prompt: string; appType: string; llmConfigId?: string },
    sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Starting generation', { sessionId, userId, appType: event.appType });

    const generationSession = await PhaseOrchestrator.createSession(this.prisma, {
      userId,
      prompt: event.prompt,
      appType: event.appType,
      llmConfigId: event.llmConfigId,
    });

    const generationService = new GenerationService(
      generationSession,
      this.llmProvider,
      this.projectService
    );

    this.activeSessions.set(sessionId, generationService);

    this.sendToSession(sessionId, {
      type: 'SESSION_CREATED',
      sessionId,
      userId,
      prompt: event.prompt,
      appType: event.appType,
    });

    generationService.setPhaseUpdateCallback((phase, status, _data) => {
      this.sendToSession(sessionId, {
        type: 'PROGRESS_UPDATE',
        sessionId,
        phase,
        progress: 0,
        message: `Phase ${phase} - ${status}`,
      });
    });

    try {
      const questions = await generationService.startDiscovery();
      
      this.sendToSession(sessionId, {
        type: 'CLARIFICATION_NEEDED',
        question: questions.join('\n'),
        context: 'Discovery phase',
      });
    } catch (error) {
      logger.error('Generation failed', error instanceof Error ? error : undefined, { sessionId });
      
      this.sendToSession(sessionId, {
        type: 'SESSION_FAILED',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: 'discovery',
      });
    }
  }

  private async handleClarificationResponse(
    event: { type: 'CLARIFICATION_RESPONSE'; answer: string },
    sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Clarification response received', { sessionId, userId });

    const generationService = this.activeSessions.get(sessionId);
    if (!generationService) {
      throw new Error('No active generation session found');
    }

    try {
      await generationService.completeDiscoveryWithAnswers({
        clarification: event.answer,
      });

      const session = generationService.getSession();
      const architectureArtifact = session.currentPhase.artifacts['architecture.md'];

      if (architectureArtifact) {
        this.sendToSession(sessionId, {
          type: 'SPEC_GENERATED',
          sessionId,
          spec: architectureArtifact,
          filename: 'architecture.md',
        });
      }

      await generationService.startPlanning();
      
      const planArtifact = generationService.getSession().currentPhase.artifacts['plan.md'];
      if (planArtifact) {
        this.sendToSession(sessionId, {
          type: 'SPEC_GENERATED',
          sessionId,
          spec: planArtifact,
          filename: 'plan.md',
        });
      }
    } catch (error) {
      logger.error('Failed to process clarification', error instanceof Error ? error : undefined, { sessionId });
      
      this.sendToSession(sessionId, {
        type: 'SESSION_FAILED',
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: generationService.getCurrentPhase().phase,
      });
    }
  }

  private async handleSpecApproval(
    event: { type: 'SPEC_APPROVED'; sessionId: string },
    _sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Spec approved', { sessionId: event.sessionId, userId });

    const generationService = this.activeSessions.get(event.sessionId);
    if (!generationService) {
      throw new Error('No active generation session found');
    }

    try {
      await generationService.startExecution();
      await generationService.startVerification();
      
      const session = generationService.getSession();
      
      this.sendToSession(event.sessionId, {
        type: 'SESSION_COMPLETED',
        sessionId: event.sessionId,
        projectId: session.projectId,
      });

      this.activeSessions.delete(event.sessionId);
    } catch (error) {
      logger.error('Failed to complete generation', error instanceof Error ? error : undefined, { 
        sessionId: event.sessionId 
      });
      
      this.sendToSession(event.sessionId, {
        type: 'SESSION_FAILED',
        sessionId: event.sessionId,
        error: error instanceof Error ? error.message : 'Unknown error',
        phase: generationService.getCurrentPhase().phase,
      });
    }
  }

  private async handleSpecRejection(
    event: { type: 'SPEC_REJECTED'; sessionId: string; feedback: string },
    _sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Spec rejected', { sessionId: event.sessionId, userId, feedback: event.feedback });

    const generationService = this.activeSessions.get(event.sessionId);
    if (!generationService) {
      throw new Error('No active generation session found');
    }

    this.sendToSession(event.sessionId, {
      type: 'CLARIFICATION_NEEDED',
      question: `Please revise the specification based on this feedback: ${event.feedback}`,
      context: 'Spec revision',
    });
  }

  private async handleRetryPhase(
    event: { type: 'RETRY_PHASE'; sessionId: string },
    _sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Retrying phase', { sessionId: event.sessionId, userId });

    const project = await this.projectService.getProject(event.sessionId);
    if (!project) {
      throw new Error('Project not found');
    }

    const session = await PhaseOrchestrator.createSession(this.prisma, {
      userId,
      projectId: project.id,
      prompt: project.prompt,
      appType: project.appType,
    });

    const orchestrator = new PhaseOrchestrator(session, this.prisma, this.eventEmitter);
    
    try {
      await orchestrator.retryPhase();
      
      this.sendToSession(event.sessionId, {
        type: 'PROGRESS_UPDATE',
        sessionId: event.sessionId,
        phase: session.currentPhase.phase,
        progress: 0,
        message: 'Phase retry started',
      });
    } catch (error) {
      logger.error('Failed to retry phase', error instanceof Error ? error : undefined, { 
        sessionId: event.sessionId 
      });
      
      this.sendToSession(event.sessionId, {
        type: 'ERROR',
        message: error instanceof Error ? error.message : 'Failed to retry phase',
      });
    }
  }

  private async handleCancelSession(
    event: { type: 'CANCEL_SESSION'; sessionId: string },
    _sessionId: string,
    userId: string
  ): Promise<void> {
    logger.info('Cancelling session', { sessionId: event.sessionId, userId });

    this.activeSessions.delete(event.sessionId);
    
    await this.projectService.updateProject(event.sessionId, {
      status: 'cancelled',
    });

    this.sendToSession(event.sessionId, {
      type: 'SESSION_FAILED',
      sessionId: event.sessionId,
      error: 'Session cancelled by user',
      phase: 'discovery',
    });
  }

  private sendQueuedEvents(sessionId: string, ws: AuthenticatedWebSocket): void {
    const queuedEvents = this.eventQueue.get(sessionId);
    
    if (!queuedEvents || queuedEvents.length === 0) {
      return;
    }

    logger.info('Sending queued events', { sessionId, count: queuedEvents.length });

    for (const item of queuedEvents) {
      this.sendEvent(ws, item.event);
    }

    this.eventQueue.delete(sessionId);
  }

  sendToSession(sessionId: string, event: ServerEvent): void {
    const connections = this.connectionManager.getConnectionsBySession(sessionId);
    
    if (connections.length === 0) {
      logger.info('No active connections, queueing event', { sessionId, eventType: event.type });
      
      let queue = this.eventQueue.get(sessionId);
      if (!queue) {
        queue = [];
        this.eventQueue.set(sessionId, queue);
      }
      
      queue.push({
        event,
        timestamp: Date.now(),
      });
      
      return;
    }

    this.connectionManager.sendToSession(sessionId, event);
  }

  broadcast(event: ServerEvent): void {
    this.connectionManager.broadcast(event);
  }

  private sendEvent(ws: WebSocket, event: ServerEvent): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }

  private sendError(ws: WebSocket, message: string): void {
    this.sendEvent(ws, {
      type: 'ERROR',
      message,
    });
  }

  start(): void {
    this.connectionManager.startHeartbeat();
    logger.info('SessionHandler started');
  }

  stop(): void {
    this.connectionManager.closeAllConnections();
    this.wss.close();
    logger.info('SessionHandler stopped');
  }

  getStats() {
    return this.connectionManager.getStats();
  }

  getConnectionManager(): ConnectionManager {
    return this.connectionManager;
  }
}

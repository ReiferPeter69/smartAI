import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { getAllWorkflows, getWorkflowById, detectWorkflowFromPrompt, suggestWorkflow } from '../../agents/Workflows';
import { AgentRouter } from '../../services/AgentRouter';
import { WorkflowExecutor } from '../../services/WorkflowExecutor';
import { EnhancedLLMService } from '../../services/EnhancedLLMService';
import { ProviderFactory } from '../../llm/ProviderFactory';

export function createWorkflowsRouter(): Router {
  const router = Router();
  const agentRouter = new AgentRouter();

  router.use(authenticate);

  router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflows = getAllWorkflows();
      res.json({ workflows });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:workflowId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const workflowId = Array.isArray(req.params.workflowId) ? req.params.workflowId[0] : req.params.workflowId;
      const workflow = getWorkflowById(workflowId);
      
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }
      
      res.json({ workflow });
    } catch (error) {
      next(error);
    }
  });

  router.post('/detect', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prompt } = req.body;
      
      if (!prompt) {
        res.status(400).json({ error: 'Missing prompt in request body' });
        return;
      }

      const detectedWorkflow = detectWorkflowFromPrompt(prompt);
      const suggestedWorkflows = suggestWorkflow(prompt);
      
      res.json({ 
        detectedWorkflow,
        suggestedWorkflows: suggestedWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          description: w.description,
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/suggest-agent', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { prompt, context } = req.body;
      
      if (!prompt) {
        res.status(400).json({ error: 'Missing prompt in request body' });
        return;
      }

      const result = agentRouter.detectBestAgent(prompt, context);
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post('/execute', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { workflowId, prompt, context, provider, apiKey } = req.body;
      
      if (!workflowId || !prompt) {
        res.status(400).json({ error: 'Missing required fields: workflowId, prompt' });
        return;
      }

      const workflow = getWorkflowById(workflowId);
      if (!workflow) {
        res.status(404).json({ error: 'Workflow not found' });
        return;
      }

      if (!provider || !apiKey) {
        res.status(400).json({ 
          error: 'Provider and API key required for workflow execution',
          hint: 'Include provider and apiKey in request body'
        });
        return;
      }

      const llmProvider = await ProviderFactory.createProvider({
        provider,
        apiKey,
        model: 'gpt-4o',
      });

      const enhancedLLMService = new EnhancedLLMService(llmProvider);
      const workflowExecutor = new WorkflowExecutor(enhancedLLMService);

      const result = await workflowExecutor.executeWorkflow(workflow, prompt, context);
      
      res.json({ 
        success: true,
        result,
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/agents/search/by-skill/:skillId', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skillId = Array.isArray(req.params.skillId) ? req.params.skillId[0] : req.params.skillId;
      const agents = agentRouter.findAgentsBySkill(skillId);
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  });

  router.get('/agents/search/by-capability/:capability', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const capability = Array.isArray(req.params.capability) ? req.params.capability[0] : req.params.capability;
      const agents = agentRouter.findAgentsByCapability(capability);
      res.json({ agents });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

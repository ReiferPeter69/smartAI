import { Router, Response, NextFunction } from 'express';
import { AuthRequest, authenticate } from '../middleware/auth';
import { ModelRouter, RoutingStrategy } from '../../services/ModelRouter';
import { getAllAgentTemplates } from '../../agents/AgentTemplates';
import { getAllSkills } from '../../agents/SkillLibrary';

export function createModelsRouter(): Router {
  const router = Router();
  const modelRouter = new ModelRouter();

  router.use(authenticate);

  router.get('/', async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const models = modelRouter.getAllModels();
      res.json({ models });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:modelName', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const modelName = Array.isArray(req.params.modelName) ? req.params.modelName[0] : req.params.modelName;
      const modelInfo = modelRouter.getModelInfo(modelName);
      
      if (!modelInfo) {
        res.status(404).json({ error: 'Model not found' });
        return;
      }
      
      res.json({ model: modelInfo });
    } catch (error) {
      next(error);
    }
  });

  router.get('/provider/:provider', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const provider = Array.isArray(req.params.provider) ? req.params.provider[0] : req.params.provider;
      const models = modelRouter.getModelsByProvider(provider);
      res.json({ models });
    } catch (error) {
      next(error);
    }
  });

  router.post('/select', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const strategy = req.body as RoutingStrategy;
      
      if (!strategy.priority) {
        res.status(400).json({ error: 'Missing priority in routing strategy' });
        return;
      }

      const selectedModel = modelRouter.selectModel(strategy);
      const modelInfo = modelRouter.getModelInfo(selectedModel);
      
      res.json({ 
        selectedModel,
        modelInfo,
        strategy 
      });
    } catch (error) {
      next(error);
    }
  });

  router.post('/estimate-cost', async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { model, promptTokens, completionTokens } = req.body;
      
      if (!model || promptTokens === undefined || completionTokens === undefined) {
        res.status(400).json({ error: 'Missing required fields: model, promptTokens, completionTokens' });
        return;
      }

      const cost = modelRouter.estimateCost(model, promptTokens, completionTokens);
      res.json({ cost, model, promptTokens, completionTokens });
    } catch (error) {
      next(error);
    }
  });

  router.get('/agents/templates', async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = getAllAgentTemplates();
      res.json({ templates });
    } catch (error) {
      next(error);
    }
  });

  router.get('/agents/skills', async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const skills = getAllSkills();
      res.json({ skills });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
